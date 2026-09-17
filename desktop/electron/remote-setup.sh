#!/bin/sh
set -eu
umask 077
export LC_ALL=C
uid=$(id -u)
runtime="/run/user/$uid"
display=''
for socket in "$runtime"/wayland-*; do
  if [ -S "$socket" ]; then display=$(basename "$socket"); break; fi
done
if [ -z "$display" ]; then
  echo 'No active Wayland session for this SSH user. Log into a compatible Wayland desktop as this user first.' >&2
  exit 1
fi
missing=''
command -v wayvnc >/dev/null 2>&1 || missing="$missing wayvnc"
command -v websockify >/dev/null 2>&1 || missing="$missing websockify"
command -v python3 >/dev/null 2>&1 || missing="$missing python3"
[ -f /usr/share/novnc/vnc.html ] || missing="$missing novnc"
if [ -n "$missing" ]; then
  command -v apt-get >/dev/null 2>&1 || { echo "Automatic installation supports apt-based Linux. Missing:$missing" >&2; exit 1; }
  if [ "$uid" = 0 ]; then privilege=''; else
    sudo -n true 2>/dev/null || { echo "Missing:$missing. Passwordless sudo is required for automatic installation; install these packages on the target or configure sudo first." >&2; exit 1; }
    privilege='sudo -n'
  fi
  echo "Installing:$missing"
  $privilege env DEBIAN_FRONTEND=noninteractive apt-get update
  $privilege env DEBIAN_FRONTEND=noninteractive apt-get install -y $missing
fi
export XDG_RUNTIME_DIR="$runtime" WAYLAND_DISPLAY="$display"
python3 - <<'PY'
import json, os, pathlib, socket, subprocess, time, urllib.request, signal
cache = pathlib.Path.home() / '.cache' / 'felix-remote'
cache.mkdir(parents=True, exist_ok=True, mode=0o700)
state_path = cache / 'session.json'
def healthy(state):
    try:
        with socket.create_connection(('127.0.0.1', state['vnc']), 2) as sock:
            if not sock.recv(12).startswith(b'RFB '): return False
        with urllib.request.urlopen('http://127.0.0.1:%s/vnc.html' % state['web'], timeout=2) as response:
            return response.status == 200
    except Exception:
        return False
try:
    state = json.loads(state_path.read_text())
    if state.get('version') != 2:
        # Retire only the old Felix-owned capture instance, never the user's VNC.
        for key, marker in [('vnc_pid', str(cache / 'control-')), ('web_pid', '127.0.0.1:%s' % state['web'])]:
            try:
                command = pathlib.Path('/proc/%s/cmdline' % state[key]).read_text()
                if marker in command: os.kill(state[key], signal.SIGTERM)
            except (OSError, KeyError): pass
        raise ValueError('old Felix capture session')
    for key, executable in [('vnc_pid', 'wayvnc'), ('web_pid', 'websockify')]:
        if key == 'vnc_pid' and state.get('reused'): continue
        if executable not in pathlib.Path('/proc/%s/cmdline' % state[key]).read_text(): raise ValueError('stale service')
    if not healthy(state): raise ValueError('unhealthy service')
    print('FELIX_READY ' + json.dumps(state), flush=True)
    raise SystemExit(0)
except (OSError, ValueError, KeyError):
    pass
def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]
def listening(port):
    try:
        with socket.create_connection(('127.0.0.1', port), 1) as sock:
            return sock.recv(12).startswith(b'RFB ')
    except Exception:
        return False
reuse_vnc = next((port for port in (5900, 5901, 5902) if listening(port)), None)
vnc, web = reuse_vnc or free_port(), free_port()
while web == vnc: web = free_port()
processes = []
try:
    if reuse_vnc is None:
        with open(cache / 'wayvnc.log', 'ab') as log:
            processes.append(subprocess.Popen(['wayvnc', '-C', '/dev/null', '-S', str(cache / ('control-%s.sock' % vnc)), '127.0.0.1', str(vnc)], stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True))
    else:
        processes.append(None)
    with open(cache / 'websockify.log', 'ab') as log:
        processes.append(subprocess.Popen(['websockify', '--web=/usr/share/novnc', '127.0.0.1:%s' % web, '127.0.0.1:%s' % vnc], stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True))
    state = dict(version=2, reused=reuse_vnc is not None, vnc=vnc, web=web, vnc_pid=processes[0].pid if processes[0] else None, web_pid=processes[-1].pid)
    for _ in range(40):
        if any(p is not None and p.poll() is not None for p in processes): raise RuntimeError('wayvnc/websockify exited; check ~/.cache/felix-remote/*.log (Wayland compositor may not support wayvnc)')
        if healthy(state):
            state_path.write_text(json.dumps(state))
            print('FELIX_READY ' + json.dumps(state), flush=True)
            break
        time.sleep(.25)
    else: raise RuntimeError('Remote desktop services did not become ready')
except BaseException:
    for process in processes:
        if process is not None and process.poll() is None: process.terminate()
    raise
PY

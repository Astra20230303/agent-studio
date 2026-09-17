export type ConnectionStatus = 'connecting' | 'connected' | 'offline' | 'error';

// A generation invalidates a previous connection attempt without replaying turns.
export function createConnectionRecovery(options: {
  connect: () => Promise<unknown>;
  status: (status: ConnectionStatus, error?: string) => void;
  connected: () => void;
  delays?: number[];
}) {
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = true;
  const delays = options.delays || [500, 1500, 3000];
  const clear = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
  const attempt = async (token: number, index: number) => {
    if (stopped || token !== generation) return;
    options.status('connecting');
    try {
      await options.connect();
      if (stopped || token !== generation) return;
      options.status('connected');
      options.connected();
    } catch (error) {
      if (stopped || token !== generation) return;
      const message = error instanceof Error ? error.message : String(error);
      if (index >= delays.length) { options.status('offline', message); return; }
      options.status('connecting', message);
      timer = setTimeout(() => { timer = undefined; void attempt(token, index + 1); }, delays[index]);
    }
  };
  const restart = (defer: boolean) => {
    stopped = false;
    clear();
    const token = ++generation;
    options.status(defer ? 'offline' : 'connecting');
    if (defer) timer = setTimeout(() => { timer = undefined; void attempt(token, 0); }, delays[0] || 0);
    else void attempt(token, 0);
  };
  return {
    start: () => restart(false),
    disconnected: () => restart(true),
    stop: () => { stopped = true; generation++; clear(); },
  };
}

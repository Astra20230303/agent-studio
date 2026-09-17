$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class DesktopInput {
  [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr value);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint x, uint y, uint data, UIntPtr extra);
  [StructLayout(LayoutKind.Sequential)] public struct INPUT { public uint type; public UNION data; }
  [StructLayout(LayoutKind.Explicit)] public struct UNION { [FieldOffset(0)] public KEYBOARD keyboard; [FieldOffset(0)] public MOUSE mouse; }
  [StructLayout(LayoutKind.Sequential)] public struct KEYBOARD { public ushort key, scan; public uint flags, time; public UIntPtr extra; }
  [StructLayout(LayoutKind.Sequential)] public struct MOUSE { public int x,y; public uint data,flags,time; public UIntPtr extra; }
  [DllImport("user32.dll", SetLastError=true)] public static extern uint SendInput(uint count, INPUT[] inputs, int size);
  public static void Type(string text) {
    foreach(char c in text) {
      var events = new INPUT[2];
      for(int i=0;i<2;i++) { events[i].type=1; events[i].data.keyboard.scan=c; events[i].data.keyboard.flags=(uint)(4+i*2); }
      if(SendInput(2,events,Marshal.SizeOf(typeof(INPUT)))!=2) throw new Exception("Windows rejected keyboard input (privilege or secure desktop).");
    }
  }
}
'@
[void][DesktopInput]::SetProcessDpiAwarenessContext([IntPtr](-4))
try {
  $action = [Console]::In.ReadToEnd() | ConvertFrom-Json
  $bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
  if ($action.type -ne 'screenshot') {
    $frame = $action.frame
    if ($null -eq $frame -or $frame.left -ne $bounds.Left -or $frame.top -ne $bounds.Top -or $frame.width -ne $bounds.Width -or $frame.height -ne $bounds.Height) { throw 'Display layout changed. Take a new screenshot.' }
    if ($action.type -in @('move','click','scroll')) {
      $px = $bounds.Left + [int][Math]::Floor($action.x * $bounds.Width / $frame.imageWidth)
      $py = $bounds.Top + [int][Math]::Floor($action.y * $bounds.Height / $frame.imageHeight)
      if (-not [DesktopInput]::SetCursorPos($px,$py)) { throw 'Windows rejected pointer input.' }
      if ($action.type -eq 'click') {
        $down = 2; $up = 4
        if ($action.button -eq 'right') { $down = 8; $up = 16 }
        if ($action.button -eq 'middle') { $down = 32; $up = 64 }
        $count = 1; if ($action.double) { $count = 2 }
        for ($i=0; $i -lt $count; $i++) {
          [DesktopInput]::mouse_event($down,0,0,0,[UIntPtr]::Zero)
          [DesktopInput]::mouse_event($up,0,0,0,[UIntPtr]::Zero)
        }
      }
      if ($action.type -eq 'scroll') {
        $wheel = [BitConverter]::ToUInt32([BitConverter]::GetBytes([int](-120 * $action.delta)),0)
        [DesktopInput]::mouse_event(2048,0,0,$wheel,[UIntPtr]::Zero)
      }
    } elseif ($action.type -eq 'type') { [DesktopInput]::Type($action.text) }
    elseif ($action.type -eq 'key') { [System.Windows.Forms.SendKeys]::SendWait($action.sequence) }
    Start-Sleep -Milliseconds 200
  }
  $imageWidth = [Math]::Min(1600, $bounds.Width)
  $imageHeight = [int][Math]::Round($bounds.Height * $imageWidth / $bounds.Width)
  $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($bounds.Left,$bounds.Top,0,0,$bounds.Size)
  $scaled = New-Object System.Drawing.Bitmap($imageWidth,$imageHeight)
  $g = [System.Drawing.Graphics]::FromImage($scaled)
  $g.DrawImage($bitmap,0,0,$imageWidth,$imageHeight)
  $stream = New-Object System.IO.MemoryStream
  $scaled.Save($stream,[System.Drawing.Imaging.ImageFormat]::Png)
  @{ frame = @{left=$bounds.Left;top=$bounds.Top;width=$bounds.Width;height=$bounds.Height;imageWidth=$imageWidth;imageHeight=$imageHeight}; data=[Convert]::ToBase64String($stream.ToArray()) } | ConvertTo-Json -Compress
} catch {
  @{error=$_.Exception.Message} | ConvertTo-Json -Compress
  exit 1
} finally {
  if ($graphics) { $graphics.Dispose() }; if ($g) { $g.Dispose() }
  if ($bitmap) { $bitmap.Dispose() }; if ($scaled) { $scaled.Dispose() }; if ($stream) { $stream.Dispose() }
}

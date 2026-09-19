export function resourceDownload(uri: string, blob: string): { filename: string; href: string } | undefined {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(blob)) return;
  try { atob(blob); } catch { return; }
  let filename = '';
  try { filename = decodeURIComponent(new URL(uri).pathname.split('/').pop() || ''); } catch {}
  filename = filename.replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '_').replace(/[. ]+$/g, '');
  if (!filename || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(filename)) filename = 'resource.bin';
  return { filename, href: `data:application/octet-stream;base64,${blob}` };
}

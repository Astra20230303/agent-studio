export function toolMedia(block: any): { kind: 'image' | 'audio'; src: string } | undefined {
  if (!block || typeof block !== 'object') return;
  const kind = ['image', 'inputImage'].includes(block.type) ? 'image' : ['audio', 'inputAudio'].includes(block.type) ? 'audio' : undefined;
  if (!kind) return;
  const allowed = kind === 'image' ? ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] : ['audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/mp4'];
  const direct = kind === 'image' ? block.imageUrl : block.audioUrl;
  if (typeof direct === 'string' && /^https:\/\//i.test(direct)) {
    try { const url = new URL(direct); if (!url.username && !url.password) return { kind, src: url.href }; } catch {}
  }
  const source = typeof direct === 'string' ? direct : typeof block.data === 'string' ? `data:${block.mimeType};base64,${block.data}` : '';
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/.exec(source);
  if (match && allowed.includes(match[1]) && match[2].length > 0 && match[2].length <= 14 * 1024 * 1024) return { kind, src: source };
}

export function resultBlocks(result: any): any[] {
  return Array.isArray(result) ? result : Array.isArray(result?.content) ? result.content : [];
}

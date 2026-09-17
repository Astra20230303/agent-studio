export function messageLinkKind(value: string): 'web' | 'anchor' | 'file' | 'unsupported' {
  if (!value || /[\u0000-\u001f]/.test(value)) return 'unsupported';
  if (value.startsWith('#')) return 'anchor';
  if (/^https?:/i.test(value)) {
    try { const url = new URL(value); return url.username || url.password ? 'unsupported' : 'web'; } catch { return 'unsupported'; }
  }
  if (/^[a-z]:[\\/]/i.test(value)) return 'file';
  // A bare filename with a line suffix otherwise resembles a URI scheme.
  if (/^[^:/\\?#]+\.[^:/\\?#]+:[1-9]\d*(?::[1-9]\d*)?$/.test(value)) return 'file';
  return /^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('//') ? 'unsupported' : 'file';
}
export function headingSlug(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, '').trim().replace(/\s/g, '-');
}

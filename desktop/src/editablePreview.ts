export function isEditablePreview(value: unknown): value is { text: string; revision: string } {
  if (!value || typeof value !== 'object') return false;
  const preview = value as Record<string, unknown>;
  return typeof preview.text === 'string' && typeof preview.revision === 'string' && !!preview.revision
    && !preview.truncated && !preview.encodingInvalid && !preview.binary && !preview.image;
}

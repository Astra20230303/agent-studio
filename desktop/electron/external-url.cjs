function externalUrl(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw Error('Only HTTP(S) browser links are supported');
  return url.href;
}
module.exports = { externalUrl };

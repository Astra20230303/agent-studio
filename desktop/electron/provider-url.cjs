function providerUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('请输入有效的 Provider Base URL'); }
  const loopback = url.hostname === 'localhost' || url.hostname === '[::1]' || /^127(?:\.\d{1,3}){3}$/.test(url.hostname);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) || url.username || url.password || url.search || url.hash) {
    throw new Error('请输入 HTTPS Base URL；本机回环地址也支持 HTTP');
  }
  return url.href.replace(/\/+$/, '');
}
function isLocalProvider(value) {
  try {
    const url = new URL(providerUrl(value));
    return url.hostname === 'localhost' || url.hostname === '[::1]' || /^127(?:\.\d{1,3}){3}$/.test(url.hostname);
  } catch { return false; }
}
module.exports = { providerUrl, isLocalProvider };

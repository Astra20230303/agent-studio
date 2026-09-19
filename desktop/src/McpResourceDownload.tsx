import { useMemo } from 'react';
import { resourceDownload } from './resourceDownload';
export function McpResourceDownload({ uri, blob }: { uri: string; blob: string }) {
  const download = useMemo(() => resourceDownload(uri, blob), [uri, blob]);
  return download ? <a download={download.filename} href={download.href}>下载资源文件</a> : <p role="alert">资源的 Base64 数据无效，无法下载。</p>;
}

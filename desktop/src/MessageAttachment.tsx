import { useContext } from 'react';
import { ArtifactOpenContext, ArtifactWorkspaceContext } from './Artifacts';

export function MessageAttachment({ path }: { path: string }) {
  const open = useContext(ArtifactOpenContext);
  const workspace = useContext(ArtifactWorkspaceContext);
  const normalized = path.replace(/\\/g, '/');
  const separator = normalized.lastIndexOf('/');
  const absolute = normalized.startsWith('/') || /^[a-z]:\//i.test(normalized);
  const root = absolute ? normalized.slice(0, separator + 1) : workspace;
  const name = normalized.slice(separator + 1);
  const valid = !!root && !!name && !/[\0\r\n]/.test(path) && (absolute || !/^[a-z][a-z\d+.-]*:/i.test(path));
  return <div className="message-attachment" title={path}>
    <button disabled={!open || !valid} aria-label={`预览附件：${path}`} onClick={() => { if (open && root && valid) open({ root, path: absolute ? name : path }); }}>📎 {name || path}</button>
  </div>;
}

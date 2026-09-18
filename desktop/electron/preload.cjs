const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  droppedFilePaths: files => files.map(file => webUtils.getPathForFile(file)),
  customFrame: process.argv.includes('--felix-soft-frame'),
  conversationNotifications: input => ipcRenderer.invoke('desktop:conversation-notifications', input),
  onOpenConversation: listener => {
    const handler = (_event, threadId) => listener(threadId);
    ipcRenderer.on('desktop:open-conversation', handler);
    return () => ipcRenderer.removeListener('desktop:open-conversation', handler);
  },
  openExternal: url => ipcRenderer.invoke('desktop:open-external', url),
  windowState: () => ipcRenderer.invoke('window:state'),
  resizeFrame: input => ipcRenderer.send('window:resize-frame', input),
  onWindowState: listener => {
    const handler = (_event, state) => listener(state);
    ipcRenderer.on('window:state', handler);
    return () => ipcRenderer.removeListener('window:state', handler);
  },
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
  providerStatus: providerId => ipcRenderer.invoke('desktop:provider-status', providerId),
  saveProvider: input => ipcRenderer.invoke('desktop:save-provider', input),
  listProviders: () => ipcRenderer.invoke('desktop:list-providers'),
  threadProvider: threadId => ipcRenderer.invoke('desktop:thread-provider', threadId),
  activateProvider: id => ipcRenderer.invoke('desktop:activate-provider', id),
  deleteProvider: id => ipcRenderer.invoke('desktop:delete-provider', id),
  listModels: input => ipcRenderer.invoke('desktop:list-models', input),
  remoteAction: action => ipcRenderer.invoke('desktop:remote-action', action),
  remoteStatus: () => ipcRenderer.invoke('desktop:remote-status'),
  onRemoteOpen: listener => {
    const handler = () => listener();
    ipcRenderer.on('desktop:remote-open', handler);
    return () => ipcRenderer.removeListener('desktop:remote-open', handler);
  },
  artifact: input => ipcRenderer.invoke('desktop:artifact', input),
  getProjectRoot: () => ipcRenderer.invoke('desktop:project-root'),
  workspaceFile: input => ipcRenderer.invoke('desktop:workspace-file', input),
  workspaceGit: input => ipcRenderer.invoke('desktop:workspace-git', input),
  pickProject: () => ipcRenderer.invoke('desktop:pick-project'),
  pickFiles: () => ipcRenderer.invoke('desktop:pick-files'),
  saveConversation: input => ipcRenderer.invoke('desktop:save-conversation', input),
  saveTerminal: input => ipcRenderer.invoke('desktop:save-terminal', input),
  saveTaskOutput: input => ipcRenderer.invoke('desktop:save-task-output', input),
  readExtensionFile: (path, kind) => ipcRenderer.invoke('desktop:extension-file', { path, kind }),
  listTasks: () => ipcRenderer.invoke('tasks:list'),
  saveTask: input => ipcRenderer.invoke('tasks:save', input),
  setTaskStatus: (id, status) => ipcRenderer.invoke('tasks:status', { id, status }),
  runTask: id => ipcRenderer.invoke('tasks:run', { id }),
  cancelTask: id => ipcRenderer.invoke('tasks:cancel', { id }),
  deleteTask: id => ipcRenderer.invoke('tasks:delete', { id }),
  taskDetail: id => ipcRenderer.invoke('tasks:detail', { id }),
  onTasksChanged: listener => {
    const handler = (_event, message) => listener(message);
    ipcRenderer.on('tasks:changed', handler);
    return () => ipcRenderer.removeListener('tasks:changed', handler);
  },
  terminal: {
    create: cwd => ipcRenderer.invoke('terminal:create', { cwd }),
    write: (id, data) => ipcRenderer.invoke('terminal:write', { id, data }),
    resize: (id, cols, rows) => ipcRenderer.invoke('terminal:resize', { id, cols, rows }),
    close: id => ipcRenderer.invoke('terminal:close', { id }),
    onData: listener => { const handler = (_event, message) => listener(message); ipcRenderer.on('terminal:data', handler); return () => ipcRenderer.removeListener('terminal:data', handler); }
  }
});

contextBridge.exposeInMainWorld('codex', {
  connect: () => ipcRenderer.invoke('codex:connect'),
  request: (method, params) => ipcRenderer.invoke('codex:request', { method, params }),
  notify: (method, params) => ipcRenderer.invoke('codex:notify', { method, params }),
  respond: (id, result, error) => ipcRenderer.invoke('codex:respond', { id, result, error }),
  stop: () => ipcRenderer.invoke('codex:stop'),
  onNotification: listener => {
    const handler = (_event, message) => listener(message);
    ipcRenderer.on('codex:notification', handler);
    return () => ipcRenderer.removeListener('codex:notification', handler);
  },
  onServerRequest: listener => {
    const handler = (_event, message) => listener(message);
    ipcRenderer.on('codex:server-request', handler);
    return () => ipcRenderer.removeListener('codex:server-request', handler);
  },
  onError: listener => {
    const handler = (_event, message) => listener(message);
    ipcRenderer.on('codex:error', handler);
    return () => ipcRenderer.removeListener('codex:error', handler);
  },
  onStderr: listener => {
    const handler = (_event, message) => listener(message);
    ipcRenderer.on('codex:stderr', handler);
    return () => ipcRenderer.removeListener('codex:stderr', handler);
  },
  onClosed: listener => {
    const handler = (_event, message) => listener(message);
    ipcRenderer.on('codex:closed', handler);
    return () => ipcRenderer.removeListener('codex:closed', handler);
  }
});

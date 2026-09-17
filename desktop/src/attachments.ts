export function attachmentInput(paths: string[] = []) {
  return [...new Set(paths)].map(path => /\.(png|jpe?g|webp|gif)$/i.test(path)
    ? { type: 'localImage', path }
    : { type: 'text', text: `用户附加的本地文件（请按需使用文件工具读取）：${JSON.stringify(path)}` });
}
export function userInput(text: string, plugins: { id: string; name: string }[] = [], paths: string[] = [], skills: { name: string; path: string }[] = []) {
  return [...(text ? [{ type: 'text', text }] : []), ...attachmentInput(paths), ...plugins.map(plugin => ({ type: 'mention', name: plugin.name, path: `plugin://${plugin.id}` })), ...[...new Map(skills.map(skill => [skill.path, skill])).values()].map(skill => ({ type: 'skill', name: skill.name, path: skill.path }))];
}

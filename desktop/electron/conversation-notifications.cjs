const fs = require('node:fs');
const path = require('node:path');
const defaults = { completed: false, failed: false, input: false, backgroundOnly: true };
function createConversationNotifications(filename, { show, focused }) {
  let settings = { ...defaults };
  try { const saved = JSON.parse(fs.readFileSync(filename, 'utf8')); for (const key of Object.keys(defaults)) if (typeof saved[key] === 'boolean') settings[key] = saved[key]; } catch {}
  const seen = new Set();
  return {
    read: () => ({ ...settings }),
    save(input) {
      const next = { ...settings };
      for (const key of Object.keys(defaults)) { if (typeof input?.[key] !== 'boolean') throw Error('通知设置无效'); next[key] = input[key]; }
      fs.mkdirSync(path.dirname(filename), { recursive: true });
      fs.writeFileSync(`${filename}.tmp`, JSON.stringify(next), 'utf8'); fs.renameSync(`${filename}.tmp`, filename);
      settings = next; return { ...settings };
    },
    handle(message) {
      const params = message.params || {}; let kind; let key;
      if (message.method === 'turn/completed' && ['completed', 'failed'].includes(params.turn?.status)) { kind = params.turn.status; key = `turn:${params.threadId}:${params.turn.id}`; }
      else if (['item/commandExecution/requestApproval', 'item/fileChange/requestApproval', 'item/permissions/requestApproval', 'item/tool/requestUserInput', 'mcpServer/elicitation/request'].includes(message.method)) { kind = 'input'; key = `request:${message.id}`; }
      if (!kind || seen.has(key)) return;
      seen.add(key); if (seen.size > 1000) seen.delete(seen.values().next().value);
      if (!settings[kind] || settings.backgroundOnly && focused()) return;
      try { show({ title: 'Felix', body: { completed: '会话已完成，请返回应用查看结果。', failed: '会话执行失败，请返回应用查看详情。', input: '会话需要你的输入或审批。' }[kind], threadId: params.threadId }); } catch { /* Conversation state remains available if OS notifications fail. */ }
    },
  };
}
module.exports = { createConversationNotifications };

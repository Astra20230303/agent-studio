const record = value => value && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string';
const nonempty = value => text(value) && !!value.trim();
const date = value => text(value) && Number.isFinite(Date.parse(value));
function validateTaskRuns(runs) {
  const ids = new Set();
  for (const run of runs) {
    if (!record(run) || !nonempty(run.id) || ids.has(run.id)
      || !['running','completed','failed','interrupted'].includes(run.status)
      || !['manual','scheduled'].includes(run.trigger) || !date(run.startedAt)
      || run.outputTruncated != null && typeof run.outputTruncated !== 'boolean'
      || run.finishedAt != null && !date(run.finishedAt)
      || run.output != null && !text(run.output) || run.error != null && !text(run.error)
      || run.threadId != null && !nonempty(run.threadId)) throw Error('任务运行记录无效。');
    ids.add(run.id);
    const config = run.configuration;
    if (config != null && (!record(config) || !['name','prompt','model'].every(key => text(config[key]))
      || !['agent','reminder'].includes(config.kind) || !['read-only','workspace-write'].includes(config.permission)
      || [config.cwd,config.providerId].some(value => value != null && !text(value))
      || config.reasoningEffort != null && !['low','medium','high'].includes(config.reasoningEffort)
      || config.timeoutMinutes != null && (!Number.isInteger(config.timeoutMinutes) || config.timeoutMinutes < 1 || config.timeoutMinutes > 120))) throw Error('任务运行配置快照无效。');
    const environment = run.environment;
    if (environment != null && (!record(environment) || !nonempty(environment.cwd)
      || environment.providerId != null && !text(environment.providerId))) throw Error('任务运行环境记录无效。');
  }
}
module.exports = { validateTaskRuns };

function shouldNotifyTask(task) {
  if (!task.notify || task.runs?.[0]?.silent === true && task.runs?.[0]?.status === 'completed') return false;
  const status = task.runs?.[0]?.status;
  if (!['completed', 'failed', 'interrupted'].includes(status)) return false;
  return task.notificationPolicy !== 'failed_runs_only' || status === 'failed';
}
module.exports = { shouldNotifyTask };

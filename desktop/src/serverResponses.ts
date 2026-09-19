import { validateCommandDecision, type ApprovalDecision } from './approvalDecisions.ts';
type Answers = Record<string, { answers: string[] }>;
type Request = { id?: string | number; method?: string; params?: any };

export function createServerResponses(respond: (id: string | number, result: unknown) => Promise<any>) {
  const pending = new Map<string | number, symbol>();
  return {
    invalidate(id: string | number) { pending.delete(id); },
    reset() { pending.clear(); },
    async send(request: Request, decision: ApprovalDecision, answers?: Answers, content?: Record<string, unknown>) {
      const { id, method } = request;
      if (!(typeof id === 'string' && !!id.trim() || typeof id === 'number' && Number.isSafeInteger(id))) throw Error('服务请求编号无效，未提交回答。');
      if (pending.has(id)) throw Error('此请求正在提交，请等待完成。');
      const token = Symbol();
      pending.set(id, token);
      try {
        let result: unknown = { decision };
        if (method === 'item/commandExecution/requestApproval') {
          result = { decision: validateCommandDecision(request.params, decision) };
        } else if (typeof decision !== 'string') {
          throw Error('此请求不支持规则审批。');
        } else if (method === 'item/permissions/requestApproval') {
          result = { scope: 'turn', permissions: decision === 'accept' ? request.params?.permissions || {} : {} };
        } else if (method === 'item/tool/requestUserInput') {
          result = { answers: answers || Object.fromEntries((request.params?.questions || []).map((question: any) => [question.id, { answers: [] }])) };
        } else if (method === 'mcpServer/elicitation/request') {
          result = { action: decision === 'accept' ? 'accept' : decision === 'cancel' ? 'cancel' : 'decline', content: decision === 'accept' ? content ?? null : null };
        }
        const response = await respond(id, structuredClone(result));
        if (pending.get(id) !== token) return false;
        if (response?.ok !== true) throw Error(response?.error?.message || response?.error || '提交失败，请重试。');
        return true;
      } catch (error) {
        if (pending.get(id) !== token) return false;
        throw error;
      } finally { if (pending.get(id) === token) pending.delete(id); }
    },
  };
}

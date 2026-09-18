export type ConflictStage = { stage: number; text?: string; unavailable?: string };
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
export function parseConflictStages(value: unknown) {
  if (!object(value) || !Array.isArray(value.stages) || value.stages.some((stage: any) => !object(stage) || ![1, 2, 3].includes(stage.stage)
    || stage.text != null && typeof stage.text !== 'string' || stage.unavailable != null && typeof stage.unavailable !== 'string'
    || stage.text != null && stage.unavailable != null) || new Set(value.stages.map((stage: any) => stage.stage)).size !== value.stages.length) throw Error('冲突版本数据无效，请重试');
  return structuredClone(value.stages) as ConflictStage[];
}

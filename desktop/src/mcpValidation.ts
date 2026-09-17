import Ajv from 'ajv';
import addFormats from 'ajv-formats';
const validator = new Ajv({ allErrors: true, strict: false, validateSchema: true });
addFormats(validator);
export function validateMcpContent(schema: any, content: Record<string, unknown>): string | undefined {
  try {
    // Form schemas have a fixed object envelope; ignore dialect metadata because
    // their primitive constraints are shared with JSON Schema draft-07.
    const { $schema: _dialect, ...form } = schema;
    const check = validator.compile(form);
    if (!check(content)) return validator.errorsText(check.errors, { separator: '; ' });
  } catch { return '表单约束无效，无法提交。'; }
}

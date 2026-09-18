type DiagnosticProcess = {
  id: number;
  residentMemoryBytes?: number | null;
  physicalFootprintBytes?: number | null;
};

export type ServerDiagnosticGauge = { name: string; value: number };
export type ServerDiagnostics = { process: DiagnosticProcess; gauges: ServerDiagnosticGauge[] };

const finiteNonNegative = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

export function readServerDiagnostics(value: unknown): ServerDiagnostics {
  const input = value as any;
  const process = input?.process;
  if (!process || !Number.isInteger(process.id) || process.id < 0
    || process.residentMemoryBytes != null && !finiteNonNegative(process.residentMemoryBytes)
    || process.physicalFootprintBytes != null && !finiteNonNegative(process.physicalFootprintBytes)
    || !Array.isArray(input.gauges)) throw new Error('服务诊断响应无效');
  const gauges = input.gauges.map((gauge: any) => {
    if (!gauge || typeof gauge.name !== 'string' || !gauge.name.trim() || !finiteNonNegative(gauge.value)) throw new Error('服务诊断指标无效');
    return { name: gauge.name, value: gauge.value };
  });
  return { process: { id: process.id, ...(process.residentMemoryBytes != null ? { residentMemoryBytes: process.residentMemoryBytes } : {}), ...(process.physicalFootprintBytes != null ? { physicalFootprintBytes: process.physicalFootprintBytes } : {}), }, gauges };
}

export function formatBytes(value?: number | null): string {
  if (value == null) return '未知';
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KiB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MiB`;
  return `${(value / 1024 ** 3).toFixed(1)} GiB`;
}

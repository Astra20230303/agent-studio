import type { ReasoningEffort } from './reasoningEffort';
export type ThreadStatus = 'idle' | 'running' | 'needs_input' | 'completed' | 'failed';
export type AutomationStatus = 'active' | 'paused' | 'failed';

export interface Message {
  streamCompleted?: boolean;
  /** Explicit server/transport delta identities already applied to this reply. */
  streamDeltaIds?: string[];
  plugins?: { id: string; name: string }[];
  attachments?: string[];
  skills?: { name: string; path: string }[];
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  turnId?: string;
  tool?: ToolActivity;
}

export interface ToolActivity {
  kind: 'commandExecution' | 'fileChange' | 'collabAgentToolCall' | 'subAgentActivity' | 'mcpToolCall' | 'dynamicToolCall' | 'contextCompaction' | 'rawRecord';
  rawRecord?: { type: string; item: Record<string, unknown> };
  subAgent?: { kind: string; threadId: string; path: string };
  invocation?: { server?: string; name: string; arguments?: unknown; result?: unknown; error?: unknown; success?: boolean };
  collaboration?: { tool: string; prompt?: string; model?: string; receiverThreadIds: string[]; agentsStates: Record<string, { status: string; message?: string }> };
  status: string;
  command?: string;
  processId?: string;
  cwd?: string;
  output?: string;
  terminalInputs?: string[];
  progress?: string[];
  exitCode?: number | null;
  durationMs?: number | null;
  turnId?: string;
  changes?: { path: string; kind?: { type: string } | string; diff?: string }[];
}

export interface Thread {
  providerId?: string;
  model?: string;
  reasoningEffort?: ReasoningEffort;
  effectivePermissions?: import('./threadPermissions').ThreadPermissions;
  requestedPermission?: DesktopState['permission'];
  contextTokens?: import('./ContextUsage').ContextTokens;
  cwd?: string;
  planningMode?: 'default' | 'plan';
  plan?: import('./planning').PlanProgress;
  id: string;
  remoteId?: string;
  title: string;
  titleSource?: 'auto' | 'manual';
  projectId?: string;
  status: ThreadStatus;
  pinned: boolean;
  archived: boolean;
  messages: Message[];
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  path?: string;
  git: { isRepository: boolean; branch?: string; dirty?: boolean };
  environment: 'local' | 'worktree';
}

export interface Automation {
  id: string;
  name: string;
  schedule: string;
  status: AutomationStatus;
  notificationPolicy: 'all' | 'failed_runs_only' | 'none';
  lastRunAt?: string;
  nextRunAt?: string;
}

export interface LlmProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

export interface DesktopState {
  reasoningEffort: ReasoningEffort;
  mode: 'code' | 'work';
  activeThreadId?: string;
  activeProjectId?: string;
  theme: 'light' | 'dark' | 'system';
  sendShortcut?: 'enter' | 'mod-enter';
  model: string;
  permission: 'on-request' | 'workspace-write' | 'danger-full-access';
  threads: Thread[];
  projects: Project[];
  automations: Automation[];
  providers: LlmProvider[];
}

import type { AgentToolDefinition } from '@/infrastructure/openrouter/openrouter-client';
import type { LangflowRunInput } from '@/infrastructure/langflow/langflow-client';

export interface AgentToolResult {
  label: string;
  output: unknown;
  sources?: Array<{ displayName: string }>;
}

export interface RegisteredAgentTool {
  definition: AgentToolDefinition;
  execute(context: LangflowRunInput, input: unknown): Promise<AgentToolResult>;
}

export class AgentToolRegistry {
  private readonly toolsByName: Map<string, RegisteredAgentTool>;

  constructor(tools: RegisteredAgentTool[]) {
    this.toolsByName = new Map(tools.map((tool) => [tool.definition.name, tool]));
    if (this.toolsByName.size !== tools.length) throw new Error('Agent tool names must be unique');
  }

  definitions(): AgentToolDefinition[] {
    return [...this.toolsByName.values()].map((tool) => tool.definition);
  }

  execute(name: string, context: LangflowRunInput, input: unknown): Promise<AgentToolResult> {
    const tool = this.toolsByName.get(name);
    if (!tool) throw new Error(`Unknown agent tool: ${name}`);
    return tool.execute(context, input);
  }
}

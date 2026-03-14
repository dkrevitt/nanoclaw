/**
 * Type declarations for @anthropic-ai/claude-agent-sdk
 */

declare module '@anthropic-ai/claude-agent-sdk' {
  export interface QueryOptions {
    prompt: string;
    options?: {
      cwd?: string;
      resume?: string;
      allowedTools?: string[];
      permissionMode?: 'bypassPermissions' | 'acceptEdits' | 'plan' | 'default';
      mcpServers?: Record<string, {
        command: string;
        args?: string[];
        env?: Record<string, string>;
      }>;
      settingSources?: Array<'project' | 'user'>;
    };
  }

  export interface QueryMessage {
    type: 'result' | 'system' | 'assistant' | 'user';
    subtype?: 'init' | string;
    result?: string;
    session_id?: string;
  }

  export function query(options: QueryOptions): AsyncIterable<QueryMessage>;
}

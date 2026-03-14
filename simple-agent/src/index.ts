/**
 * Simple Self-Improving Agent
 *
 * Single process that:
 * - Responds to one Slack channel
 * - Uses Claude Agent SDK with skills + CLAUDE.md
 * - Can update its own instructions (self-improving)
 * - Runs continuously with scheduled tasks
 */

import 'dotenv/config';
import { query } from '@anthropic-ai/claude-agent-sdk';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDatabase, getSession, saveSession, storeMessage, ScheduledTask } from './db.js';
import { SlackBot, SlackMessage } from './slack.js';
import { startScheduler } from './scheduler.js';
import { pullChanges, syncToGithub, isGitRepo } from './git-sync.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = path.join(__dirname, '..', 'workspace');
const MCP_SERVERS_DIR = path.join(__dirname, '..', 'mcp-servers');

// Environment variables
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL;
const APIFY_TOKEN = process.env.APIFY_TOKEN;

// Validate required environment variables
if (!SLACK_BOT_TOKEN || !SLACK_APP_TOKEN || !SLACK_CHANNEL) {
  console.error('Missing required environment variables:');
  console.error('  SLACK_BOT_TOKEN - Slack bot OAuth token (xoxb-...)');
  console.error('  SLACK_APP_TOKEN - Slack app-level token (xapp-...)');
  console.error('  SLACK_CHANNEL - Slack channel ID to listen to');
  process.exit(1);
}

/**
 * Run the Claude agent with a prompt
 */
async function runAgent(prompt: string, sessionId?: string): Promise<string> {
  // Pull latest changes if workspace is a git repo
  if (isGitRepo()) {
    pullChanges();
  }

  // Build MCP servers config
  const mcpServers: Record<string, any> = {};

  // Add Apify MCP server if token is set
  if (APIFY_TOKEN) {
    const apifyMcpPath = path.join(MCP_SERVERS_DIR, 'apify', 'dist', 'index.js');
    mcpServers.apify = {
      command: 'node',
      args: [apifyMcpPath],
      env: {
        APIFY_TOKEN,
        APIFY_DAILY_BUDGET: process.env.APIFY_DAILY_BUDGET || '5.00',
      },
    };
  }

  let result = '';
  let newSessionId: string | undefined;

  try {
    for await (const msg of query({
      prompt,
      options: {
        cwd: WORKSPACE_DIR,
        resume: sessionId,
        allowedTools: [
          'Bash',
          'Read',
          'Write',
          'Edit',
          'Glob',
          'Grep',
          'WebSearch',
          'WebFetch',
          'Skill',
          'Task',
        ],
        permissionMode: 'bypassPermissions',
        mcpServers: Object.keys(mcpServers).length > 0 ? mcpServers : undefined,
      },
    })) {
      if (msg.type === 'result') {
        result = msg.result || '';
      }
      if (msg.type === 'system' && msg.subtype === 'init') {
        newSessionId = msg.session_id;
      }
    }
  } catch (err) {
    console.error('Agent error:', err);
    result = `Error: ${err instanceof Error ? err.message : String(err)}`;
  }

  // Save session for continuity
  if (newSessionId) {
    saveSession(newSessionId);
  }

  // Sync changes to GitHub if workspace is a git repo
  if (isGitRepo() && result) {
    syncToGithub(result);
  }

  return result;
}

/**
 * Handle incoming Slack message
 */
async function handleMessage(message: SlackMessage, slack: SlackBot): Promise<void> {
  console.log(`Message from ${message.senderName}: ${message.text.slice(0, 100)}...`);

  // Store message in database
  storeMessage({
    id: message.id,
    channel_id: message.channelId,
    thread_ts: message.threadTs,
    sender: message.sender,
    sender_name: message.senderName,
    content: message.text,
    timestamp: message.timestamp,
    is_from_me: false,
  });

  // Start typing indicator (adds hourglass reaction)
  const stopTyping = slack.startTyping(message.id);

  let result: string;
  try {
    // Run agent with the message
    const sessionId = getSession();
    result = await runAgent(message.text, sessionId);
  } finally {
    // Always stop typing indicator
    stopTyping();
  }

  if (result) {
    // Reply in the same thread
    await slack.reply(result, message.threadTs || undefined);

    // Store bot response
    storeMessage({
      id: `bot-${Date.now()}`,
      channel_id: message.channelId,
      thread_ts: message.threadTs,
      sender: 'bot',
      sender_name: 'Agent',
      content: result,
      timestamp: new Date().toISOString(),
      is_from_me: true,
    });
  }
}

/**
 * Run a scheduled task
 */
async function runScheduledTask(task: ScheduledTask, slack: SlackBot): Promise<string> {
  console.log(`Running scheduled task: ${task.prompt.slice(0, 50)}...`);

  const sessionId = getSession();
  const result = await runAgent(task.prompt, sessionId);

  // Send result to Slack
  if (result) {
    await slack.send(`*Scheduled Task Result:*\n${result}`);
  }

  return result;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log('Starting simple-agent...');

  // Initialize database
  initDatabase();
  console.log('Database initialized');

  // Create Slack bot with explicit type annotation to avoid circular reference
  let slack: SlackBot;

  const messageHandler = async (message: SlackMessage): Promise<void> => {
    return handleMessage(message, slack);
  };

  slack = new SlackBot({
    config: {
      botToken: SLACK_BOT_TOKEN!,
      appToken: SLACK_APP_TOKEN!,
      channelId: SLACK_CHANNEL!,
    },
    onMessage: messageHandler,
  });

  // Start Slack connection
  await slack.start();

  // Start scheduler
  startScheduler((task) => runScheduledTask(task, slack));

  console.log('Agent ready and listening...');

  // Handle shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    await slack.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

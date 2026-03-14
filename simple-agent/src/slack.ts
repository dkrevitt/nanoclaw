/**
 * Slack integration for simple-agent
 *
 * Socket Mode connection to a single channel.
 */

import { App, LogLevel } from '@slack/bolt';

export interface SlackConfig {
  botToken: string;
  appToken: string;
  channelId: string;
}

export interface SlackMessage {
  id: string;
  channelId: string;
  threadTs: string | null;
  sender: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export interface SlackBotOptions {
  config: SlackConfig;
  onMessage: (message: SlackMessage) => Promise<void>;
}

export class SlackBot {
  private app: App;
  private botUserId: string = '';
  private config: SlackConfig;
  private onMessage: (message: SlackMessage) => Promise<void>;
  private connected = false;

  // Track active threads where we're in conversation (no @mention needed)
  private activeThreads: Set<string> = new Set();

  // Queue to prevent parallel agent runs
  private queue: Array<() => Promise<void>> = [];
  private processing = false;

  // Dedup: track processed message IDs to avoid double-handling
  private processedIds: Set<string> = new Set();

  constructor(options: SlackBotOptions) {
    this.config = options.config;
    this.onMessage = options.onMessage;

    this.app = new App({
      token: this.config.botToken,
      appToken: this.config.appToken,
      socketMode: true,
      logLevel: LogLevel.WARN,
    });

    this.setupHandlers();
  }

  private async enqueue(handler: () => Promise<void>): Promise<void> {
    this.queue.push(handler);
    if (!this.processing) {
      this.processing = true;
      while (this.queue.length > 0) {
        const next = this.queue.shift();
        if (next) {
          try {
            await next();
          } catch (err) {
            console.error('Queue handler error:', err);
          }
        }
      }
      this.processing = false;
    }
  }

  private setupHandlers(): void {
    // Handle all messages in the configured channel
    this.app.message(async ({ message, client }) => {
      // Type guard for regular messages
      if (!('user' in message) || !('text' in message)) return;
      // Ignore bot messages
      if ('bot_id' in message || message.user === this.botUserId) return;
      // Only process messages in our channel
      if (message.channel !== this.config.channelId) return;

      // Dedup check (app_mention may also fire for @mentions)
      if (this.processedIds.has(message.ts)) return;

      // Determine thread context
      const isInThread = 'thread_ts' in message && message.thread_ts !== message.ts;
      const threadTs = (isInThread ? message.thread_ts : message.ts) as string;

      // Check if this needs a response:
      // 1. Contains @mention of the bot
      // 2. Is in an active thread (bot already engaged)
      const hasMention = message.text?.includes(`<@${this.botUserId}>`);
      const isActiveThread = isInThread && this.activeThreads.has(message.thread_ts as string);

      if (!hasMention && !isActiveThread) {
        // Message doesn't need a response - ignore
        return;
      }

      this.processedIds.add(message.ts);
      // Clean up old IDs periodically (keep last 1000)
      if (this.processedIds.size > 1000) {
        const ids = Array.from(this.processedIds);
        this.processedIds = new Set(ids.slice(-500));
      }

      const timestamp = new Date(parseFloat(message.ts) * 1000).toISOString();

      // Get user info for display name
      let senderName = message.user;
      try {
        const userInfo = await client.users.info({ user: message.user });
        senderName =
          (userInfo.user as any)?.real_name ||
          (userInfo.user as any)?.name ||
          message.user;
      } catch {
        // Fall back to user ID
      }

      // Mark thread as active
      this.activeThreads.add(threadTs);

      // Queue the message handler to prevent parallel runs
      await this.enqueue(async () => {
        await this.onMessage({
          id: message.ts,
          channelId: message.channel,
          threadTs,
          sender: message.user,
          senderName,
          text: message.text || '',
          timestamp,
        });
      });
    });

    // Handle app_mention events (when someone @mentions the bot)
    this.app.event('app_mention', async ({ event, client }) => {
      // Only process in our channel
      if (event.channel !== this.config.channelId) return;

      // Dedup check (message handler may have already processed this)
      if (this.processedIds.has(event.ts)) return;
      this.processedIds.add(event.ts);

      const timestamp = new Date(parseFloat(event.ts) * 1000).toISOString();

      const userId = event.user || 'unknown';
      let senderName: string = userId;
      try {
        if (event.user) {
          const userInfo = await client.users.info({ user: event.user });
          senderName =
            (userInfo.user as any)?.real_name ||
            (userInfo.user as any)?.name ||
            userId;
        }
      } catch {
        // Fall back to user ID
      }

      const threadTs = ('thread_ts' in event ? event.thread_ts : event.ts) as string;

      // Mark thread as active
      this.activeThreads.add(threadTs);

      // Queue the message handler
      await this.enqueue(async () => {
        await this.onMessage({
          id: event.ts,
          channelId: event.channel,
          threadTs,
          sender: userId,
          senderName,
          text: event.text || '',
          timestamp,
        });
      });
    });
  }

  async start(): Promise<void> {
    // Get bot user ID for filtering own messages
    const authTest = await this.app.client.auth.test();
    this.botUserId = authTest.user_id as string;
    console.log(`Slack authenticated as ${authTest.user} (${this.botUserId})`);

    await this.app.start();
    this.connected = true;
    console.log(`Slack connected, listening to channel ${this.config.channelId}`);
  }

  /**
   * Start typing indicator. Returns a function to stop it.
   */
  startTyping(threadTs?: string): () => void {
    if (!this.connected) return () => {};

    let running = true;

    // Slack typing indicator lasts ~3 seconds, so we refresh it
    const refresh = async () => {
      while (running) {
        try {
          // Note: Slack doesn't have a direct "typing" API for bots in threads
          // We simulate presence by posting and deleting, or just let it be
          // For now, we'll add a reaction to show we're working
        } catch {
          // Ignore errors
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    };

    // Add a "thinking" reaction to the message
    if (threadTs) {
      this.app.client.reactions.add({
        channel: this.config.channelId,
        timestamp: threadTs,
        name: 'hourglass_flowing_sand',
      }).catch(() => {});
    }

    refresh();

    return () => {
      running = false;
      // Remove the reaction
      if (threadTs) {
        this.app.client.reactions.remove({
          channel: this.config.channelId,
          timestamp: threadTs,
          name: 'hourglass_flowing_sand',
        }).catch(() => {});
      }
    };
  }

  /**
   * Split long text into chunks that fit Slack's limits
   */
  private splitMessage(text: string, maxLength: number = 3900): string[] {
    if (text.length <= maxLength) return [text];

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }

      // Try to split at a natural boundary
      let splitIndex = maxLength;

      // Look for newline near the end
      const newlineIndex = remaining.lastIndexOf('\n', maxLength);
      if (newlineIndex > maxLength * 0.5) {
        splitIndex = newlineIndex + 1;
      } else {
        // Look for space
        const spaceIndex = remaining.lastIndexOf(' ', maxLength);
        if (spaceIndex > maxLength * 0.5) {
          splitIndex = spaceIndex + 1;
        }
      }

      chunks.push(remaining.slice(0, splitIndex));
      remaining = remaining.slice(splitIndex);
    }

    return chunks;
  }

  async reply(text: string, threadTs?: string): Promise<void> {
    if (!this.connected) {
      console.warn('Cannot send Slack message: not connected');
      return;
    }

    // Split into chunks if needed
    const chunks = this.splitMessage(text);

    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunk = chunks.length > 1 && i > 0
          ? chunks[i]  // Continuation chunks
          : chunks[i];

        await this.app.client.chat.postMessage({
          channel: this.config.channelId,
          text: chunk,
          mrkdwn: true,
          ...(threadTs && { thread_ts: threadTs }),
        });

        // Small delay between chunks to maintain order
        if (i < chunks.length - 1) {
          await new Promise((r) => setTimeout(r, 200));
        }
      } catch (err) {
        console.error('Failed to send Slack message:', err);
      }
    }
  }

  async send(text: string): Promise<void> {
    return this.reply(text);
  }

  isConnected(): boolean {
    return this.connected;
  }

  async stop(): Promise<void> {
    this.connected = false;
    await this.app.stop();
    console.log('Slack disconnected');
  }
}

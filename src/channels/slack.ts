/**
 * Slack Channel for NanoClaw
 *
 * Connects to Slack via Bolt SDK with Socket Mode.
 * Maps Slack channels to existing NanoClaw groups via a configuration file.
 */

import { App, LogLevel } from '@slack/bolt';
import fs from 'fs';
import path from 'path';

import { ASSISTANT_NAME, STORE_DIR } from '../config.js';
import { logger } from '../logger.js';
import { Channel, OnInboundMessage, OnChatMetadata, RegisteredGroup } from '../types.js';

const SLACK_CONFIG_PATH = path.join(STORE_DIR, 'slack-config.json');

export interface SlackChannelMapping {
  slackChannelId: string;
  slackChannelName: string;
  nanoclawJid: string; // The NanoClaw group JID to map to
}

export interface SlackConfig {
  botToken: string;
  appToken: string; // Required for Socket Mode
  signingSecret?: string; // Optional, not needed for Socket Mode
  channelMappings: SlackChannelMapping[];
}

export interface SlackChannelOpts {
  onMessage: OnInboundMessage;
  onChatMetadata: OnChatMetadata;
  registeredGroups: () => Record<string, RegisteredGroup>;
}

export class SlackChannel implements Channel {
  name = 'slack';

  private app: App | null = null;
  private connected = false;
  private config: SlackConfig | null = null;
  private opts: SlackChannelOpts;
  private botUserId: string = '';

  // Map Slack channel IDs to NanoClaw JIDs
  private channelToJid: Map<string, string> = new Map();
  // Reverse map for sending
  private jidToChannel: Map<string, string> = new Map();
  // Track thread_ts for each JID to enable threaded replies
  // Key: JID, Value: thread_ts (the parent message timestamp)
  private jidToThreadTs: Map<string, string> = new Map();

  constructor(opts: SlackChannelOpts) {
    this.opts = opts;
  }

  async connect(): Promise<void> {
    // Load config
    if (!fs.existsSync(SLACK_CONFIG_PATH)) {
      throw new Error(
        `Slack config not found at ${SLACK_CONFIG_PATH}. Run slack auth first.`
      );
    }

    this.config = JSON.parse(fs.readFileSync(SLACK_CONFIG_PATH, 'utf-8'));
    if (!this.config?.botToken || !this.config?.appToken) {
      throw new Error('Slack config missing botToken or appToken');
    }

    // Build channel mappings
    for (const mapping of this.config.channelMappings || []) {
      this.channelToJid.set(mapping.slackChannelId, mapping.nanoclawJid);
      this.jidToChannel.set(mapping.nanoclawJid, mapping.slackChannelId);
      logger.info(
        { slackChannel: mapping.slackChannelName, jid: mapping.nanoclawJid },
        'Slack channel mapped'
      );
    }

    // Initialize Bolt app with Socket Mode
    this.app = new App({
      token: this.config.botToken,
      appToken: this.config.appToken,
      socketMode: true,
      logLevel: LogLevel.WARN,
    });

    // Get bot user ID for filtering own messages
    const authTest = await this.app.client.auth.test();
    this.botUserId = authTest.user_id as string;
    logger.info({ botUserId: this.botUserId }, 'Slack authenticated');

    // Handle all messages
    this.app.message(async ({ message, client }) => {
      // Type guard for regular messages
      if (!('user' in message) || !('text' in message)) return;
      // Ignore bot messages
      if ('bot_id' in message || message.user === this.botUserId) return;

      const channelId = message.channel;
      const jid = this.channelToJid.get(channelId);

      if (!jid) {
        logger.debug({ channelId }, 'Slack message from unmapped channel, ignoring');
        return;
      }

      const timestamp = new Date(parseFloat(message.ts) * 1000).toISOString();

      // Notify about chat metadata
      this.opts.onChatMetadata(jid, timestamp);

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

      // Track thread for replies
      // If message is in a thread, use thread_ts; otherwise use message ts to start a new thread
      const isInThread = 'thread_ts' in message && message.thread_ts !== message.ts;
      const threadTs = (isInThread ? message.thread_ts : message.ts) as string;
      this.jidToThreadTs.set(jid, threadTs);

      // If message is in a thread, auto-inject trigger so it doesn't require @mention
      // This allows natural conversation flow within threads
      let content = message.text || '';
      if (isInThread && !content.includes(`@${ASSISTANT_NAME}`)) {
        content = `@${ASSISTANT_NAME} ${content}`;
      }

      // Deliver message
      this.opts.onMessage(jid, {
        id: message.ts,
        chat_jid: jid,
        sender: `slack:${message.user}`,
        sender_name: senderName,
        content,
        timestamp,
        is_from_me: false,
        is_bot_message: false,
      });
    });

    // Handle app_mention events (when someone @mentions the bot)
    this.app.event('app_mention', async ({ event, client }) => {
      const channelId = event.channel;
      const jid = this.channelToJid.get(channelId);

      if (!jid) {
        logger.debug({ channelId }, 'Slack mention from unmapped channel, ignoring');
        return;
      }

      const timestamp = new Date(parseFloat(event.ts) * 1000).toISOString();
      this.opts.onChatMetadata(jid, timestamp);

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

      // Convert @bot mention to @ASSISTANT_NAME format for trigger matching
      const text = (event.text || '').replace(/<@[A-Z0-9]+>/g, `@${ASSISTANT_NAME}`);

      // Track thread for replies
      // If mention is in a thread, use thread_ts; otherwise use event ts to start a new thread
      const threadTs = ('thread_ts' in event ? event.thread_ts : event.ts) as string;
      this.jidToThreadTs.set(jid, threadTs);

      this.opts.onMessage(jid, {
        id: event.ts,
        chat_jid: jid,
        sender: `slack:${userId}`,
        sender_name: senderName,
        content: text,
        timestamp,
        is_from_me: false,
        is_bot_message: false,
      });
    });

    // Start the app
    await this.app.start();
    this.connected = true;
    logger.info('Slack channel connected (Socket Mode)');
  }

  async sendMessage(jid: string, text: string): Promise<void> {
    if (!this.app) {
      logger.warn({ jid }, 'Cannot send Slack message: not connected');
      return;
    }

    const channelId = this.jidToChannel.get(jid);
    if (!channelId) {
      logger.warn({ jid }, 'Cannot send Slack message: no channel mapping');
      return;
    }

    // Get thread_ts for threaded reply (if available)
    const threadTs = this.jidToThreadTs.get(jid);

    // Prefix with assistant name for consistency
    const prefixed = `*${ASSISTANT_NAME}:* ${text}`;

    try {
      await this.app.client.chat.postMessage({
        channel: channelId,
        text: prefixed,
        mrkdwn: true,
        ...(threadTs && { thread_ts: threadTs }),
      });
      logger.info(
        { channelId, length: text.length, threaded: !!threadTs },
        'Slack message sent'
      );
    } catch (err) {
      logger.error({ channelId, err }, 'Failed to send Slack message');
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  ownsJid(jid: string): boolean {
    // Slack channel uses mapped JIDs
    return this.jidToChannel.has(jid);
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    if (this.app) {
      await this.app.stop();
      this.app = null;
    }
    logger.info('Slack channel disconnected');
  }

  async setTyping(_jid: string, _isTyping: boolean): Promise<void> {
    // Slack doesn't have a user-controlled typing indicator for bots
  }

  /**
   * Get available Slack channels that can be mapped
   */
  async getAvailableChannels(): Promise<
    Array<{ id: string; name: string; isMember: boolean }>
  > {
    if (!this.app) return [];

    const result = await this.app.client.conversations.list({
      types: 'public_channel,private_channel',
      limit: 200,
    });

    return (
      (result.channels as any[])?.map((ch) => ({
        id: ch.id,
        name: ch.name,
        isMember: ch.is_member || false,
      })) || []
    );
  }

  /**
   * Add a channel mapping
   */
  addChannelMapping(
    slackChannelId: string,
    slackChannelName: string,
    nanoclawJid: string
  ): void {
    if (!this.config) {
      throw new Error('Slack not configured');
    }

    // Update in-memory maps
    this.channelToJid.set(slackChannelId, nanoclawJid);
    this.jidToChannel.set(nanoclawJid, slackChannelId);

    // Update config file
    const existing = this.config.channelMappings.findIndex(
      (m) => m.slackChannelId === slackChannelId
    );
    const mapping: SlackChannelMapping = {
      slackChannelId,
      slackChannelName,
      nanoclawJid,
    };

    if (existing >= 0) {
      this.config.channelMappings[existing] = mapping;
    } else {
      this.config.channelMappings.push(mapping);
    }

    fs.writeFileSync(SLACK_CONFIG_PATH, JSON.stringify(this.config, null, 2));
    logger.info({ slackChannelName, nanoclawJid }, 'Channel mapping added');
  }

  /**
   * Remove a channel mapping
   */
  removeChannelMapping(slackChannelId: string): void {
    if (!this.config) return;

    const mapping = this.config.channelMappings.find(
      (m) => m.slackChannelId === slackChannelId
    );
    if (mapping) {
      this.channelToJid.delete(slackChannelId);
      this.jidToChannel.delete(mapping.nanoclawJid);
      this.config.channelMappings = this.config.channelMappings.filter(
        (m) => m.slackChannelId !== slackChannelId
      );
      fs.writeFileSync(SLACK_CONFIG_PATH, JSON.stringify(this.config, null, 2));
      logger.info({ slackChannelId }, 'Channel mapping removed');
    }
  }

  /**
   * Get current channel mappings
   */
  getChannelMappings(): SlackChannelMapping[] {
    return this.config?.channelMappings || [];
  }
}

/**
 * Check if Slack is configured
 */
export function isSlackConfigured(): boolean {
  if (!fs.existsSync(SLACK_CONFIG_PATH)) return false;
  try {
    const config = JSON.parse(fs.readFileSync(SLACK_CONFIG_PATH, 'utf-8'));
    return Boolean(config?.botToken && config?.appToken);
  } catch {
    return false;
  }
}

/**
 * Initialize Slack config file
 */
export function initSlackConfig(botToken: string, appToken: string): void {
  const config: SlackConfig = {
    botToken,
    appToken,
    channelMappings: [],
  };
  fs.mkdirSync(path.dirname(SLACK_CONFIG_PATH), { recursive: true });
  fs.writeFileSync(SLACK_CONFIG_PATH, JSON.stringify(config, null, 2));
  logger.info({ path: SLACK_CONFIG_PATH }, 'Slack config initialized');
}

/**
 * Get Slack config path (for display in setup instructions)
 */
export function getSlackConfigPath(): string {
  return SLACK_CONFIG_PATH;
}

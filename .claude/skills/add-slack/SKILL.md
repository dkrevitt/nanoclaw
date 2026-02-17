---
name: add-slack
description: Add Slack as a messaging channel for NanoClaw. Maps Slack channels to existing NanoClaw groups. Triggers on "add slack", "setup slack", "slack integration", "connect slack".
---

# Add Slack Channel

Add Slack as an additional messaging channel for NanoClaw. Slack channels are mapped to existing NanoClaw groups, allowing you to interact with the same agent from both WhatsApp and Slack.

## Prerequisites

1. **NanoClaw running** with at least one registered group (e.g., via WhatsApp)
2. **Slack workspace** where you have permission to create apps

## Setup Steps

### 1. Create a Slack App

1. Go to https://api.slack.com/apps
2. Click **Create New App** → **From scratch**
3. Name: "NanoClaw" (or your assistant name)
4. Select your workspace
5. Click **Create App**

### 2. Configure Bot Token Scopes

1. Go to **OAuth & Permissions** in the sidebar
2. Under **Scopes** → **Bot Token Scopes**, add:
   - `app_mentions:read` - Read @mentions
   - `channels:history` - Read messages in public channels
   - `channels:read` - List channels
   - `chat:write` - Send messages
   - `groups:history` - Read messages in private channels
   - `groups:read` - List private channels
   - `users:read` - Get user display names

### 3. Enable Socket Mode

1. Go to **Socket Mode** in the sidebar
2. Toggle **Enable Socket Mode** ON
3. Name the token: "NanoClaw Socket"
4. Copy the **App-Level Token** (starts with `xapp-`)

### 4. Enable Events

1. Go to **Event Subscriptions** in the sidebar
2. Toggle **Enable Events** ON
3. Under **Subscribe to bot events**, add:
   - `app_mention` - When someone @mentions the bot
   - `message.channels` - Messages in public channels
   - `message.groups` - Messages in private channels

### 5. Install the App

1. Go to **Install App** in the sidebar
2. Click **Install to Workspace**
3. Authorize the permissions
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### 6. Configure NanoClaw

Create the config file at `store/slack-config.json`:

```json
{
  "botToken": "xoxb-your-bot-token",
  "appToken": "xapp-your-app-token",
  "channelMappings": []
}
```

Or run this command:
```bash
node -e "
const fs = require('fs');
const config = {
  botToken: 'YOUR_BOT_TOKEN',
  appToken: 'YOUR_APP_TOKEN',
  channelMappings: []
};
fs.mkdirSync('store', { recursive: true });
fs.writeFileSync('store/slack-config.json', JSON.stringify(config, null, 2));
console.log('Config created at store/slack-config.json');
"
```

### 7. Map Slack Channels to Groups

Edit `store/slack-config.json` to add channel mappings:

```json
{
  "botToken": "xoxb-...",
  "appToken": "xapp-...",
  "channelMappings": [
    {
      "slackChannelId": "C0123456789",
      "slackChannelName": "#general",
      "nanoclawJid": "1234567890@g.us"
    }
  ]
}
```

To find your Slack channel ID:
1. Open Slack
2. Right-click on the channel name
3. Click **View channel details**
4. Copy the Channel ID from the bottom

To find your NanoClaw group JID:
- Check `data/nanoclaw.db` or ask the agent "what groups are registered?"

### 8. Invite the Bot

In Slack, invite the bot to each channel you want it to monitor:
```
/invite @NanoClaw
```

### 9. Restart NanoClaw

```bash
npm run build
launchctl kickstart -k gui/$(id -u)/com.nanoclaw
```

## Usage

Once configured, you can interact with NanoClaw from Slack:

```
@NanoClaw what's the status of my tasks?
```

The bot responds with the same trigger word (`@Andy` or your configured name).

## How It Works

- Slack channels are mapped to existing NanoClaw groups
- Messages from Slack are stored in the same database as WhatsApp messages
- The agent sees messages from both channels with sender prefixes (`slack:user_id`)
- Responses go to both channels if the group is mapped to both

## Troubleshooting

### Bot not responding
1. Check if Socket Mode is enabled in Slack App settings
2. Verify the bot is invited to the channel
3. Check logs: `tail -f logs/nanoclaw.log | grep -i slack`

### "Not configured" error
Ensure `store/slack-config.json` exists with valid tokens.

### Channel not mapped
Verify the channel ID in your config matches the actual Slack channel ID.

## File Locations

| File | Purpose |
|------|---------|
| `store/slack-config.json` | Slack credentials and channel mappings |
| `src/channels/slack.ts` | Slack channel implementation |

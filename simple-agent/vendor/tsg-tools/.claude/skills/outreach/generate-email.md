# /generate-email

Generate a personalized email for a creator using Claude AI.

## Usage

```
/generate-email --creator-id <id> --project-id <id>
```

## What it does

Calls `POST /outreach/generate` to generate a personalized email using Claude AI, based on the creator's profile, recent posts, and project pitch angles.

## Parameters

- `--creator-id` (required): UUID of the creator
- `--project-id` (required): UUID of the project

## Options

- `--topic-id <id>`: Topic for context (uses saved posts)
- `--pitch-angle-id <id>`: Specific pitch angle to use
- `--instructions "<text>"`: Custom instructions for AI

## Example

```bash
/generate-email --creator-id abc123 --project-id proj-456 --topic-id topic-789

# Output:
# Generated email for @johnsmith:
#
# Subject: John - would love your take on Kilo Code
#
# Body:
# Hi John,
#
# I've been following your AI coding content on YouTube and really
# enjoyed your recent comparison of Claude vs GPT for coding tasks...
#
# Pitch angle used: Product Review Request
# Recipient: john@example.com
```

## API

```typescript
POST /outreach/generate
{
  "creatorId": "uuid",
  "projectId": "uuid",
  "topicId": "uuid",           // optional
  "pitchAngleId": "string",    // optional
  "customInstructions": "..."  // optional
}

Response:
{
  "subject": "...",
  "body": "...",
  "recipientEmail": "john@example.com",
  "pitchAngleUsed": "Product Review Request"
}
```

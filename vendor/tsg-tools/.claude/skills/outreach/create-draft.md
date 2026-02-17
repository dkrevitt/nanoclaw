# /create-draft

Create a Gmail draft for a creator and record the outreach.

## Usage

```
/create-draft --creator-id <id> --project-id <id> --to "<email>" --subject "<subject>" --body "<body>"
```

## What it does

Calls `POST /outreach/create-draft` to create a Gmail draft using the project's connected Gmail account and record the outreach in the database.

## Parameters

- `--creator-id` (required): UUID of the creator
- `--project-id` (required): UUID of the project
- `--to` (required): Recipient email address
- `--subject` (required): Email subject line
- `--body` (required): Email body text

## Options

- `--topic-id <id>`: Topic for tracking
- `--pitch-angle-id <id>`: Pitch angle used
- `--pitch-angle-name "<name>"`: Pitch angle name

## Example

```bash
/create-draft \
  --creator-id abc123 \
  --project-id proj-456 \
  --to "john@example.com" \
  --subject "John - would love your take on Kilo Code" \
  --body "Hi John, I've been following your content..."

# Output:
# Gmail draft created:
#   Draft ID: draft-xyz789
#   Recipient: john@example.com
#   Subject: John - would love your take on Kilo Code
#
# Outreach recorded:
#   ID: outreach-abc123
#   Status: draft_created
#
# View draft: https://mail.google.com/mail/u/0/#drafts
```

## API

```typescript
POST /outreach/create-draft
{
  "creatorId": "uuid",
  "projectId": "uuid",
  "topicId": "uuid",             // optional
  "pitchAngleId": "string",      // optional
  "pitchAngleName": "string",    // optional
  "recipientEmail": "john@example.com",
  "subject": "...",
  "body": "..."
}

Response:
{
  "outreach": { ... },
  "draftId": "gmail-draft-id",
  "messageId": "gmail-message-id"
}
```

**Note:** The project must have a Gmail account connected.

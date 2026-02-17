# /create-saved-search

Create a new saved search for a topic.

## Usage

```
/create-saved-search --topic-id <id> --query "<search query>" --platform <platform>
```

## What it does

Calls `POST /saved-searches` to create a new search query that can be executed to discover creators.

## Parameters

- `--topic-id` (required): UUID of the topic
- `--project-id` (required): UUID of the project
- `--query` (required): Search query string
- `--platform` (required): Platform (youtube, tiktok, instagram, twitter, substack, newsletter)

## Options

- `--search-url`: Optional URL for the search (for reference)

## Example

```bash
/create-saved-search \
  --topic-id topic-123 \
  --project-id proj-456 \
  --query "AI coding agent comparison" \
  --platform youtube

# Output:
# Created saved search: abc123-def456
# Query: "AI coding agent comparison"
# Platform: youtube
```

## API

```typescript
POST /saved-searches
{
  "topicId": "uuid",
  "projectId": "uuid",
  "searchQuery": "AI coding agent comparison",
  "platform": "youtube",
  "searchUrl": "https://..."  // optional
}
```

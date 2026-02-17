# /get-topic

Get details for a specific topic.

## Usage

```
/get-topic <topic-id>
```

## What it does

Calls `GET /topics/:id` to fetch topic details including review criteria and saved searches.

## Parameters

- `topicId` (required): UUID of the topic

## Example

```bash
/get-topic topic-123

# Output:
# Topic: AI model coding benchmarks
# Project: Kilo Code
# Description: Creators who compare AI coding models...
#
# Review Criteria:
#   Must have:
#     - Posts video content primarily
#     - Posts at least weekly
#     - Follower count > 10,000
#   Nice to have:
#     - Verified account
#     - Engagement rate > 5%
#   Exclude if:
#     - Primarily promotional content
#
# Saved Searches (13):
#   YouTube (4): "AI coding comparison", "Claude vs GPT"...
#   TikTok (3): #claudeai, #aicodingtools...
#   Instagram (3): #aicode, #claudeai...
#   Twitter (3): "Claude coding", "AI dev tools"...
```

## API

```typescript
GET /topics/:id

Response:
{
  "id": "topic-123",
  "project_id": "proj-abc",
  "topic": "AI model coding benchmarks",
  "description": "...",
  "review_criteria": {
    "must_have": [...],
    "nice_to_have": [...],
    "exclude_if": [...]
  },
  "saved_searches": [...]
}
```

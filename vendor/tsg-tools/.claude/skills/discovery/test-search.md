# /test-search

Test a saved search without creating creators in the database.

## Usage

```
/test-search <saved-search-id>
```

## What it does

Calls `POST /apify/test-execute` to run a search in dry-run mode. Returns preview results without persisting any data.

## Parameters

- `savedSearchId` (required): UUID of the saved search to test

## Options

- `--max-results <n>`: Limit number of results (default: 10)

## Example

```bash
/test-search abc123-def456 --max-results 5

# Output:
# Testing search: "AI coding tutorials" (YouTube)
# Results (5):
#   - @ai_tutorials (47K followers)
#   - @code_with_ai (23K followers)
#   ...
```

## API

```typescript
POST /apify/test-execute
{
  "savedSearchId": "uuid",
  "dryRun": true,
  "maxResults": 10
}
```

# /batch-enrich

Batch enrich multiple creators.

## Usage

```
/batch-enrich <creator-ids> [--tier <tier>]
```

## What it does

Calls `POST /creators/batch-enrich` or `POST /creators/batch-enrich-full` to enrich multiple creators at once.

## Parameters

- `creatorIds` (required): Comma-separated UUIDs of creators to enrich

## Options

- `--tier preliminary|full`: Enrichment level (default: preliminary)

## Example

```bash
/batch-enrich "id1,id2,id3" --tier preliminary

# Output:
# Batch enriching 3 creators (Tier 2)...
# Results:
#   - @ai_tutorials: success
#   - @code_master: success
#   - @tech_reviewer: failed (rate limited)
#
# Summary: 2 succeeded, 1 failed
```

## API

```typescript
// Tier 2 (preliminary)
POST /creators/batch-enrich
{
  "creatorIds": ["uuid1", "uuid2", "uuid3"]
}

// Tier 3 (full)
POST /creators/batch-enrich-full
{
  "creatorIds": ["uuid1", "uuid2", "uuid3"]
}
```

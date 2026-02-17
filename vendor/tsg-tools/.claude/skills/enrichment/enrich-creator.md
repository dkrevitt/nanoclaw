# /enrich-creator

Enrich a single creator with platform data.

## Usage

```
/enrich-creator <creator-id> [--tier <tier>]
```

## What it does

Calls `POST /creators/:id/enrich` to fetch additional data for a creator from platform APIs.

## Parameters

- `creatorId` (required): UUID of the creator to enrich

## Options

- `--tier preliminary|full`: Enrichment level (default: preliminary)
  - `preliminary` (Tier 2): Apify - follower counts, recent posts, engagement
  - `full` (Tier 3): influencers.club - cross-platform handles, demographics, email

## Example

```bash
/enrich-creator abc123-def456 --tier full

# Output:
# Enriching @johnsmith (YouTube)...
# Tier 3 enrichment complete:
#   - Followers: 47,234
#   - Email: john@example.com
#   - Twitter: @johnsmith_dev
#   - Instagram: @johnsmith.code
```

## API

```typescript
POST /creators/:id/enrich
{
  "tier": "full"  // or "preliminary"
}
```

# /enrich-creator

Enrich a single creator with platform data.

## Usage

```
/enrich-creator <creator-id> [--tier <tier>] [--include-email]
```

## What it does

Calls `POST /creators/:id/enrich` to fetch additional data for a creator from platform APIs.

## Parameters

- `creatorId` (required): UUID of the creator to enrich

## Options

- `--tier 2|3`: Enrichment level (default: 2)
  - `2` (Tier 2): Follower counts, recent posts, engagement
  - `3` (Tier 3): Cross-platform handles, full profile data
- `--include-email`: Also run email enrichment waterfall

**Note:** Provider is configurable via env vars (default: Apify for both tiers). influencers.club available as fallback.

## Example

```bash
/enrich-creator abc123-def456 --tier 3

# Output:
# Enriching @johnsmith (YouTube)...
# Tier 3 enrichment complete:
#   - Followers: 47,234
#   - Email: john@example.com
#   - Twitter: @johnsmith_dev
#   - Instagram: @johnsmith.code
```

## API

**Request body (all fields optional):**
```json
{
  "tier": 2,           // 2 or 3 (default: 2)
  "includeEmail": false,  // Run email enrichment after profile (default: false)
  "force": false          // Skip staleness check (default: false)
}
```

```bash
# Tier 2 (default)
curl -s -X POST "$TSG_API_URL/creators/<creator-id>/enrich" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json"

# Tier 3
curl -s -X POST "$TSG_API_URL/creators/<creator-id>/enrich" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tier": 3}'

# Tier 3 + email enrichment, force refresh
curl -s -X POST "$TSG_API_URL/creators/<creator-id>/enrich" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tier": 3, "includeEmail": true, "force": true}'
```

**Legacy query params (still supported):**
- `?tier=full|preliminary` - Maps to tier 3|2
- `?force=true` - Skip staleness check

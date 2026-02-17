# /enrich-marketer-email

Find a marketer's email via Apollo enrichment.

## Usage

```
/enrich-marketer-email --marketer-id <id>
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--marketer-id` | Yes | UUID of the marketer |

## Prerequisites

- Marketer must have an associated company with a domain
- Company domain is used for Apollo lookup

## What it does

1. Gets marketer name and company domain from database
2. Calls Apollo `/people/match` endpoint to find email
3. Updates marketer record with:
   - `email` - Found email address
   - `email_verified` - Whether Apollo verified the email
   - `email_verification_date` - When verified
4. Returns enrichment result

## API Call

```bash
curl -s -X POST "$TSG_API_URL/marketers/<marketer-id>/enrich-email" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'
```

## Response

Success:
```json
{
  "marketer": {
    "id": "uuid",
    "full_name": "Jane Smith",
    "email": "jane@acme.com",
    "email_verified": true,
    "email_verification_date": "2024-01-15T10:00:00Z"
  },
  "enriched": true,
  "emailStatus": "verified"
}
```

Failure:
```json
{
  "error": "Email not found",
  "enriched": false
}
```

## Example

```
/enrich-marketer-email --marketer-id abc123

Email enrichment result:
  Marketer: Jane Smith
  Company: Acme Corp (acme.com)
  Email: jane@acme.com
  Status: verified

Marketer updated with new email.
```

## Batch Enrichment

For multiple marketers:

```bash
curl -s -X POST "$TSG_API_URL/marketers/batch-enrich-emails" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "marketer_ids": ["id1", "id2", "id3"]
  }' | jq '.'
```

Response:
```json
{
  "enriched": 2,
  "failed": 1,
  "skipped": 0,
  "details": [
    { "id": "id1", "status": "enriched", "email": "jane@acme.com" },
    { "id": "id2", "status": "enriched", "email": "john@widgets.io" },
    { "id": "id3", "status": "not_found" }
  ]
}
```

## Cost

- Apollo email lookup: 1 credit per lookup
- Rate limited: 200ms between requests in batch

## Related

- Create marketer: `/create-marketer`
- Get marketer: `/get-marketer`
- List marketers: `/list-marketers`

# /get-marketer

Get full details for a marketer including company info and reviews.

## Usage

```
/get-marketer <marketer-id>
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `marketer-id` | Yes | UUID of the marketer |

## API Call

```bash
curl -s "$TSG_API_URL/marketers/<marketer-id>" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'
```

## Response

```json
{
  "marketer": {
    "id": "uuid",
    "full_name": "Jane Smith",
    "first_name": "Jane",
    "last_name": "Smith",
    "title": "VP of Marketing",
    "department": "marketing",
    "seniority": "vp",
    "email": "jane@acme.com",
    "email_verified": true,
    "email_verification_date": "2024-01-15T10:00:00Z",
    "phone": "+1-555-0123",
    "linkedin_url": "https://linkedin.com/in/janesmith",
    "linkedin_handle": "janesmith",
    "twitter_handle": "janesmith",
    "bio": "Marketing leader with 10+ years in B2B SaaS",
    "profile_picture_url": "https://...",
    "location": "San Francisco, CA",
    "country": "United States",
    "pipeline_status": "enriched",
    "contact_status": "not_contacted",
    "enrichment_provider": "apollo",
    "enriched_at": "2024-01-15T10:00:00Z",
    "company": {
      "id": "uuid",
      "name": "Acme Corp",
      "domain": "acme.com",
      "industry": "Technology",
      "employee_count_range": "51-200",
      "website": "https://acme.com",
      "linkedin_url": "https://linkedin.com/company/acme"
    },
    "marketer_reviews": [
      {
        "id": "uuid",
        "action": "approved",
        "review_feedback": "Great fit for our creator program",
        "reviewed_by": "user-uuid",
        "reviewer_type": "user",
        "created_at": "2024-01-15T12:00:00Z",
        "project": {
          "id": "uuid",
          "name": "Q1 Sponsor Outreach"
        }
      }
    ]
  }
}
```

## Example

```
/get-marketer abc123

Marketer: Jane Smith
Title: VP of Marketing @ Acme Corp
Email: jane@acme.com (verified)
Phone: +1-555-0123
LinkedIn: linkedin.com/in/janesmith
Location: San Francisco, CA
Status: enriched

Company: Acme Corp
Domain: acme.com | Industry: Technology | Employees: 51-200

Reviews:
- Q1 Sponsor Outreach: approved
  "Great fit for our creator program"
```

## Related

- List marketers: `/list-marketers`
- Create marketer: `/create-marketer`
- Enrich email: `/enrich-marketer-email`

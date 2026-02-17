# /get-company

Get full details for a company including marketers and sponsored content.

## Usage

```
/get-company <company-id>
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `company-id` | Yes | UUID of the company |

## API Call

```bash
curl -s "$TSG_API_URL/companies/<company-id>" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'
```

## Response

```json
{
  "company": {
    "id": "uuid",
    "name": "Acme Corp",
    "domain": "acme.com",
    "website": "https://acme.com",
    "logo_url": "https://...",
    "description": "Leading provider of...",
    "industry": "Technology",
    "employee_count_range": "51-200",
    "founded_year": 2015,
    "headquarters_location": "San Francisco, CA, United States",
    "country": "United States",
    "funding_total": 50000000,
    "funding_stage": "Series B",
    "linkedin_url": "https://linkedin.com/company/acme",
    "twitter_handle": "acme",
    "marketing_stack": ["HubSpot", "Segment", "Mixpanel"],
    "pipeline_status": "enriched",
    "enrichment_provider": "apollo",
    "enriched_at": "2024-01-15T10:00:00Z",
    "marketers": [
      {
        "id": "uuid",
        "full_name": "Jane Smith",
        "title": "VP of Marketing",
        "email": "jane@acme.com",
        "seniority": "vp",
        "linkedin_url": "https://linkedin.com/in/janesmith"
      }
    ],
    "sponsored_content": [
      {
        "post_url": "https://youtube.com/watch?v=...",
        "platform": "youtube",
        "post_date": "2024-01-10",
        "post_title": "Best Productivity Tools 2024",
        "creator_id": "uuid",
        "creator_handle": "@techreviewer",
        "creator_name": "Tech Reviewer",
        "deal_type": "sponsored_video",
        "confidence_score": 0.95,
        "publication_note": "500K subs, covers productivity tools weekly",
        "discovered_at": "2024-02-16T10:00:00Z"
      }
    ]
  }
}
```

## Get Sponsored Content Summary

For a detailed breakdown of sponsored content with unique creators:

```bash
curl -s "$TSG_API_URL/companies/<company-id>/sponsorships" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'
```

**Response:**
```json
{
  "sponsored_content": [...],
  "summary": {
    "total_count": 5,
    "platforms": [
      { "platform": "youtube", "count": 3 },
      { "platform": "tiktok", "count": 2 }
    ],
    "unique_creators": [
      {
        "creator_id": "uuid",
        "creator_handle": "@techreviewer",
        "creator_name": "Tech Reviewer",
        "sponsorship_count": 2
      }
    ]
  }
}
```

## Example

```
/get-company abc123

Company: Acme Corp
Domain: acme.com
Industry: Technology | Employees: 51-200 | Founded: 2015
Funding: $50M (Series B)
Status: enriched

Marketers (3):
1. Jane Smith - VP of Marketing (jane@acme.com)
2. John Doe - Director of Growth (john@acme.com)
3. Alice Brown - Influencer Marketing Manager (alice@acme.com)

Sponsored Content (5 posts, 3 creators):
- Tech Reviewer (YouTube) - 2 posts
- Gadget Guy (TikTok) - 2 posts
- Product Showcase (Instagram) - 1 post
```

## Related

- List companies: `/list-companies`
- Find marketers: `POST /companies/:id/find-marketers`
- Enrich company: `POST /companies/:id/enrich`
- Sponsorships summary: `GET /companies/:id/sponsorships`

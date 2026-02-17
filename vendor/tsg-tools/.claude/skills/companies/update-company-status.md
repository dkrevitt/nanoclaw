# /update-company-status

Update the contact status for a company within a specific project.

## Usage

```
/update-company-status --company-id <id> --project-id <id> --status contacted
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--company-id` | Yes | UUID of the company |
| `--project-id` | Yes | UUID of the project |
| `--status` | Yes | New contact status |

## Valid Statuses

| Status | Description |
|--------|-------------|
| `not_contacted` | Ready for outreach |
| `drafted` | Email draft created |
| `contacted` | Initial outreach sent |
| `in_progress` | Active conversation |
| `closed_won` | Deal closed successfully |
| `closed_lost` | Deal fell through |

## API Call

```bash
curl -s -X PUT "$TSG_API_URL/companies/<company-id>/project-status/<project-id>" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "contactStatus": "contacted"
  }' | jq '.'
```

## Response

```json
{
  "projectStatus": {
    "id": "uuid",
    "company_id": "uuid",
    "project_id": "uuid",
    "contact_status": "contacted",
    "updated_at": "2024-01-15T12:00:00Z",
    "updated_by": "user-uuid"
  }
}
```

## Example

```
/update-company-status --company-id abc123 --project-id def456 --status contacted

Updated company status:
  Company: Acme Corp
  Project: Q1 Sponsor Outreach
  Status: not_contacted → contacted
```

## Get Current Status

```bash
curl -s "$TSG_API_URL/companies/<company-id>/project-status/<project-id>" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'
```

## Get All Project Statuses for a Company

```bash
curl -s "$TSG_API_URL/companies/<company-id>/project-statuses" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'
```

## Related

- List companies: `/list-companies`
- Get company: `/get-company`
- Link to project: `/link-company-to-project`

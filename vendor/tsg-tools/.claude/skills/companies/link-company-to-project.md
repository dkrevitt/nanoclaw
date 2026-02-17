# /link-company-to-project

Link an existing company to a project for tracking.

## Usage

```
/link-company-to-project --company-id <id> --project-id <id>
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--company-id` | Yes | UUID of the company |
| `--project-id` | Yes | UUID of the project |

## What it does

1. Creates an entry in `company_project_status` junction table
2. Sets initial `contact_status` to `not_contacted`
3. Tracks discovery context (how the company was added)

## API Call

```bash
curl -s -X POST "$TSG_API_URL/projects/<project-id>/companies" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "companyId": "<company-id>"
  }' | jq '.'
```

## Response

```json
{
  "projectStatus": {
    "id": "uuid",
    "company_id": "uuid",
    "project_id": "uuid",
    "contact_status": "not_contacted",
    "discovered_via": "manual",
    "added_at": "2024-01-15T10:00:00Z"
  }
}
```

## Example

```
/link-company-to-project --company-id abc123 --project-id def456

Linked company to project:
  Company: Acme Corp (acme.com)
  Project: Q1 Sponsor Outreach
  Status: not_contacted

Next steps:
  1. View marketers: /get-company abc123
  2. Update status: /update-company-status --company-id abc123 --project-id def456 --status drafted
```

## Use Cases

- **Cross-project discovery**: Company found in Project A is relevant to Project B
- **Ad-hoc research**: Found a sponsor on LinkedIn, created company, now linking to project
- **Bulk import**: Link multiple companies from external research

## Related

- Create company: `/create-company`
- Update status: `/update-company-status`
- List project companies: `GET /projects/:id/companies`

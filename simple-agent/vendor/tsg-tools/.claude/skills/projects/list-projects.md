# /list-projects

List all projects.

## Usage

```
/list-projects
```

## What it does

Calls `GET /projects` to list all projects with their basic info.

## Example

```bash
/list-projects

# Output:
# Projects:
#
#   1. Kilo Code (proj-abc123)
#      Topics: 3
#      Creators: 127
#      Gmail: david@company.com
#      Sheets: Configured
#
#   2. Another Product (proj-def456)
#      Topics: 2
#      Creators: 45
#      Gmail: Not connected
#      Sheets: Not configured
```

## API

```typescript
GET /projects

Response:
{
  "projects": [
    {
      "id": "proj-abc123",
      "name": "Kilo Code",
      "description": "...",
      "gmail_account_id": "uuid",
      "sheets_spreadsheet_id": "...",
      "sheets_tab_name": "Creators",
      "pitch_angles": {...},
      "review_criteria": {...}
    }
  ]
}
```

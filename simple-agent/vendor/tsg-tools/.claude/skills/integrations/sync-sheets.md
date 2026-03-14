# /sync-sheets

Sync approved creators to Google Sheets.

## Usage

```
/sync-sheets --project-id <id>
```

## What it does

Calls `POST /sheets/sync` to sync all approved creators for a project to the configured Google Spreadsheet.

## Prerequisites

Project must have:
1. Gmail account connected (`gmail_account_id`)
2. Spreadsheet ID configured (`sheets_spreadsheet_id`)
3. Tab name configured (`sheets_tab_name`, defaults to "Creators")

Configure these via Chrome extension → Project Settings.

## Parameters

- `--project-id` (required): UUID of the project

## Example

```bash
/sync-sheets --project-id proj-123

# Output:
# Syncing creators to Google Sheets...
#
# Project: Kilo Code
# Spreadsheet: Creator Outreach Tracker
# Tab: Creators
#
# Sync complete:
#   Rows synced: 47
#   Synced at: 2024-01-11T12:00:00Z
#
# View: https://docs.google.com/spreadsheets/d/abc123/edit#gid=0
```

## API

```typescript
POST /sheets/sync
{
  "projectId": "uuid"
}

Response:
{
  "success": true,
  "rowCount": 47,
  "syncedAt": "2024-01-11T12:00:00Z",
  "spreadsheetUrl": "https://docs.google.com/spreadsheets/d/..."
}
```

## Errors

- `no_gmail_account`: No Google account connected
- `no_sheets_config`: Spreadsheet ID not configured
- `sheets_scope_missing`: Re-authorize with Sheets scope

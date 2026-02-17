# Integration Skills

Google Sheets and Gmail account management.

## Available Skills

| Skill | Description |
|-------|-------------|
| [/sync-sheets](integrations/sync-sheets.md) | Sync creators to Google Sheets |
| [/gmail-accounts](integrations/gmail-accounts.md) | List connected Gmail accounts |

## Quick Reference

### Sync to Sheets
```bash
/sync-sheets --project-id <id>
```
Exports approved creators to configured Google Spreadsheet.

### List Gmail accounts
```bash
/gmail-accounts
```
Shows connected Gmail accounts with last-used dates.

## Setup Requirements

### Gmail
1. Open Chrome extension
2. Go to Project Settings
3. Click "Connect Gmail Account"
4. Complete OAuth flow

### Google Sheets
1. Connect Gmail account first (grants Sheets scope)
2. Create or open target spreadsheet
3. Copy spreadsheet ID from URL
4. Configure in Project Settings:
   - `sheets_spreadsheet_id`: The spreadsheet ID
   - `sheets_tab_name`: Tab name (default: "Creators")

## Sheets Sync Output

The sync exports approved creators with columns:
- Creator name and handles
- Platform and follower counts
- Email addresses
- Profile URLs
- Review status and feedback
- Contact status

## Typical Use Cases

- **Export for outreach tracking**: Sync approved creators to shared sheet
- **Account audit**: Check which Gmail accounts are connected
- **Re-sync after approvals**: Run sync to update spreadsheet with new creators

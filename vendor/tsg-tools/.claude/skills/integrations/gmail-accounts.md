# /gmail-accounts

List connected Gmail accounts.

## Usage

```
/gmail-accounts
```

## What it does

Calls `GET /gmail/accounts` to list all Gmail accounts that have been connected via OAuth for sending emails.

## Example

```bash
/gmail-accounts

# Output:
# Connected Gmail accounts:
#
#   1. david@company.com
#      Display name: David K
#      Connected: 2024-01-05
#      Last used: 2024-01-11
#
#   2. outreach@company.com
#      Display name: Company Outreach
#      Connected: 2024-01-08
#      Last used: 2024-01-10
```

## API

```typescript
GET /gmail/accounts

Response:
{
  "accounts": [
    {
      "id": "uuid",
      "email": "david@company.com",
      "display_name": "David K",
      "profile_picture": "https://...",
      "created_at": "2024-01-05T...",
      "last_used_at": "2024-01-11T..."
    }
  ]
}
```

## Related

- Connect new account: Chrome extension → Project Settings → Connect Gmail Account
- Delete account: `DELETE /gmail/accounts/:id`

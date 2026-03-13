# Authentication & API Key Skills

Manage API keys for authenticating with the TSG backend API.

## Available Skills

| Skill | Description |
|-------|-------------|
| [/create-api-key](#create-api-key) | Create a new API key |
| [/list-api-keys](#list-api-keys) | List all API keys with status |
| [/revoke-api-key](#revoke-api-key) | Revoke an API key |
| [/regenerate-api-key](#regenerate-api-key) | Regenerate an API key |
| [/verify-auth](#verify-auth) | Test that authentication is working |

## Quick Reference

### Verify authentication works
```bash
# Check health (no auth required)
curl -s "$TSG_API_URL/health"

# Check auth (requires valid API key)
curl -s "$TSG_API_URL/projects" -H "X-API-Key: $TSG_API_KEY"
```

### Create a new API key
```bash
curl -s -X POST "$TSG_API_URL/api-keys" \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "claude-agent"}'
```

---

## Skill Details

### /create-api-key

Create a new API key for authenticating with the backend.

**Endpoint:** `POST /api-keys`

**Important:** Requires an existing authenticated session (Bearer token from Chrome extension login). You cannot create an API key using another API key.

```bash
curl -s -X POST "$TSG_API_URL/api-keys" \
  -H "Authorization: Bearer <your-supabase-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "claude-agent",
    "description": "API key for Claude agent workflows"
  }'
```

**Optional: Scope to specific projects:**
```bash
curl -s -X POST "$TSG_API_URL/api-keys" \
  -H "Authorization: Bearer <your-supabase-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "project-specific",
    "project_ids": ["project-uuid-1", "project-uuid-2"]
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "name": "claude-agent",
  "key": "tsg_sk_a1b2c3d4e5f6...",
  "key_prefix": "tsg_sk_a1b2",
  "message": "Store this key securely - it cannot be retrieved again."
}
```

**The `key` field is only returned at creation time.** Save it immediately to your `.env` file as `TSG_API_KEY`.

---

### /list-api-keys

List all API keys with their status.

**Endpoint:** `GET /api-keys`

```bash
curl -s "$TSG_API_URL/api-keys" \
  -H "X-API-Key: $TSG_API_KEY"
```

**Response:**
```json
{
  "api_keys": [
    {
      "id": "uuid",
      "name": "claude-agent",
      "key_prefix": "tsg_sk_a1b2",
      "status": "active",
      "last_used_at": "2024-01-15T12:00:00Z",
      "created_at": "2024-01-01T00:00:00Z",
      "revoked_at": null
    }
  ]
}
```

---

### /revoke-api-key

Revoke an API key (soft delete — the key stops working but the record remains).

**Endpoint:** `DELETE /api-keys/:id`

```bash
curl -s -X DELETE "$TSG_API_URL/api-keys/<key-id>" \
  -H "X-API-Key: $TSG_API_KEY"
```

**Response:**
```json
{
  "message": "API key \"claude-agent\" has been revoked",
  "id": "uuid"
}
```

---

### /regenerate-api-key

Regenerate an API key. The old key immediately stops working and a new one is returned.

**Endpoint:** `POST /api-keys/:id/regenerate`

```bash
curl -s -X POST "$TSG_API_URL/api-keys/<key-id>/regenerate" \
  -H "X-API-Key: $TSG_API_KEY"
```

**Response:**
```json
{
  "id": "uuid",
  "name": "claude-agent",
  "key": "tsg_sk_new_key_here...",
  "key_prefix": "tsg_sk_newk",
  "message": "Key regenerated. Store this key securely - it cannot be retrieved again."
}
```

**Update your `.env` file immediately** with the new key value.

---

### /verify-auth

Test that authentication is configured and working.

**Step 1: Check backend is reachable**
```bash
curl -s "$TSG_API_URL/health"
# Expected: {"status":"ok"}
```

**Step 2: Check API key works**
```bash
curl -s "$TSG_API_URL/projects" -H "X-API-Key: $TSG_API_KEY"
# Expected: JSON array of projects
# If 401: API key is invalid or revoked
```

**Step 3: If auth fails, check key status**
```bash
# List keys to see which are active
curl -s "$TSG_API_URL/api-keys" -H "X-API-Key: $TSG_API_KEY"

# Or check environment variables
echo "URL: $TSG_API_URL"
echo "Key prefix: ${TSG_API_KEY:0:12}"
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `{"error":"Unauthorized"}` | Invalid or missing API key | Check `$TSG_API_KEY` is set and starts with `tsg_sk_` |
| `{"error":"Invalid API key"}` | Key not found in database | Key may have been deleted. Create a new one |
| `{"error":"API key has been revoked"}` | Key was revoked | Regenerate or create a new key |
| Connection refused | Backend not running | Start with `cd tsg-extension-backend && npm run dev` |
| Empty response | Wrong URL | Check `$TSG_API_URL` has no trailing slash |

## Authentication Methods

| Method | Header | Used By |
|--------|--------|---------|
| API Key | `X-API-Key: tsg_sk_...` | Claude agents, service-to-service |
| Bearer Token | `Authorization: Bearer <jwt>` | Chrome extension users |
| Dev Mode | None (set `DISABLE_AUTH=true`) | Local development only |

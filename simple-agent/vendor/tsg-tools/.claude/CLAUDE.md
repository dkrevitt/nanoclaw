# TSG Backend API (Storage Only)

Backend storage for creator discovery. All workflow logic (search, enrichment, AI review) lives in NanoClaw.

## What This System Stores

- **Projects** - Client/publication configurations
- **Topics** - Discovery topics within projects
- **Creators** - Discovered creator profiles and review status

## API Usage

```bash
cd /workspace/tsg-tools && npx tsx src/utils/api.ts <command>
```

### Commands

| Command | Description |
|---------|-------------|
| `projects` | List all projects |
| `project <id>` | Get project details |
| `topics <projectId>` | List topics for a project |
| `topic <id>` | Get topic details |
| `creators [options]` | List creators |
| `creator <id>` | Get single creator |
| `create-creator` | Create a new creator |
| `link-creator` | Link creator to project |
| `review <creatorId>` | Submit a review |

### Examples

```bash
# List projects
npx tsx src/utils/api.ts projects

# Get creators for a project
npx tsx src/utils/api.ts creators --project-id <uuid>

# Submit review
npx tsx src/utils/api.ts review <creatorId> \
  --project-id <uuid> \
  --topic-id <uuid> \
  --action approved \
  --feedback "Strong technical content, 50k followers"
```

## Authentication

API key authentication via `X-API-Key` header. The key is passed via environment:

```bash
export TSG_API_KEY="tsg_sk_..."
export TSG_API_URL="https://tsg-extension-backend-pink.vercel.app"
```

## Skills

| Skill | Purpose |
|-------|---------|
| [projects.md](skills/projects.md) | Project/topic CRUD |
| [creators.md](skills/creators.md) | Creator CRUD, reviews |
| [outreach.md](skills/outreach.md) | Email campaigns |

## Note

Discovery, enrichment, and AI review are handled by NanoClaw via the Apify MCP server. This backend is storage-only.

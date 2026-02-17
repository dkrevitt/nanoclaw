# Workflow & Pipeline Skills

Start, monitor, and manage automated workflows and multi-step pipelines.

## Available Skills

| Skill | Description |
|-------|-------------|
| [/start-workflow](#start-workflow) | Start a single-step workflow |
| [/start-pipeline](#start-pipeline) | Start combined discovery+review pipeline |
| [/workflow-status](#workflow-status) | Check workflow execution progress |
| [/pipeline-status](#pipeline-status) | Check pipeline progress across all steps |
| [/workflow-logs](#workflow-logs) | Get detailed step-by-step execution logs |
| [/workflow-records](#workflow-records) | Get records created by a workflow |
| [/cancel-workflow](#cancel-workflow) | Cancel a running workflow |
| [/list-workflows](#list-workflows) | List workflow executions for a project |
| [/list-pipelines](#list-pipelines) | List pipelines for a project |

## Workflow Types

| Type | Description | Triggers |
|------|-------------|----------|
| `search_term_gen` | AI-generated search queries | Creates `topic_saved_searches` records |
| `discovery` | Execute saved searches via Apify | Creates/updates `creators` records |
| `review` | AI-powered creator review | Updates `creator_project_statuses` |

## Pipeline Steps

Pipelines orchestrate multiple workflows in sequence:

```
search_terms → discovery → review → campaign
```

Each step creates an execution that can be monitored independently.

---

## Quick Reference

### Start a discovery workflow
```bash
# Single workflow
curl -X POST "$TSG_API_URL/workflows/start" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agentType": "discovery",
    "projectId": "<uuid>",
    "topicId": "<uuid>"
  }'
```

### Start combined pipeline (discovery + review)
```bash
curl -X POST "$TSG_API_URL/workflows/start-combined" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "<uuid>",
    "topicId": "<uuid>",
    "savedSearchIds": ["<search-id-1>", "<search-id-2>"],
    "config": {
      "autoReview": true
    }
  }'
```

### Monitor execution progress
```bash
# Lightweight polling endpoint
curl "$TSG_API_URL/workflows/<execution-id>/status" \
  -H "X-API-Key: $TSG_API_KEY"
```

### Get active workflows for a project
```bash
curl "$TSG_API_URL/workflows/active?project_id=<uuid>" \
  -H "X-API-Key: $TSG_API_KEY"
```

---

## Skill Details

### /start-workflow

Start a single-step workflow execution.

**Endpoint:** `POST /workflows/start`

**Request:**
```json
{
  "agentType": "discovery",      // Required: search_term_gen | discovery | review
  "projectId": "<uuid>",         // Required
  "topicId": "<uuid>",           // Optional for project-level workflows
  "savedSearchId": "<uuid>",     // Optional: specific search to execute
  "config": {                    // Optional: workflow-specific config
    "limit": 50
  }
}
```

**Response:**
```json
{
  "executionId": "<uuid>",
  "status": "running"
}
```

---

### /start-pipeline

Start a combined discovery + review pipeline. This is the main entry point for automated workflows.

**Endpoint:** `POST /workflows/start-combined`

**Request:**
```json
{
  "projectId": "<uuid>",         // Required
  "topicId": "<uuid>",           // Required
  "savedSearchIds": ["<uuid>"],  // Optional: specific searches to run
  "config": {
    "autoReview": true,          // Default: true - auto-chain to review
    "skipDiscovery": false       // Optional: review-only mode
  }
}
```

**Response:**
```json
{
  "pipelineId": "<uuid>",
  "executionId": "<uuid>",       // Initial discovery execution
  "status": "running"
}
```

**Review-only mode:** Set `skipDiscovery: true` to run review on existing creators without discovery. Requires `savedSearchIds` to scope which creators to review.

---

### /workflow-status

Check the progress of a running workflow.

**Endpoint:** `GET /workflows/:id/status`

**Response:**
```json
{
  "status": "running",           // running | completed | failed | cancelled
  "progress": {
    "total": 50,
    "processed": 23,
    "successful": 20,
    "failed": 2,
    "skipped": 1
  },
  "currentItem": "YouTube: AI coding tutorials",
  "intermediateResults": { ... },
  "resultSummary": null,         // Populated on completion
  "errorCode": null,
  "errorMessage": null
}
```

---

### /pipeline-status

Check the progress of a pipeline across all steps.

**Endpoint:** `GET /pipelines/:id/status`

**Response:**
```json
{
  "id": "<uuid>",
  "status": "in_progress",
  "currentStep": "discovery",
  "steps": {
    "search_terms": {
      "status": "completed",
      "progress": { "processed": 15, "total": 15 }
    },
    "discovery": {
      "status": "running",
      "progress": { "processed": 5, "total": 10 },
      "currentItem": "Searching TikTok..."
    },
    "review": {
      "status": "pending",
      "progress": null
    },
    "campaign": {
      "status": "pending",
      "campaignId": null
    }
  }
}
```

---

### /workflow-logs

Get detailed step-by-step execution logs.

**Endpoint:** `GET /workflows/:id/logs`

**Query Parameters:**
- `step_type` - Filter by step type
- `status` - Filter by status (success, error, skipped)
- `limit` - Max logs to return (default: 100)
- `offset` - Pagination offset

**Response:**
```json
{
  "logs": [
    {
      "stepType": "search",
      "status": "success",
      "message": "Found 23 creators",
      "data": { ... },
      "timestamp": "2024-01-10T12:00:00Z"
    }
  ],
  "total": 45,
  "hasMore": false,
  "displaySummary": "Completed 45 steps with 3 errors"
}
```

---

### /workflow-records

Get records created by a workflow (creators, reviews, searches).

**Endpoint:** `GET /workflows/:id/records`

**Response (discovery workflow):**
```json
{
  "executionId": "<uuid>",
  "agentType": "discovery",
  "status": "completed",
  "type": "discovery",
  "creators": [ ... ],
  "totalCount": 50,
  "newCount": 35
}
```

**Response (review workflow):**
```json
{
  "executionId": "<uuid>",
  "agentType": "review",
  "type": "review",
  "reviews": [ ... ],
  "totalCount": 50,
  "approved": 12,
  "skipped": 38,
  "approvalRate": 24
}
```

---

### /cancel-workflow

Cancel a running workflow.

**Endpoint:** `POST /workflows/:id/cancel`

**Response:**
```json
{
  "success": true
}
```

---

### /list-workflows

List workflow executions for a project.

**Endpoint:** `GET /workflows`

**Query Parameters:**
- `project_id` (required)
- `agent_type` - Filter by type
- `status` - Filter by status
- `limit` / `offset` - Pagination

---

### /list-pipelines

List pipelines for a project.

**Endpoint:** `GET /pipelines`

**Query Parameters:**
- `project_id` (required)
- `topic_id` - Filter by topic
- `status` - Filter by status
- `limit` / `offset` - Pagination

---

## Typical Workflows

### Full Discovery Pipeline

1. **Start pipeline** with `/run-pipeline` command or `POST /workflows/start-combined`
2. **Monitor progress** via `GET /pipelines/:id/status`
3. **Review results** in Chrome extension or via `GET /workflows/:id/records`

### Review-Only Mode

Run AI review on existing creators (no new discovery):

```bash
curl -X POST "$TSG_API_URL/workflows/start-combined" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "<uuid>",
    "topicId": "<uuid>",
    "savedSearchIds": ["<uuid>"],
    "config": {
      "skipDiscovery": true
    }
  }'
```

### Standalone AI Review

Run review without creating a pipeline:

```bash
curl -X POST "$TSG_API_URL/workflows/review" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "<uuid>",
    "topicId": "<uuid>",
    "creatorIds": ["<uuid>", "<uuid>"]
  }'
```

---

## Status Values

### Workflow Statuses
| Status | Meaning |
|--------|---------|
| `running` | Currently executing |
| `completed` | Finished successfully |
| `failed` | Execution error |
| `cancelled` | User cancelled |

### Pipeline Statuses
| Status | Meaning |
|--------|---------|
| `in_progress` | Pipeline is running |
| `completed` | All steps finished |
| `failed` | A step failed |
| `cancelled` | User cancelled |

---

## Related Commands

- `/run-pipeline` - Full pipeline orchestration command
- `/discover-creators` - Legacy discovery command
- `/check-projects` - View project status

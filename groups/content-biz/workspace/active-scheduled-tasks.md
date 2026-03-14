# Active Scheduled Tasks

Last updated: 2026-03-14 01:55 UTC

## Content-Biz Group Tasks

### 1. YouTube + Twitter Discovery (3-Hour Heartbeat)
- **Task ID:** `1773453115062-dzssb9`
- **Schedule:** `0 */3 * * *` (every 3 hours at :00 minutes)
- **Next runs:** 3:00, 6:00, 9:00, 12:00, 15:00, 18:00, 21:00, 0:00
- **Platforms:** YouTube, Twitter
- **Strategy:** Use date filtering (`uploadedAfter`, `since`) to only process new content since last execution
- **Status:** ✅ Active

### 2. TikTok + Instagram Discovery (Daily Heartbeat)
- **Task ID:** `1773453120583-707nms`
- **Schedule:** `0 9 * * *` (daily at 9:00 AM)
- **Platforms:** TikTok, Instagram
- **Strategy:** Broader searches with aggressive post-filtering (no API date filtering available)
- **Status:** ✅ Active

## Old Task Status

### Kilo Code Discovery Loop (DEPRECATED)
- **Task ID:** `task-1773421955289-4czqxt`
- **Description:** "Run the discovery loop for Kilo Code / OpenClaw me..."
- **Status:** Cancellation requested, may be in different group context
- **Note:** This task has been superseded by the new platform-specific heartbeats above

## Execution Strategy

**High-frequency (3 hours):**
- YouTube: uploadedAfter filtering
- Twitter: since + minLikes filtering
- Smaller result sets, lower per-run costs
- Tracks timestamps in `last-execution.json`

**Low-frequency (daily):**
- TikTok: Post-filter only
- Instagram: Post-filter only
- Less frequent to compensate for lack of date filtering
- Aggressive filtering by follower count and engagement

## Monitoring

To verify tasks are running:
1. Check for new results in `workspace/projects/{project}/results/`
2. Check for updated timestamps in `workspace/projects/{project}/last-execution.json`
3. Check for new insights in `workspace/learning-log.md`
4. Messages will only be sent if there are approved creators or errors

## Cost Management

Each heartbeat run checks `apify_get_usage` before executing searches to stay within budget.

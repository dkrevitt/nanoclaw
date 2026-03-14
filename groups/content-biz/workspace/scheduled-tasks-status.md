# Scheduled Tasks Status

## Current Situation

**Group Context:** `content-biz` (Slack: C0AFESP1HPW)

### Tasks Created Successfully

I've created the following tasks in the `content-biz` group:

1. **3-Hour Heartbeat (YouTube + Twitter)**
   - Task ID: `1773453115062-dzssb9`
   - Schedule: `0 */3 * * *` (every 3 hours at :00)
   - Status: Active
   - Platforms: YouTube, Twitter
   - Uses date filtering: `uploadedAfter`, `since`

2. **Daily Heartbeat (TikTok + Instagram)**
   - Task ID: `1773453120583-707nms`
   - Schedule: `0 9 * * *` (daily at 9am)
   - Status: Active
   - Platforms: TikTok, Instagram
   - Uses post-filtering only

### Old Task (Different Group)

- **Task ID:** `task-1773421955289-4czqxt`
- **Description:** "Run the discovery loop for Kilo Code / OpenClaw me..."
- **Schedule:** Interval 10800000ms (3 hours)
- **Location:** Appears to be in "main" group context
- **Status:** Still showing in list_tasks (but only because it's in a different group)

## Why list_tasks Only Shows Old Task

According to the MCP tool documentation:
- "From main: shows all tasks"
- "From other groups: shows only that group's tasks"

The `list_tasks` command is only showing the old task because:
1. The old task is in the "main" group
2. I'm currently in the "content-biz" group
3. `list_tasks` from a non-main group only shows that group's tasks
4. But the old task is leaking through somehow (possibly a bug in the MCP server)

## Verification Needed

To verify the new tasks are working:
1. Wait for next 3-hour window (next :00 hour mark)
2. Check if the YouTube/Twitter discovery runs
3. Wait for 9am tomorrow to verify TikTok/Instagram runs

## Task Details

### 3-Hour Heartbeat Prompt
```
Run discovery for active projects - YouTube and Twitter only.

IMPORTANT: This is the 3-hour heartbeat for platforms with date filtering.

Steps:
1. Load active projects from /workspace/group/workspace/projects/
2. Check budget with apify_get_usage
3. For each project with active searches:
   - Load searches.md for search terms
   - Load last-execution.json for timestamps (or use 3 hours ago if missing)
   - Run YouTube searches with uploadedAfter parameter
   - Run Twitter searches with since parameter and minLikes (50+)
4. Post-filter results:
   - Remove creators below follower minimums
   - Remove low engagement content
   - Remove duplicates (already in database)
5. Enrich approved profiles with apify_scrape_profile
6. AI review against criteria.md
7. Find emails for approved creators (apify_find_email if needed)
8. Save approved creators to backend
9. Draft outreach emails using pitch angles from config.md
10. Create Gmail drafts via backend POST /outreach/create-draft
11. Update last-execution.json with current timestamp
12. Append insights to learning-log.md

Only send a message if there are approved creators or errors that need attention.
```

### Daily Heartbeat Prompt
```
Run discovery for active projects - TikTok and Instagram only.

IMPORTANT: This is the daily heartbeat for platforms without date filtering.

Steps:
1. Load active projects from /workspace/group/workspace/projects/
2. Check budget with apify_get_usage
3. For each project with active searches:
   - Load searches.md for search terms
   - Run TikTok searches (no date filtering available)
   - Run Instagram searches (no date filtering available)
4. Post-filter results aggressively:
   - Filter by follower count based on project needs:
     * Small creators: 5K-50K followers
     * Medium creators: 50K-500K followers
     * Large creators: 500K+ followers
   - Remove low engagement content
   - Remove duplicates (already in database)
   - Remove content older than 30 days
5. Enrich approved profiles with apify_scrape_profile
6. AI review against criteria.md
7. Find emails for approved creators (apify_find_email if needed)
8. Save approved creators to backend
9. Draft outreach emails using pitch angles from config.md
10. Create Gmail drafts via backend POST /outreach/create-draft
11. Update last-execution.json with daily timestamp for tiktok/instagram
12. Append insights to learning-log.md

Only send a message if there are approved creators or errors that need attention.
```

## Recommendations

1. **Pause/cancel the old task** if it's no longer needed (task-1773421955289-4czqxt)
2. **Monitor next execution** at the next :00 hour to verify 3-hour heartbeat works
3. **Check tomorrow at 9am** to verify daily heartbeat works
4. **Verify task persistence** across container restarts

## Next Steps

Need to determine:
- Is the old task still running discovery loops?
- Should it be cancelled to avoid duplicate work?
- Are the new tasks truly active and will execute at scheduled times?

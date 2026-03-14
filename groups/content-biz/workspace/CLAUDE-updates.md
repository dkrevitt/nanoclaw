# Suggested Updates for CLAUDE.md

## Section to Replace: "### Direct Apify Access"

Replace the existing table with this enhanced version:

```markdown
### Direct Apify Access

You have direct access to social media search via MCP tools:

| Tool | Purpose | Pre-Filtering | Execution Frequency |
|------|---------|---------------|---------------------|
| `apify_youtube_search` | Search YouTube videos/channels | ✅ `uploadedAfter` (ISO date) | Every 3 hours |
| `apify_twitter_search` | Search Twitter/X | ✅ `since` (ISO date), `minLikes` | Every 3 hours |
| `apify_tiktok_search` | Search TikTok videos/users | ❌ Post-filter only | Daily |
| `apify_instagram_search` | Search Instagram posts/profiles | ❌ Post-filter only | Daily |
| `apify_scrape_profile` | Enrich profile (extracts email from bio if present) | N/A | As needed |
| `apify_find_email` | Email waterfall (bio -> linktree -> youtube -> tiktok -> generic) | N/A | As needed |
| `apify_estimate_cost` | Estimate cost before running | N/A | Before large runs |
| `apify_get_usage` | Check today's usage/budget | N/A | Before searches |

**Search Execution Strategy:**

*High-frequency platforms (every 3 hours):*
- **YouTube** - Use `uploadedAfter` to search only content uploaded since last execution
- **Twitter** - Use `since` and `minLikes` to filter by date and engagement
- Track last execution timestamp per search term in `workspace/projects/{project}/last-execution.json`
- Pre-filtering at API level minimizes costs and redundant results

*Low-frequency platforms (daily):*
- **TikTok** - Run daily, post-filter by follower count/engagement (no API date filtering)
- **Instagram** - Run daily, post-filter by follower count/engagement (no API date filtering)
- Less frequent execution compensates for inability to filter by date

**Post-Filtering (all platforms):**
After retrieval, always filter results by:
1. Minimum follower/subscriber count (project-specific)
2. Minimum engagement (views/likes)
3. Content recency (remove stale content)
4. Duplicates (already in database or reviewed)
```

## Section to Update: "### Workflow Steps"

Update step 3 to mention platform-specific filtering:

```markdown
3. **Execute searches** with Apify MCP tools
   - YouTube/Twitter: Use date filtering (`uploadedAfter`/`since`) with timestamps from `last-execution.json`
   - TikTok/Instagram: Broader searches, filtered post-retrieval
   - Check current usage with `apify_get_usage` before running
```

Add new step after step 11:

```markdown
12. **Update execution timestamps** in `workspace/projects/{project}/last-execution.json` for YouTube/Twitter searches
```

## New Section to Add: "### Scheduled Discovery"

Add this section after "### Workflow Steps":

```markdown
### Scheduled Discovery

Discovery runs on automated schedules:

**3-Hour Heartbeat (YouTube + Twitter)**
- Runs every 3 hours at :00 minutes
- Searches YouTube and Twitter using date filters
- Only processes content uploaded/posted since last execution
- Smaller result sets = lower costs per run

**Daily Heartbeat (TikTok + Instagram)**
- Runs daily at 9am
- Searches TikTok and Instagram with post-filtering
- Adjusts follower thresholds based on project needs
- Less frequent to compensate for lack of date filtering

All scheduled runs:
1. Load active projects from workspace
2. Check budget with `apify_get_usage`
3. Execute platform-specific searches
4. Post-filter, enrich, review, save
5. Update `last-execution.json` timestamps
6. Append insights to `learning-log.md`
```

## Files Referenced

The strategy depends on these workspace files:
- `workspace/projects/{project}/last-execution.json` - Tracks search timestamps
- `workspace/discovery-strategy.md` - Full platform strategy documentation
- `workspace/learning-log.md` - Discovery insights over time
- `workspace/search-performance.json` - Search term performance tracking

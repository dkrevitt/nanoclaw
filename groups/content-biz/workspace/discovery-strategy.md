# Discovery Search Strategy

## Platform-Specific Execution Cadence

### High-Frequency Platforms (Every 3 Hours)

**YouTube** - Pre-filtering available
- Use `uploadedAfter` parameter to search only new content since last execution
- Track last execution timestamp per search term in `last-execution.json`
- Example: `uploadedAfter: "2026-03-14T01:00:00Z"`
- Cost efficient: only new videos = smaller result sets

**Twitter** - Pre-filtering available
- Use `since` parameter to search only tweets since last execution
- Use `minLikes` to filter low-engagement content
- Track last execution timestamp per search term in `last-execution.json`
- Example: `since: "2026-03-14T01:00:00Z", minLikes: 50`
- Cost efficient: only new tweets = smaller result sets

### Low-Frequency Platforms (Daily)

**TikTok** - No pre-filtering available
- Run once daily to minimize redundant searches
- Post-filter by follower count and engagement after retrieval
- Adjust thresholds based on current needs:
  - Small creators: 5K-50K followers
  - Medium creators: 50K-500K followers
  - Large creators: 500K+ followers

**Instagram** - No pre-filtering available
- Run once daily to minimize redundant searches
- Post-filter by follower count and engagement after retrieval
- Adjust thresholds based on current needs (same as TikTok)

## Post-Filtering Logic (All Platforms)

After retrieving results, filter by:
1. **Follower/subscriber minimums** - Remove creators below threshold
2. **Engagement minimums** - Remove low-view/low-like content
3. **Recency** - Remove stale content (varies by project)
4. **Duplicates** - Remove creators already in database or already reviewed

## Execution Tracking

Store last execution timestamp in `workspace/projects/{project}/last-execution.json`:

```json
{
  "youtube": {
    "cursor ide tutorial": "2026-03-14T01:27:00Z",
    "AI coding tools": "2026-03-14T04:30:00Z",
    "react tutorial": "2026-03-14T01:30:00Z"
  },
  "twitter": {
    "cursor ide": "2026-03-14T01:30:00Z",
    "#reactjs": "2026-03-14T04:30:00Z"
  },
  "tiktok": "2026-03-14T00:00:00Z",
  "instagram": "2026-03-14T00:00:00Z"
}
```

For YouTube/Twitter: track per search term (many timestamps)
For TikTok/Instagram: single daily timestamp

## Scheduled Task Configuration

### 3-Hour Heartbeat (YouTube + Twitter)
```bash
Schedule: cron "0 */3 * * *"  # Every 3 hours at :00
Context: group
Prompt: "Run discovery for active projects - YouTube and Twitter only. Use uploadedAfter/since parameters with timestamps from last-execution.json. Post-filter results, enrich approved creators, find emails, draft outreach."
```

### Daily Heartbeat (TikTok + Instagram)
```bash
Schedule: cron "0 9 * * *"  # Daily at 9am
Context: group
Prompt: "Run discovery for active projects - TikTok and Instagram only. Post-filter by follower count based on project needs. Enrich approved creators, find emails, draft outreach."
```

## Cost Optimization Benefits

1. **Pre-filtering (YouTube/Twitter)**
   - Only search new content since last run
   - Smaller result sets = fewer enrichments
   - 3-hour cycles keep result sets small

2. **Reduced frequency (TikTok/Instagram)**
   - Daily instead of every 3 hours = 8x fewer searches
   - No date filtering means more redundancy, so less frequent = more cost efficient

3. **Post-filtering (all platforms)**
   - Remove bad candidates before expensive enrichment
   - Duplicate removal prevents re-enriching known creators

## Implementation Notes

- Always check `apify_get_usage` before running searches
- Use `apify_estimate_cost` for large discovery runs
- Update `last-execution.json` after each successful run
- Append insights to `workspace/learning-log.md`
- Track search term performance in `workspace/search-performance.json`

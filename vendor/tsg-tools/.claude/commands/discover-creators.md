# /discover-creators

Discovers creators for a topic from TWO sources:
1. **Existing database** - Searches creators we already have by content keywords
2. **External platforms** - Runs Apify searches to find new creators

Both sources create `creator_reviews` records with `action='pending_review'` to link creators to the topic for later review.

## Usage

```
/discover-creators --project-id <uuid> --topic-id <uuid>
/discover-creators --project-id <uuid>                    # All topics in project
/discover-creators --project-id <uuid> --topic-id <uuid> --skip-db        # Skip existing DB search
/discover-creators --project-id <uuid> --topic-id <uuid> --skip-external  # Skip Apify searches
/discover-creators --project-id <uuid> --topic-id <uuid> --force          # Force re-run all searches
```

**Arguments:**
- `--project-id <uuid>` - Required. Project ID
- `--topic-id <uuid>` - Optional. If omitted, runs for all topics in project
- `--skip-db` - Skip searching existing database
- `--skip-external` - Skip running Apify external searches
- `--skip-recent-days <N>` - Skip external searches executed within last N days (default: 3)
- `--force` - Force re-run ALL external searches, ignoring `last_executed_at`

## Workflow Steps

### Step 0: Fetch Topic and Saved Searches

```bash
# Get topic with saved searches
npx tsx src/utils/api.ts topic $TOPIC_ID

# Or get all topics for a project
npx tsx src/utils/api.ts topics $PROJECT_ID
```

### Step 1: Execute Saved Searches

For each saved search that hasn't been run recently (or use `--force` to re-run all):

```bash
# Execute a search - backend handles discovery + enrichment + pending_review creation
npx tsx src/utils/api.ts execute-search $SEARCH_ID
```

**What the backend does automatically:**
1. Runs discovery:
   - YouTube, Instagram, TikTok, Twitter → Apify search actors
   - Newsletter/Substack (Substack, Beehiiv, Ghost, ConvertKit, Buttondown) → Tavily web search + LLM filtering
2. Creates/updates creator records with deduplication
3. Creates `creator_reviews` with `action='pending_review'` for each creator+topic
4. Performs Tier 2 enrichment:
   - Social platforms: follower counts, recent posts via Apify
   - Newsletters: Extracts social handles from page HTML
5. Updates `saved_search_ids[]` on creators

### Step 2: Summary

After running searches, display:
- How many saved searches were executed vs skipped
- How many new creators were discovered
- How many creators are now pending review
- Suggested next command: `/review-creators --project-id X --topic-id Y`

## Example Output

```
=== Discovering creators for project "Kilo Code" ===

Topic 1/3: AI model coding benchmarks
├── Saved searches: 13 (YouTube: 3, TikTok: 4, Instagram: 3, Twitter: 3)

Running external searches (8 to run, 5 skipped as recent)...
  "Claude vs GPT coding" on youtube...
    ✓ 12 new creators, 3 updated
    ✓ 15 enriched, 0 failed

  "#claudecode" on instagram...
    ✓ 8 new creators, 2 updated
    ✓ 10 enriched, 0 failed

  ... 6 more searches

=== Summary ===
Topic: AI model coding benchmarks
├── New discoveries: 45
├── Total pending_review: 68
└── Next: /review-creators --project-id <id> --topic-id <id>
```

## API Endpoints Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/topics/:topicId` | Get topic with saved searches |
| GET | `/topics?project_id=<id>` | List topics for project |
| POST | `/apify/execute-search` | Execute saved search (auto-enriches) |

## Notes

- **Deduplication**: Same creator in multiple searches only gets one pending_review per topic
- **Existing reviews preserved**: Won't overwrite approved/skipped reviews
- **Incremental**: Safe to run multiple times - only processes new/changed data
- **Cost-efficient**: External searches have Apify costs (~$0.50 per search)

## Related Commands

- `/identify-search-terms` - Find good search queries before running discovery
- `/review-creators` - Evaluate pending_review creators and approve/skip

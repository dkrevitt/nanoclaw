# Report Skills

Generate intelligence reports and analytics from creator data.

## Available Skills

| Skill | Description |
|-------|-------------|
| [/content-report](../commands/content-report.md) | Generate market intelligence report on creator content |

## Quick Reference

### Content Report
```bash
/content-report --project-id <uuid>                    # Analyze last 30 days
/content-report --project-id <uuid> --days 14          # Custom time window
/content-report --project-id <uuid> --refresh          # Refresh posts first
/content-report --project-id <uuid> --dry-run          # Preview analysis
```

Generates a comprehensive report analyzing:
- High-performing posts (above-average engagement)
- Sponsorship activity (brands, patterns)
- Trending topics and hashtags
- Platform distribution
- Creator activity summary

## Report Types

### Content Report

Analyzes recent content from matched creators to identify:

| Analysis | Description |
|----------|-------------|
| Top performers | Posts with 1.5x+ average engagement |
| Sponsors | Brands detected via #ad, #sponsored, partnership signals |
| Trending topics | Most common hashtags and emerging themes |
| Platform mix | Distribution of content across platforms |

**Output**: Markdown report saved to `projects/{project-name}/reports/content-report-{date}.md`

**Cost**: Free (uses existing post data) or ~$2-5 with `--refresh` flag

## Typical Workflows

### Weekly Content Review
```bash
# 1. Check project status
/check-projects --project-id <uuid>

# 2. Refresh post data and generate report
/content-report --project-id <uuid> --refresh --days 7
```

### Monthly Trend Analysis
```bash
# Generate 30-day report without refresh (use existing data)
/content-report --project-id <uuid> --days 30
```

### Pre-Campaign Planning
```bash
# Preview what data is available
/content-report --project-id <uuid> --dry-run

# Generate full report for campaign planning
/content-report --project-id <uuid> --days 60 --refresh
```

## Data Requirements

Reports require:
- Matched creators (any contact_status except `no_fit` and `skipped`)
- Recent posts data (from Tier 2 enrichment or post refresh)

If post data is stale:
- Use `--refresh` flag to update
- Or run Tier 2 enrichment via `/batch-enrich`

## API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /projects/:id` | Get project name |
| `GET /creators?project_id=X` | Fetch creators with posts |
| `POST /creators/batch-refresh-posts` | Refresh post data |

## Related Commands

- `/check-projects` - View project status before generating reports
- `/list-creators` - View individual creator data
- `/get-creator` - Deep dive on specific creator content

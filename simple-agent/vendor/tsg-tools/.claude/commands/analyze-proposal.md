# /analyze-proposal Command

Analyze ROI/cost efficiency of proposed content items using creator's post history and performance data.

**Use case:** Before accepting a creator proposal, analyze whether the deal is cost-effective based on their historical performance, including sponsored vs organic content performance differences.

## Usage

```bash
/analyze-proposal --content-item-id <uuid>
/analyze-proposal --creator-id <uuid> --cost <amount> --posts <count>
```

**Option 1: Analyze existing content item**
- `--content-item-id <uuid>` - Content item with status='proposed'

**Option 2: Ad-hoc analysis**
- `--creator-id <uuid>` - Creator to analyze
- `--cost <number>` - Proposed deal cost in USD
- `--posts <number>` - Number of posts in deal

**Optional Arguments:**
- `--max-posts <number>` - Max posts to fetch for analysis (default: 100)
- `--max-days <number>` - Days of history to analyze (default: 365)
- `--output <path>` - Custom output path for report
- `--dry-run` - Preview analysis without saving report

## Workflow Steps

### Step 1: Fetch Content Item and Creator Data

```typescript
// Fetch content item (if provided)
const contentItemResponse = await fetch(`${TSG_API_URL}/content-items/${contentItemId}`, {
  headers: { 'X-API-Key': TSG_API_KEY },
});
const { contentItem } = await contentItemResponse.json();

// Fetch creator details
const creatorResponse = await fetch(`${TSG_API_URL}/creators/${creatorId}`, {
  headers: { 'X-API-Key': TSG_API_KEY },
});
const { creator } = await creatorResponse.json();
```

### Step 2: Check Recent Posts Data

Check if we have sufficient post history with engagement metrics:

```typescript
// Fetch recent posts for the creator (from creators.recent_posts)
const postsResponse = await fetch(
  `${TSG_API_URL}/creators/${creatorId}/recent-posts?limit=100`,
  { headers: { 'X-API-Key': TSG_API_KEY } }
);
const { posts, total, sponsoredCount } = await postsResponse.json();

// Need at least 20 posts for meaningful analysis
// Need at least 2 sponsored posts to compare performance
```

### Step 3: Fetch Extended Post History (if needed)

If insufficient data, trigger extended post fetch:

```typescript
if (posts.length < 50 || sponsoredCount < 2) {
  console.log('Fetching extended post history (up to 1 year)...');

  const fetchResponse = await fetch(
    `${TSG_API_URL}/creators/${creatorId}/fetch-extended-posts`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TSG_API_KEY,
      },
      body: JSON.stringify({
        maxDaysBack: 365,
        maxPosts: 100,
      }),
    }
  );

  const result = await fetchResponse.json();
  console.log(`Fetched ${result.postsFound} posts, ${result.sponsoredCount} sponsored`);

  // Re-fetch posts after fetching extended history (now merged into recent_posts)
  const updatedPostsResponse = await fetch(
    `${TSG_API_URL}/creators/${creatorId}/recent-posts?limit=100`,
    { headers: { 'X-API-Key': TSG_API_KEY } }
  );
  const { posts: updatedPosts } = await updatedPostsResponse.json();
}
```

### Step 4: Analyze Performance Metrics

Calculate key metrics in-memory:

```typescript
interface PerformanceMetrics {
  // Post counts
  totalPosts: number;
  organicPosts: number;
  sponsoredPosts: number;
  sponsoredPercentage: number;

  // View metrics
  organicAvgViews: number;
  sponsoredAvgViews: number;
  performanceRatio: number;  // sponsored / organic

  // Engagement metrics
  organicAvgEngagement: number;  // (likes + comments) / views
  sponsoredAvgEngagement: number;

  // Trends
  viewsTrend: 'up' | 'stable' | 'down';
  postingFrequency: number;  // posts per month

  // ROI projections
  expectedImpressions: number;
  expectedCpm: number;
  industryBenchmarkCpm: { min: number; max: number };
}

function analyzePerformance(posts: SavedPost[]): PerformanceMetrics {
  const organic = posts.filter(p => !p.is_sponsored);
  const sponsored = posts.filter(p => p.is_sponsored);

  // Calculate averages
  const organicAvgViews = average(organic.map(p => p.views || 0));
  const sponsoredAvgViews = sponsored.length > 0
    ? average(sponsored.map(p => p.views || 0))
    : organicAvgViews * 0.85;  // Estimate if no sponsored data

  const performanceRatio = sponsoredAvgViews / organicAvgViews;

  // Project performance for the deal
  const expectedImpressions = sponsoredAvgViews * postQuantity;
  const expectedCpm = (cost / expectedImpressions) * 1000;

  return {
    totalPosts: posts.length,
    organicPosts: organic.length,
    sponsoredPosts: sponsored.length,
    sponsoredPercentage: (sponsored.length / posts.length) * 100,
    organicAvgViews,
    sponsoredAvgViews,
    performanceRatio,
    expectedImpressions,
    expectedCpm,
    industryBenchmarkCpm: getIndustryBenchmark(creator.primary_platform),
    // ... calculate other metrics
  };
}
```

### Step 5: Generate Recommendation

Determine recommendation based on analysis:

```typescript
type Recommendation = 'strong_buy' | 'buy' | 'hold' | 'pass';

function generateRecommendation(metrics: PerformanceMetrics): {
  recommendation: Recommendation;
  reasoning: string[];
  riskFactors: string[];
  confidenceScore: number;
} {
  const reasoning: string[] = [];
  const riskFactors: string[] = [];
  let score = 50;  // Start neutral

  // CPM analysis
  if (metrics.expectedCpm <= metrics.industryBenchmarkCpm.min) {
    reasoning.push(`Excellent CPM: $${metrics.expectedCpm.toFixed(2)} is below industry average`);
    score += 20;
  } else if (metrics.expectedCpm <= metrics.industryBenchmarkCpm.max) {
    reasoning.push(`Competitive CPM: $${metrics.expectedCpm.toFixed(2)} is within industry range`);
    score += 10;
  } else {
    riskFactors.push(`High CPM: $${metrics.expectedCpm.toFixed(2)} exceeds industry benchmark`);
    score -= 15;
  }

  // Sponsored content performance
  if (metrics.performanceRatio >= 0.9) {
    reasoning.push(`Sponsored content performs well (${(metrics.performanceRatio * 100).toFixed(0)}% of organic)`);
    score += 15;
  } else if (metrics.performanceRatio >= 0.7) {
    reasoning.push(`Sponsored content is acceptable (${(metrics.performanceRatio * 100).toFixed(0)}% of organic)`);
    score += 5;
  } else {
    riskFactors.push(`Sponsored content underperforms (${(metrics.performanceRatio * 100).toFixed(0)}% of organic)`);
    score -= 10;
  }

  // Sponsored content saturation
  if (metrics.sponsoredPercentage > 30) {
    riskFactors.push(`High sponsored content ratio (${metrics.sponsoredPercentage.toFixed(0)}%) may indicate audience fatigue`);
    score -= 10;
  }

  // View trends
  if (metrics.viewsTrend === 'up') {
    reasoning.push('Views trending upward');
    score += 10;
  } else if (metrics.viewsTrend === 'down') {
    riskFactors.push('Views trending downward');
    score -= 10;
  }

  // Determine recommendation
  let recommendation: Recommendation;
  if (score >= 75) recommendation = 'strong_buy';
  else if (score >= 60) recommendation = 'buy';
  else if (score >= 40) recommendation = 'hold';
  else recommendation = 'pass';

  return {
    recommendation,
    reasoning,
    riskFactors,
    confidenceScore: Math.min(Math.max(score / 100, 0), 1),
  };
}
```

### Step 6: Generate Markdown Report

Create a comprehensive report:

```markdown
# ROI Analysis: @creatorhandle

**Generated:** 2026-01-12
**Content Item:** <uuid>
**Confidence:** 0.82

---

## Deal Terms

| Metric | Value |
|--------|-------|
| Cost | $X,XXX |
| Posts | Y |
| Target CPM | $ZZ.ZZ |
| Platform | YouTube |
| Format | Video |

---

## Creator Performance (Last 12 Months)

### Overview
- **Total posts analyzed:** 87
- **Posting frequency:** 7.2 posts/month

### Organic Content
- **Posts:** 75 (86%)
- **Average views:** 45,000
- **Average engagement:** 4.7%

### Sponsored Content
- **Posts:** 12 (14%)
- **Average views:** 38,000 (84% of organic)
- **Average engagement:** 4.0%

### Sponsorship Detection
Found 12 sponsored posts via signals:
- #ad (8)
- #sponsored (3)
- "paid partnership" (1)

---

## ROI Projections

| Metric | Projected | Industry Benchmark |
|--------|-----------|-------------------|
| Expected impressions | 114,000 | - |
| Expected CPM | $21.93 | $15-25 |
| Expected engagement | ~4,000 | - |
| Cost per engagement | $0.63 | $0.50-1.00 |

---

## Recommendation: BUY

### Reasons to Proceed
1. Sponsored content retains 84% of organic reach (good)
2. Projected CPM of $21.93 is within industry range ($15-25)
3. Consistent posting frequency shows reliable execution
4. Engagement rate stays strong on sponsored content

### Risk Factors
1. 14% sponsored content may indicate some audience fatigue
2. Views trending down 8% over last 3 months

---

## Comparable Deals

Based on similar creators on this platform:
- **Low range:** $15 CPM
- **Average:** $20 CPM
- **High range:** $30 CPM

This deal is **slightly above average** but within acceptable range.

---

*Analysis based on 87 posts over 12 months*
*Confidence score: 0.82*
```

### Step 7: Save Report

Save the report to the project folder:

```typescript
// Save to projects/{project-name}/analyses/
const projectSlug = project.name.toLowerCase().replace(/\s+/g, '-');
const creatorSlug = creator.primary_handle || creator.display_name.toLowerCase().replace(/\s+/g, '-');
const contentItemShort = contentItemId.slice(0, 8);

const reportPath = `projects/${projectSlug}/analyses/${creatorSlug}_${contentItemShort}.md`;

// Write the file
fs.writeFileSync(reportPath, reportContent);

console.log(`Report saved to: ${reportPath}`);
```

## Industry CPM Benchmarks

Reference benchmarks by platform (approximate):

| Platform | Low | Average | High |
|----------|-----|---------|------|
| YouTube | $15 | $25 | $50 |
| TikTok | $10 | $15 | $25 |
| Instagram | $15 | $20 | $35 |
| Twitter | $8 | $12 | $20 |

These vary significantly by:
- Creator tier (nano, micro, macro, mega)
- Content category (tech, lifestyle, gaming, etc.)
- Geographic audience
- Engagement quality

## Sponsorship Detection

The system detects sponsored content using these signals:

**Hashtags:**
- #ad, #sponsored, #partner, #paidpartnership
- #gifted, #collab, #brandpartner, #ambassador
- #promo, #advert, #paidpromotion

**Text patterns:**
- "paid partnership"
- "sponsored by"
- "in partnership with"
- "this video is sponsored"
- "brought to you by"
- "use code X for"
- "link in bio for X% off"

## API Reference

### Get Recent Posts (from creators.recent_posts)
```
GET /creators/:id/recent-posts?limit=100&sponsored_only=false

Response:
{
  posts: [...],
  total: number,
  sponsoredCount: number
}
```

### Fetch Extended Post History
```
POST /creators/:id/fetch-extended-posts
{
  maxDaysBack: 365,
  maxPosts: 100
}

Response:
{
  success: true,
  postsFound: 87,
  postsUpserted: 85,  // number of posts merged into recent_posts
  sponsoredCount: 12
}
```

### Get Content Item
```
GET /content-items/:id

Response:
{
  contentItem: {
    id: string,
    creator_id: string,
    cost: number,
    post_quantity: number,
    status: "proposed",
    ...
  }
}
```

## Example Output

```
=== ROI Analysis Complete ===

Creator: @TechCreator123 (YouTube)
Deal: $3,500 for 3 posts

Key Metrics:
- Expected impressions: 135,000
- Expected CPM: $25.93
- Sponsored performance ratio: 85%

Recommendation: BUY
Confidence: 0.78

Report saved to: projects/kilo-code/analyses/techcreator123_a1b2c3d4.md

Next steps:
1. Review full report for details
2. If proceeding, update status to 'planned' in Chrome extension
3. Negotiate if CPM is higher than target
```

# Identify Search Terms Command

**Command**: `/identify-search-terms`

**Purpose**: Identify optimal search terms for a given project and topic through iterative exploration and testing. This is the foundation of the discovery pipeline - quality here determines quality downstream.

---

## Modes

This command supports two modes based on project type:

| Mode | Project Type | Goal |
|------|--------------|------|
| **Creator Discovery** | `creator_search` | Find creators who post relevant content |
| **Sponsor Discovery** | `marketer_search` | Find sponsored posts to identify brand partnerships |

The mode is auto-detected from the project's `project_type` field.

---

## Core Philosophy

Search term identification is **exploration, not guessing**. Different platforms require different strategies:

| Platform | Primary Discovery | Secondary Discovery | What Works |
|----------|------------------|---------------------|------------|
| **YouTube** | Keyword search | Channel keywords | Specific phrases: "Claude vs Cursor review", "AI coding benchmark 2025" |
| **TikTok** | Hashtags | Sounds, duets | Niche hashtags: #claudecode, #cursorso (NOT generic #coding) |
| **Instagram** | Hashtags | Location, handles | Community hashtags, often different from TikTok |
| **Twitter/X** | Hashtags + keywords | Lists, handles | Mix of hashtags and quoted phrases |
| **Newsletter** | Web search (Tavily) | Platform-specific sites | Niche + platform: "AI newsletter substack", "developer newsletter beehiiv" |

**Key insight**: Hashtags are community-created. The best way to find good hashtags is to analyze posts from creators who are already a good fit.

**Newsletter note**: Newsletter discovery uses Tavily web search (not Apify). Searches target newsletter platforms (Substack, Beehiiv, Ghost, ConvertKit, Buttondown) and general newsletter queries.

### Sponsor Discovery Mode

When searching for sponsored content, the strategy shifts to finding **sponsorship signals**:

| Platform | Sponsorship Signals | What Works |
|----------|---------------------|------------|
| **YouTube** | Title/description phrases | `"sponsored by"`, `"thanks to X for sponsoring"`, `"this video is brought to you by"` |
| **TikTok** | Disclosure hashtags | `#ad`, `#sponsored`, `#paidpartnership`, `#gifted` + niche terms |
| **Instagram** | Partnership labels | `#ad`, `#partner`, "paid partnership with" badge, `#gifted` |
| **Twitter/X** | Disclosure hashtags | `#ad` + brand handles, `"thanks @brand"` |
| **Newsletter** | Sponsorship phrases in issues | `"sponsored by"`, `"today's sponsor"`, `"a word from our sponsor"` |

**Key insight**: Sponsored content is explicitly disclosed. Mining these signals finds active brand partnerships.

**Newsletter sponsor discovery**: Newsletter platforms are searched via Tavily to find individual **issues** (not homepages) that contain sponsorship signals. The workflow extracts sponsor sections from newsletter issues and analyzes them for brand mentions.

---

## Prerequisites

### Both Modes
- Project ID and Topic ID
- Backend running with Apify integration
- (Optional) Some approved creators already in database (improves hashtag mining)

### Creator Discovery Mode
- Topic review criteria defined (to evaluate result quality)

### Sponsor Discovery Mode
- `project_type = 'marketer_search'` on project
- `represented_creator_id` set on project (the creator we represent)
- `company_review_criteria` defined on topic (to evaluate brand fit)

---

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 0: Detect Mode                                            │
│  - Fetch project to determine project_type                      │
│  - Creator mode (creator_search) vs Sponsor mode (marketer_search)│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: Context & Seed Generation                             │
│  [Creator] Generate creator-focused seeds (niche keywords)      │
│  [Sponsor] Generate sponsorship signal seeds (#ad + niche)      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: Mining                                                 │
│  [Creator] Mine hashtags from approved creators' posts           │
│  [Sponsor] Mine sponsorship patterns from represented creator    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 3: Test & Evaluate                                        │
│  [Creator] Score by profile relevance, precision, diversity      │
│  [Sponsor] Score by sponsorship signal %, brands detected        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 4: Expand & Iterate (optional)                            │
│  - From high-quality results, extract MORE hashtags/patterns     │
│  - Test new candidates discovered                                │
│  - Repeat until diminishing returns                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 5: Recommend & Save                                       │
│  [Creator] Save with searchIntent: "creator_discovery"           │
│  [Sponsor] Save with searchIntent: "sponsored_content"           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 0: Detect Mode

### Fetch Project and Determine Mode

```bash
GET /projects/{projectId}
```

Check `project_type`:
- `creator_search` → **Creator Discovery Mode**
- `marketer_search` → **Sponsor Discovery Mode**

Display mode context:

**Creator Discovery Mode:**
```
Mode: Creator Discovery
Project: {project.name}
Topic: {topic.topic}

Target Creator Profile:
- Must have: {criteria.must_have}
- Nice to have: {criteria.nice_to_have}
- Exclude if: {criteria.exclude_if}

Platforms to search: youtube, tiktok, instagram, twitter, newsletter
```

**Sponsor Discovery Mode:**
```
Mode: Sponsor Discovery
Project: {project.name}
Represented Creator: {represented_creator.display_name} (@{represented_creator.primary_handle})
Topic: {topic.topic}

Target Company Profile:
- Must have: {company_review_criteria.must_have}
- Nice to have: {company_review_criteria.nice_to_have}
- Exclude if: {company_review_criteria.exclude_if}

Platforms to search: youtube, tiktok, instagram, twitter, newsletter
```

---

## Phase 1: Context & Seed Generation

### 1a. Fetch Project and Topic Context

```bash
GET /projects/{projectId}
GET /topics/{topicId}
```

**Creator Mode - Extract and display:**
```
Project: {project.name}
Topic: {topic.topic}

Target Creator Profile:
- Must have: {criteria.must_have}
- Nice to have: {criteria.nice_to_have}
- Exclude if: {criteria.exclude_if}

Platforms to search: youtube, tiktok, instagram, twitter, newsletter
```

**Sponsor Mode - Extract and display:**
```
Project: {project.name}
Represented Creator: {represented_creator.display_name}
  - Primary Platform: {represented_creator.primary_platform}
  - Followers: {represented_creator.follower_count}
  - Niche: {topic.topic}

Target Company Profile:
- Must have: {company_review_criteria.must_have}
- Nice to have: {company_review_criteria.nice_to_have}
- Exclude if: {company_review_criteria.exclude_if}

Platforms to search: youtube, tiktok, instagram, twitter, newsletter
```

### 1b. Generate Seed Terms

#### Creator Discovery Mode

**For YouTube** (keyword-based):
Generate 5-8 keyword phrases based on topic:
- Direct topic keywords: "AI coding benchmark", "Claude Code review"
- Product comparisons: "Claude vs Cursor", "Copilot vs Claude"
- Content types: "AI coding tutorial 2025", "best AI for developers"

**For TikTok/Instagram/Twitter** (hashtag-based):
Generate 3-5 obvious seed hashtags to START exploration:
- Product hashtags: #claudecode, #cursorai, #githubcopilot
- Category hashtags: #aitools, #devtools, #coding

**For Newsletter** (web search queries via Tavily):
Generate 5-8 search queries targeting newsletter platforms:
- Platform-specific: `"AI newsletter substack"`, `"developer newsletter beehiiv"`
- Topic + newsletter: `"coding tips newsletter"`, `"AI tools weekly digest"`
- Provider variations: `"tech newsletter ghost"`, `"programming newsletter convertkit"`

Newsletter searches use Tavily and target these platforms:
- Substack (site:substack.com)
- Beehiiv (site:beehiiv.com)
- Ghost (various domains)
- ConvertKit (various domains)
- Buttondown (site:buttondown.email)

**Important**: These seeds are just starting points. The real hashtag discovery happens in Phase 2.

#### Sponsor Discovery Mode

**For YouTube** (disclosure phrases):
Generate 5-8 sponsorship signal phrases:
- Direct disclosures: `"{niche} sponsored by"`, `"thanks to * for sponsoring"`
- Integration phrases: `"{niche} this video is brought to you by"`, `"{product type} ad"`
- Partnership content: `"{niche} brand deal"`, `"partnered with"`

**For TikTok/Instagram/Twitter** (disclosure hashtags + niche):
Generate 3-5 sponsorship signal combinations:
- Niche + disclosure: `"{niche} #ad"`, `"{product type} #sponsored"`
- Partnership tags: `"#paidpartnership {niche}"`, `"#gifted {category}"`
- Brand mentions: `"#{brand} ad"`, `"thanks @{brand}"`

**For Newsletter** (sponsorship phrases + platform targeting):
Generate 3-5 search queries targeting newsletter issues with sponsor sections:
- Disclosure phrases: `"{niche} sponsored by site:substack.com/p/"`, `"{topic} today's sponsor"`
- Partnership content: `"{niche} a word from our sponsor"`, `"{topic} brought to you by"`
- Platform targeting: `site:beehiiv.com/p/ {niche} sponsor`

**Example sponsor seeds (AI coding niche):**
```
YouTube seeds:
  1. "AI coding sponsored by"
  2. "developer tools brand deal"
  3. "coding tutorial thanks to"

TikTok/Instagram seeds:
  1. #ad #coding
  2. #sponsored #devtools
  3. #paidpartnership tech

Newsletter seeds:
  1. "AI coding sponsored by" site:substack.com/p/
  2. "developer tools" "today's sponsor"
  3. "tech newsletter" "brought to you by"
```

---

## Phase 2: Hashtag Mining

This is the most important phase for TikTok/Instagram/Twitter. Hashtags are community-created, so we need to discover what the community actually uses.

### Creator Discovery Mode

#### 2a. Mine from Approved Creators (if available)

If we have approved creators in the database for this topic (or related topics):

```bash
GET /creators?pipeline_status=approved&primary_platform={platform}
```

For each approved creator:
1. Check their `recent_posts` field
2. Extract all hashtags from post captions
3. Build frequency map

```
Analyzing 12 approved TikTok creators...

Hashtag Frequency (from approved creators' posts):
  #aitools         - used by 8/12 creators (67%)
  #claudecode      - used by 6/12 creators (50%)
  #techsoftware    - used by 5/12 creators (42%)
  #codinglife      - used by 4/12 creators (33%)
  #devtok          - used by 4/12 creators (33%)
  #learntocode     - used by 3/12 creators (25%)
  ...

These hashtags are strong candidates - they're what on-topic creators actually use.
```

#### 2b. Bootstrap with Pre-Approval (for new topics)

**For new topics with no approved creators**, we need to bootstrap the mining process:

1. Run seed searches (Phase 1 seeds)
2. Manually review the results and identify 3-5 creators that "look like a good fit"
3. Use THOSE creators' hashtags as the mining source

This is a **lightweight pre-approval** - we're not formally reviewing them, just saying "this content looks relevant to our topic."

```
=== Bootstrap Pre-Approval ===

No approved creators for this topic yet. Let's bootstrap.

Running seed search: #claudecode (TikTok)
Found 18 profiles. Here are the top 5 by relevance:

1. @aidev_sarah
   - 45k followers, posts AI coding tutorials
   - Recent hashtags: #claudecode #aitools #devtok #techsoftware
   - Looks good? [y/n] y

2. @codewithclaude
   - 12k followers, Claude-specific content
   - Recent hashtags: #claudecode #anthropic #aicoding
   - Looks good? [y/n] y

3. @techbrand_official
   - 200k followers, company account
   - Recent hashtags: #claudecode #enterprise #saas
   - Looks good? [y/n] n (company account - skip for mining, but keep search term!)

4. @cursor_dev
   - 28k followers, Cursor tutorials
   - Recent hashtags: #cursorai #claudecode #devtools
   - Looks good? [y/n] y

5. @random_coder
   - 5k followers, general coding content
   - Recent hashtags: #claudecode #webdev #javascript
   - Looks good? [y/n] n (off-topic content)

Pre-approved 3 creators for hashtag mining.
Extracting their hashtags...
```

**Important**: The company account (@techbrand_official) doesn't disqualify the search term `#claudecode` - that hashtag clearly surfaces relevant content. We skip the company account for mining purposes, but the search term stays.

#### 2c. Mine from Seed Search Results

For each seed term, run a dry-run search and extract hashtags from results:

```bash
POST /apify/test-execute
{
  "searchQuery": "#claudecode",
  "platform": "tiktok",
  "maxResults": 20,
  "dryRun": true
}
```

From results, extract:
1. Profile bios → hashtags mentioned
2. Recent posts → hashtags used
3. Build map of co-occurring hashtags

```
Seed search: #claudecode (TikTok)
Results: 18 profiles

Hashtags found in their posts:
  #cursorai        - appears in 12 profiles' posts
  #aicoding        - appears in 10 profiles' posts
  #devtok          - appears in 8 profiles' posts
  #softwareengineer- appears in 7 profiles' posts
  #techtok         - appears by 6 profiles' posts
  #buildinpublic   - appears in 5 profiles' posts

These are related hashtags used by the same community!
```

### Sponsor Discovery Mode

#### 2a. Mine from Represented Creator's Sponsored Posts

If the represented creator has `recent_posts` with sponsorship data:

```bash
GET /creators/{represented_creator_id}
```

Analyze their past sponsored posts for patterns:
1. Extract brands they've worked with
2. Extract hashtags used in sponsored content
3. Identify disclosure phrase patterns

```
Analyzing represented creator's sponsored posts...

Sponsorship Patterns Found:
  Brands: NordVPN (3x), Skillshare (2x), Squarespace (1x)
  Hashtags: #ad (6x), #sponsored (4x), #partner (2x)
  Phrases: "sponsored by" (4x), "thanks to X for sponsoring" (2x)

These patterns suggest successful sponsorship niches.
```

#### 2b. Extract Sponsorship Patterns from Seed Results

For each seed term, run a dry-run search and extract sponsorship signals:

```bash
POST /apify/test-execute
{
  "searchQuery": "#ad #coding",
  "platform": "tiktok",
  "maxResults": 20,
  "dryRun": true
}
```

From results, extract:
1. Brand mentions (company names in captions)
2. Co-occurring hashtags with #ad
3. Sponsorship disclosure phrases

```
Seed search: #ad #coding (TikTok)
Results: 24 posts with sponsorship signals

Brands detected:
  NordVPN          - 5 posts
  Skillshare       - 4 posts
  Brilliant        - 3 posts
  Squarespace      - 2 posts

Co-occurring hashtags:
  #techtok         - 8 posts
  #learntocode     - 6 posts
  #devtools        - 5 posts

Disclosure patterns:
  "partnered with" - 7 posts
  "thanks to"      - 5 posts
  "use code"       - 4 posts (indicates affiliate)
```

#### 2c. Build Candidate List

Combine:
- Seeds that returned good results
- Hashtags mined from approved creators / represented creator
- Co-occurring hashtags from seed searches

Deduplicate and rank by frequency.

---

## Phase 3: Test & Evaluate

### 3a. Test Each Candidate

For each candidate term (keyword or hashtag):

```bash
POST /apify/test-execute
{
  "searchQuery": "{candidate}",
  "platform": "{platform}",
  "maxResults": 10,
  "dryRun": true
}
```

### 3b. Evaluate Results

#### Creator Discovery Mode

**Important: Search term evaluation focuses on CONTENT, not creator-level filtering.**

We evaluate whether the search term surfaces relevant CONTENT. Creator-level concerns (company vs individual, follower thresholds, geographic location) are handled at the **review stage**, not here.

##### What we evaluate at search term stage:
- Is the CONTENT relevant to the topic?
- Is the content FORMAT correct (video, tutorial, review)?
- Does this hashtag/keyword attract the right content vertical?

##### What we DON'T filter at search term stage:
- Company vs individual accounts (filter at review)
- Follower count thresholds (filter at review)
- Geographic location (filter at review)
- Account activity/recency (filter at review)

**Example**: A search for `#claudecode` returns:
- 12 individual creators making tutorials ✅
- 3 company accounts posting product content ✅ (content is relevant!)
- 3 off-topic accounts using hashtag randomly ❌

This is **80% precision** (15/18 have relevant content). The company accounts don't hurt the search term - they'll be filtered during review.

---

**Relevance Score (0-10)**: Does the CONTENT match what we're looking for?
- 9-10: Perfect match (content clearly about the topic)
- 7-8: Strong match (most content is on-topic)
- 5-6: Possible match (some relevant content)
- 3-4: Weak match (tangentially related)
- 0-2: Not relevant (wrong topic entirely)

**Precision Estimate**: % of results with relevant CONTENT (score 7+)

**Diversity Score**: Variety of unique accounts (avoid one account dominating)

**Volume Assessment**:
- < 3 results: Too narrow, hashtag not active
- 3-20 results: Good, targeted niche
- 20-50 results: Ideal volume
- 50-100: Acceptable, may need filtering
- > 100: Too broad, precision will suffer

#### Sponsor Discovery Mode

**Sponsorship Signal Evaluation focuses on finding SPONSORED content.**

We evaluate whether the search term surfaces posts with **sponsorship signals**.

##### What we evaluate at search term stage:
- What % of results show sponsorship signals (#ad, #sponsored, brand mentions)?
- What brands are being promoted?
- Is the content in our target niche?

##### Metrics:

**Sponsorship Signal Score (0-100%)**: % of results with sponsorship indicators
- 70-100%: Excellent - highly targeted sponsored content
- 50-69%: Good - majority sponsored
- 30-49%: Moderate - mix of organic and sponsored
- <30%: Low - mostly organic content

**Brands Detected**: Count of unique brands mentioned

**Niche Relevance**: % of sponsored content in our target category

### 3c. Display Test Results

#### Creator Discovery Mode

```
=== Testing TikTok Hashtags ===

#claudecode (seed)
  Results: 18 profiles
  Precision: 72% (13/18 on-topic)
  Sample: @aidev_sarah, @codewithclaude, @techreviewer
  Verdict: ✅ STRONG - niche, active, on-topic

#cursorai (mined)
  Results: 24 profiles
  Precision: 67% (16/24 on-topic)
  Sample: @cursor_tips, @ai_coder, @devtools_daily
  Verdict: ✅ STRONG - good adjacent community

#devtok (mined)
  Results: 2,847 profiles
  Precision: 12% (estimated from sample)
  Sample: @gaming_dev, @webdev_tips, @studentcoder
  Verdict: ❌ SKIP - too broad, low precision

#aicoding (mined)
  Results: 156 profiles
  Precision: 45% (estimated)
  Sample: @ai_engineer, @mlops_daily, @generic_tech
  Verdict: ⚠️ MAYBE - decent but noisy
```

```
=== Testing Newsletter Searches (via Tavily) ===

"AI coding newsletter substack" (seed)
  Results: 12 newsletters (after Claude AI filtering)
  Precision: 83% (10/12 actual newsletter homepages)
  Sample: The AI Coding Weekly, DevTools Digest, Prompt Engineering Newsletter
  Socials extracted: 8/12 have Twitter, 5/12 have YouTube
  Verdict: ✅ STRONG - high precision, good social handle extraction

"developer tools weekly beehiiv" (seed)
  Results: 6 newsletters
  Precision: 100% (6/6 actual newsletters)
  Sample: DevTools Weekly, The Build Newsletter
  Socials extracted: 5/6 have Twitter
  Verdict: ✅ STRONG - smaller but very precise

"programming newsletter" (general)
  Results: 45 results (8 after Claude AI filtering)
  Precision: 62% (5/8 relevant to topic)
  Sample: Various coding newsletters, some too general
  Verdict: ⚠️ MAYBE - needs niche qualifier
```

#### Sponsor Discovery Mode

```
=== Testing TikTok Sponsorship Searches ===

#ad #coding (seed)
  Results: 24 posts
  Sponsorship Rate: 87% (21/24 have sponsorship signals)
  Brands Detected: NordVPN (5), Skillshare (4), Brilliant (3), Squarespace (2), Other (7)
  Verdict: ✅ STRONG - high sponsorship signal, good brand diversity

#sponsored #devtools (seed)
  Results: 18 posts
  Sponsorship Rate: 94% (17/18 have sponsorship signals)
  Brands Detected: JetBrains (4), GitHub (3), AWS (2), Other (8)
  Verdict: ✅ STRONG - excellent for tech tool sponsors

#techtok (mined)
  Results: 3,200 posts
  Sponsorship Rate: 8% (estimated from sample)
  Brands Detected: Mixed (mostly organic content)
  Verdict: ❌ SKIP - too broad, low sponsorship signal

#paidpartnership coding (mined)
  Results: 42 posts
  Sponsorship Rate: 78% (33/42 have sponsorship signals)
  Brands Detected: Codecademy (6), Udemy (4), DataCamp (3), Other (20)
  Verdict: ✅ STRONG - good for edu-tech sponsors
```

---

## Phase 4: Expand & Iterate (Optional)

If high-quality results were found, extract more hashtags from THOSE results:

### Creator Discovery Mode

```
The #claudecode search found 13 on-topic creators.
Mining hashtags from their posts...

New hashtags discovered:
  #anthropic       - 8 creators use this
  #llmcoding       - 6 creators use this
  #aiagent         - 5 creators use this

Would you like to test these new hashtags? [y/n]
```

### Sponsor Discovery Mode

```
The #ad #coding search found 21 sponsored posts.
Mining patterns from these posts...

New sponsorship patterns discovered:
  #learntocode #ad     - 8 posts with this combo
  "use code"           - 7 posts (affiliate signal)
  "link in bio"        - 6 posts (partnership signal)

New brands discovered:
  Codecademy           - 4 posts
  DataCamp             - 3 posts

Would you like to test these new patterns? [y/n]
```

This creates an expanding search:
1. Start with seeds → find good creators/sponsored content
2. Mine their hashtags/patterns → find more hashtags
3. Test new hashtags → find more good creators/sponsored content
4. Repeat until diminishing returns

**Stop expanding when**:
- New hashtags return mostly creators/posts we've already seen
- Precision/sponsorship rate drops below threshold
- User indicates they have enough search terms

---

## Phase 5: Recommend & Save

### 5a. Present Ranked Recommendations

#### Creator Discovery Mode

Group by tier and platform:

```
=== Search Term Recommendations ===

YOUTUBE (2 recommended):
┌────────────────────────────────────────────────────────────────┐
│ 1. "Claude Code review"                                        │
│    Precision: 78% | Results: 23 | Score: 8.7/10               │
│    Why: Specific product + content type, high relevance        │
├────────────────────────────────────────────────────────────────┤
│ 2. "AI coding benchmark 2025"                                  │
│    Precision: 65% | Results: 34 | Score: 7.8/10               │
│    Why: Good topic match, some noise from general AI content   │
└────────────────────────────────────────────────────────────────┘

TIKTOK (3 recommended):
┌────────────────────────────────────────────────────────────────┐
│ 1. #claudecode                                                 │
│    Precision: 72% | Results: 18 | Score: 8.5/10               │
│    Source: Seed term                                           │
├────────────────────────────────────────────────────────────────┤
│ 2. #cursorai                                                   │
│    Precision: 67% | Results: 24 | Score: 8.1/10               │
│    Source: Mined from #claudecode results                      │
├────────────────────────────────────────────────────────────────┤
│ 3. #aiagent                                                    │
│    Precision: 58% | Results: 42 | Score: 7.2/10               │
│    Source: Mined from approved creators                        │
└────────────────────────────────────────────────────────────────┘

SKIPPED (low precision):
- #devtok (12% precision, too broad)
- #coding (8% precision, too generic)
- #techtok (15% precision, too broad)
```

#### Sponsor Discovery Mode

Group by tier and platform:

```
=== Sponsorship Search Recommendations ===

YOUTUBE (2 recommended):
┌────────────────────────────────────────────────────────────────┐
│ 1. "coding tutorial sponsored by"                              │
│    Sponsorship Rate: 82% | Brands: 12 | Score: 8.9/10         │
│    Top Brands: NordVPN, Skillshare, Brilliant                  │
├────────────────────────────────────────────────────────────────┤
│ 2. "developer tools thanks to"                                 │
│    Sponsorship Rate: 71% | Brands: 8 | Score: 7.6/10          │
│    Top Brands: JetBrains, GitHub, AWS                          │
└────────────────────────────────────────────────────────────────┘

TIKTOK (3 recommended):
┌────────────────────────────────────────────────────────────────┐
│ 1. #ad #coding                                                 │
│    Sponsorship Rate: 87% | Brands: 15 | Score: 8.7/10         │
│    Top Brands: NordVPN, Skillshare, Brilliant                  │
├────────────────────────────────────────────────────────────────┤
│ 2. #sponsored #devtools                                        │
│    Sponsorship Rate: 94% | Brands: 8 | Score: 8.5/10          │
│    Top Brands: JetBrains, GitHub, AWS                          │
├────────────────────────────────────────────────────────────────┤
│ 3. #paidpartnership coding                                     │
│    Sponsorship Rate: 78% | Brands: 12 | Score: 7.8/10         │
│    Top Brands: Codecademy, Udemy, DataCamp                     │
└────────────────────────────────────────────────────────────────┘

SKIPPED (low sponsorship rate):
- #techtok (8% sponsorship rate, mostly organic)
- #coding (5% sponsorship rate, too generic)
- #devtok (12% sponsorship rate, too broad)
```

### 5b. User Confirmation

```
Create saved searches for the 5 recommended terms above? [y/n/select]
```

Options:
- `y` - Create all recommended
- `n` - Cancel
- `select` - Let user pick specific terms

### 5c. Create Saved Searches

#### Creator Discovery Mode

```bash
POST /saved-searches
{
  "topicId": "{topicId}",
  "projectId": "{projectId}",
  "searchQuery": "{term}",
  "platform": "{platform}",
  "searchIntent": "creator_discovery",
  "searchUrl": "{platform_search_url}"
}
```

#### Sponsor Discovery Mode

```bash
POST /saved-searches
{
  "topicId": "{topicId}",
  "projectId": "{projectId}",
  "searchQuery": "{term}",
  "platform": "{platform}",
  "searchIntent": "sponsored_content",
  "searchUrl": "{platform_search_url}"
}
```

**Important**: The `searchIntent` field determines how the backend processes results:
- `creator_discovery` → Standard creator pipeline (Tier 1 → Tier 2 → Review)
- `sponsored_content` → Sponsor pipeline (Posts → Brand extraction → Company enrichment → Marketer discovery)

---

## Platform-Specific Strategies

### Creator Discovery Strategies

#### YouTube Strategy
- **Primary**: Keyword search in video titles/descriptions
- **What works**: Specific phrases with product names + content type
  - "Claude vs Cursor comparison"
  - "GitHub Copilot tutorial 2025"
  - "AI coding agent review"
- **What doesn't work**: Single keywords ("AI", "coding")
- **Mining**: Look at video tags, channel keywords

#### TikTok Strategy
- **Primary**: Hashtag search
- **What works**: Niche community hashtags
  - Product-specific: #claudecode, #cursorai
  - Community: #devtok (only if filtered), #techtok
- **What doesn't work**: Generic hashtags (#coding, #tech)
- **Mining**: Extract from post captions, bio hashtags
- **Advanced**: Sound-based discovery (some sounds are associated with tech content)

#### Instagram Strategy
- **Primary**: Hashtag search
- **What works**: Similar to TikTok but often different hashtags
  - Professional: #softwareengineer, #developerlife
  - Tool-specific: #aitools, #devtools
- **What doesn't work**: Over-used hashtags (#instagood, #photooftheday)
- **Mining**: Bio hashtags, post hashtags, tagged locations

#### Twitter/X Strategy
- **Primary**: Hashtag + keyword hybrid
- **What works**:
  - Hashtags: #AIcoding, #DevTools
  - Keywords: "Claude Code", "Cursor AI"
  - Combo: #AI "coding agent"
- **Mining**: Bio keywords, pinned tweets, list membership
- **Advanced**: Find curated lists of tech creators

#### Newsletter Strategy
- **Primary**: Web search queries via Tavily
- **Discovery method**: Two-pronged search
  1. Platform-specific: `site:substack.com {niche}`, `site:beehiiv.com {niche}`
  2. General: `"{niche} newsletter subscribe"`
- **What works**: Niche + platform + newsletter signals
  - `"AI coding newsletter substack"` - Platform + topic
  - `"developer tools weekly digest"` - Content type signals
  - `"tech newsletter beehiiv subscribe"` - Platform + action verb
  - `"programming roundup ghost"` - Topic + platform
- **What doesn't work**:
  - Generic queries without newsletter signals (returns blogs, not newsletters)
  - Platform name alone (too broad)
- **Supported platforms**:
  - Substack (site:substack.com)
  - Beehiiv (site:beehiiv.com)
  - Ghost (various custom domains)
  - ConvertKit (various custom domains)
  - Buttondown (site:buttondown.email)
- **Mining**: Not applicable (no hashtags). Instead, use topic variations and platform combinations.
- **Filtering**: Results pass through Claude AI filter to identify actual newsletter homepages (rejects blogs about newsletters, aggregators, etc.)
- **Enrichment**: Tier 2 extracts social handles from newsletter pages, enabling Tier 3 via Twitter/YouTube

### Sponsor Discovery Strategies

#### Newsletter Strategy (via Tavily)
- **Primary**: Web search for newsletter issues with sponsorship signals
- **Discovery method**: Tavily search targeting `/p/` paths (individual issues, not homepages)
- **What works**: Sponsorship phrases + platform targeting
  - `"{niche} sponsored by" site:substack.com/p/` - Direct disclosure in Substack issues
  - `"{topic}" "today's sponsor" site:beehiiv.com/p/` - Common sponsor section header
  - `"{niche}" "a word from our sponsor"` - Newsletter-specific language
  - `"{topic}" "brought to you by"` - Partnership disclosure
- **What doesn't work**:
  - Targeting homepages (no sponsor content there)
  - Generic queries without sponsorship signals
- **Supported platforms**:
  - Substack (site:substack.com/p/)
  - Beehiiv (site:beehiiv.com/p/)
  - Ghost (*.ghost.io/{slug})
  - Buttondown (buttondown.email/*/archive/*)
- **Mining**: Extract brands from sponsor sections in fetched issue content
- **Cost**: ~$0.01-0.02 per Tavily query + ~$0.001 per issue for Claude analysis

#### YouTube Strategy
- **Primary**: Disclosure phrase search
- **What works**: Sponsorship disclosure patterns
  - `"{niche} sponsored by"` - Direct disclosure
  - `"thanks to * for sponsoring this video"` - Common phrase
  - `"{niche} this video is brought to you by"` - Intro sponsorship
  - `"use code {niche}"` - Affiliate indicators
- **What doesn't work**: Generic brand names without disclosure context
- **Mining**: Extract brand names from sponsored segments

#### TikTok Strategy
- **Primary**: Disclosure hashtag + niche combinations
- **What works**: Sponsorship signals with niche targeting
  - `#ad #coding` - Direct disclosure + niche
  - `#sponsored #devtools` - Alternate disclosure + niche
  - `#paidpartnership tech` - Platform partnership label
  - `#gifted #software` - Product seeding indicator
- **What doesn't work**: Just #ad alone (too broad, all industries)
- **Mining**: Co-occurring hashtags with #ad in tech content

#### Instagram Strategy
- **Primary**: Partnership labels and hashtags
- **What works**: Platform-native sponsorship signals
  - `#ad #developer` - Standard disclosure
  - `#partner #coding` - Partnership indicator
  - `"paid partnership with"` - Platform label text
  - `#gifted #tech` - Product seeding
- **What doesn't work**: Generic partnership terms without niche
- **Mining**: Look for "paid partnership" badge usage

#### Twitter/X Strategy
- **Primary**: Disclosure hashtags + brand handles
- **What works**: Compact sponsorship signals
  - `#ad coding` - Direct disclosure + niche
  - `"thanks @{brand}"` - Brand acknowledgment pattern
  - `#sponsored developer` - Alternate disclosure
  - `"in partnership with"` - Formal partnership
- **What doesn't work**: Just brand mentions (could be organic)
- **Mining**: Track which brands tech creators tag in sponsored posts

---

## Command Parameters

```bash
/identify-search-terms --project-id <uuid> --topic-id <uuid> [options]
```

**Required**:
- `--project-id`: Project UUID
- `--topic-id`: Topic UUID

**Optional (both modes)**:
- `--platforms`: Comma-separated
  - Creator mode default: `youtube,tiktok,instagram,twitter,newsletter`
  - Sponsor mode default: `youtube,tiktok,instagram,twitter,newsletter`
- `--max-seeds`: Max seed terms per platform (default: 5)
- `--test-limit`: Max results per test search (default: 15)
- `--expand-iterations`: How many mining iterations (default: 2)
- `--skip-mining`: Skip hashtag mining, just use seeds (faster but less thorough)
- `--auto-create`: Auto-create top searches without confirmation

**Creator Discovery Mode options**:
- `--min-precision`: Minimum precision to recommend (default: 50%)

**Sponsor Discovery Mode options**:
- `--min-sponsorship-rate`: Minimum % posts with sponsorship signals (default: 40%)
- `--brand-categories`: Focus on specific brand types (e.g., "saas,education,vpn")

---

## Example Sessions

### Creator Discovery Example

```
User: /identify-search-terms --project-id 2df4e0dc-5ab8-4d16-a1cc-0599273e473d --topic-id ffe20ca0-5037-4fe5-9290-56471c8b982d

Agent: Loading project and topic context...

Mode: Creator Discovery
Project: Kilo Code
Topic: AI model coding benchmarks
Review Criteria:
  - Must post video content about AI coding tools
  - Must have engaged audience (>1k followers)
  - Exclude: Brand accounts, inactive accounts

Platforms: youtube, tiktok, instagram, twitter, newsletter

=== PHASE 1: Generating Seeds ===

YouTube seeds:
  1. "AI coding benchmark"
  2. "Claude vs GPT coding"
  3. "best AI for coding 2025"

TikTok/Instagram seeds:
  1. #aicodingtools
  2. #claudecode
  3. #cursorai

Newsletter seeds:
  1. "AI coding newsletter substack"
  2. "developer tools weekly beehiiv"
  3. "programming digest newsletter"

=== PHASE 2: Mining Hashtags ===

Found 3 approved creators for this topic. Mining their TikTok posts...
Extracted 12 unique hashtags from their content.

Running seed search #claudecode on TikTok...
Found 18 profiles. Extracting co-occurring hashtags...
Discovered 8 new candidate hashtags.

Running newsletter search "AI coding newsletter substack"...
Found 8 newsletter homepages after Claude AI filtering.

Candidate hashtag list (deduplicated):
  From seeds: #aicodingtools, #claudecode, #cursorai
  From approved creators: #devtools, #aiagent, #techsoftware
  From mining: #anthropic, #llmcoding, #codewithclaude

Newsletter candidate list:
  Platform variations: substack, beehiiv, ghost
  Topic variations: "AI coding", "developer tools", "tech roundup"

=== PHASE 3: Testing Candidates ===

Testing 15 candidates across 5 platforms...
[Progress: ████████████ 100%]

=== PHASE 4: Results ===

RECOMMENDED (precision ≥ 50%):
  YouTube: 3 terms
  TikTok: 4 terms
  Instagram: 2 terms
  Twitter: 2 terms
  Newsletter: 3 terms

SKIPPED (low precision): 4 terms

View detailed results? [y/n]

User: y

[Detailed results displayed...]

Create saved searches for 14 recommended terms? [y/n]

User: y

Created 14 saved searches with searchIntent: "creator_discovery". Ready for /discover-creators.
```

### Sponsor Discovery Example

```
User: /identify-search-terms --project-id 8a2f1e3c-7b9d-4c5e-a6f8-1234567890ab --topic-id 3c4d5e6f-7890-abcd-ef12-345678901234

Agent: Loading project and topic context...

Mode: Sponsor Discovery
Project: Find sponsors for @techcreator
Represented Creator: TechCreator (@techcreator)
  - Primary Platform: YouTube
  - Followers: 450,000
  - Niche: Developer tools and coding tutorials

Topic: Developer tool sponsors
Company Review Criteria:
  - Must have: Series B+ funding, Consumer developer product
  - Nice to have: Active influencer program, Previous creator partnerships
  - Exclude if: Direct competitors, B2B enterprise only

Platforms: youtube, tiktok, instagram, twitter

=== PHASE 1: Generating Sponsorship Seeds ===

YouTube seeds:
  1. "coding tutorial sponsored by"
  2. "developer tools thanks to"
  3. "this video is brought to you by" programming
  4. "use code" coding tutorial

TikTok/Instagram seeds:
  1. #ad #coding
  2. #sponsored #devtools
  3. #paidpartnership tech

=== PHASE 2: Mining Sponsorship Patterns ===

Analyzing represented creator's past sponsored posts...
Found 8 sponsored posts:
  - NordVPN (3x): #ad #security
  - Skillshare (2x): #sponsored #learning
  - JetBrains (2x): #paidpartnership #devtools
  - Squarespace (1x): #ad #website

Running seed search "#ad #coding" on TikTok...
Found 24 posts with sponsorship signals.
Extracting brand mentions and patterns...

Sponsorship patterns discovered:
  From represented creator: NordVPN, Skillshare, JetBrains, Squarespace
  From seed results: Brilliant, Codecademy, DataCamp, GitHub, AWS
  Co-occurring patterns: "use code", "link in bio", "partnered with"

=== PHASE 3: Testing Candidates ===

Testing 10 candidates across 4 platforms...
[Progress: ████████████ 100%]

=== PHASE 4: Results ===

RECOMMENDED (sponsorship rate ≥ 40%):
  YouTube: 3 terms (avg 76% sponsorship rate)
  TikTok: 4 terms (avg 82% sponsorship rate)
  Instagram: 2 terms (avg 68% sponsorship rate)
  Twitter: 1 term (avg 55% sponsorship rate)

SKIPPED (low sponsorship rate): 4 terms

View detailed results? [y/n]

User: y

=== Detailed Sponsorship Search Results ===

YOUTUBE:
┌────────────────────────────────────────────────────────────────┐
│ 1. "coding tutorial sponsored by"                              │
│    Sponsorship Rate: 82% | Brands: 12 | Score: 8.9/10         │
│    Top Brands: NordVPN, Skillshare, Brilliant                  │
├────────────────────────────────────────────────────────────────┤
│ 2. "developer tools thanks to"                                 │
│    Sponsorship Rate: 71% | Brands: 8 | Score: 7.6/10          │
│    Top Brands: JetBrains, GitHub, AWS                          │
├────────────────────────────────────────────────────────────────┤
│ 3. "this video is brought to you by" programming               │
│    Sponsorship Rate: 75% | Brands: 10 | Score: 7.8/10         │
│    Top Brands: Codecademy, DataCamp, Coursera                  │
└────────────────────────────────────────────────────────────────┘

TIKTOK:
┌────────────────────────────────────────────────────────────────┐
│ 1. #ad #coding                                                 │
│    Sponsorship Rate: 87% | Brands: 15 | Score: 8.7/10         │
│    Top Brands: NordVPN, Skillshare, Brilliant                  │
├────────────────────────────────────────────────────────────────┤
│ 2. #sponsored #devtools                                        │
│    Sponsorship Rate: 94% | Brands: 8 | Score: 8.5/10          │
│    Top Brands: JetBrains, GitHub, AWS                          │
├────────────────────────────────────────────────────────────────┤
│ 3. #paidpartnership coding                                     │
│    Sponsorship Rate: 78% | Brands: 12 | Score: 7.8/10         │
│    Top Brands: Codecademy, Udemy, DataCamp                     │
├────────────────────────────────────────────────────────────────┤
│ 4. #gifted #developer                                          │
│    Sponsorship Rate: 65% | Brands: 6 | Score: 7.2/10          │
│    Top Brands: Logitech, Keychron, Secretlab                   │
└────────────────────────────────────────────────────────────────┘

SKIPPED (low sponsorship rate):
- #techtok (8% sponsorship rate, mostly organic)
- #coding alone (5% sponsorship rate, too generic)
- #devlife (12% sponsorship rate, lifestyle not sponsors)
- #programmer (15% sponsorship rate, too broad)

NEWSLETTER (via Tavily):
┌────────────────────────────────────────────────────────────────┐
│ 1. "developer tools" "sponsored by" site:substack.com/p/       │
│    Issues Found: 18 | Sponsorship Rate: 89% | Score: 8.6/10   │
│    Top Brands: Retool, Linear, Notion, Supabase                │
├────────────────────────────────────────────────────────────────┤
│ 2. "coding newsletter" "today's sponsor"                       │
│    Issues Found: 12 | Sponsorship Rate: 92% | Score: 8.4/10   │
│    Top Brands: Brilliant, Codecademy, GitHub                   │
├────────────────────────────────────────────────────────────────┤
│ 3. "tech newsletter" "a word from our sponsor"                 │
│    Issues Found: 8 | Sponsorship Rate: 100% | Score: 8.2/10   │
│    Top Brands: NordVPN, Notion, Linear                         │
└────────────────────────────────────────────────────────────────┘

Create saved searches for 13 recommended terms? [y/n]

User: y

Created 13 saved searches with searchIntent: "sponsored_content".

Next steps:
  1. Run /discover-marketers to execute these searches
  2. Backend will extract brands from sponsored posts (including newsletter issues)
  3. Companies will be enriched via Apollo
  4. Marketers will be discovered for outreach
```

---

## Error Handling

### Both Modes
- **No results for seed**: Try broader seeds, warn user
- **Rate limits**: Add delays between API calls, batch appropriately
- **Platform unavailable**: Skip that platform, continue with others

### Creator Discovery Mode
- **No approved creators**: Skip approved-creator mining, rely on seed exploration
- **All candidates low precision**: Suggest reviewing topic criteria, or manual input

### Sponsor Discovery Mode
- **No represented_creator_id**: Error - "This project is configured as 'marketer_search' but has no represented creator. Set represented_creator_id on the project first."
- **Low sponsorship rate in niche**: Warn - "This niche has low sponsorship activity. Consider broadening search terms or trying adjacent niches."
- **Missing company_review_criteria**: Warn - "No company review criteria set on topic. Searches will be created but brand evaluation may be limited."

---

## Future Enhancements

1. **Sound/Audio discovery** (TikTok): Identify sounds associated with tech content
2. **List discovery** (Twitter): Find curated lists of tech creators
3. **Trending hashtag integration**: Use platform APIs for trending suggestions
4. **Historical learning**: Track which search terms yielded highest approval rates
5. **Semantic expansion**: Use embeddings to find semantically similar terms
6. **Competitor creator analysis**: Find hashtags used by known competitors' creator programs
7. **Brand affinity mapping**: Track which brands sponsor which niches (sponsor mode)
8. **Sponsorship timing patterns**: Identify seasonal sponsorship trends (sponsor mode)

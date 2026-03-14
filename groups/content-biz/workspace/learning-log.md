# Discovery Learning Log

Append-only log of discovery insights across all projects.

---

## Template

```
## {date} - {project}

**Searches:** {n} queries, {platforms}
**Results:** {discovered} found, {approved} approved ({rate}%)

### What Worked
- ...

### What Didn't Work
- ...

### Adjustments Made
- ...
```

---

## 2026-03-13 - Kilo Code (Manual Discovery)

*Searches*: 15 web searches across YouTube, TikTok, general web
*Method*: Manual (Apify tools unavailable)
*Results*: 6 creators identified, 4 viable for outreach

### What Worked
- *OpenClaw-specific searches* yielded strong results (Nat Eliason, freeCodeCamp coverage)
- *"Vibe coding" trend search* found Alex Finn (55k YT subs, perfect fit)
- *Established creators* (Fireship, ThePrimeagen) cover the topic but may be expensive
- *Web search* as fallback when Apify unavailable works, but time-intensive

### What Didn't Work
- *Apify MCP tools* - All returned 404 errors (API endpoint configuration issue)
- *TSG backend API* - Access denied, likely auth/API key issue for this group
- *Generic searches* ("AI Jason", "Generait") - No specific creators found
- *TikTok creator identification* - Found trend but no specific handles extracted

### Technical Issues
- Apify MCP: `404 - page-not-found` on all search endpoints
- Backend API: `You do not have access to this project` error
- Impact: No automated enrichment, email finding, or AI pre-review
- Manual discovery took ~2 hours vs estimated 15 min automated

### Key Insights
1. *OpenClaw is MASSIVE* in Q1 2026 - "most hyped AI application of the year"
2. *Vibe coding* is established term (Andrej Karpathy, 2025) with dedicated audience
3. *Business automation* angle (not just devs) may be stronger for OpenClaw content
4. *Mid-tier creators* (50k-500k) seem most accessible vs mega-channels

### Search Term Performance
*High performers*:
- "OpenClaw tutorial YouTube" ✅
- "vibe coding" creators ✅
- "Cursor vs Claude Code" ✅

*Low performers*:
- "Generait AI" ❌ (channel doesn't exist?)
- "AI Jason" ❌ (website exists, no clear YouTube channel)
- Generic "clawdbot review" ❌ (tool reviews, not creators)

### Recommended Adjustments

*Add to searches.md*:
- "OpenClaw business automation" (YouTube)
- "build apps with Claude Code" (YouTube)
- #vibecoding (TikTok)
- #openclaw (TikTok)
- "built with Kilo Code" (Twitter/X)

*Consider removing*:
- "Generait" searches (no results after multiple attempts)

*New platform to explore*:
- Substack newsletters covering AI coding tools
- Search: `site:substack.com/p/ "cursor" OR "claude code" OR "openclaw"`

### Next Actions
1. *Fix technical issues*: Apify MCP & backend API access
2. *Manual enrichment*: Get YouTube URLs, subscriber counts, emails for 4 viable creators
3. *Newsletter search*: Add Substack/Beehiiv to discovery platforms
4. *TikTok deep dive*: Identify specific IndieHackers creators using #openclaw

---

(Future entries will be added here)

## 2026-03-14 - 3-Hour Heartbeat Execution

### New Channels Found (Last 3 Hours)
- BoxminingAI - "NEW OpenClaw Update is MASSIVE!" - 3.8K views
- Build In Public - "OpenClaw Update 3.11 IS INSANE" - 6.2K views  
- Julian Goldie SEO - Multiple OpenClaw update videos - 17K+ views

### Twitter Activity
- Mostly non-English tweets (Chinese/Korean)
- English tweets about OpenClaw security concerns and deployment costs
- Low relevance for creator outreach

### Status
- Heartbeat ran successfully
- No new English-speaking technical creators qualified
- Larger channels (Julian Goldie SEO) already too big (likely >100K subs)
- Next execution: 2026-03-14 06:00 UTC

### Budget
- YouTube search: $0.023
- Twitter search: $0.05
- Total spent this run: $0.073
- Daily remaining: $19.21

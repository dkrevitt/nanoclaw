# Backend Workflow Plan: Technically Startup Infrastructure Sponsors
**Date:** February 16, 2026
**Status:** Pending backend configuration

## Goal

Use TSG backend + Apollo integration to:
1. Create proper project structure in database
2. Enrich company data (domain, employees, funding, stage)
3. Find and verify marketing contacts (CMO, VP Marketing, Head of Growth)
4. Store everything in Supabase (not just .md files)

## Step 1: Create Project

```
backend_create_project({
  name: "Technically - Startup Infrastructure Sponsors",
  project_type: "marketer_search",
  criteria: {
    must_have: [
      "Sells to startup operators (founders, product, ops, finance)",
      "B2B SaaS with clear value proposition",
      "Has marketing budget (Series A+ or profitable)",
      "Product can be explained simply (ELI5 style)"
    ],
    nice_to_have: [
      "Recent funding round (indicates marketing budget)",
      "No existing creator sponsorships (less competition)",
      "Startup operator audience overlap",
      "Complex product that benefits from explainer content"
    ],
    exclude_if: [
      "Consumer-focused (not B2B)",
      "Enterprise-only (no startup tier)",
      "Owns competing media properties",
      "Explicitly anti-advertising"
    ],
    min_followers: null,
    max_days_inactive: null,
    require_english: true
  }
})
```

**Expected Result:** Project ID for "Technically - Startup Infrastructure Sponsors"

---

## Step 2: Create Topic

```
backend_create_topic({
  project_id: "[from step 1]",
  topic: "Startup Infrastructure - Banking, Payroll, Legal, Accounting",
  criteria: {
    must_have: [
      "Back-office software (banking, payroll, legal, accounting, CRM)",
      "Targets startups or SMBs",
      "Has clear marketing team or partnerships person"
    ],
    nice_to_have: [
      "Recent funding (2024-2026)",
      "New product launch",
      "Emerging category leader"
    ],
    exclude_if: [
      "Enterprise-only pricing",
      "Operates competing newsletter"
    ]
  }
})
```

**Expected Result:** Topic ID for "Startup Infrastructure"

---

## Step 3: Discover Sponsors (AI Ideation)

Use `backend_discover_sponsors` to generate initial list:

```
backend_discover_sponsors({
  topic_id: "[from step 2]",
  niche: "Back-office SaaS for startups: business banking, corporate cards, payroll, HR, legal, accounting, CRM, and operations software that startup operators need",
  count: 30,
  criteria: {
    must_have: [
      "Sells to startup operators",
      "Has marketing budget",
      "Clear value proposition"
    ],
    nice_to_have: [
      "Recent funding",
      "No creator sponsorships yet",
      "Complex product (good explainer opportunity)"
    ]
  }
})
```

**Expected Companies to be Discovered:**
- Monaco (AI CRM)
- Puzzle (AI accounting)
- Rho (banking)
- Soxton AI (legal)
- Attio (CRM)
- Skala (legal)
- Pulley (cap table)
- Remote (global payroll)
- Deel (global payroll)
- Clay (data enrichment)
- ... and 20 more

**This will automatically:**
1. Generate 30 company ideas via AI
2. Enrich each via Apollo (domain, description, employee count, funding)
3. Run AI pre-review against criteria
4. Save all to database

---

## Step 4: Manual Company Addition (if needed)

For companies not discovered by AI, manually add:

```
backend_create_company({
  project_id: "[project id]",
  company_name: "Monaco",
  domain: "monaco.com",
  description: "AI-native CRM for startup sales teams"
})
```

Then enrich:

```
backend_enrich_company({
  company_id: "[company id]"
})
```

---

## Step 5: Find Marketing Contacts

For each approved company, find marketing contacts:

```
backend_find_marketers({
  company_id: "[company id]",
  titles: [
    "CMO",
    "Chief Marketing Officer",
    "VP Marketing",
    "Vice President Marketing",
    "Head of Marketing",
    "Director of Marketing",
    "Head of Growth",
    "VP Growth",
    "Head of Partnerships",
    "VP Partnerships"
  ],
  limit: 5
})
```

**This will:**
1. Search Apollo for people at the company with those titles
2. Return name, title, LinkedIn, email (if available)
3. Save contacts to database linked to company

---

## Step 6: Batch Email Verification

Once contacts are found, verify emails:

```
backend_batch_enrich_emails({
  marketer_ids: [
    "[contact 1 id]",
    "[contact 2 id]",
    "[contact 3 id]",
    ...
  ]
})
```

**This will:**
1. Use Apollo to verify email deliverability
2. Update contact records with verified status
3. Remove invalid/bouncing emails

---

## Step 7: Review and Prioritize

Get pending companies for review:

```
backend_pending_review({
  project_id: "[project id]"
})
```

Review and update status:

```
backend_update_company_status({
  company_id: "[company id]",
  status: "approved" // or "contacted", "replied", "skipped"
})
```

---

## Expected Final Output

### Database Tables Populated:

**companies table:**
- 30-40 companies
- Enriched data: domain, description, employee count, funding stage
- AI pre-review decisions with reasoning
- Manual review status

**marketers table:**
- 3-5 contacts per company (150-200 total contacts)
- Title, LinkedIn, email, phone
- Email verification status
- Linked to parent company

**projects table:**
- "Technically - Startup Infrastructure Sponsors" project
- Criteria stored
- Pipeline statistics

**topics table:**
- "Startup Infrastructure" topic
- Topic-specific criteria

### Workspace Files:

After backend workflow completes, export summary to workspace:

```
workspace/proprietary/technically/sponsors/
├── startup-infrastructure-discovery-2026-02.md (existing research)
├── marketing-contacts-startup-infra.md (existing manual research)
└── backend-enriched-sponsors-2026-02.md (NEW - export from database)
```

---

## Priority Companies for Immediate Enrichment

Once backend is configured, run workflow for these companies first:

### Tier 1: Brand New (Highest Priority)
1. **Monaco** - monaco.com
2. **Soxton AI** - soxton.ai
3. **Puzzle** - puzzle.io

### Tier 2: Proven Sponsors
4. **Rho** - rho.co
5. **Attio** - attio.com

### Tier 3: Emerging Platforms
6. **Skala** - skala.io
7. **Pulley** - pulley.com
8. **Clay** - clay.com
9. **Remote** - remote.com
10. **Deel** - deel.com

---

## Cost Estimates (Apollo Credits)

**Per company:**
- Company enrichment: 1 credit
- Contact search: 1 credit per contact found
- Email verification: 1 credit per email

**For 10 companies with 3 contacts each:**
- Company enrichment: 10 credits
- Contact search: 30 credits
- Email verification: 30 credits
- **Total: ~70 credits**

---

## Troubleshooting

If backend tools fail:

1. **Check environment variables:**
   ```bash
   env | grep TSG
   ```
   Should show:
   - TSG_BACKEND_URL
   - TSG_API_KEY

2. **Restart NanoClaw:**
   ```bash
   launchctl kickstart -k gui/$(id -u)/com.nanoclaw
   ```

3. **Check backend health:**
   ```bash
   curl -H "X-API-Key: $TSG_API_KEY" $TSG_BACKEND_URL/health
   ```

4. **Review logs:**
   ```bash
   grep -i "backend_" logs/nanoclaw.log | tail -20
   ```

---

## Next Steps

1. ✅ Environment variables configured (TSG_BACKEND_URL, TSG_API_KEY)
2. ⏳ Restart NanoClaw to load env vars
3. ⏳ Test backend connection with `backend_list_projects`
4. ⏳ Create "Technically - Startup Infrastructure" project
5. ⏳ Run sponsor discovery workflow
6. ⏳ Enrich top 10 priority companies
7. ⏳ Find and verify marketing contacts
8. ⏳ Export enriched data to workspace
9. ⏳ Begin outreach to Monaco, Puzzle, Rho

---

## Status

**Current:** Waiting for NanoClaw restart to load TSG backend environment variables

**Blocker:** Backend tools returning "TSG backend not configured" - env vars not visible in container

**Solution:** Restart NanoClaw service to reload environment

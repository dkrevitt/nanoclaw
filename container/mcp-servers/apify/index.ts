/**
 * Apify MCP Server for NanoClaw
 *
 * Provides direct access to Apify actors for social media search,
 * profile enrichment, and email discovery. All search intelligence
 * lives in NanoClaw - this is just the execution layer.
 *
 * Tools:
 * - apify_youtube_search, apify_tiktok_search, apify_instagram_search, apify_twitter_search
 * - apify_scrape_profile (enrichment, extracts email from bio)
 * - apify_find_email (waterfall: bio -> linktree -> youtube -> tiktok -> generic)
 * - apify_estimate_cost, apify_get_usage (cost control)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

// Environment configuration
const APIFY_TOKEN = process.env.APIFY_TOKEN || '';
const APIFY_DAILY_BUDGET = parseFloat(process.env.APIFY_DAILY_BUDGET || '5.00');
const WORKSPACE_DIR = '/workspace/group';
const USAGE_FILE = path.join(WORKSPACE_DIR, 'apify-usage.json');

// Apify API base URL
const APIFY_API_BASE = 'https://api.apify.com/v2';

// Actor IDs for different platforms
const ACTORS = {
  // Search actors
  youtube_search: 'streamers/youtube-scraper',
  tiktok_search: 'clockworks/tiktok-scraper',
  tiktok_profile: 'clockworks/tiktok-profile-scraper',
  instagram_search: 'apify/instagram-scraper',
  instagram_profile: 'apify/instagram-profile-scraper',
  twitter_search: 'quacker/twitter-scraper',
  twitter_profile: 'quacker/twitter-profile-scraper',
  // Email waterfall actors (in priority order)
  linktree_email: 'ahmed_jasarevic/linktree-beacons-bio-email-scraper-extract-leads',
  youtube_email: 'endspec/youtube-instant-email-scraper',
  tiktok_email: 'scraper-mind/tiktok-profile-email-scraper',
  generic_email: 'chitosibug3/social-media-email-scraper-2025',
  social_finder: 'tri_angle/social-media-finder',
};

// Approximate costs per actor run (in USD)
const COST_ESTIMATES = {
  youtube_search: 0.02,    // per 10 results
  tiktok_search: 0.02,     // per 10 results
  instagram_search: 0.05,  // per 10 results (more expensive)
  twitter_search: 0.05,    // per 10 results
  profile_scrape: 0.01,    // per profile
  email_lookup: 0.01,      // per actor attempt
};

interface UsageData {
  date: string;
  totalCost: number;
  searches: number;
  profiles: number;
  emails: number;
  runs: Array<{
    timestamp: string;
    actor: string;
    cost: number;
    resultCount: number;
  }>;
}

function loadUsage(): UsageData {
  const today = new Date().toISOString().split('T')[0];

  try {
    if (fs.existsSync(USAGE_FILE)) {
      const data = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8'));
      // Reset if it's a new day
      if (data.date !== today) {
        return {
          date: today,
          totalCost: 0,
          searches: 0,
          profiles: 0,
          emails: 0,
          runs: [],
        };
      }
      return data;
    }
  } catch {
    // Ignore parse errors
  }

  return {
    date: today,
    totalCost: 0,
    searches: 0,
    profiles: 0,
    emails: 0,
    runs: [],
  };
}

function saveUsage(usage: UsageData): void {
  try {
    fs.mkdirSync(path.dirname(USAGE_FILE), { recursive: true });
    fs.writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2));
  } catch (err) {
    console.error('Failed to save usage:', err);
  }
}

function recordUsage(actor: string, cost: number, resultCount: number, type: 'search' | 'profile' | 'email'): UsageData {
  const usage = loadUsage();
  usage.totalCost += cost;
  usage.runs.push({
    timestamp: new Date().toISOString(),
    actor,
    cost,
    resultCount,
  });

  if (type === 'search') usage.searches++;
  else if (type === 'profile') usage.profiles++;
  else if (type === 'email') usage.emails++;

  saveUsage(usage);
  return usage;
}

function checkBudget(estimatedCost: number): { allowed: boolean; remaining: number; message: string } {
  const usage = loadUsage();
  const remaining = APIFY_DAILY_BUDGET - usage.totalCost;

  if (estimatedCost > remaining) {
    return {
      allowed: false,
      remaining,
      message: `Daily budget exceeded. Remaining: $${remaining.toFixed(2)}, requested: $${estimatedCost.toFixed(2)}`,
    };
  }

  return {
    allowed: true,
    remaining: remaining - estimatedCost,
    message: `Budget OK. Remaining after this run: $${(remaining - estimatedCost).toFixed(2)}`,
  };
}

interface ApifyRunResult {
  success: boolean;
  data?: any;
  error?: string;
  cost?: number;
}

async function runApifyActor(
  actorId: string,
  input: Record<string, any>,
  options: { waitSecs?: number; memoryMbytes?: number } = {}
): Promise<ApifyRunResult> {
  if (!APIFY_TOKEN) {
    return { success: false, error: 'APIFY_TOKEN not set' };
  }

  const waitSecs = options.waitSecs || 120;
  const memoryMbytes = options.memoryMbytes || 256;

  // Convert actor ID format: "username/actor" -> "username~actor" for API
  const apiActorId = actorId.replace('/', '~');

  try {
    // Start the actor run
    const runResponse = await fetch(
      `${APIFY_API_BASE}/acts/${apiActorId}/runs?token=${APIFY_TOKEN}&waitForFinish=${waitSecs}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...input,
          memoryMbytes,
        }),
      }
    );

    if (!runResponse.ok) {
      const text = await runResponse.text();
      return { success: false, error: `Apify API error: ${runResponse.status} - ${text}` };
    }

    const runData = await runResponse.json();

    if (runData.data?.status !== 'SUCCEEDED') {
      return {
        success: false,
        error: `Actor run failed with status: ${runData.data?.status}`,
      };
    }

    // Fetch the results from the dataset
    const datasetId = runData.data?.defaultDatasetId;
    if (!datasetId) {
      return { success: false, error: 'No dataset ID returned' };
    }

    const dataResponse = await fetch(
      `${APIFY_API_BASE}/datasets/${datasetId}/items?token=${APIFY_TOKEN}&format=json`
    );

    if (!dataResponse.ok) {
      return { success: false, error: 'Failed to fetch dataset' };
    }

    const items = await dataResponse.json();

    // Calculate approximate cost from usage
    const usageUsd = runData.data?.usageTotalUsd || 0;

    return {
      success: true,
      data: items,
      cost: usageUsd,
    };
  } catch (err) {
    return {
      success: false,
      error: `Request failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// Create MCP server
const server = new McpServer({
  name: 'apify',
  version: '1.0.0',
});

// ============================================================================
// Search Tools
// ============================================================================

server.tool(
  'apify_youtube_search',
  `Search YouTube for videos matching a query. Returns video metadata including title, channel, views, likes, and description.

Cost: ~$0.02 per 10 results. Use maxResults to control costs.`,
  {
    query: z.string().describe('Search query (e.g., "cursor ide tutorial")'),
    maxResults: z.number().optional().default(20).describe('Maximum videos to return (default: 20)'),
    sortBy: z.enum(['relevance', 'date', 'viewCount', 'rating']).optional().default('relevance'),
    uploadedAfter: z.string().optional().describe('ISO date - only videos uploaded after this date'),
  },
  async (args) => {
    const estimatedCost = COST_ESTIMATES.youtube_search * Math.ceil(args.maxResults / 10);
    const budget = checkBudget(estimatedCost);

    if (!budget.allowed) {
      return { content: [{ type: 'text' as const, text: `Budget exceeded: ${budget.message}` }], isError: true };
    }

    const result = await runApifyActor(ACTORS.youtube_search, {
      searchKeywords: args.query,  // String, not array
      maxResults: args.maxResults,
      sortBy: args.sortBy,
      uploadDate: args.uploadedAfter ? 'custom' : undefined,
      uploadDateAfter: args.uploadedAfter,
    });

    if (!result.success) {
      return { content: [{ type: 'text' as const, text: `Search failed: ${result.error}` }], isError: true };
    }

    recordUsage(ACTORS.youtube_search, result.cost || estimatedCost, result.data?.length || 0, 'search');

    // Format results
    const videos = (result.data || []).map((v: any) => ({
      title: v.title,
      url: v.url,
      channelName: v.channelName,
      channelUrl: v.channelUrl,
      views: v.viewCount,
      likes: v.likeCount,
      publishedAt: v.publishedAt,
      duration: v.duration,
      description: v.description?.slice(0, 200),
    }));

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          query: args.query,
          resultCount: videos.length,
          estimatedCost: result.cost || estimatedCost,
          videos,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'apify_tiktok_search',
  `Search TikTok for videos and creators. Returns creator profiles with follower counts, engagement, and recent videos.

Cost: ~$0.02 per 10 results.`,
  {
    query: z.string().describe('Search query or hashtag (e.g., "#coding" or "ai tutorial")'),
    maxResults: z.number().optional().default(20).describe('Maximum results (default: 20)'),
    searchType: z.enum(['video', 'user']).optional().default('video'),
  },
  async (args) => {
    const estimatedCost = COST_ESTIMATES.tiktok_search * Math.ceil(args.maxResults / 10);
    const budget = checkBudget(estimatedCost);

    if (!budget.allowed) {
      return { content: [{ type: 'text' as const, text: `Budget exceeded: ${budget.message}` }], isError: true };
    }

    const result = await runApifyActor(ACTORS.tiktok_search, {
      searchQueries: [args.query],
      resultsPerPage: args.maxResults,
      searchSection: args.searchType === 'user' ? 'users' : 'videos',
    });

    if (!result.success) {
      return { content: [{ type: 'text' as const, text: `Search failed: ${result.error}` }], isError: true };
    }

    recordUsage(ACTORS.tiktok_search, result.cost || estimatedCost, result.data?.length || 0, 'search');

    // Format results based on search type
    const items = (result.data || []).map((item: any) => {
      if (args.searchType === 'user') {
        return {
          username: item.uniqueId || item.username,
          displayName: item.nickname,
          followers: item.followerCount,
          following: item.followingCount,
          likes: item.heartCount || item.heart,
          bio: item.signature,
          verified: item.verified,
          profileUrl: `https://www.tiktok.com/@${item.uniqueId || item.username}`,
        };
      }
      return {
        description: item.text || item.desc,
        url: item.webVideoUrl,
        authorUsername: item.authorMeta?.name || item.author?.uniqueId,
        authorFollowers: item.authorMeta?.fans,
        views: item.playCount,
        likes: item.diggCount,
        comments: item.commentCount,
        shares: item.shareCount,
        createdAt: item.createTime,
      };
    });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          query: args.query,
          searchType: args.searchType,
          resultCount: items.length,
          estimatedCost: result.cost || estimatedCost,
          results: items,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'apify_instagram_search',
  `Search Instagram for posts, hashtags, or profiles. More expensive than other platforms.

Cost: ~$0.05 per 10 results (Instagram scraping is more resource-intensive).`,
  {
    query: z.string().describe('Search query, hashtag, or username'),
    maxResults: z.number().optional().default(20).describe('Maximum results (default: 20)'),
    type: z.enum(['posts', 'hashtag', 'profile']).optional().default('posts'),
  },
  async (args) => {
    const estimatedCost = COST_ESTIMATES.instagram_search * Math.ceil(args.maxResults / 10);
    const budget = checkBudget(estimatedCost);

    if (!budget.allowed) {
      return { content: [{ type: 'text' as const, text: `Budget exceeded: ${budget.message}` }], isError: true };
    }

    // Build input based on search type
    const input: Record<string, any> = {
      resultsLimit: args.maxResults,
    };

    if (args.type === 'hashtag') {
      input.hashtags = [args.query.replace('#', '')];
    } else if (args.type === 'profile') {
      input.usernames = [args.query.replace('@', '')];
    } else {
      input.search = args.query;
    }

    const result = await runApifyActor(ACTORS.instagram_search, input);

    if (!result.success) {
      return { content: [{ type: 'text' as const, text: `Search failed: ${result.error}` }], isError: true };
    }

    recordUsage(ACTORS.instagram_search, result.cost || estimatedCost, result.data?.length || 0, 'search');

    // Format results
    const items = (result.data || []).map((item: any) => ({
      type: item.type || 'post',
      url: item.url,
      username: item.ownerUsername,
      displayName: item.ownerFullName,
      caption: item.caption?.slice(0, 200),
      likes: item.likesCount,
      comments: item.commentsCount,
      followers: item.followersCount,
      timestamp: item.timestamp,
    }));

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          query: args.query,
          type: args.type,
          resultCount: items.length,
          estimatedCost: result.cost || estimatedCost,
          results: items,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'apify_twitter_search',
  `Search Twitter/X for tweets or profiles. Requires paid Apify plan.

Cost: ~$0.05 per 10 results.`,
  {
    query: z.string().describe('Search query (e.g., "cursor ide" or "from:username")'),
    maxResults: z.number().optional().default(20).describe('Maximum results (default: 20)'),
    since: z.string().optional().describe('ISO date - only tweets after this date'),
    minLikes: z.number().optional().describe('Minimum likes threshold'),
  },
  async (args) => {
    const estimatedCost = COST_ESTIMATES.twitter_search * Math.ceil(args.maxResults / 10);
    const budget = checkBudget(estimatedCost);

    if (!budget.allowed) {
      return { content: [{ type: 'text' as const, text: `Budget exceeded: ${budget.message}` }], isError: true };
    }

    const result = await runApifyActor(ACTORS.twitter_search, {
      searchTerms: [args.query],
      maxTweets: args.maxResults,
      sinceDate: args.since,
      sort: 'Top',
    });

    if (!result.success) {
      return { content: [{ type: 'text' as const, text: `Search failed: ${result.error}` }], isError: true };
    }

    recordUsage(ACTORS.twitter_search, result.cost || estimatedCost, result.data?.length || 0, 'search');

    // Filter by minLikes if specified and format results
    let tweets = (result.data || []).map((t: any) => ({
      text: t.text || t.full_text,
      url: t.url,
      authorUsername: t.user?.screen_name || t.author?.userName,
      authorDisplayName: t.user?.name || t.author?.displayName,
      authorFollowers: t.user?.followers_count || t.author?.followersCount,
      likes: t.favorite_count || t.likeCount,
      retweets: t.retweet_count || t.retweetCount,
      replies: t.reply_count || t.replyCount,
      createdAt: t.created_at || t.createdAt,
    }));

    if (args.minLikes) {
      tweets = tweets.filter((t: any) => t.likes >= args.minLikes!);
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          query: args.query,
          resultCount: tweets.length,
          estimatedCost: result.cost || estimatedCost,
          tweets,
        }, null, 2),
      }],
    };
  }
);

// ============================================================================
// Profile Scraping (Enrichment)
// ============================================================================

server.tool(
  'apify_scrape_profile',
  `Scrape a creator's profile for enrichment. Returns followers, bio, recent posts, engagement metrics, and email if found.

Extracts email from:
- Explicit email fields in profile data
- Email addresses in bio/description text

Cost: ~$0.01 per profile.`,
  {
    platform: z.enum(['youtube', 'tiktok', 'instagram', 'twitter']),
    handle: z.string().describe('Username or channel ID/URL'),
    includePosts: z.boolean().optional().default(true).describe('Include recent posts (default: true)'),
    maxPosts: z.number().optional().default(10).describe('Max recent posts to fetch (default: 10)'),
  },
  async (args) => {
    const estimatedCost = COST_ESTIMATES.profile_scrape;
    const budget = checkBudget(estimatedCost);

    if (!budget.allowed) {
      return { content: [{ type: 'text' as const, text: `Budget exceeded: ${budget.message}` }], isError: true };
    }

    // Select the right actor based on platform
    let actorId: string;
    let input: Record<string, any> = {};

    switch (args.platform) {
      case 'youtube':
        actorId = ACTORS.youtube_search;
        input = {
          channelUrls: [args.handle.includes('youtube.com') ? args.handle : `https://www.youtube.com/${args.handle}`],
          maxResults: args.includePosts ? args.maxPosts : 0,
        };
        break;
      case 'tiktok':
        actorId = ACTORS.tiktok_profile;
        input = {
          profiles: [args.handle.replace('@', '')],
          resultsPerPage: args.includePosts ? args.maxPosts : 0,
        };
        break;
      case 'instagram':
        actorId = ACTORS.instagram_profile;
        input = {
          usernames: [args.handle.replace('@', '')],
          resultsLimit: args.includePosts ? args.maxPosts : 0,
        };
        break;
      case 'twitter':
        actorId = ACTORS.twitter_profile;
        input = {
          handles: [args.handle.replace('@', '')],
          tweetsDesired: args.includePosts ? args.maxPosts : 0,
        };
        break;
    }

    const result = await runApifyActor(actorId, input);

    if (!result.success) {
      return { content: [{ type: 'text' as const, text: `Profile scrape failed: ${result.error}` }], isError: true };
    }

    recordUsage(actorId, result.cost || estimatedCost, 1, 'profile');

    // Normalize profile data across platforms
    const raw = result.data?.[0] || {};
    const bio = raw.description || raw.signature || raw.biography || '';

    // Extract email from profile data or bio
    const extractEmail = (data: any, bioText: string): string | null => {
      // Check explicit email fields
      if (data.email) return data.email;
      if (data.businessEmail) return data.businessEmail;
      if (data.publicEmail) return data.publicEmail;

      // Extract from bio using regex
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const matches = bioText.match(emailRegex);
      if (matches && matches.length > 0) {
        // Filter out common non-business patterns
        const validEmails = matches.filter(email =>
          !email.includes('example.com') &&
          !email.includes('email.com') &&
          !email.includes('youremail')
        );
        if (validEmails.length > 0) return validEmails[0];
      }

      return null;
    };

    const email = extractEmail(raw, bio);

    const profile: Record<string, any> = {
      platform: args.platform,
      handle: args.handle,
      displayName: raw.name || raw.nickname || raw.fullName || raw.displayName,
      bio,
      followers: raw.subscriberCount || raw.followerCount || raw.followersCount,
      following: raw.followingCount,
      totalPosts: raw.videoCount || raw.postsCount || raw.statusesCount,
      verified: raw.verified || raw.isVerified,
      profileUrl: raw.url || raw.profileUrl,
      avatarUrl: raw.thumbnailUrl || raw.avatarMedium || raw.profilePicUrl,
      email,  // Will be null if not found
    };

    // Add engagement metrics if available
    if (raw.averageEngagement) {
      profile.avgEngagement = raw.averageEngagement;
    }
    if (raw.heartCount || raw.likesCount) {
      profile.totalLikes = raw.heartCount || raw.likesCount;
    }

    // Add recent posts if requested
    if (args.includePosts && result.data) {
      profile.recentPosts = (raw.latestPosts || raw.latestVideos || raw.posts || [])
        .slice(0, args.maxPosts)
        .map((post: any) => ({
          url: post.url || post.webVideoUrl,
          text: post.text || post.description || post.caption,
          likes: post.likeCount || post.diggCount || post.likesCount,
          comments: post.commentCount || post.commentsCount,
          views: post.viewCount || post.playCount,
          createdAt: post.publishedAt || post.createTime || post.timestamp,
        }));
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          estimatedCost: result.cost || estimatedCost,
          profile,
        }, null, 2),
      }],
    };
  }
);

// ============================================================================
// Email Waterfall
// ============================================================================

server.tool(
  'apify_find_email',
  `Find email for a creator using the same waterfall as the TSG backend.

Waterfall order (stops at first success):
1. Bio text extraction (FREE) - regex on bio/description
2. Linktree scraping (FREE) - if linktree URL in bio
3. YouTube email scraper (~$0.01, 47% hit rate)
4. TikTok email scraper (~$0.01, 13% hit rate)
5. Generic social scraper (~$0.01, 10% hit rate)

Use this AFTER apify_scrape_profile if no email was found in the profile.`,
  {
    platform: z.enum(['youtube', 'tiktok', 'instagram', 'twitter']),
    handle: z.string().describe('Username/handle for the creator'),
    bio: z.string().optional().describe('Bio text (to extract email from)'),
    linktreeUrl: z.string().optional().describe('Linktree URL if found in bio'),
  },
  async (args) => {
    const providersTriled: string[] = [];
    let email: string | null = null;
    let source: string | null = null;
    let totalCost = 0;

    // Helper to extract email from text
    const extractEmailFromText = (text: string): string | null => {
      if (!text) return null;
      const emailRegex = /[\w.-]+@[\w.-]+\.\w{2,}/gi;
      const matches = text.match(emailRegex);
      if (matches && matches.length > 0) {
        const validEmails = matches.filter(e =>
          !e.includes('example.com') &&
          !e.includes('test.com') &&
          !e.includes('youremail') &&
          !e.includes('email.com')
        );
        return validEmails.length > 0 ? validEmails[0] : null;
      }
      return null;
    };

    // Step 1: Bio text extraction (FREE)
    if (args.bio) {
      providersTriled.push('bio_extraction');
      email = extractEmailFromText(args.bio);
      if (email) {
        source = 'bio_extraction';
      }
    }

    // Step 2: Linktree scraping (FREE)
    if (!email && args.linktreeUrl) {
      providersTriled.push('linktree');
      const budget = checkBudget(0);
      if (budget.allowed) {
        const result = await runApifyActor(ACTORS.linktree_email, {
          startUrls: [{ url: args.linktreeUrl }],
        }, { waitSecs: 30 });

        if (result.success && result.data?.[0]) {
          const ltData = result.data[0];
          email = ltData.email || ltData.emails?.[0] || extractEmailFromText(JSON.stringify(ltData));
          if (email) source = 'linktree';
        }
      }
    }

    // Step 3: YouTube email scraper
    if (!email && (args.platform === 'youtube' || args.handle.includes('youtube'))) {
      providersTriled.push('youtube_email');
      const budget = checkBudget(COST_ESTIMATES.email_lookup);
      if (budget.allowed) {
        const result = await runApifyActor(ACTORS.youtube_email, {
          handles: [args.handle.replace('@', '')],
        }, { waitSecs: 60 });

        totalCost += result.cost || COST_ESTIMATES.email_lookup;

        if (result.success && result.data?.[0]?.email) {
          email = result.data[0].email;
          source = 'youtube_email';
        }
      }
    }

    // Step 4: TikTok email scraper
    if (!email && (args.platform === 'tiktok' || args.handle.includes('tiktok'))) {
      providersTriled.push('tiktok_email');
      const budget = checkBudget(COST_ESTIMATES.email_lookup);
      if (budget.allowed) {
        const handle = args.handle.replace('@', '');
        const result = await runApifyActor(ACTORS.tiktok_email, {
          startUrls: [{ url: `https://www.tiktok.com/@${handle}` }],
        }, { waitSecs: 60 });

        totalCost += result.cost || COST_ESTIMATES.email_lookup;

        if (result.success && result.data?.[0]?.email) {
          email = result.data[0].email;
          source = 'tiktok_email';
        }
      }
    }

    // Step 5: Generic social scraper (fallback)
    if (!email) {
      providersTriled.push('generic_email');
      const budget = checkBudget(COST_ESTIMATES.email_lookup);
      if (budget.allowed) {
        const result = await runApifyActor(ACTORS.generic_email, {
          platform: args.platform,
          username: args.handle.replace('@', ''),
        }, { waitSecs: 60 });

        totalCost += result.cost || COST_ESTIMATES.email_lookup;

        if (result.success && result.data?.[0]?.email) {
          email = result.data[0].email;
          source = 'generic_email';
        }
      }
    }

    // Record usage
    if (totalCost > 0) {
      recordUsage('email-waterfall', totalCost, email ? 1 : 0, 'email');
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          found: !!email,
          email,
          source,
          providersTriled,
          totalCost: totalCost.toFixed(3),
          platform: args.platform,
          handle: args.handle,
        }, null, 2),
      }],
    };
  }
);

// ============================================================================
// Cost Control
// ============================================================================

server.tool(
  'apify_estimate_cost',
  `Estimate the cost of a discovery run before executing it. Use this to plan and stay within budget.`,
  {
    searches: z.number().describe('Number of search queries to run'),
    resultsPerSearch: z.number().optional().default(20),
    platforms: z.array(z.enum(['youtube', 'tiktok', 'instagram', 'twitter'])).optional(),
    profiles: z.number().optional().default(0).describe('Number of profiles to enrich'),
  },
  async (args) => {
    const usage = loadUsage();
    const remaining = APIFY_DAILY_BUDGET - usage.totalCost;

    // Calculate estimated costs
    const platforms = args.platforms || ['youtube', 'tiktok', 'instagram', 'twitter'];

    // Average cost across platforms
    const avgSearchCost = platforms.reduce((sum, p) => {
      const cost = p === 'instagram' || p === 'twitter'
        ? COST_ESTIMATES.instagram_search
        : COST_ESTIMATES.youtube_search;
      return sum + cost;
    }, 0) / platforms.length;

    const searchCost = args.searches * avgSearchCost * Math.ceil(args.resultsPerSearch / 10);
    const profileCost = args.profiles * COST_ESTIMATES.profile_scrape;
    const totalEstimate = searchCost + profileCost;

    const withinBudget = totalEstimate <= remaining;

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          estimate: {
            searches: searchCost.toFixed(3),
            profiles: profileCost.toFixed(3),
            total: totalEstimate.toFixed(3),
          },
          budget: {
            daily: APIFY_DAILY_BUDGET.toFixed(2),
            spent: usage.totalCost.toFixed(2),
            remaining: remaining.toFixed(2),
          },
          withinBudget,
          recommendation: withinBudget
            ? 'Proceed with discovery'
            : `Reduce scope. Try ${Math.floor(remaining / avgSearchCost)} searches or wait until tomorrow.`,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'apify_get_usage',
  `Get current Apify usage statistics for today. Check this before running expensive operations.`,
  {},
  async () => {
    const usage = loadUsage();
    const remaining = APIFY_DAILY_BUDGET - usage.totalCost;

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          date: usage.date,
          totalCost: usage.totalCost.toFixed(3),
          dailyBudget: APIFY_DAILY_BUDGET.toFixed(2),
          remaining: remaining.toFixed(2),
          percentUsed: ((usage.totalCost / APIFY_DAILY_BUDGET) * 100).toFixed(1) + '%',
          operations: {
            searches: usage.searches,
            profiles: usage.profiles,
            emails: usage.emails,
          },
          recentRuns: usage.runs.slice(-5).map(r => ({
            time: r.timestamp.split('T')[1].split('.')[0],
            actor: r.actor.split('/')[1] || r.actor,
            cost: r.cost.toFixed(3),
            results: r.resultCount,
          })),
        }, null, 2),
      }],
    };
  }
);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);

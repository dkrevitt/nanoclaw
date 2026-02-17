/**
 * TSG Backend API Utilities
 *
 * Standardized API calls for the creator discovery workflows.
 * Handles authentication, error handling, and response parsing.
 *
 * Usage from shell:
 *   npx tsx src/utils/api.ts <command> [args...]
 *
 * Usage from TypeScript:
 *   import { getTopics, executeSearch } from './utils/api.js';
 */

// Load environment variables
const API_URL = process.env.TSG_API_URL || 'https://tsg-extension-backend-pink.vercel.app';
const API_KEY = process.env.TSG_API_KEY || '';

if (!API_KEY) {
  console.error('Error: TSG_API_KEY environment variable is required');
  console.error('Set it with: export TSG_API_KEY="your-api-key"');
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: any
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${path}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return { success: true, data };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

// ============================================================================
// Projects & Topics
// ============================================================================

export interface Project {
  id: string;
  name: string;
  description?: string;
  review_criteria?: any;
}

export interface Topic {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  review_criteria?: any;
  saved_searches?: SavedSearch[];
}

export interface SavedSearch {
  id: string;
  topic_id: string;
  project_id: string;
  search_query: string;
  platform: string;
  search_url?: string;
  last_executed_at?: string;
  last_execution_status?: string;
  last_execution_result_count?: number;
}

export async function getProjects(): Promise<ApiResponse<{ projects: Project[] }>> {
  return apiRequest('GET', '/projects');
}

export async function getProject(projectId: string): Promise<ApiResponse<Project>> {
  return apiRequest('GET', `/projects/${projectId}`);
}

export async function getTopics(projectId: string): Promise<ApiResponse<{ topics: Topic[] }>> {
  return apiRequest('GET', `/topics?project_id=${projectId}`);
}

export async function getTopic(topicId: string): Promise<ApiResponse<Topic>> {
  return apiRequest('GET', `/topics/${topicId}`);
}

export async function getSavedSearches(topicId: string): Promise<ApiResponse<{ saved_searches: SavedSearch[] }>> {
  return apiRequest('GET', `/saved-searches?topic_id=${topicId}`);
}

// ============================================================================
// Discovery & Search
// ============================================================================

export interface ExecuteSearchResult {
  savedSearch: {
    id: string;
    search_query: string;
    platform: string;
  };
  results: {
    discovered: number;
    skipped: number;
    discoveries: any[];
  };
  execution: any;
  enrichment?: {
    requested: number;
    succeeded: number;
    failed: number;
  };
}

export async function executeSearch(
  savedSearchId: string,
  options?: { autoEnrich?: boolean }
): Promise<ApiResponse<ExecuteSearchResult>> {
  return apiRequest('POST', '/apify/execute-search', {
    savedSearchId,
    autoEnrich: options?.autoEnrich ?? true,
  });
}

export async function testSearch(
  savedSearchId: string,
  options?: { maxResults?: number }
): Promise<ApiResponse<any>> {
  return apiRequest('POST', '/apify/test-execute', {
    savedSearchId,
    dryRun: true,
    maxResults: options?.maxResults,
  });
}

// ============================================================================
// Creators
// ============================================================================

export interface Creator {
  id: string;
  primary_platform: string;
  primary_handle: string;
  display_name?: string;
  bio?: string;
  follower_count?: number;
  engagement_rate?: number;
  pipeline_status: string;
  enrichment_tier: number;
  recent_posts?: any[];
  enrichment_metadata?: any;
  saved_search_ids?: string[];

  // Tier 2 enrichment (Apify preliminary)
  tier2_status?: 'pending' | 'in_progress' | 'success' | 'failed';
  tier2_metadata?: Record<string, any>;
  tier2_enriched_at?: string;
  tier2_error?: string;
  tier2_api_response?: Record<string, any>;

  // Tier 3 enrichment (influencers.club full)
  tier3_status?: 'pending' | 'in_progress' | 'success' | 'failed';
  tier3_metadata?: Record<string, any>;
  tier3_enriched_at?: string;
  tier3_error?: string;
  tier3_api_response?: Record<string, any>;
}

export interface GetCreatorsOptions {
  projectId?: string;
  topicId?: string;
  pipelineStatus?: string;
  platform?: string;
  limit?: number;
  offset?: number;
  excludeReviewedForTopic?: string;
}

export async function getCreators(options: GetCreatorsOptions = {}): Promise<ApiResponse<{ creators: Creator[]; total: number }>> {
  const params = new URLSearchParams();
  if (options.projectId) params.append('project_id', options.projectId);
  if (options.topicId) params.append('topic_id', options.topicId);
  if (options.pipelineStatus) params.append('pipeline_status', options.pipelineStatus);
  if (options.platform) params.append('platform', options.platform);
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.offset) params.append('offset', options.offset.toString());
  if (options.excludeReviewedForTopic) params.append('exclude_reviewed_for_topic', options.excludeReviewedForTopic);

  const queryString = params.toString();
  return apiRequest('GET', `/creators${queryString ? `?${queryString}` : ''}`);
}

export async function getCreator(creatorId: string): Promise<ApiResponse<Creator>> {
  return apiRequest('GET', `/creators/${creatorId}`);
}

export async function searchCreatorsByContent(
  keywords: string[],
  options?: {
    projectId?: string;
    topicId?: string;
    platform?: string;
    minFollowers?: number;
    limit?: number;
    dryRun?: boolean;
  }
): Promise<ApiResponse<{
  matches: any[];
  total: number;
  linked: number;
  alreadyLinked: number;
}>> {
  return apiRequest('POST', '/creators/search-by-content', {
    keywords,
    projectId: options?.projectId,
    topicId: options?.topicId,
    platform: options?.platform,
    minFollowers: options?.minFollowers,
    limit: options?.limit || 50,
    dryRun: options?.dryRun || false,
  });
}

// ============================================================================
// Internal Discovery
// ============================================================================

export interface InternalDiscoveryResult {
  discovered: number;
  linkedToProject: number;
  alreadyLinked: number;
  message: string;
}

export async function executeInternalDiscovery(options: {
  savedSearchId: string;
  projectId: string;
  topicId?: string;
}): Promise<ApiResponse<InternalDiscoveryResult>> {
  return apiRequest('POST', '/internal-discovery/execute', {
    savedSearchId: options.savedSearchId,
    projectId: options.projectId,
    topicId: options.topicId,
  });
}

// ============================================================================
// Reviews
// ============================================================================

export interface SubmitReviewOptions {
  creatorId: string;
  projectId: string;
  topicId: string;
  action: 'approved' | 'skipped' | 'pending_review';
  reviewFeedback: string;
  reviewerType?: 'human' | 'agent'; // Who made the review (defaults to 'agent' for CLI)
  savedPosts?: Array<{
    post_url: string;
    post_title?: string;
    relevance_note?: string;
  }>;
}

export async function submitReview(options: SubmitReviewOptions): Promise<ApiResponse<any>> {
  return apiRequest('POST', `/creators/${options.creatorId}/review`, {
    projectId: options.projectId,
    topicId: options.topicId,
    action: options.action,
    reviewFeedback: options.reviewFeedback,
    reviewerType: options.reviewerType || 'agent', // Default to 'agent' for CLI/agent usage
    savedPosts: options.savedPosts,
  });
}

export async function getCreatorReviews(
  creatorId: string,
  options?: { projectId?: string; topicId?: string }
): Promise<ApiResponse<{ reviews: any[] }>> {
  const params = new URLSearchParams();
  if (options?.projectId) params.append('project_id', options.projectId);
  if (options?.topicId) params.append('topic_id', options.topicId);

  const queryString = params.toString();
  return apiRequest('GET', `/creators/${creatorId}/reviews${queryString ? `?${queryString}` : ''}`);
}

// ============================================================================
// Enrichment
// ============================================================================

export async function enrichCreator(
  creatorId: string,
  tier: 'preliminary' | 'full' = 'preliminary'
): Promise<ApiResponse<any>> {
  return apiRequest('POST', `/creators/${creatorId}/enrich`, { tier });
}

export async function batchEnrichCreators(
  creatorIds: string[],
  tier: 'preliminary' | 'full' = 'preliminary'
): Promise<ApiResponse<any>> {
  const endpoint = tier === 'full' ? '/creators/batch-enrich-full' : '/creators/batch-enrich';
  return apiRequest('POST', endpoint, { creatorIds });
}

// ============================================================================
// Saved Searches Management
// ============================================================================

export interface CreateSavedSearchOptions {
  topicId: string;
  projectId: string;
  searchQuery: string;
  platform: string;
  searchUrl?: string;
}

export async function createSavedSearch(options: CreateSavedSearchOptions): Promise<ApiResponse<SavedSearch>> {
  return apiRequest('POST', '/saved-searches', {
    topicId: options.topicId,
    projectId: options.projectId,
    searchQuery: options.searchQuery,
    platform: options.platform,
    searchUrl: options.searchUrl,
  });
}

export async function deleteSavedSearch(searchId: string): Promise<ApiResponse<void>> {
  return apiRequest('DELETE', `/saved-searches/${searchId}`);
}

// ============================================================================
// Content Items (Proposals)
// ============================================================================

export interface ContentItem {
  id: string;
  project_id: string;
  topic_id: string | null;
  creator_id: string;
  name: string;
  description: string | null;
  format: string;
  platform: string | null;
  cost: number | null;
  target_cpm: number | null;
  target_impressions: number | null;
  sow_link: string | null;
  launch_date: string | null;
  published_url: string | null;
  actual_views: number | null;
  actual_likes: number | null;
  actual_comments: number | null;
  status: string;
  post_quantity: number | null;
  proposal_source: string | null;
  proposal_raw_text: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  creator?: Creator;
}

export interface CreateContentItemOptions {
  projectId: string;
  topicId?: string;
  creatorId: string;
  name: string;
  description?: string;
  format: string;
  platform?: string;
  cost?: number;
  targetCpm?: number;
  targetImpressions?: number;
  sowLink?: string;
  launchDate?: string;
  status?: string;
  postQuantity?: number;
  proposalSource?: string;
  proposalRawText?: string;
}

export async function getContentItem(contentItemId: string): Promise<ApiResponse<{ contentItem: ContentItem }>> {
  return apiRequest('GET', `/content-items/${contentItemId}`);
}

export async function getContentItems(options: {
  projectId?: string;
  topicId?: string;
  creatorId?: string;
  status?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<ApiResponse<{ contentItems: ContentItem[]; total: number }>> {
  const params = new URLSearchParams();
  if (options.projectId) params.append('project_id', options.projectId);
  if (options.topicId) params.append('topic_id', options.topicId);
  if (options.creatorId) params.append('creator_id', options.creatorId);
  if (options.status) params.append('status', options.status);
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.offset) params.append('offset', options.offset.toString());

  const queryString = params.toString();
  return apiRequest('GET', `/content-items${queryString ? `?${queryString}` : ''}`);
}

export async function createContentItem(options: CreateContentItemOptions): Promise<ApiResponse<{ contentItem: ContentItem }>> {
  return apiRequest('POST', '/content-items', {
    projectId: options.projectId,
    topicId: options.topicId,
    creatorId: options.creatorId,
    name: options.name,
    description: options.description,
    format: options.format,
    platform: options.platform,
    cost: options.cost,
    targetCpm: options.targetCpm,
    targetImpressions: options.targetImpressions,
    sowLink: options.sowLink,
    launchDate: options.launchDate,
    status: options.status || 'planned',
    postQuantity: options.postQuantity,
    proposalSource: options.proposalSource,
    proposalRawText: options.proposalRawText,
  });
}

export async function updateContentItem(
  contentItemId: string,
  updates: Partial<CreateContentItemOptions>
): Promise<ApiResponse<{ contentItem: ContentItem }>> {
  return apiRequest('PUT', `/content-items/${contentItemId}`, updates);
}

// ============================================================================
// Recent Posts (Extended Post History for ROI Analysis)
// ============================================================================

export interface RecentPost {
  post_id?: string;
  post_url?: string;
  created_at?: string;
  caption?: string;
  hashtags?: string[];
  engagement?: {
    likes?: number;
    comments?: number;
    views?: number;
    shares?: number;
  };
  platform?: string;
  is_sponsored?: boolean;
  sponsorship_signals?: string[];
}

export async function getRecentPosts(
  creatorId: string,
  options: { limit?: number; sponsoredOnly?: boolean } = {}
): Promise<ApiResponse<{ posts: RecentPost[]; total: number; sponsoredCount: number }>> {
  const params = new URLSearchParams();
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.sponsoredOnly) params.append('sponsored_only', 'true');

  const queryString = params.toString();
  return apiRequest('GET', `/creators/${creatorId}/recent-posts${queryString ? `?${queryString}` : ''}`);
}

export async function fetchExtendedPosts(
  creatorId: string,
  options: { maxDaysBack?: number; maxPosts?: number } = {}
): Promise<ApiResponse<{ success: boolean; postsFound: number; postsUpserted: number; sponsoredCount: number }>> {
  return apiRequest('POST', `/creators/${creatorId}/fetch-extended-posts`, {
    maxDaysBack: options.maxDaysBack || 365,
    maxPosts: options.maxPosts || 100,
  });
}

// ============================================================================
// CLI Interface
// ============================================================================

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    console.log(`
TSG API CLI

Usage: npx tsx src/utils/api.ts <command> [args...]

Commands:
  projects                          List all projects
  project <id>                      Get project details
  topics <projectId>                List topics for a project
  topic <id>                        Get topic details with saved searches
  searches <topicId>                List saved searches for a topic

  creators [options]                List creators
    --project-id <id>               Filter by project
    --topic-id <id>                 Filter by topic
    --status <status>               Filter by pipeline status
    --limit <n>                     Limit results

  execute-search <searchId>         Execute a saved search
  test-search <searchId>            Dry-run a search (no save)

  internal-discovery                Execute internal discovery
    --saved-search-id <id>          Saved search ID (required)
    --project-id <id>               Project ID (required)
    --topic-id <id>                 Topic ID (optional)

  search-by-content                 Search creators by keywords
    --keywords <csv>                Comma-separated keywords (required)
    --project-id <id>               Project ID (required)
    --topic-id <id>                 Topic ID (required)
    --platform <name>               Filter by platform (optional)
    --min-followers <n>             Minimum follower count (optional)
    --limit <n>                     Max results (default: 50)
    --dry-run                       Preview without linking (optional)

  review <creatorId>                Submit a review
    --project-id <id>               Project ID (required)
    --topic-id <id>                 Topic ID (required)
    --action <action>               approved|skipped|pending_review
    --feedback <text>               Review feedback

Environment:
  TSG_API_URL                       API base URL (default: production)
  TSG_API_KEY                       API key (required)
`);
    process.exit(0);
  }

  let result: ApiResponse<any>;

  switch (command) {
    case 'projects':
      result = await getProjects();
      break;

    case 'project':
      if (!args[0]) {
        console.error('Usage: project <id>');
        process.exit(1);
      }
      result = await getProject(args[0]);
      break;

    case 'topics':
      if (!args[0]) {
        console.error('Usage: topics <projectId>');
        process.exit(1);
      }
      result = await getTopics(args[0]);
      break;

    case 'topic':
      if (!args[0]) {
        console.error('Usage: topic <id>');
        process.exit(1);
      }
      result = await getTopic(args[0]);
      break;

    case 'searches':
      if (!args[0]) {
        console.error('Usage: searches <topicId>');
        process.exit(1);
      }
      result = await getSavedSearches(args[0]);
      break;

    case 'creators': {
      const options: GetCreatorsOptions = {};
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--project-id' && args[i + 1]) options.projectId = args[++i];
        if (args[i] === '--topic-id' && args[i + 1]) options.topicId = args[++i];
        if (args[i] === '--status' && args[i + 1]) options.pipelineStatus = args[++i];
        if (args[i] === '--limit' && args[i + 1]) options.limit = parseInt(args[++i]);
      }
      result = await getCreators(options);
      break;
    }

    case 'execute-search':
      if (!args[0]) {
        console.error('Usage: execute-search <searchId>');
        process.exit(1);
      }
      result = await executeSearch(args[0]);
      break;

    case 'test-search':
      if (!args[0]) {
        console.error('Usage: test-search <searchId>');
        process.exit(1);
      }
      result = await testSearch(args[0]);
      break;

    case 'internal-discovery': {
      let savedSearchId = '', projectId = '', topicId = '';
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--saved-search-id' && args[i + 1]) savedSearchId = args[++i];
        if (args[i] === '--project-id' && args[i + 1]) projectId = args[++i];
        if (args[i] === '--topic-id' && args[i + 1]) topicId = args[++i];
      }
      if (!savedSearchId || !projectId) {
        console.error('Usage: internal-discovery --saved-search-id <id> --project-id <id> [--topic-id <id>]');
        process.exit(1);
      }
      result = await executeInternalDiscovery({
        savedSearchId,
        projectId,
        topicId: topicId || undefined,
      });
      break;
    }

    case 'search-by-content': {
      let keywords = '', projectId = '', topicId = '', platform = '';
      let minFollowers = 0, limit = 50, dryRun = false;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--keywords' && args[i + 1]) keywords = args[++i];
        if (args[i] === '--project-id' && args[i + 1]) projectId = args[++i];
        if (args[i] === '--topic-id' && args[i + 1]) topicId = args[++i];
        if (args[i] === '--platform' && args[i + 1]) platform = args[++i];
        if (args[i] === '--min-followers' && args[i + 1]) minFollowers = parseInt(args[++i]);
        if (args[i] === '--limit' && args[i + 1]) limit = parseInt(args[++i]);
        if (args[i] === '--dry-run') dryRun = true;
      }
      if (!keywords || !projectId || !topicId) {
        console.error('Usage: search-by-content --keywords <csv> --project-id <id> --topic-id <id> [options]');
        process.exit(1);
      }
      result = await searchCreatorsByContent(
        keywords.split(',').map(k => k.trim()),
        {
          projectId,
          topicId,
          platform: platform || undefined,
          minFollowers: minFollowers || undefined,
          limit,
          dryRun,
        }
      );
      break;
    }

    case 'review': {
      if (!args[0]) {
        console.error('Usage: review <creatorId> --project-id <id> --topic-id <id> --action <action> --feedback <text> [--reviewer-type human|agent]');
        process.exit(1);
      }
      const creatorId = args[0];
      let projectId = '', topicId = '', action = '', feedback = '', reviewerType = '';
      for (let i = 1; i < args.length; i++) {
        if (args[i] === '--project-id' && args[i + 1]) projectId = args[++i];
        if (args[i] === '--topic-id' && args[i + 1]) topicId = args[++i];
        if (args[i] === '--action' && args[i + 1]) action = args[++i];
        if (args[i] === '--feedback' && args[i + 1]) feedback = args[++i];
        if (args[i] === '--reviewer-type' && args[i + 1]) reviewerType = args[++i];
      }
      if (!projectId || !topicId || !action) {
        console.error('Missing required options: --project-id, --topic-id, --action');
        process.exit(1);
      }
      result = await submitReview({
        creatorId,
        projectId,
        topicId,
        action: action as 'approved' | 'skipped' | 'pending_review',
        reviewFeedback: feedback,
        reviewerType: (reviewerType as 'human' | 'agent') || undefined, // defaults to 'agent' in submitReview
      });
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }

  if (result.success) {
    console.log(JSON.stringify(result.data, null, 2));
  } else {
    console.error('Error:', result.error);
    process.exit(1);
  }
}

// Run CLI if executed directly
if (process.argv[1]?.includes('api.ts')) {
  main().catch(console.error);
}

/**
 * TSG Backend API Utilities (Storage Only)
 *
 * CRUD operations for projects, topics, and creators.
 * All workflow logic (search, enrichment, review) lives in NanoClaw.
 *
 * Usage from shell:
 *   npx tsx src/utils/api.ts <command> [args...]
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

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  path: string,
  body?: any,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: text.slice(0, 500) || `HTTP ${response.status}: Non-JSON response`,
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return { success: true, data };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: `Request timed out after ${timeoutMs / 1000}s`,
      };
    }
    return {
      success: false,
      error: error.message || 'Network error',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// Projects & Topics
// ============================================================================

export interface Project {
  id: string;
  name: string;
  description?: string;
}

export interface Topic {
  id: string;
  project_id: string;
  name: string;
  description?: string;
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

// ============================================================================
// Creators (CRUD)
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
  recent_posts?: any[];
  enrichment_metadata?: any;
}

export interface GetCreatorsOptions {
  projectId?: string;
  topicId?: string;
  pipelineStatus?: string;
  platform?: string;
  limit?: number;
  offset?: number;
}

export async function getCreators(options: GetCreatorsOptions = {}): Promise<ApiResponse<{ creators: Creator[]; total: number }>> {
  const params = new URLSearchParams();
  if (options.projectId) params.append('project_id', options.projectId);
  if (options.topicId) params.append('topic_id', options.topicId);
  if (options.pipelineStatus) params.append('pipeline_status', options.pipelineStatus);
  if (options.platform) params.append('platform', options.platform);
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.offset) params.append('offset', options.offset.toString());

  const queryString = params.toString();
  return apiRequest('GET', `/creators${queryString ? `?${queryString}` : ''}`);
}

export async function getCreator(creatorId: string): Promise<ApiResponse<Creator>> {
  return apiRequest('GET', `/creators/${creatorId}`);
}

export interface CreateCreatorOptions {
  primary_platform: string;
  primary_handle: string;
  display_name?: string;
  bio?: string;
  email?: string;
  follower_count?: number;
  profile_url?: string;
  avatar_url?: string;
  enrichment_metadata?: any;
}

export async function createCreator(options: CreateCreatorOptions): Promise<ApiResponse<Creator>> {
  // API expects camelCase field names
  const payload = {
    primaryPlatform: options.primary_platform,
    primaryHandle: options.primary_handle,
    displayName: options.display_name,
    bio: options.bio,
    email: options.email,
    followerCount: options.follower_count,
    profileUrl: options.profile_url,
    avatarUrl: options.avatar_url,
    enrichmentMetadata: options.enrichment_metadata,
  };
  return apiRequest('POST', '/creators', payload);
}

export async function updateCreator(
  creatorId: string,
  updates: Partial<CreateCreatorOptions>
): Promise<ApiResponse<Creator>> {
  // API expects camelCase field names
  const payload: Record<string, any> = {};
  if (updates.primary_platform !== undefined) payload.primaryPlatform = updates.primary_platform;
  if (updates.primary_handle !== undefined) payload.primaryHandle = updates.primary_handle;
  if (updates.display_name !== undefined) payload.displayName = updates.display_name;
  if (updates.bio !== undefined) payload.bio = updates.bio;
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.follower_count !== undefined) payload.followerCount = updates.follower_count;
  if (updates.profile_url !== undefined) payload.profileUrl = updates.profile_url;
  if (updates.avatar_url !== undefined) payload.avatarUrl = updates.avatar_url;
  if (updates.enrichment_metadata !== undefined) payload.enrichmentMetadata = updates.enrichment_metadata;
  return apiRequest('PATCH', `/creators/${creatorId}`, payload);
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
  reviewerType?: 'human' | 'agent';
}

export async function submitReview(options: SubmitReviewOptions): Promise<ApiResponse<any>> {
  return apiRequest('POST', `/creators/${options.creatorId}/review`, {
    projectId: options.projectId,
    topicId: options.topicId,
    action: options.action,
    reviewFeedback: options.reviewFeedback,
    reviewerType: options.reviewerType || 'agent',
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
// Link Creator to Project
// ============================================================================

export async function linkCreatorToProject(
  creatorId: string,
  projectId: string,
  topicId?: string
): Promise<ApiResponse<any>> {
  return apiRequest('POST', `/creators/${creatorId}/link`, {
    projectId,
    topicId,
  });
}

// ============================================================================
// CLI Interface
// ============================================================================

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    console.log(`
TSG API CLI (Storage Only)

Usage: npx tsx src/utils/api.ts <command> [args...]

Commands:
  projects                          List all projects
  project <id>                      Get project details
  topics <projectId>                List topics for a project
  topic <id>                        Get topic details

  creators [options]                List creators
    --project-id <id>               Filter by project
    --topic-id <id>                 Filter by topic
    --status <status>               Filter by pipeline status
    --limit <n>                     Limit results

  creator <id>                      Get single creator

  create-creator                    Create a new creator
    --platform <platform>           Primary platform (required)
    --handle <handle>               Primary handle (required)
    --name <name>                   Display name
    --bio <bio>                     Bio text
    --followers <n>                 Follower count

  link-creator <creatorId>          Link creator to project
    --project-id <id>               Project ID (required)
    --topic-id <id>                 Topic ID (optional)

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

    case 'creator':
      if (!args[0]) {
        console.error('Usage: creator <id>');
        process.exit(1);
      }
      result = await getCreator(args[0]);
      break;

    case 'create-creator': {
      let platform = '', handle = '', name = '', bio = '', email = '', profileUrl = '';
      let followers = 0;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--platform' && args[i + 1]) platform = args[++i];
        if (args[i] === '--handle' && args[i + 1]) handle = args[++i];
        if (args[i] === '--name' && args[i + 1]) name = args[++i];
        if (args[i] === '--bio' && args[i + 1]) bio = args[++i];
        if (args[i] === '--email' && args[i + 1]) email = args[++i];
        if (args[i] === '--profile-url' && args[i + 1]) profileUrl = args[++i];
        if (args[i] === '--followers' && args[i + 1]) followers = parseInt(args[++i]);
      }
      if (!platform || !handle) {
        console.error('Usage: create-creator --platform <platform> --handle <handle> [--name <name>] [--bio <bio>] [--email <email>] [--profile-url <url>] [--followers <n>]');
        process.exit(1);
      }
      result = await createCreator({
        primary_platform: platform,
        primary_handle: handle,
        display_name: name || undefined,
        email: email || undefined,
        profile_url: profileUrl || undefined,
        bio: bio || undefined,
        follower_count: followers || undefined,
      });
      break;
    }

    case 'link-creator': {
      if (!args[0]) {
        console.error('Usage: link-creator <creatorId> --project-id <id> [--topic-id <id>]');
        process.exit(1);
      }
      const creatorId = args[0];
      let projectId = '', topicId = '';
      for (let i = 1; i < args.length; i++) {
        if (args[i] === '--project-id' && args[i + 1]) projectId = args[++i];
        if (args[i] === '--topic-id' && args[i + 1]) topicId = args[++i];
      }
      if (!projectId) {
        console.error('Missing required: --project-id');
        process.exit(1);
      }
      result = await linkCreatorToProject(creatorId, projectId, topicId || undefined);
      break;
    }

    case 'review': {
      if (!args[0]) {
        console.error('Usage: review <creatorId> --project-id <id> --topic-id <id> --action <action> --feedback <text>');
        process.exit(1);
      }
      const creatorId = args[0];
      let projectId = '', topicId = '', action = '', feedback = '';
      for (let i = 1; i < args.length; i++) {
        if (args[i] === '--project-id' && args[i + 1]) projectId = args[++i];
        if (args[i] === '--topic-id' && args[i + 1]) topicId = args[++i];
        if (args[i] === '--action' && args[i + 1]) action = args[++i];
        if (args[i] === '--feedback' && args[i + 1]) feedback = args[++i];
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

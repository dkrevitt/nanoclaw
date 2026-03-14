/**
 * Deterministic pre-filter utilities for creator review workflow
 *
 * These checks run BEFORE Claude evaluation to automatically skip
 * discoveries that fail objective criteria.
 */

export interface PreFilterOptions {
  minFollowers: number;      // Default: 1000
  maxDaysInactive: number;   // Default: 30
}

export interface PreFilterResult {
  pass: boolean;
  reasons: string[];
  details: Record<string, any>;
  needsEnrichmentCheck: boolean;  // True if missing post data - needs enrichment retry before review
}

export const DEFAULT_PREFILTER_OPTIONS: PreFilterOptions = {
  minFollowers: 1000,
  maxDaysInactive: 30,
};

/**
 * Detect language from text using character patterns
 * Returns ISO 639-1 codes: 'en', 'vi', 'cjk', 'ru', 'ar', 'th', 'hi', 'es', 'unknown'
 */
export function detectLanguage(text: string): string {
  if (!text || text.length < 30) return 'unknown';

  // Vietnamese (diacritics are distinctive)
  const vietnamesePattern = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  if (vietnamesePattern.test(text)) return 'vi';

  // Chinese/Japanese/Korean (CJK characters)
  const cjkPattern = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/;
  if (cjkPattern.test(text)) return 'cjk';

  // Russian/Cyrillic
  const cyrillicPattern = /[\u0400-\u04ff]/;
  if (cyrillicPattern.test(text)) return 'ru';

  // Arabic
  const arabicPattern = /[\u0600-\u06ff]/;
  if (arabicPattern.test(text)) return 'ar';

  // Thai
  const thaiPattern = /[\u0e00-\u0e7f]/;
  if (thaiPattern.test(text)) return 'th';

  // Hindi/Devanagari
  const hindiPattern = /[\u0900-\u097f]/;
  if (hindiPattern.test(text)) return 'hi';

  // Spanish/Portuguese (distinctive characters)
  const spanishPattern = /[¿¡ñáéíóúü]/i;
  if (spanishPattern.test(text)) return 'es';

  // Default: if mostly Latin characters, assume English
  const latinRatio = (text.match(/[a-zA-Z]/g) || []).length / text.length;
  return latinRatio > 0.5 ? 'en' : 'unknown';
}

/**
 * Get human-readable language name from code
 */
export function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    'vi': 'Vietnamese',
    'cjk': 'Chinese/Japanese/Korean',
    'ru': 'Russian',
    'ar': 'Arabic',
    'th': 'Thai',
    'hi': 'Hindi',
    'es': 'Spanish/Portuguese',
    'en': 'English',
    'unknown': 'Unknown',
  };
  return names[code] || code;
}

/**
 * Parse post date from various formats (ISO, relative)
 */
export function parsePostDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;

  // Handle ISO dates
  if (dateStr.includes('T') || dateStr.includes('-')) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  }

  // Handle relative dates like "2 days ago", "1 week ago"
  const relativeMatch = dateStr.match(/(\d+)\s*(day|week|month|hour)s?\s*ago/i);
  if (relativeMatch) {
    const num = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();
    const now = new Date();
    if (unit === 'hour') return new Date(now.getTime() - num * 60 * 60 * 1000);
    if (unit === 'day') return new Date(now.getTime() - num * 24 * 60 * 60 * 1000);
    if (unit === 'week') return new Date(now.getTime() - num * 7 * 24 * 60 * 60 * 1000);
    if (unit === 'month') return new Date(now.getTime() - num * 30 * 24 * 60 * 60 * 1000);
  }

  return null;
}

/**
 * Run deterministic pre-filter checks on a discovery
 *
 * @param discovery - The discovery object with enrichment data
 * @param options - Pre-filter configuration options
 * @returns PreFilterResult with pass/fail and reasons
 */
export function preFilterDiscovery(
  discovery: any,
  options: PreFilterOptions = DEFAULT_PREFILTER_OPTIONS
): PreFilterResult {
  const { minFollowers, maxDaysInactive } = options;
  const reasons: string[] = [];
  const details: Record<string, any> = {};
  let needsEnrichmentCheck = false;

  // 1. FOLLOWER COUNT CHECK
  // Support both unified schema (follower_count directly) and legacy (engagement_metrics.follower_count)
  const followers = discovery.follower_count || discovery.engagement_metrics?.follower_count || 0;
  details.followers = followers;
  if (followers < minFollowers) {
    reasons.push(`Only ${followers} followers (min: ${minFollowers})`);
  }

  // 2. POST RECENCY CHECK
  const recentPosts = discovery.recent_posts || [];
  details.postCount = recentPosts.length;
  if (recentPosts.length === 0) {
    // Don't skip for missing posts - could be enrichment issue
    // Flag for enrichment check instead
    needsEnrichmentCheck = true;
    details.missingPosts = true;
  } else {
    const lastPostDate = parsePostDate(recentPosts[0]?.created_at);
    if (lastPostDate) {
      const daysSincePost = Math.floor((Date.now() - lastPostDate.getTime()) / (1000 * 60 * 60 * 24));
      details.daysSinceLastPost = daysSincePost;
      if (daysSincePost > maxDaysInactive) {
        reasons.push(`Last post ${daysSincePost} days ago (max: ${maxDaysInactive})`);
      }
    }
  }

  // 3. LANGUAGE DETECTION CHECK
  if (recentPosts.length > 0) {
    const allCaptions = recentPosts.map((p: any) => p.caption || '').join(' ');
    const detectedLang = detectLanguage(allCaptions);
    details.detectedLanguage = getLanguageName(detectedLang);
    details.sampleText = allCaptions.slice(0, 100);
    if (detectedLang !== 'en' && detectedLang !== 'unknown') {
      reasons.push(`Content in ${getLanguageName(detectedLang)}, not English`);
    }
  }

  // 4. LOCATION CHECK (if available)
  const location = (discovery.enrichment_metadata?.location || '').toLowerCase();
  details.location = location || 'not specified';
  const excludedRegions = ['india', 'pakistan', 'nigeria', 'bangladesh'];
  for (const region of excludedRegions) {
    if (location.includes(region)) {
      reasons.push(`Location "${location}" is in excluded region`);
      break;
    }
  }

  return {
    pass: reasons.length === 0,
    reasons,
    details,
    needsEnrichmentCheck,
  };
}

/**
 * Check a creator record against pre-filter criteria
 * (Used for auditing existing creators)
 *
 * @param creator - Creator record from the database
 * @param discovery - Optional discovery with recent_posts for language check
 * @param options - Pre-filter configuration options
 */
export function checkCreatorAgainstPrefilter(
  creator: { follower_count?: number; primary_handle?: string; primary_platform?: string },
  discovery?: { recent_posts?: any[] },
  options: PreFilterOptions = DEFAULT_PREFILTER_OPTIONS
): PreFilterResult {
  const reasons: string[] = [];
  const details: Record<string, any> = {};
  let needsEnrichmentCheck = false;

  // 1. Follower count
  const followers = creator.follower_count || 0;
  details.followers = followers;
  if (followers < options.minFollowers) {
    reasons.push(`FOLLOWERS: ${followers} < ${options.minFollowers}`);
  }

  // 2. Language (from discovery recent_posts)
  if (discovery?.recent_posts && discovery.recent_posts.length > 0) {
    const allCaptions = discovery.recent_posts.map((p: any) => p.caption || '').join(' ');
    const lang = detectLanguage(allCaptions);
    details.detectedLanguage = getLanguageName(lang);
    if (lang !== 'en' && lang !== 'unknown') {
      reasons.push(`LANGUAGE: ${getLanguageName(lang)}`);
    }
  } else {
    // Missing posts data - needs enrichment check
    needsEnrichmentCheck = true;
    details.missingPosts = true;
  }

  return {
    pass: reasons.length === 0,
    reasons,
    details,
    needsEnrichmentCheck,
  };
}

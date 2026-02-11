/**
 * Signal Normalizer — Unified signal format & pre-processing
 * 
 * Takes raw signals from all 4 sources and normalizes them into
 * a consistent format for clustering and scoring.
 */

/**
 * Normalize a raw signal into unified format
 * @param {Object} raw - Raw signal from any source
 * @returns {Object} Normalized signal
 */
function normalizeSignal(raw) {
  return {
    id: generateId(raw),
    source: raw.source || 'unknown',
    subSource: raw.subSource || raw.sub_source || 'unknown',
    
    // Content
    title: raw.name || raw.title || extractTitle(raw),
    text: raw.text || raw.description || '',
    url: raw.url || raw.news_url || raw.html_url || null,
    
    // Metadata
    date: raw.date || raw.createdAt || raw.collectedAt || new Date().toISOString(),
    collectedAt: raw.collectedAt || new Date().toISOString(),
    
    // Classification
    topics: dedupeTopics(raw.topics || []),
    sentiment: raw.sentiment || 'neutral',
    signalType: raw.signalType || classifySignalType(raw),
    
    // Metrics (source-specific)
    engagement: raw.engagement || null,
    stars: raw.stars || null,
    marketCap: raw.marketCap || null,
    
    // Source-specific extras
    username: raw.username || null,
    ticker: raw.ticker || null,
    address: raw.address || null,
    keyInsight: raw.keyInsight || null,
    dataPoint: raw.dataPoint || null,
  };
}

/**
 * Generate a simple ID for deduplication
 */
function generateId(raw) {
  const parts = [
    raw.source || '',
    raw.subSource || '',
    raw.url || raw.name || raw.text?.substring(0, 50) || '',
  ];
  // Simple hash
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `sig_${Math.abs(hash).toString(36)}`;
}

/**
 * Extract a title from raw signal content
 */
function extractTitle(raw) {
  if (raw.name) return raw.name;
  if (raw.text) return raw.text.substring(0, 100).trim();
  if (raw.ticker) return `$${raw.ticker}`;
  return 'Untitled Signal';
}

/**
 * Classify signal type based on content
 */
function classifySignalType(raw) {
  if (raw.source === 'github') return 'developer_activity';
  if (raw.source === 'research') return 'research_insight';
  if (raw.subSource?.includes('pumpfun') || raw.subSource?.includes('dexscreener')) return 'token_activity';
  if (raw.source === 'onchain') return 'onchain_activity';
  if (raw.source === 'social') {
    if (raw.subSource === 'kol') return 'kol_signal';
    if (raw.subSource === 'trending') return 'social_trending';
    return 'social_mention';
  }
  return 'general';
}

/**
 * De-duplicate and normalize topic tags
 */
function dedupeTopics(topics) {
  if (!Array.isArray(topics)) return [];
  const normalized = topics
    .map(t => String(t).toLowerCase().trim().replace(/\s+/g, '_'))
    .filter(t => t.length > 0 && t.length < 50);
  return [...new Set(normalized)];
}

/**
 * Batch normalize all signals and remove duplicates
 * @param {Array} rawSignals - Array of raw signals from all sources
 * @returns {Array} De-duplicated, normalized signals
 */
function normalizeAll(rawSignals) {
  const seen = new Set();
  const normalized = [];

  for (const raw of rawSignals) {
    const signal = normalizeSignal(raw);
    if (!seen.has(signal.id)) {
      seen.add(signal.id);
      normalized.push(signal);
    }
  }

  // Sort by date (newest first)
  normalized.sort((a, b) => new Date(b.date) - new Date(a.date));

  return normalized;
}

/**
 * Get signal statistics
 */
function getSignalStats(signals) {
  const bySource = {};
  const byType = {};
  const allTopics = {};

  for (const s of signals) {
    bySource[s.source] = (bySource[s.source] || 0) + 1;
    byType[s.signalType] = (byType[s.signalType] || 0) + 1;
    for (const t of s.topics) {
      allTopics[t] = (allTopics[t] || 0) + 1;
    }
  }

  // Top topics sorted by frequency
  const topTopics = Object.entries(allTopics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([topic, count]) => ({ topic, count }));

  return {
    total: signals.length,
    bySource,
    byType,
    topTopics,
    dateRange: {
      earliest: signals.length > 0 ? signals[signals.length - 1].date : null,
      latest: signals.length > 0 ? signals[0].date : null,
    },
  };
}

module.exports = {
  normalizeSignal,
  normalizeAll,
  getSignalStats,
};

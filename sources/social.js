/**
 * Social Signal Collector — X / KOL Monitoring
 * 
 * Uses Grok x_search to monitor key opinion leaders and ecosystem accounts
 * for emerging themes, project mentions, and sentiment shifts.
 */
const { searchX, askGrokForJson } = require('../services/grok');

// ==========================================
// KOL & Account Lists
// ==========================================

/** Tier 1: Core ecosystem leaders */
const TIER1_KOLS = [
  'aeyakovenko',    // Toly (Solana co-founder)
  '0xMert_',        // Mert (Helius CEO)
  'rajgokal',       // Raj (Solana co-founder)
  'armaboronkov',   // Armani (Solana Foundation)
];

/** Tier 2: Builders & analysts */
const TIER2_KOLS = [
  'VitalikButerin',  // Vitalik (cross-ecosystem signal)
  'blaboronkov',     // Placeholder for research accounts
  'heaboronkov',     // Helius
  'JupiterExchange', // Jupiter
  'marginaboronkov', // MarginFi
  'tensoraboronkov', // Tensor
];

/** Research & media accounts */
const RESEARCH_ACCOUNTS = [
  'MessariCrypto',
  'ElectricCapital',
  'TheBlock__',
  'DelphistDigital',
];

/** All accounts combined */
const ALL_ACCOUNTS = [...TIER1_KOLS, ...TIER2_KOLS, ...RESEARCH_ACCOUNTS];

// ==========================================
// Signal Collection
// ==========================================

/**
 * Collect social signals from KOLs about Solana ecosystem
 * @param {number} [dayRange=14] - How many days back to look
 * @returns {Promise<Array>} Array of social signal objects
 */
async function collectSocialSignals(dayRange = 14) {
  console.log(`[Social] Collecting signals from ${ALL_ACCOUNTS.length} accounts (${dayRange} days)...`);

  const signals = [];
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - dayRange);
  const since = sinceDate.toISOString().split('T')[0];

  // Batch 1: KOL conversations about Solana ecosystem
  try {
    const kolSignals = await searchX({
      query: `(from:${TIER1_KOLS.join(' OR from:')}) Solana since:${since} min_faves:50`,
      systemInstruction: `You are a Solana ecosystem research agent. Use x_search to find posts from top Solana KOLs.

Search for recent posts (since ${since}) from these accounts that discuss:
- New projects, protocols, or technologies
- Ecosystem trends, narratives, or shifts
- Technical developments or upgrades
- Market insights or predictions

For each relevant post, extract:
- username: The @username
- text: Full tweet text
- url: Direct tweet URL
- date: ISO date
- engagement: Estimated likes/retweets (high/medium/low)
- topics: Array of topic tags (e.g. ["DeFi", "AI agents", "restaking"])
- sentiment: positive/negative/neutral

Return JSON array of objects. Max 20 results, sorted by relevance.`
    });

    if (Array.isArray(kolSignals)) {
      for (const s of kolSignals) {
        signals.push({
          source: 'social',
          subSource: 'kol',
          username: s.username || s.x_username || 'unknown',
          text: s.text || s.tweet_content || '',
          url: s.url || s.post_url || null,
          date: s.date || new Date().toISOString(),
          engagement: s.engagement || 'medium',
          topics: Array.isArray(s.topics) ? s.topics : [],
          sentiment: s.sentiment || 'neutral',
          collectedAt: new Date().toISOString(),
        });
      }
    }
    console.log(`[Social] KOL batch: ${signals.length} signals`);
  } catch (err) {
    console.error('[Social] KOL collection error:', err.message);
  }

  // Batch 2: Trending Solana topics on X
  try {
    const trendingSignals = await searchX({
      query: `Solana since:${since} min_faves:200 -filter:retweets`,
      systemInstruction: `You are a trend detection agent. Use x_search to find the most viral/trending Solana ecosystem discussions.

Search for high-engagement posts about Solana from the last ${dayRange} days.
Focus on posts that reveal EMERGING TRENDS — new narratives, new project categories, new use cases.

Ignore: price speculation, generic "bullish" posts, memes without substance.

For each result:
- username: @username
- text: Full tweet text
- url: Tweet URL
- date: ISO date
- topics: Array of narrative tags
- sentiment: positive/negative/neutral
- signal_type: "narrative_shift" | "new_project" | "ecosystem_update" | "technical_development" | "market_signal"

Return JSON array, max 15 results, sorted by novelty and engagement.`
    });

    if (Array.isArray(trendingSignals)) {
      for (const s of trendingSignals) {
        signals.push({
          source: 'social',
          subSource: 'trending',
          username: s.username || 'unknown',
          text: s.text || '',
          url: s.url || null,
          date: s.date || new Date().toISOString(),
          engagement: 'high',
          topics: Array.isArray(s.topics) ? s.topics : [],
          sentiment: s.sentiment || 'neutral',
          signalType: s.signal_type || 'ecosystem_update',
          collectedAt: new Date().toISOString(),
        });
      }
    }
    console.log(`[Social] Trending batch: ${signals.length - signals.filter(s => s.subSource === 'kol').length} signals`);
  } catch (err) {
    console.error('[Social] Trending collection error:', err.message);
  }

  // Batch 3: Specific emerging topic searches
  const emergingQueries = [
    'Solana AI agent',
    'Solana DePIN',
    'Solana RWA',
    'Solana restaking',
    'Solana PayFi',
    'Solana gaming',
    'Solana DeFi new',
  ];

  for (const query of emergingQueries) {
    try {
      const results = await searchX({
        query: `${query} since:${since} min_faves:30`,
        systemInstruction: `Use x_search to find recent posts about "${query}". Return JSON array with fields: username, text, url, date, topics, sentiment. Max 5 results.`
      });

      if (Array.isArray(results)) {
        for (const s of results) {
          signals.push({
            source: 'social',
            subSource: 'topic_search',
            query,
            username: s.username || 'unknown',
            text: s.text || '',
            url: s.url || null,
            date: s.date || new Date().toISOString(),
            topics: Array.isArray(s.topics) ? s.topics : [query],
            sentiment: s.sentiment || 'neutral',
            collectedAt: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.warn(`[Social] Topic search "${query}" error:`, err.message);
    }

    // Small delay between searches
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`[Social] Total: ${signals.length} social signals collected`);
  return signals;
}

module.exports = {
  collectSocialSignals,
  TIER1_KOLS,
  TIER2_KOLS,
  RESEARCH_ACCOUNTS,
  ALL_ACCOUNTS,
};

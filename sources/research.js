/**
 * Research Signal Collector — Reports & Analysis
 * 
 * Uses Grok x_search to find:
 * - Published reports from Messari, Electric Capital, Helius, Delphi
 * - Blog posts and threads about Solana ecosystem trends
 * - Data-driven analysis and market intelligence
 */
const { searchX, askGrokForJson } = require('../services/grok');

// ==========================================
// Research Sources
// ==========================================

const RESEARCH_QUERIES = [
  {
    name: 'ecosystem_reports',
    query: '(from:MessariCrypto OR from:ElectricCapital OR from:heaboronkov OR from:DelphistDigital) Solana report',
    description: 'Research reports from major crypto analytics firms',
  },
  {
    name: 'solana_foundation',
    query: '(from:solaboronkov OR from:SolanaFndn) update OR announcement OR report',
    description: 'Official Solana Foundation updates',
  },
  {
    name: 'developer_ecosystem',
    query: 'Solana developer ecosystem report OR "state of solana" OR "solana ecosystem"',
    description: 'Developer ecosystem analysis and state-of reports',
  },
  {
    name: 'defi_analysis',
    query: 'Solana DeFi TVL OR "Solana DeFi" analysis OR report min_faves:50',
    description: 'DeFi-specific analysis and TVL movements',
  },
  {
    name: 'emerging_narratives',
    query: 'Solana narrative OR "Solana trend" OR "building on Solana" min_faves:100',
    description: 'Broad narrative and trend discussions',
  },
];

// ==========================================
// Signal Collection
// ==========================================

/**
 * Collect research signals from published reports and analysis
 * @param {number} [dayRange=14]
 * @returns {Promise<Array>} Array of research signal objects
 */
async function collectResearchSignals(dayRange = 14) {
  console.log(`[Research] Collecting research signals (${dayRange} days)...`);

  const since = new Date();
  since.setDate(since.getDate() - dayRange);
  const sinceStr = since.toISOString().split('T')[0];

  const signals = [];

  for (const source of RESEARCH_QUERIES) {
    try {
      const results = await searchX({
        query: `${source.query} since:${sinceStr}`,
        systemInstruction: `You are a research intelligence agent. Use x_search to find research reports, analysis, and data-driven insights about the Solana ecosystem.

Search context: "${source.description}"

For each result, extract:
- username: @username of poster
- text: Full post text
- url: Post URL
- date: ISO date
- topics: Array of topic tags (specific — e.g. "DeFi TVL", "developer growth", "AI agents", NOT generic tags)
- key_insight: One-sentence summary of the key insight or finding
- data_point: Any specific data mentioned (e.g. "TVL up 40%", "500 new repos")

Return JSON array. Focus on posts with DATA or ANALYSIS, not opinions. Max 10 results.`
      });

      if (Array.isArray(results)) {
        for (const r of results) {
          signals.push({
            source: 'research',
            subSource: source.name,
            username: r.username || 'unknown',
            text: r.text || '',
            url: r.url || null,
            date: r.date || new Date().toISOString(),
            topics: Array.isArray(r.topics) ? r.topics : [],
            keyInsight: r.key_insight || null,
            dataPoint: r.data_point || null,
            collectedAt: new Date().toISOString(),
          });
        }
      }

      console.log(`[Research] "${source.name}": ${Array.isArray(results) ? results.length : 0} signals`);
    } catch (err) {
      console.error(`[Research] "${source.name}" error:`, err.message);
    }

    // Rate limit: small delay between searches
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`[Research] Total: ${signals.length} research signals collected`);
  return signals;
}

module.exports = {
  collectResearchSignals,
  RESEARCH_QUERIES,
};

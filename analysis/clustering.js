/**
 * Narrative Clustering — AI-powered signal grouping
 * 
 * Uses Grok to intelligently cluster normalized signals into
 * coherent narratives / themes that are emerging in the Solana ecosystem.
 */
const { askGrokForJson } = require('../services/grok');
const { getSignalStats } = require('./signals');

/**
 * Cluster signals into narratives using Grok AI
 * @param {Array} signals - Normalized signals
 * @returns {Promise<Array>} Array of narrative clusters
 */
async function clusterNarratives(signals) {
  console.log(`[Clustering] Analyzing ${signals.length} signals for narrative patterns...`);

  const stats = getSignalStats(signals);

  // Prepare signal digest for the AI (summarize to fit context)
  const digest = buildSignalDigest(signals);

  const prompt = `You are an expert Solana ecosystem analyst. Analyze these signals collected over the past 14 days and identify EMERGING NARRATIVES.

## Signal Summary
- Total signals: ${stats.total}
- Sources: ${JSON.stringify(stats.bySource)}
- Top topics: ${stats.topTopics.slice(0, 15).map(t => `${t.topic} (${t.count})`).join(', ')}

## Signal Digest
${digest}

## Your Task
Identify 5-8 EMERGING or ACCELERATING narratives in the Solana ecosystem. For each narrative:

1. Focus on what is NEW or GROWING — not what everyone already knows
2. Look for CROSS-SOURCE signals (mentioned in social AND onchain AND github = strong)
3. Prioritize NOVELTY over volume
4. Be SPECIFIC — "AI agents on Solana" is better than "AI"

Return JSON:
{
  "narratives": [
    {
      "id": "narrative_id_slug",
      "name": "Short Name (3-5 words)",
      "description": "2-3 sentence explanation of what this narrative is and why it matters",
      "evidence": [
        "Specific evidence point 1 from the signals",
        "Specific evidence point 2",
        "Specific evidence point 3"
      ],
      "sources": ["social", "onchain", "github"],
      "topics": ["topic1", "topic2"],
      "stage": "emerging | accelerating | maturing",
      "confidence": 0.85,
      "velocity": "rising | stable | declining"
    }
  ]
}

Be rigorous. Only include narratives you have genuine signal evidence for.`;

  const result = await askGrokForJson({
    prompt,
    systemInstruction: 'You are a Solana ecosystem analyst. Identify emerging narratives from multi-source signal data. Return ONLY valid JSON.',
  });

  if (!result?.narratives || !Array.isArray(result.narratives)) {
    console.error('[Clustering] Invalid response — no narratives array');
    return [];
  }

  console.log(`[Clustering] Identified ${result.narratives.length} narratives`);
  return result.narratives;
}

/**
 * Build a compact signal digest for the AI prompt
 * Groups signals by source and summarizes key content
 */
function buildSignalDigest(signals) {
  const sections = [];

  // Social signals
  const social = signals.filter(s => s.source === 'social');
  if (social.length > 0) {
    sections.push('### Social / X Signals');
    const kolSignals = social.filter(s => s.subSource === 'kol').slice(0, 10);
    const trendingSignals = social.filter(s => s.subSource === 'trending').slice(0, 10);
    const topicSignals = social.filter(s => s.subSource === 'topic_search').slice(0, 10);

    if (kolSignals.length > 0) {
      sections.push('**KOL Posts:**');
      for (const s of kolSignals) {
        sections.push(`- @${s.username}: ${truncate(s.text, 150)} [topics: ${s.topics.join(', ')}]`);
      }
    }
    if (trendingSignals.length > 0) {
      sections.push('**Trending:**');
      for (const s of trendingSignals) {
        sections.push(`- @${s.username}: ${truncate(s.text, 150)} [${s.signalType}]`);
      }
    }
    if (topicSignals.length > 0) {
      sections.push('**Topic Searches:**');
      for (const s of topicSignals) {
        sections.push(`- [${s.query || s.topics.join(',')}] @${s.username}: ${truncate(s.text, 120)}`);
      }
    }
  }

  // On-chain signals
  const onchain = signals.filter(s => s.source === 'onchain');
  if (onchain.length > 0) {
    sections.push('\n### On-Chain Signals');
    const pumpfun = onchain.filter(s => s.subSource?.includes('pumpfun'));
    const dex = onchain.filter(s => s.subSource?.includes('dexscreener'));
    const network = onchain.filter(s => s.subSource === 'network_stats');

    if (network.length > 0) {
      for (const s of network) {
        sections.push(`- Network TPS: ${s.value}, avg slot: ${s.avgSlotTime}s`);
      }
    }
    if (pumpfun.length > 0) {
      sections.push('**PumpFun tokens:**');
      for (const s of pumpfun.slice(0, 10)) {
        sections.push(`- ${s.name} ($${s.ticker}) — MC: $${s.marketCap?.toLocaleString() || 'N/A'} [${s.subSource}]`);
      }
    }
    if (dex.length > 0) {
      sections.push('**DexScreener:**');
      for (const s of dex.slice(0, 10)) {
        sections.push(`- ${s.name || s.address?.substring(0, 12)} [${s.subSource}]`);
      }
    }
  }

  // GitHub signals
  const github = signals.filter(s => s.source === 'github');
  if (github.length > 0) {
    sections.push('\n### Developer Activity (GitHub)');
    const sorted = github.sort((a, b) => (b.stars || 0) - (a.stars || 0));
    for (const s of sorted.slice(0, 15)) {
      sections.push(`- ${s.name} ⭐${s.stars || 0} — ${truncate(s.description, 100)} [${s.topics.slice(0, 3).join(', ')}]`);
    }
  }

  // Research signals
  const research = signals.filter(s => s.source === 'research');
  if (research.length > 0) {
    sections.push('\n### Research & Reports');
    for (const s of research.slice(0, 10)) {
      const insight = s.keyInsight ? ` — KEY: ${s.keyInsight}` : '';
      const data = s.dataPoint ? ` [DATA: ${s.dataPoint}]` : '';
      sections.push(`- @${s.username}: ${truncate(s.text, 120)}${insight}${data}`);
    }
  }

  return sections.join('\n');
}

function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}

module.exports = {
  clusterNarratives,
  buildSignalDigest,
};

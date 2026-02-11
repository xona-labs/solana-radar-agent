/**
 * Narrative Scoring — Ranking algorithm for detected narratives
 * 
 * Scores narratives based on:
 * - Cross-source signal strength (signals from multiple source types)
 * - Velocity (emerging > maturing)
 * - Evidence quality (data points, specific examples)
 * - Novelty (not yet mainstream)
 */

/**
 * Score and rank narratives
 * @param {Array} narratives - Array of narrative clusters from clustering
 * @param {Array} signals - Normalized signals for evidence counting
 * @returns {Array} Scored and ranked narratives
 */
function scoreNarratives(narratives, signals) {
  console.log(`[Scoring] Scoring ${narratives.length} narratives against ${signals.length} signals...`);

  const scored = narratives.map(narrative => {
    const scores = {};

    // 1. Cross-source strength (0-30 points)
    // More diverse sources = stronger signal
    const uniqueSources = new Set(narrative.sources || []);
    scores.crossSource = Math.min(uniqueSources.size * 8, 30);

    // 2. Evidence quality (0-25 points)
    const evidenceCount = (narrative.evidence || []).length;
    scores.evidence = Math.min(evidenceCount * 8, 25);

    // 3. Velocity bonus (0-20 points)
    if (narrative.velocity === 'rising') scores.velocity = 20;
    else if (narrative.velocity === 'stable') scores.velocity = 10;
    else scores.velocity = 5;

    // 4. Stage bonus (0-15 points)
    // Emerging narratives score highest (we want early signals)
    if (narrative.stage === 'emerging') scores.stage = 15;
    else if (narrative.stage === 'accelerating') scores.stage = 12;
    else scores.stage = 5;

    // 5. AI confidence (0-10 points)
    scores.confidence = Math.round((narrative.confidence || 0.5) * 10);

    // 6. Signal count from actual data (bonus, 0-10)
    const narrativeTopics = (narrative.topics || []).map(t => t.toLowerCase());
    const matchingSignals = signals.filter(s =>
      s.topics.some(t => narrativeTopics.includes(t.toLowerCase()))
    );
    scores.signalCount = Math.min(Math.floor(matchingSignals.length / 2), 10);

    // Total score
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

    return {
      ...narrative,
      scores,
      totalScore,
      matchingSignalCount: matchingSignals.length,
      rank: 0, // Will be set after sorting
    };
  });

  // Sort by total score descending
  scored.sort((a, b) => b.totalScore - a.totalScore);

  // Assign ranks
  scored.forEach((n, i) => { n.rank = i + 1; });

  console.log(`[Scoring] Top narrative: "${scored[0]?.name}" (score: ${scored[0]?.totalScore})`);
  return scored;
}

/**
 * Get a human-readable score breakdown
 */
function explainScore(narrative) {
  if (!narrative.scores) return 'No scoring data';

  const lines = [
    `Cross-source strength: ${narrative.scores.crossSource}/30`,
    `Evidence quality: ${narrative.scores.evidence}/25`,
    `Velocity: ${narrative.scores.velocity}/20 (${narrative.velocity || 'unknown'})`,
    `Stage: ${narrative.scores.stage}/15 (${narrative.stage || 'unknown'})`,
    `AI confidence: ${narrative.scores.confidence}/10`,
    `Signal match: ${narrative.scores.signalCount}/10 (${narrative.matchingSignalCount || 0} signals)`,
    `─────────`,
    `TOTAL: ${narrative.totalScore}/110`,
  ];

  return lines.join('\n');
}

module.exports = {
  scoreNarratives,
  explainScore,
};

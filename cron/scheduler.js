/**
 * Scheduler — Cron jobs for signal collection and narrative analysis
 * 
 * Schedule:
 * - Signal collection: daily at 06:00 UTC
 * - Narrative analysis: every 14 days (or on-demand)
 * - Full run: collect + analyze in one go
 */
const cron = require('node-cron');

// Sources
const { collectSocialSignals } = require('../sources/social');
const { collectOnChainSignals } = require('../sources/onchain');
const { collectGithubSignals } = require('../sources/github');
const { collectResearchSignals } = require('../sources/research');

// Analysis
const { normalizeAll, getSignalStats } = require('../analysis/signals');
const { clusterNarratives } = require('../analysis/clustering');
const { scoreNarratives } = require('../analysis/scoring');
const { generateBuildIdeas } = require('../analysis/build-ideas');

// Storage
const { saveSignals, saveNarratives, loadLatestSignals } = require('../storage/store');

let collectionCron = null;
let analysisCron = null;

// ==========================================
// Pipeline Steps
// ==========================================

/**
 * Step 1: Collect signals from all sources
 * @param {number} [dayRange=14]
 * @returns {Promise<Object>} { signals, stats }
 */
async function runCollection(dayRange = 14) {
  console.log('');
  console.log('📡 ═══════════════════════════════════════════');
  console.log('   Signal Collection Pipeline');
  console.log('═══════════════════════════════════════════════');
  console.log(`   Day range: ${dayRange} days`);
  console.log(`   Started: ${new Date().toISOString()}`);
  console.log('');

  const allRawSignals = [];

  // Collect from all 4 sources (parallel where possible)
  const [socialResult, onchainResult, githubResult, researchResult] = await Promise.allSettled([
    collectSocialSignals(dayRange),
    collectOnChainSignals(),
    collectGithubSignals(dayRange),
    collectResearchSignals(dayRange),
  ]);

  if (socialResult.status === 'fulfilled') allRawSignals.push(...socialResult.value);
  else console.error('[Scheduler] Social collection failed:', socialResult.reason?.message);

  if (onchainResult.status === 'fulfilled') allRawSignals.push(...onchainResult.value);
  else console.error('[Scheduler] OnChain collection failed:', onchainResult.reason?.message);

  if (githubResult.status === 'fulfilled') allRawSignals.push(...githubResult.value);
  else console.error('[Scheduler] GitHub collection failed:', githubResult.reason?.message);

  if (researchResult.status === 'fulfilled') allRawSignals.push(...researchResult.value);
  else console.error('[Scheduler] Research collection failed:', researchResult.reason?.message);

  // Normalize & de-duplicate
  const signals = normalizeAll(allRawSignals);
  const stats = getSignalStats(signals);

  // Save
  saveSignals(signals, { stats, dayRange });

  console.log('');
  console.log('📊 Collection Results:');
  console.log(`   Total signals: ${signals.length}`);
  console.log(`   By source: ${JSON.stringify(stats.bySource)}`);
  console.log(`   Top topics: ${stats.topTopics.slice(0, 5).map(t => t.topic).join(', ')}`);
  console.log('');

  return { signals, stats };
}

/**
 * Step 2: Analyze collected signals → narratives + build ideas
 * @param {Array} [signals] - Pre-collected signals (or loads latest from storage)
 * @returns {Promise<Object>} { narratives, stats }
 */
async function runAnalysis(signals = null) {
  console.log('');
  console.log('🧠 ═══════════════════════════════════════════');
  console.log('   Narrative Analysis Pipeline');
  console.log('═══════════════════════════════════════════════');
  console.log(`   Started: ${new Date().toISOString()}`);
  console.log('');

  // Load signals if not provided
  if (!signals) {
    const latest = loadLatestSignals();
    if (!latest?.signals) {
      console.error('[Scheduler] No signals found. Run collection first: npm run collect');
      return { narratives: [], stats: {} };
    }
    signals = latest.signals;
    console.log(`[Scheduler] Loaded ${signals.length} signals from latest snapshot`);
  }

  const stats = getSignalStats(signals);

  // Step 2a: Cluster into narratives
  console.log('[Scheduler] Step 1/3: Clustering signals into narratives...');
  const rawNarratives = await clusterNarratives(signals);

  // Step 2b: Score & rank
  console.log('[Scheduler] Step 2/3: Scoring and ranking narratives...');
  const scored = scoreNarratives(rawNarratives, signals);

  // Step 2c: Generate build ideas
  console.log('[Scheduler] Step 3/3: Generating build ideas...');
  const narratives = await generateBuildIdeas(scored);

  // Save
  saveNarratives(narratives, stats);

  console.log('');
  console.log('🎯 Analysis Results:');
  console.log(`   Narratives detected: ${narratives.length}`);
  for (const n of narratives.slice(0, 5)) {
    console.log(`   ${n.rank}. ${n.name} (score: ${n.totalScore}, ideas: ${n.buildIdeas?.length || 0})`);
  }
  console.log('');

  return { narratives, stats };
}

/**
 * Full pipeline: collect + analyze
 */
async function runFull(dayRange = 14) {
  console.log('');
  console.log('🚀 ═══════════════════════════════════════════');
  console.log('   FULL PIPELINE: Collect → Analyze');
  console.log('═══════════════════════════════════════════════');
  console.log('');

  const { signals, stats } = await runCollection(dayRange);
  const result = await runAnalysis(signals);

  console.log('');
  console.log('✅ Full pipeline complete!');
  console.log(`   ${signals.length} signals → ${result.narratives.length} narratives`);
  console.log('');

  return { signals, ...result };
}

// ==========================================
// Cron Jobs
// ==========================================

/**
 * Start scheduled collection and analysis
 */
function startCron() {
  stopCron();

  // Daily signal collection at 06:00 UTC
  collectionCron = cron.schedule('0 6 * * *', async () => {
    console.log(`[Cron] Signal collection triggered at ${new Date().toISOString()}`);
    try {
      await runCollection(14);
    } catch (err) {
      console.error('[Cron] Collection error:', err.message);
    }
  }, { scheduled: true, timezone: 'UTC' });

  // Full analysis every 14 days (1st and 15th of each month) at 08:00 UTC
  analysisCron = cron.schedule('0 8 1,15 * *', async () => {
    console.log(`[Cron] Full analysis triggered at ${new Date().toISOString()}`);
    try {
      await runFull(14);
    } catch (err) {
      console.error('[Cron] Analysis error:', err.message);
    }
  }, { scheduled: true, timezone: 'UTC' });

  console.log('[Cron] Scheduled jobs:');
  console.log('  📡 Signal collection: daily at 06:00 UTC');
  console.log('  🧠 Full analysis: 1st & 15th of month at 08:00 UTC');
}

/**
 * Stop all cron jobs
 */
function stopCron() {
  if (collectionCron) { collectionCron.stop(); collectionCron = null; }
  if (analysisCron) { analysisCron.stop(); analysisCron = null; }
}

module.exports = {
  runCollection,
  runAnalysis,
  runFull,
  startCron,
  stopCron,
};

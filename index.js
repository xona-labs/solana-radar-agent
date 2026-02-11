/**
 * Solana Radar Agent — Main Entry Point
 * 
 * Autonomous AI agent that detects emerging narratives in the Solana ecosystem
 * by analyzing signals from social media, on-chain data, developer activity,
 * and research reports.
 * 
 * What it does:
 * 1. Collects signals from 4 sources (X/social, on-chain, GitHub, research)
 * 2. Normalizes & deduplicates signals into a unified format
 * 3. Uses AI (Grok) to cluster signals into coherent narratives
 * 4. Scores & ranks narratives by novelty, velocity, and cross-source strength
 * 5. Generates 3-5 concrete build ideas for each narrative
 * 6. Serves results via API + interactive dashboard
 * 7. Refreshes fortnightly via scheduled cron
 */
require('dotenv').config();

const { createServer } = require('./server');
const { startCron, runFull } = require('./cron/scheduler');

const PORT = process.env.PORT || 3010;

async function main() {
  console.log('');
  console.log('📡 ═══════════════════════════════════════════════');
  console.log('   XONA Radar — Narrative Intelligence');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  // ==========================================
  // 1. Pre-flight checks
  // ==========================================
  const checks = {
    XAI_API_KEY: !!process.env.XAI_API_KEY,
    SOLANA_RPC_URL: !!process.env.SOLANA_RPC_URL,
    GITHUB_TOKEN: !!process.env.GITHUB_TOKEN,
  };

  console.log('   Config:');
  console.log(`   ├── Grok AI (x_search):   ${checks.XAI_API_KEY ? '✅ ready' : '❌ XAI_API_KEY not set'}`);
  console.log(`   ├── Solana RPC (on-chain): ${checks.SOLANA_RPC_URL ? '✅ ready' : '⚠️  optional (SOLANA_RPC_URL)'}`);
  console.log(`   └── GitHub (dev activity): ${checks.GITHUB_TOKEN ? '✅ ready' : '⚠️  optional (GITHUB_TOKEN)'}`);
  console.log('');

  if (!checks.XAI_API_KEY) {
    console.error('❌ XAI_API_KEY is required. Set it in .env and restart.');
    console.error('   Get a key at: https://console.x.ai/');
    process.exit(1);
  }

  // ==========================================
  // 2. Start Express API + Dashboard Server
  // ==========================================
  const app = createServer();

  const server = app.listen(PORT, () => {
    console.log(`🌐 Server running on port ${PORT}`);
    console.log('');
    console.log('   Dashboard:');
    console.log(`   └── http://localhost:${PORT}/`);
    console.log('');
    console.log('   API Endpoints:');
    console.log(`   ├── GET  http://localhost:${PORT}/api/narratives`);
    console.log(`   ├── GET  http://localhost:${PORT}/api/signals`);
    console.log(`   ├── GET  http://localhost:${PORT}/api/stats`);
    console.log(`   ├── GET  http://localhost:${PORT}/api/history`);
    console.log(`   ├── POST http://localhost:${PORT}/api/collect`);
    console.log(`   ├── POST http://localhost:${PORT}/api/analyze`);
    console.log(`   ├── POST http://localhost:${PORT}/api/full-run`);
    console.log(`   └── GET  http://localhost:${PORT}/health`);
    console.log('');
  });

  // ==========================================
  // 3. Start Scheduled Cron Jobs
  // ==========================================
  startCron();

  // ==========================================
  // 4. Run initial collection if no data exists
  // ==========================================
  const { getStorageStats } = require('./storage/store');
  const stats = getStorageStats();

  if (!stats.hasLatestNarratives) {
    console.log('📡 No existing data — triggering initial full run...');
    console.log('   This will take a few minutes (collecting from 4 sources + AI analysis)');
    console.log('');

    // Run asynchronously so the server is available immediately
    runFull(14).then(result => {
      console.log('');
      console.log(`✅ Initial run complete! ${result.signals.length} signals → ${result.narratives.length} narratives`);
      console.log(`   View at: http://localhost:${PORT}/`);
      console.log('');
    }).catch(err => {
      console.error('⚠️  Initial run failed:', err.message);
      console.log('   You can retry via the dashboard or: POST /api/full-run');
    });
  } else {
    console.log('✅ Existing data found — serving cached narratives');
    console.log(`   Next refresh: scheduled via cron (1st & 15th of month)`);
    console.log(`   Manual refresh: POST /api/full-run or use dashboard`);
  }

  console.log('');
  console.log('📡 XONA Radar is running!');
  console.log('');

  // ==========================================
  // Graceful Shutdown
  // ==========================================
  const { stopCron } = require('./cron/scheduler');

  const shutdown = () => {
    console.log('\n🛑 Shutting down XONA Radar...');
    stopCron();
    server.close(() => {
      console.log('👋 Goodbye!');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

/**
 * Solana Radar Agent — Express API Server
 * 
 * Endpoints:
 * - GET /                    — Dashboard UI
 * - GET /api/narratives      — Latest detected narratives with build ideas
 * - GET /api/signals         — Latest collected signals
 * - GET /api/stats           — Signal and narrative statistics
 * - GET /api/history         — Historical narrative snapshots
 * - POST /api/collect        — Trigger signal collection
 * - POST /api/analyze        — Trigger narrative analysis
 * - POST /api/full-run       — Trigger full pipeline (collect + analyze)
 * - GET /health              — Health check
 */
const express = require('express');
const cors = require('cors');
const path = require('path');

const {
  loadLatestNarratives,
  loadLatestSignals,
  loadNarrativeHistory,
  getStorageStats,
} = require('./storage/store');

const { runCollection, runAnalysis, runFull } = require('./cron/scheduler');
const { getSignalStats } = require('./analysis/signals');
const { explainScore } = require('./analysis/scoring');

function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // ==========================================
  // Dashboard (static HTML)
  // ==========================================

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard', 'index.html'));
  });

  // ==========================================
  // API: Narratives
  // ==========================================

  /**
   * GET /api/narratives — Latest detected narratives with build ideas
   */
  app.get('/api/narratives', (req, res) => {
    const data = loadLatestNarratives();
    if (!data) {
      return res.json({
        success: true,
        narratives: [],
        message: 'No narratives detected yet. Run POST /api/full-run to start.',
      });
    }

    return res.json({
      success: true,
      timestamp: data.timestamp,
      narrativeCount: data.narrativeCount,
      narratives: data.narratives.map(n => ({
        rank: n.rank,
        name: n.name,
        id: n.id,
        description: n.description,
        stage: n.stage,
        velocity: n.velocity,
        confidence: n.confidence,
        totalScore: n.totalScore,
        scores: n.scores,
        evidence: n.evidence,
        sources: n.sources,
        topics: n.topics,
        buildIdeas: n.buildIdeas || [],
      })),
      stats: data.stats,
    });
  });

  /**
   * GET /api/narratives/:id — Single narrative with full details
   */
  app.get('/api/narratives/:id', (req, res) => {
    const data = loadLatestNarratives();
    if (!data) {
      return res.status(404).json({ success: false, message: 'No narratives found' });
    }

    const narrative = data.narratives.find(n => n.id === req.params.id);
    if (!narrative) {
      return res.status(404).json({ success: false, message: 'Narrative not found' });
    }

    return res.json({
      success: true,
      narrative: {
        ...narrative,
        scoreExplanation: explainScore(narrative),
      },
    });
  });

  // ==========================================
  // API: Signals
  // ==========================================

  /**
   * GET /api/signals — Latest collected signals
   */
  app.get('/api/signals', (req, res) => {
    const data = loadLatestSignals();
    if (!data) {
      return res.json({
        success: true,
        signals: [],
        message: 'No signals collected yet. Run POST /api/collect to start.',
      });
    }

    const source = req.query.source || null;
    let signals = data.signals;

    if (source) {
      signals = signals.filter(s => s.source === source);
    }

    const limit = parseInt(req.query.limit) || 100;
    signals = signals.slice(0, limit);

    return res.json({
      success: true,
      timestamp: data.timestamp,
      total: data.signalCount,
      returned: signals.length,
      signals,
    });
  });

  // ==========================================
  // API: Statistics
  // ==========================================

  /**
   * GET /api/stats — Combined signal and narrative statistics
   */
  app.get('/api/stats', (req, res) => {
    const signalData = loadLatestSignals();
    const narrativeData = loadLatestNarratives();
    const storage = getStorageStats();

    const signalStats = signalData?.signals ? getSignalStats(signalData.signals) : null;

    return res.json({
      success: true,
      signals: signalStats ? {
        total: signalStats.total,
        bySource: signalStats.bySource,
        byType: signalStats.byType,
        topTopics: signalStats.topTopics.slice(0, 20),
        collectedAt: signalData.timestamp,
      } : null,
      narratives: narrativeData ? {
        count: narrativeData.narrativeCount,
        analyzedAt: narrativeData.timestamp,
        topNarrative: narrativeData.narratives[0]?.name || null,
      } : null,
      storage,
    });
  });

  /**
   * GET /api/history — Historical narrative snapshots
   */
  app.get('/api/history', (req, res) => {
    const limit = parseInt(req.query.limit) || 5;
    const history = loadNarrativeHistory(limit);

    return res.json({
      success: true,
      snapshots: history.map(h => ({
        timestamp: h.timestamp,
        narrativeCount: h.narrativeCount,
        topNarratives: (h.narratives || []).slice(0, 3).map(n => ({
          rank: n.rank,
          name: n.name,
          totalScore: n.totalScore,
        })),
      })),
    });
  });

  // ==========================================
  // API: Pipeline Triggers
  // ==========================================

  /**
   * POST /api/collect — Trigger signal collection
   */
  app.post('/api/collect', async (req, res) => {
    const dayRange = parseInt(req.body.dayRange) || 14;
    console.log(`[API] Signal collection triggered (${dayRange} days)`);

    try {
      const result = await runCollection(dayRange);
      return res.json({
        success: true,
        signalCount: result.signals.length,
        stats: result.stats,
      });
    } catch (err) {
      console.error('[API] Collection error:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  /**
   * POST /api/analyze — Trigger narrative analysis (uses latest signals)
   */
  app.post('/api/analyze', async (req, res) => {
    console.log('[API] Narrative analysis triggered');

    try {
      const result = await runAnalysis();
      return res.json({
        success: true,
        narrativeCount: result.narratives.length,
        narratives: result.narratives.map(n => ({
          rank: n.rank,
          name: n.name,
          totalScore: n.totalScore,
          buildIdeasCount: n.buildIdeas?.length || 0,
        })),
      });
    } catch (err) {
      console.error('[API] Analysis error:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  /**
   * POST /api/full-run — Trigger full pipeline (collect + analyze)
   */
  app.post('/api/full-run', async (req, res) => {
    const dayRange = parseInt(req.body.dayRange) || 14;
    console.log(`[API] Full pipeline triggered (${dayRange} days)`);

    try {
      const result = await runFull(dayRange);
      return res.json({
        success: true,
        signalCount: result.signals.length,
        narrativeCount: result.narratives.length,
        narratives: result.narratives.map(n => ({
          rank: n.rank,
          name: n.name,
          totalScore: n.totalScore,
          buildIdeasCount: n.buildIdeas?.length || 0,
        })),
      });
    } catch (err) {
      console.error('[API] Full run error:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // ==========================================
  // Health
  // ==========================================

  app.get('/health', (req, res) => {
    const storage = getStorageStats();
    res.json({
      status: 'ok',
      agent: 'xona-radar',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      storage,
    });
  });

  // ==========================================
  // Error handling
  // ==========================================

  app.use((err, req, res, next) => {
    console.error('[Server] Unhandled error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  });

  return app;
}

module.exports = { createServer };

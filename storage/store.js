/**
 * Storage — JSON file persistence for signals and narratives
 * 
 * Stores timestamped snapshots of collected signals and detected narratives.
 * Simple file-based approach — no database needed.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Save signals snapshot
 * @param {Array} signals - Normalized signals
 * @param {Object} [meta] - Additional metadata
 */
function saveSignals(signals, meta = {}) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `signals_${timestamp}.json`;
  const filepath = path.join(DATA_DIR, filename);

  const data = {
    timestamp: new Date().toISOString(),
    signalCount: signals.length,
    ...meta,
    signals,
  };

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`[Storage] Saved ${signals.length} signals → ${filename}`);

  // Also update latest pointer
  fs.writeFileSync(
    path.join(DATA_DIR, 'signals_latest.json'),
    JSON.stringify(data, null, 2)
  );

  return filepath;
}

/**
 * Save narrative analysis results
 * @param {Array} narratives - Scored narratives with build ideas
 * @param {Object} stats - Signal statistics
 */
function saveNarratives(narratives, stats = {}) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `narratives_${timestamp}.json`;
  const filepath = path.join(DATA_DIR, filename);

  const data = {
    timestamp: new Date().toISOString(),
    narrativeCount: narratives.length,
    stats,
    narratives,
  };

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`[Storage] Saved ${narratives.length} narratives → ${filename}`);

  // Also update latest pointer
  fs.writeFileSync(
    path.join(DATA_DIR, 'narratives_latest.json'),
    JSON.stringify(data, null, 2)
  );

  return filepath;
}

/**
 * Load the latest signals
 * @returns {Object|null}
 */
function loadLatestSignals() {
  const filepath = path.join(DATA_DIR, 'signals_latest.json');
  if (!fs.existsSync(filepath)) return null;

  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (err) {
    console.error('[Storage] Error loading signals:', err.message);
    return null;
  }
}

/**
 * Load the latest narratives
 * @returns {Object|null}
 */
function loadLatestNarratives() {
  const filepath = path.join(DATA_DIR, 'narratives_latest.json');
  if (!fs.existsSync(filepath)) return null;

  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (err) {
    console.error('[Storage] Error loading narratives:', err.message);
    return null;
  }
}

/**
 * Load all signal snapshots (for historical comparison)
 * @param {number} [limit=10] - Max snapshots to load
 * @returns {Array}
 */
function loadSignalHistory(limit = 10) {
  if (!fs.existsSync(DATA_DIR)) return [];

  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('signals_') && f !== 'signals_latest.json')
    .sort()
    .reverse()
    .slice(0, limit);

  return files.map(f => {
    try {
      return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
    } catch {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Load all narrative snapshots
 * @param {number} [limit=10]
 * @returns {Array}
 */
function loadNarrativeHistory(limit = 10) {
  if (!fs.existsSync(DATA_DIR)) return [];

  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('narratives_') && f !== 'narratives_latest.json')
    .sort()
    .reverse()
    .slice(0, limit);

  return files.map(f => {
    try {
      return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
    } catch {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Get storage stats
 */
function getStorageStats() {
  if (!fs.existsSync(DATA_DIR)) return { signalSnapshots: 0, narrativeSnapshots: 0 };

  const files = fs.readdirSync(DATA_DIR);
  return {
    signalSnapshots: files.filter(f => f.startsWith('signals_') && f !== 'signals_latest.json').length,
    narrativeSnapshots: files.filter(f => f.startsWith('narratives_') && f !== 'narratives_latest.json').length,
    hasLatestSignals: fs.existsSync(path.join(DATA_DIR, 'signals_latest.json')),
    hasLatestNarratives: fs.existsSync(path.join(DATA_DIR, 'narratives_latest.json')),
  };
}

module.exports = {
  saveSignals,
  saveNarratives,
  loadLatestSignals,
  loadLatestNarratives,
  loadSignalHistory,
  loadNarrativeHistory,
  getStorageStats,
};

/**
 * On-Chain Signal Collector — Solana Network Activity
 * 
 * Uses Helius API + PumpFun + DexScreener for:
 * - New program deployments & usage spikes
 * - Token trends and volume anomalies
 * - Network-level activity patterns
 */
const axios = require('axios');

const PUMPFUN_API = 'https://frontend-api-v3.pump.fun';
const DEXSCREENER_API = 'https://api.dexscreener.com';

const BROWSER_HEADERS = {
  'accept': '*/*',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'no-cache',
  'origin': 'https://pump.fun',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
};

// ==========================================
// Helius — On-Chain Program Activity
// ==========================================

/**
 * Get top Solana programs by transaction count (via Helius)
 */
async function getTopPrograms() {
  const rpcUrl = process.env.SOLANA_RPC_URL;
  if (!rpcUrl) {
    console.warn('[OnChain] SOLANA_RPC_URL not set — skipping program analysis');
    return [];
  }

  try {
    const res = await axios.post(
      rpcUrl,
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'getRecentPerformanceSamples',
        params: [10]
      },
      { timeout: 15000 }
    );

    const samples = res.data?.result || [];
    if (samples.length === 0) return [];

    // Calculate average TPS and slot times
    const avgTps = samples.reduce((sum, s) => sum + (s.numTransactions / s.samplePeriodSecs), 0) / samples.length;
    const avgSlotTime = samples.reduce((sum, s) => sum + (s.samplePeriodSecs / s.numSlots), 0) / samples.length;

    return [{
      source: 'onchain',
      subSource: 'network_stats',
      metric: 'tps',
      value: Math.round(avgTps),
      avgSlotTime: avgSlotTime.toFixed(3),
      sampleCount: samples.length,
      collectedAt: new Date().toISOString(),
      topics: ['network_health', 'performance'],
    }];
  } catch (err) {
    console.error('[OnChain] Helius stats error:', err.message);
    return [];
  }
}

/**
 * Search for trending Solana tokens on DexScreener
 */
async function getDexScreenerTrending() {
  try {
    const res = await axios.get(`${DEXSCREENER_API}/token-boosts/top/v1`, {
      timeout: 15000,
      headers: { 'Accept': 'application/json' }
    });

    const tokens = (res.data || [])
      .filter(t => t.chainId === 'solana')
      .slice(0, 15);

    return tokens.map(t => ({
      source: 'onchain',
      subSource: 'dexscreener_boosted',
      name: t.description || t.tokenAddress,
      address: t.tokenAddress,
      url: t.url || `https://dexscreener.com/solana/${t.tokenAddress}`,
      totalAmount: t.totalAmount || 0,
      topics: ['token_trending', 'dex_activity'],
      collectedAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.error('[OnChain] DexScreener trending error:', err.message);
    return [];
  }
}

/**
 * Get DexScreener latest token profiles on Solana
 */
async function getDexScreenerLatestProfiles() {
  try {
    const res = await axios.get(`${DEXSCREENER_API}/token-profiles/latest/v1`, {
      timeout: 15000,
      headers: { 'Accept': 'application/json' }
    });

    const solTokens = (res.data || [])
      .filter(t => t.chainId === 'solana')
      .slice(0, 20);

    return solTokens.map(t => ({
      source: 'onchain',
      subSource: 'dexscreener_new_profiles',
      address: t.tokenAddress,
      description: t.description || '',
      url: t.url || `https://dexscreener.com/solana/${t.tokenAddress}`,
      links: t.links || [],
      topics: ['new_token', 'token_launch'],
      collectedAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.error('[OnChain] DexScreener profiles error:', err.message);
    return [];
  }
}

// ==========================================
// PumpFun — Token Launch Trends
// ==========================================

/**
 * Get PumpFun trending tokens
 */
async function getPumpFunTrending() {
  try {
    const res = await axios.get(`${PUMPFUN_API}/coins/top-runners`, {
      headers: BROWSER_HEADERS,
      timeout: 15000,
    });

    if (!Array.isArray(res.data)) return [];

    return res.data.slice(0, 15).map(item => {
      const coin = item.coin || item;
      return {
        source: 'onchain',
        subSource: 'pumpfun_trending',
        name: coin.name || 'Unknown',
        ticker: coin.symbol || '???',
        marketCap: coin.usd_market_cap || 0,
        address: coin.mint || null,
        description: coin.description || '',
        twitter: coin.twitter || null,
        website: coin.website || null,
        topics: ['pumpfun', 'token_trending', 'memecoin'],
        collectedAt: new Date().toISOString(),
      };
    });
  } catch (err) {
    console.error('[OnChain] PumpFun trending error:', err.message);
    return [];
  }
}

/**
 * Get PumpFun movers (biggest price changes)
 */
async function getPumpFunMovers() {
  try {
    const res = await axios.get(`${PUMPFUN_API}/coins/top-movers`, {
      headers: BROWSER_HEADERS,
      timeout: 15000,
    });

    if (!Array.isArray(res.data)) return [];

    return res.data.slice(0, 15).map(item => {
      const coin = item.coin || item;
      return {
        source: 'onchain',
        subSource: 'pumpfun_movers',
        name: coin.name || 'Unknown',
        ticker: coin.symbol || '???',
        marketCap: coin.usd_market_cap || 0,
        address: coin.mint || null,
        description: coin.description || '',
        topics: ['pumpfun', 'top_movers', 'memecoin'],
        collectedAt: new Date().toISOString(),
      };
    });
  } catch (err) {
    console.error('[OnChain] PumpFun movers error:', err.message);
    return [];
  }
}

// ==========================================
// Main Collector
// ==========================================

/**
 * Collect all on-chain signals
 * @returns {Promise<Array>} Array of on-chain signal objects
 */
async function collectOnChainSignals() {
  console.log('[OnChain] Collecting on-chain signals...');

  const results = await Promise.allSettled([
    getTopPrograms(),
    getDexScreenerTrending(),
    getDexScreenerLatestProfiles(),
    getPumpFunTrending(),
    getPumpFunMovers(),
  ]);

  const signals = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      signals.push(...result.value);
    }
  }

  console.log(`[OnChain] Total: ${signals.length} on-chain signals collected`);
  return signals;
}

module.exports = {
  collectOnChainSignals,
  getTopPrograms,
  getDexScreenerTrending,
  getDexScreenerLatestProfiles,
  getPumpFunTrending,
  getPumpFunMovers,
};

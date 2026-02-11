/**
 * GitHub Signal Collector — Developer Activity
 * 
 * Uses GitHub Search API to track:
 * - New Solana-related repos gaining traction
 * - Commit velocity in key ecosystem repos
 * - Trending topics in Solana development
 */
const axios = require('axios');

const GITHUB_API = 'https://api.github.com';

function getHeaders() {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'solana-radar-agent',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

// ==========================================
// Repo Discovery
// ==========================================

/**
 * Find recently created Solana repos sorted by stars
 * @param {number} [dayRange=14]
 */
async function findNewSolanaRepos(dayRange = 14) {
  const since = new Date();
  since.setDate(since.getDate() - dayRange);
  const sinceStr = since.toISOString().split('T')[0];

  try {
    const res = await axios.get(`${GITHUB_API}/search/repositories`, {
      params: {
        q: `solana created:>${sinceStr} stars:>5`,
        sort: 'stars',
        order: 'desc',
        per_page: 30,
      },
      headers: getHeaders(),
      timeout: 15000,
    });

    return (res.data?.items || []).map(repo => ({
      source: 'github',
      subSource: 'new_repos',
      name: repo.full_name,
      description: repo.description || '',
      url: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      topics: repo.topics || [],
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      collectedAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.error('[GitHub] New repos search error:', err.message);
    return [];
  }
}

/**
 * Find trending Solana repos (recently updated, high star growth)
 */
async function findTrendingSolanaRepos() {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString().split('T')[0];

  try {
    const res = await axios.get(`${GITHUB_API}/search/repositories`, {
      params: {
        q: `solana pushed:>${sinceStr} stars:>20`,
        sort: 'updated',
        order: 'desc',
        per_page: 30,
      },
      headers: getHeaders(),
      timeout: 15000,
    });

    return (res.data?.items || []).map(repo => ({
      source: 'github',
      subSource: 'trending_repos',
      name: repo.full_name,
      description: repo.description || '',
      url: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      topics: repo.topics || [],
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      collectedAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.error('[GitHub] Trending repos search error:', err.message);
    return [];
  }
}

/**
 * Find Anchor framework projects (Solana smart contracts)
 */
async function findAnchorProjects(dayRange = 14) {
  const since = new Date();
  since.setDate(since.getDate() - dayRange);
  const sinceStr = since.toISOString().split('T')[0];

  try {
    const res = await axios.get(`${GITHUB_API}/search/repositories`, {
      params: {
        q: `anchor-lang created:>${sinceStr} language:rust`,
        sort: 'stars',
        order: 'desc',
        per_page: 20,
      },
      headers: getHeaders(),
      timeout: 15000,
    });

    return (res.data?.items || []).map(repo => ({
      source: 'github',
      subSource: 'anchor_projects',
      name: repo.full_name,
      description: repo.description || '',
      url: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      topics: [...(repo.topics || []), 'anchor', 'smart_contract'],
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      collectedAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.error('[GitHub] Anchor projects search error:', err.message);
    return [];
  }
}

/**
 * Search for specific emerging categories on GitHub
 */
async function findCategoryRepos(category, keywords) {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceStr = since.toISOString().split('T')[0];
  const query = keywords.map(k => `"${k}"`).join(' OR ');

  try {
    const res = await axios.get(`${GITHUB_API}/search/repositories`, {
      params: {
        q: `${query} solana pushed:>${sinceStr}`,
        sort: 'stars',
        order: 'desc',
        per_page: 10,
      },
      headers: getHeaders(),
      timeout: 15000,
    });

    return (res.data?.items || []).map(repo => ({
      source: 'github',
      subSource: `category_${category}`,
      category,
      name: repo.full_name,
      description: repo.description || '',
      url: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      topics: [...(repo.topics || []), category],
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      collectedAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.error(`[GitHub] Category "${category}" search error:`, err.message);
    return [];
  }
}

// ==========================================
// Main Collector
// ==========================================

/**
 * Collect all GitHub developer activity signals
 * @param {number} [dayRange=14]
 * @returns {Promise<Array>} Array of GitHub signal objects
 */
async function collectGithubSignals(dayRange = 14) {
  console.log(`[GitHub] Collecting developer activity signals (${dayRange} days)...`);

  // Category searches for emerging areas
  const categories = [
    { name: 'ai_agents', keywords: ['ai agent', 'autonomous agent', 'llm'] },
    { name: 'depin', keywords: ['depin', 'physical infrastructure', 'iot'] },
    { name: 'rwa', keywords: ['real world asset', 'rwa', 'tokenized'] },
    { name: 'payments', keywords: ['payment', 'payfi', 'micropayment'] },
    { name: 'gaming', keywords: ['game', 'gaming', 'metaverse'] },
  ];

  const searches = [
    findNewSolanaRepos(dayRange),
    findTrendingSolanaRepos(),
    findAnchorProjects(dayRange),
    ...categories.map(c => findCategoryRepos(c.name, c.keywords)),
  ];

  const results = await Promise.allSettled(searches);

  const signals = [];
  const seenRepos = new Set();

  for (const result of results) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      for (const signal of result.value) {
        // De-duplicate by repo name
        if (!seenRepos.has(signal.name)) {
          seenRepos.add(signal.name);
          signals.push(signal);
        }
      }
    }
  }

  console.log(`[GitHub] Total: ${signals.length} developer activity signals collected`);
  return signals;
}

module.exports = {
  collectGithubSignals,
  findNewSolanaRepos,
  findTrendingSolanaRepos,
  findAnchorProjects,
};

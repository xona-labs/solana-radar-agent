/**
 * Grok (xAI) API Service — Solana Radar Agent
 * Core AI engine: x_search for social intelligence, chat for analysis & clustering
 */
const axios = require('axios');

const DEFAULT_MODEL = 'grok-4-1-fast-non-reasoning';
const REASONING_MODEL = 'grok-4-1-fast-reasoning';
const XAI_API_BASE = 'https://api.x.ai/v1';

function getApiKey() {
  if (!process.env.XAI_API_KEY) {
    throw new Error('XAI_API_KEY is not set.');
  }
  return process.env.XAI_API_KEY;
}

/**
 * Make a Grok API call (responses endpoint — supports x_search tool)
 */
async function callGrokApi({
  message,
  conversationHistory = [],
  tools = [],
  systemInstruction,
  model = DEFAULT_MODEL
}) {
  const apiKey = getApiKey();

  const input = [];
  if (systemInstruction) {
    input.push({ role: 'system', content: systemInstruction });
  }
  for (const entry of conversationHistory) {
    input.push({
      role: entry.role === 'assistant' ? 'assistant' : 'user',
      content: entry.content
    });
  }
  input.push({ role: 'user', content: message });

  const response = await axios.post(
    `${XAI_API_BASE}/responses`,
    {
      model,
      input,
      tools: tools.length > 0 ? tools : undefined
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 180000
    }
  );

  return response.data;
}

/**
 * Grok Chat Completions (standard OpenAI-compatible)
 */
async function callGrokChat({ messages, model = REASONING_MODEL }) {
  const apiKey = getApiKey();

  const response = await axios.post(
    `${XAI_API_BASE}/chat/completions`,
    { model, messages },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 120000
    }
  );

  return response.data;
}

/**
 * Extract text content from Grok responses endpoint output
 */
function extractTextFromResponse(response) {
  if (!response) return null;

  if (response.output && Array.isArray(response.output)) {
    for (const item of response.output) {
      if (item.type === 'message' && item.content && Array.isArray(item.content)) {
        for (const contentItem of item.content) {
          if (contentItem.type === 'output_text' && contentItem.text) {
            return contentItem.text.trim();
          }
        }
      }
    }
  }

  if (response.content) {
    return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  }
  if (response.text) return response.text;

  return null;
}

/**
 * Parse JSON from Grok response
 */
function parseJsonFromResponse(response) {
  const text = extractTextFromResponse(response);
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1].trim()); } catch {}
    }
    const rawMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (rawMatch) {
      try { return JSON.parse(rawMatch[1]); } catch {}
    }
  }

  return null;
}

/**
 * High-level: ask Grok a question and get structured JSON back
 */
async function askGrokForJson({ prompt, systemInstruction, tools = [], model }) {
  const response = await callGrokApi({
    message: prompt,
    tools,
    systemInstruction: systemInstruction || 'You are an expert analyst. Return ONLY valid JSON, no markdown, no explanation.',
    model
  });
  return parseJsonFromResponse(response);
}

/**
 * High-level: search X via Grok x_search and get structured results
 */
async function searchX({ query, systemInstruction, outputFormat }) {
  const sysPrompt = systemInstruction || `You are a social media research agent. Use x_search to find relevant posts.
Search for: "${query}"
${outputFormat ? `Return results as JSON in this format: ${outputFormat}` : 'Return results as a JSON array.'}`;

  const response = await callGrokApi({
    message: `Search X for: ${query}`,
    tools: [{ type: 'x_search' }],
    systemInstruction: sysPrompt
  });

  return parseJsonFromResponse(response);
}

module.exports = {
  callGrokApi,
  callGrokChat,
  extractTextFromResponse,
  parseJsonFromResponse,
  askGrokForJson,
  searchX
};

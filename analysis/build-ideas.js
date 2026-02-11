/**
 * Build Ideas Generator — Concrete product ideas tied to narratives
 * 
 * For each detected narrative, generates 3-5 specific, actionable
 * product ideas that could be built on Solana.
 */
const { askGrokForJson } = require('../services/grok');

/**
 * Generate build ideas for a set of scored narratives
 * @param {Array} narratives - Scored narratives from scoring pipeline
 * @returns {Promise<Array>} Narratives enriched with build ideas
 */
async function generateBuildIdeas(narratives) {
  console.log(`[BuildIdeas] Generating build ideas for ${narratives.length} narratives...`);

  const enriched = [];

  for (const narrative of narratives) {
    try {
      const ideas = await generateIdeasForNarrative(narrative);
      enriched.push({
        ...narrative,
        buildIdeas: ideas,
      });
      console.log(`[BuildIdeas] "${narrative.name}": ${ideas.length} ideas generated`);
    } catch (err) {
      console.error(`[BuildIdeas] Error for "${narrative.name}":`, err.message);
      enriched.push({
        ...narrative,
        buildIdeas: [],
      });
    }

    // Small delay between AI calls
    await new Promise(r => setTimeout(r, 1000));
  }

  return enriched;
}

/**
 * Generate ideas for a single narrative
 */
async function generateIdeasForNarrative(narrative) {
  const prompt = `You are a Solana product strategist. Generate 3-5 concrete product ideas for this emerging narrative.

## Narrative
**${narrative.name}**
${narrative.description}

## Evidence
${(narrative.evidence || []).map(e => `- ${e}`).join('\n')}

## Stage: ${narrative.stage || 'emerging'}
## Confidence: ${(narrative.confidence || 0.5) * 100}%

## Requirements for each idea:
1. Must be buildable on Solana specifically (leverage Solana's speed, low fees, or ecosystem)
2. Must be CONCRETE — not vague ("build a dashboard" is vague; "real-time DEX aggregator that surfaces new token launches with AI risk scoring" is concrete)
3. Must be tied to THIS specific narrative
4. Include a one-line technical approach
5. Rate difficulty: easy / medium / hard

Return JSON:
{
  "ideas": [
    {
      "name": "Product Name",
      "oneLiner": "One sentence describing the product",
      "description": "2-3 sentences explaining what it does, who it's for, and why it matters",
      "whySolana": "Why this specifically benefits from being on Solana",
      "technicalApproach": "One-line description of how to build it",
      "difficulty": "easy | medium | hard",
      "targetUser": "Who would use this",
      "monetization": "How it could make money"
    }
  ]
}`;

  const result = await askGrokForJson({
    prompt,
    systemInstruction: 'You are a Solana product strategist generating specific, actionable build ideas. Return ONLY valid JSON. Be creative but practical.',
  });

  if (!result?.ideas || !Array.isArray(result.ideas)) {
    return [];
  }

  return result.ideas.map(idea => ({
    name: idea.name || 'Unnamed Idea',
    oneLiner: idea.oneLiner || idea.one_liner || '',
    description: idea.description || '',
    whySolana: idea.whySolana || idea.why_solana || '',
    technicalApproach: idea.technicalApproach || idea.technical_approach || '',
    difficulty: idea.difficulty || 'medium',
    targetUser: idea.targetUser || idea.target_user || '',
    monetization: idea.monetization || '',
  }));
}

module.exports = {
  generateBuildIdeas,
  generateIdeasForNarrative,
};

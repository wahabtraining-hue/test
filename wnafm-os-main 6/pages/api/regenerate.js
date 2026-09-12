import { callClaude, runResearch, requireAuth, ARABIC_WPM } from '../../lib/anthropic';

export const config = { maxDuration: 300 };

// Regenerate a single angle with fresh research — robust version
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!requireAuth(req, res)) return;

  const { angle, template, templateMode, sourceFormat, sourceTranscript, pillarHint, targetBodyWords } = req.body;
  if (!angle) return res.status(400).json({ error: 'Angle required' });

  try {
    const searchTopic = `${pillarHint || angle.type} ${angle.topic || ''} fitness training`;
    const researchRun = await runResearch([searchTopic]);
    let research = researchRun.text.slice(0, 2500);
    if (!research) research = 'Use accurate peer-reviewed knowledge. Pick less-obvious but valid sub-topics within the pillar.';

    // Give the model a number instead of "match the original" — same approach
    // as the defaults/deeper phases, at the Arabic speaking rate.
    const originalWords = String(angle.body || '').trim().split(/\s+/).filter(Boolean).length;
    const wordTarget = Math.max(60, Math.min(400, targetBodyWords || originalWords || Math.round(2 * ARABIC_WPM)));

    const systemPrompt = `You are the WNAFM Content Engine for Wahab Alsaleh — Khaleeji Arabic men 25-45 in GCC. Direct coach voice, full Khaleeji Arabic (not MSA).

SCIENTIFIC ACCURACY: Only cite papers that directly support the exact claim. Basic knowledge needs no citation. No bro-science: "opens the gates"/"بوابات العضلة", "primes the pump", "switches on growth", "anabolic window", "burns fat like crazy", "activates muscle", "floods your system", dramatic on/off switching, "ATP burst", "literally", "guaranteed". Hedge physiology language ("evidence suggests", "research indicates"). No invented numbers. Multifactorial mechanisms.

TASK: Regenerate ONE script angle with a GENUINELY FRESH take. The previous version covered specific sub-topics — you MUST pick DIFFERENT specific sub-topics within the same pillar. If previous ranked creatine/caffeine/carb-powder, pick different supplements (citrulline, beta-alanine, beetroot, ashwagandha, etc.). If previous covered sleep + deload + soreness for Recovery, cover different recovery topics.

CUSTOM SPIN — NON-NEGOTIABLE: If the ORIGINAL ANGLE below reads like a literal translation of a non-fitness source (e.g. it maps a source's specific rhetorical devices/examples one-to-one into fitness/nutrition equivalents), do not repeat that pattern. Keep only the structural skeleton (hook-question frame, beat count, list format) — the body's actual claim must be a genuinely original, evidence-grounded WNAFM point that doesn't mirror the source's specific examples or reasoning chain.

TEMPLATE FIDELITY: Use the EXACT same template structure and beat count as the original. Same format, same number of items/principles/sections. Fresh content only.

BODY LENGTH: ${wordTarget} Arabic words in the body — an explicit target, not a vague match. The original body was ${originalWords} words. Never write a shorter or abbreviated version. Token budget is ample — do not cut the body short to save space.

Return ONLY valid JSON, no markdown.`;

    const prompt = `Regenerate this angle with a FRESH take — different specific sub-topics, same template.

ORIGINAL ANGLE (specific topics to AVOID repeating):
Type: ${angle.type}
Tier: ${angle.tier || 'default'}
Topic: ${angle.topic || ''}
Hook: ${angle.hook || ''}
Body: ${(angle.body || '').slice(0, 600)}

TEMPLATE TO FOLLOW: ${template || 'match the original beat structure'}
TEMPLATE MODE: ${templateMode || 'literal'}
SOURCE FORMAT: ${sourceFormat || 'unknown'}
ORIGINAL SOURCE TRANSCRIPT (check your new body doesn't mirror this beyond the structural skeleton): "${(sourceTranscript || '').slice(0, 500)}"

FRESH RESEARCH:
${research}

Generate a NEW version covering DIFFERENT specific sub-topics within the ${angle.type} pillar. Same beat count and structure as original. Body at ~${wordTarget} Arabic words. Full Khaleeji Arabic.

Return ONLY this JSON (no markdown fences):
{"type":"${angle.type}","tier":"${angle.tier || 'default'}","topic":"new specific topic in plain English","hook":"Khaleeji Arabic hook","body":"Khaleeji Arabic body at the ~${wordTarget} word target","cta":"Khaleeji Arabic CTA","visualHook":"English direction for videographer","sources":[{"citation":"","finding":"","url":""}],"scriptIntegrity":{"formatMatchesSource":true,"allClaimsCited":true,"hedgeLanguageUsed":true,"notes":""}}`;

    const newAngle = await callClaude({
      system: systemPrompt,
      prompt,
      maxTokens: 10000,
      label: 'regenerate'
    });

    // Sanity check the returned shape
    if (!newAngle.hook || !newAngle.body) {
      return res.status(500).json({ error: 'Regenerated angle missing required fields (hook/body)' });
    }

    return res.status(200).json({ success: true, angle: newAngle });
  } catch (error) {
    console.error('Regenerate handler error:', error.message);
    return res.status(500).json({ error: error.message || 'Unknown regenerate failure' });
  }
}

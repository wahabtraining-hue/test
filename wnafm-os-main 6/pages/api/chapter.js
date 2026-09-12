import { callClaude, requireAuth, ARABIC_WPM } from '../../lib/anthropic';

export const config = { maxDuration: 300 };

// Expand a single YT chapter into a full word-for-word Khaleeji Arabic script.
// Carries the same safeguards as generate.js — no bro-science, hedge language,
// common-sense fallback, citation matching, length scales with chapter duration.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!requireAuth(req, res)) return;

  const { chapter, topic, research } = req.body;
  if (!chapter || !chapter.title) return res.status(400).json({ error: 'Chapter required' });

  try {
    // Parse chapter.duration into MINUTES, honouring the unit.
    // The old regex ignored units entirely, so a seconds-based value like
    // "90 sec" parsed as 90 MINUTES -> a 13,500-word target against a 12,000
    // token cap -> guaranteed truncation. The enrich prompt talks in seconds,
    // so this fired in normal use (bug #10).
    const durStr = String(chapter.duration || '').toLowerCase();
    const nums = (durStr.match(/\d+/g) || []).map(n => parseInt(n, 10));
    const isSeconds = /sec|\bs\b|ثاني/.test(durStr) && !/min|دقيق/.test(durStr);
    let targetMinutes;
    if (nums.length === 0) {
      targetMinutes = 3;
    } else {
      const top = Math.max(...nums);
      targetMinutes = isSeconds ? top / 60 : top;
    }
    // Clamp to something a single chapter can plausibly be.
    targetMinutes = Math.max(0.5, Math.min(12, targetMinutes));
    const targetWords = Math.round(targetMinutes * ARABIC_WPM); // Arabic pace

    // Token budget: ~2.2 tokens per Arabic word + JSON wrapper overhead.
    const maxTokens = Math.min(16000, Math.max(4000, Math.round(targetWords * 2.2) + 1500));

    const systemPrompt = `You are the WNAFM Content Engine for Wahab Alsaleh — Khaleeji Arabic men 25-45 in GCC. Direct coach voice, full Khaleeji Arabic (not MSA).

═══ SCIENTIFIC ACCURACY — NON-NEGOTIABLE ═══
- CITATION MATCHING: Only cite a paper if its ACTUAL finding directly supports the EXACT claim. If unsure → DON'T cite, use general logic.
- COMMON-SENSE FALLBACK: Basic widely-accepted knowledge (carbs give energy, protein helps recovery, sleep matters) needs NO citation. Say it confidently. Better no citation than a fake/misapplied one.
- BANNED BRO-SCIENCE: "opens the gates"/"بوابات العضلة", "primes the pump", "switches on growth", "anabolic window", "burns fat like crazy", "activates muscle", "floods your system", dramatic on/off switching, "ATP burst", "literally", "guaranteed".
- HEDGE LANGUAGE for physiology: "evidence suggests", "research indicates", "may support", "has been shown to". AVOID "guarantees", "literally", "always", "scientifically proven", "100%".
- NUMBER HONESTY: Never invent percentages/kg/timeframes. Cite exact numbers from studies. No number? Use qualitative language.
- MECHANISM ACCURACY: Don't oversimplify. "insulin helps shuttle nutrients to muscles" not "opens gates". Muscle growth is multifactorial.

═══ CUSTOM SPIN — NON-NEGOTIABLE ═══
Expand the given talking points into an ORIGINAL script — never a translated/paraphrased version of a source video's specific claims. Talking points describe WHAT sub-topic to cover; you still choose the specific angle, examples, and reasoning yourself in Khaleeji Arabic.

═══ LENGTH — CRITICAL ═══
Target chapter duration: ${chapter.duration || `${targetMinutes} min`}.
Target spoken word count: ~${targetWords} Arabic words (~${ARABIC_WPM} wpm).
Write the full script at natural conversational pace. Do NOT abbreviate. Do NOT summarize. Match the duration target — token budget is ample, do not cut the script short to save space.

═══ OUTPUT ═══
ONLY valid JSON, no markdown.`;

    const prompt = `Write a full word-for-word Khaleeji Arabic YouTube chapter script.

VIDEO TOPIC: "${topic || 'fitness'}"
CHAPTER TITLE: "${chapter.title}"
${chapter.function ? `CHAPTER FUNCTION: ${chapter.function}` : ''}
TARGET DURATION: ${chapter.duration || `${targetMinutes} min`} (~${targetWords} Arabic words)

KEY TALKING POINTS TO EXPAND (each should become a substantive section of the spoken script):
${(chapter.points || []).map((p, i) => `${i + 1}. ${p}`).join('\n')}

RESEARCH AVAILABLE (cite ONLY where it genuinely supports a specific claim):
${(research || '').slice(0, 3500)}

WRITE THE FULL SCRIPT:
- Natural Khaleeji Arabic, conversational, written to be SPOKEN not read
- Expand each talking point into a full section of the chapter, not a sentence
- Use hedge language for physiology claims; cite real papers only when they truly support the claim
- Basic well-known facts need no citation
- Hit the ~${targetWords} word target — do not stop short
- End with a smooth transition that sets up the next chapter (or wraps up if final)

Return ONLY this JSON:
{"title":"${chapter.title.replace(/"/g, '\\"')}","fullScript":"complete word-for-word Arabic script at full target length","sources":[{"citation":"Author et al. (Year) — Title","finding":"specific finding cited in script","url":""}],"scriptIntegrity":{"hitTargetLength":true,"allClaimsCited":true,"hedgeLanguageUsed":true,"noBroScience":true,"notes":""}}`;

    const result = await callClaude({
      system: systemPrompt,
      prompt,
      maxTokens,
      label: `chapter:${String(chapter.title).slice(0, 30)}`
    });

    if (!result.fullScript) {
      return res.status(500).json({ error: 'Chapter script missing fullScript field' });
    }

    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('Chapter handler error:', error.message);
    return res.status(500).json({ error: error.message || 'Unknown chapter failure' });
  }
}

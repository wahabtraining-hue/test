import { callClaude, requireAuth } from '../../lib/anthropic';

export const config = { maxDuration: 300 };

// This route previously had NO system prompt at all — the only generation path
// in the app with no bro-science ban and no voice rules (bug #11).
const carouselSystem = `You are the WNAFM Content Engine for Wahab Alsaleh — Khaleeji Arabic men 25-45 in GCC.
VOICE: Direct, coach-like, Khaleeji Arabic (not MSA). Never MSA in slide copy.

SCIENTIFIC ACCURACY — NON-NEGOTIABLE:
- Only cite a paper if its ACTUAL finding directly supports the EXACT claim. If unsure, don't cite.
- Basic widely-accepted knowledge needs NO citation. Better no citation than a fake one.
- BANNED BRO-SCIENCE: "opens the gates"/"بوابات العضلة", "primes the pump", "switches on growth", "anabolic window", "burns fat like crazy", "activates muscle", "floods your system", dramatic on/off switching, "ATP burst", "literally", "guaranteed".
- Never invent percentages, kg figures or timeframes. Numbers must come from the cited source.
- Slide copy must carry the SAME claims as the approved script. Do not introduce new claims the script didn't make.

OUTPUT: ONLY valid JSON, no markdown fences.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!requireAuth(req, res)) return;

  const { script, angle } = req.body;
  if (!script || !angle) return res.status(400).json({ error: 'Script and angle required' });

  try {
    const prompt = `Design an Instagram carousel based on this approved fitness script for WNAFM by Wahab Alsaleh.

APPROVED SCRIPT (Khaleeji Arabic):
Topic: ${script.topicEnglish || script.topicArabic}
Hook: "${angle.hook}"
Body: "${angle.body}"
CTA: "${angle.cta}"
Sources: ${JSON.stringify(angle.sources || [])}

DESIGN INSTRUCTIONS:
- Decide the BEST slide count for this content (6-10 slides)
- Decide the BEST layout per slide based on content — DON'T force a fixed template
- Mix layouts: text-only impact slides, stat callouts, quote pulls, list slides, comparison slides, citation slides
- Brand colors: Background #0a0a0a (near-black), Text #f5f5f3 (off-white), Accent #e8a030 (amber), Card #141414, Border #2a2a2a
- Fonts: Bebas Neue for headlines (uppercase, wide letterspacing), DM Sans for body
- Aesthetic: Dark, minimal, premium fitness, sharp edges, NO rounded corners
- All Arabic text MUST carry dir="rtl" and text-align:right on its container
- Square 1080x1080 dimensions

For each slide, generate:
1. Layout type (impact / stat / quote / list / citation / cta / cover)
2. Full inline-styled HTML that renders as a 1080x1080 slide
3. Brief design rationale

KEEP THE HTML TIGHT. Inline styles only, no <style> blocks, no HTML comments, no
redundant wrapper divs. Verbose HTML is what pushes the response past its limit.

Return ONLY this JSON:
{
  "slideCount": 7,
  "slides": [
    {
      "num": 1,
      "type": "cover",
      "rationale": "why this layout works",
      "html": "complete inline-styled HTML for a 1080x1080 div with all brand styling baked in"
    }
  ]
}

For HTML: use exact dimensions width:1080px;height:1080px;background:#0a0a0a;color:#f5f5f3;font-family:'DM Sans',sans-serif;position:relative;overflow:hidden; etc. Make Bebas Neue headlines BIG (80-140px). Use generous padding (80-120px). Mix Arabic and English where appropriate. Pull real numbers from sources when relevant.`;

    // Was 10000 — far too low for 6-10 slides of full inline-styled HTML, so the
    // JSON truncated and the parse failed with a meaningless error (bug #11).
    const carousel = await callClaude({
      system: carouselSystem,
      prompt,
      maxTokens: 24000,
      label: 'carousel'
    });

    if (!Array.isArray(carousel.slides) || carousel.slides.length === 0) {
      return res.status(500).json({ error: 'Carousel came back with no slides.' });
    }

    return res.status(200).json({ success: true, carousel });
  } catch (error) {
    console.error('Carousel handler error:', error.message);
    return res.status(500).json({ error: error.message || 'Unknown carousel failure' });
  }
}

import { callClaude, runResearch, requireAuth, ARABIC_WPM, SOURCE_WPM } from '../../lib/anthropic';

// This route runs 6 research calls plus a long multi-angle generation.
// Without an explicit ceiling it inherits the account default, which is far
// below what this workload needs (bug #3). 300s requires a Vercel Pro plan;
// on Hobby the hard ceiling is 60 — lower this to 60 if you stay on Hobby.
export const config = { maxDuration: 300 };

const LEAD_MAGNETS = [
  { name: 'Free At-Home Training Program', keyword: 'برنامج' },
  { name: 'Coaching DM Flow', keyword: 'يلا' },
  { name: 'Pregnancy Training Guide', keyword: 'حامل' },
  { name: 'HIIT/LISS Cardio Generator', keyword: 'كارديو' },
  { name: 'Best Foods for Fat Loss', keyword: 'اكل' },
  { name: 'Macro Meal Distribution Tool', keyword: 'تقسيم' },
  { name: 'Calorie Calculator', keyword: 'سعرات' },
  { name: 'RPE Guide', keyword: 'شده' },
];

const PILLARS = ['Training', 'Nutrition', 'Supplements', 'Recovery', 'Mindset', 'Injury Prevention'];

const SUBTOPIC_BANK = `SUB-TOPIC BANK (a STARTING POINT and broad MAP — pull from these, AND go beyond them when a more specific or relevant evidence-defensible sub-topic exists. The bank is wide on purpose; pick from less-obvious corners, not just the first item in each cluster.):

TRAINING
  Intensity & effort: proximity to failure (RIR/RPE in practice), training to failure vs leaving reps, autoregulation by RPE within a session, daily readiness check, RPE vs percentage-based loading
  Loading methods: lengthened-position partials, eccentric tempo & control, accentuated eccentrics, slow concentric tempo, isometric pauses at sticking point, paused reps, cluster sets, rest-pause sets, drop sets when they work and when they don't, mechanical drop sets
  Volume & frequency: volume landmarks (MEV/MAV/MRV), high-frequency low-volume vs low-frequency high-volume, fractional volume per muscle, indirect volume from compounds, weekly set distribution, training a muscle twice vs once per week
  Exercise selection: stimulus-to-fatigue ratio (SFR), free weight vs machine SFR comparison, exercise rotation cadence, exercise order effects, unilateral vs bilateral, compound vs isolation prioritization, when to swap exercises, building grip as a limiter
  Rep ranges & specificity: low-rep strength vs hypertrophy-rep training, mixed-rep approaches, the 5-30 rep effective hypertrophy window, strength-specific accessory work
  Rest & density: rest period length (hypertrophy vs strength), intra-set rest, density training, work-to-rest ratios for conditioning
  Programming structures: daily undulating periodization (DUP), block periodization, conjugate basics, linear progression for beginners, autoregulated linear progression, accumulation/intensification/realization phases
  Technique & motor learning: video form analysis, internal vs external cues, bar path consistency, breathing mechanics under load, valsalva vs bracing, building movement patterns before load
  Specific lifts: hip hinge mastery before deadlift, squat depth and individual anatomy, bench press shoulder safety, overhead press setup, row variations and what each trains

NUTRITION
  Macro fundamentals: protein needs cutting vs bulking, protein per kg targets, carb intake by training intensity, fat minimums for hormonal health, micronutrient gaps in cutters
  Protein specifics: per-meal protein distribution, leucine threshold, animal vs plant protein quality, protein quality and amino acid profiles, casein vs whey for overnight, collagen specific uses
  Energy balance: maintenance calorie estimation, adaptive thermogenesis, energy availability and stalled deficits, diet breaks vs continuous dieting, reverse dieting reality, refeeds when they help
  Carbohydrates: carb timing around training, intra-workout carbs when they matter, low-carb training pros and cons, glycogen depletion and refill
  Fats: omega-3 status, dietary fat distribution, saturated fat in trained populations
  Behavior & adherence: fiber & satiety for adherence, satiety-by-volume strategies, eating-out and restaurant frameworks, alcohol's real cost to recovery, Ramadan nutrient timing, travel nutrition, weekend calorie creep, food logging fatigue
  Body comp tracking: scale weight noise vs trend, body fat measurement limits, photo tracking cadence, waist measurement as proxy

SUPPLEMENTS
  High-value evidence-based: creatine monohydrate dosing, creatine HCL marketing claims, caffeine dosing and timing, caffeine tolerance and cycling, beta-alanine for work capacity
  Performance & pump: citrulline malate dosing, beetroot for endurance, sodium for the pump, electrolytes vs plain water
  Connective tissue & joints: collagen + vitamin C for tendons, glucosamine evidence, fish oil for joint inflammation
  Sleep & recovery: ashwagandha evidence, magnesium for sleep, melatonin dosing
  Marketing red flags: underdosed proprietary blends, BCAAs vs whole protein, fat burners that don't burn fat, testosterone boosters claims vs reality, mass-gainer cost per gram
  Practical: cycling stimulants, timing of supplements around training, what to skip when budget is tight

RECOVERY
  Sleep: sleep quality vs quantity, wind-down routines, light exposure and circadian alignment, naps for athletes, jet lag protocols for travel
  Deloads: deload structure (volume vs intensity cut), proactive vs reactive deload, deload frequency by training stress, when to skip a deload
  Fatigue management: managing systemic weekly fatigue, CNS fatigue myth vs reality, active recovery vs full rest, deload after testing
  Modalities: heat and cold exposure evidence, sauna for endurance adaptations, ice baths and the hypertrophy tradeoff, contrast therapy claims, foam rolling actual effects
  Stress & lifestyle: autoregulation under life stress, training around poor sleep weeks, HRV as a guide, training around sickness
  Concurrent training: recovery demands of cardio plus lifting, interference effect in practice, scheduling for two-a-days

MINDSET
  Habits & identity: identity-based habits vs willpower, the minimum viable session, all-or-nothing trap, environment design over discipline
  Adherence: adherence beats the optimal program, behavior-changing tracking, social accountability structures
  Plateau psychology: navigating plateaus without panic, training through low-motivation periods, deload as psychological reset
  Comparison: the comparison trap online, your starting point vs theirs, ego lifting vs honest assessment
  Long-term thinking: training across decades, retirement of certain lifts as you age, sustainable intensity

INJURY PREVENTION
  Load management: avoiding volume spikes, acute-to-chronic workload ratio, return to training after time off, deconditioning realities
  Tendon health: isometric tendon loading, slow eccentric tendon protocols, patellar tendon protocols, Achilles loading, tendon stiffness vs strength
  Movement quality: hip-hinge mechanics for desk-bound backs, scapular control basics, ankle mobility for squat depth, t-spine extension for overhead work
  Shoulder & upper body: prehab for bench-press shoulder, rotator cuff balance work, overhead press readiness, elbow tendinopathy in pullers
  Lower body: knee health & quad/hamstring balance, calf strain prevention, glute strength as low-back insurance, foot strength basics
  Pain & niggles: niggles vs pushing through, training around an existing injury, modifying load while keeping the pattern, when to deload vs when to see a clinician
  Programming for safety: warm-up sets as programming, exercise substitution menus, deload as injury prevention

SPECIFIC CONTEXTS
  Khaleeji audience realities: Ramadan training adjustments, summer heat training, gym etiquette and culture, training around social food obligations
  Life-stage: training in your 30s vs 20s, training as a busy professional, training around shift work, training while traveling, training with limited equipment at home
  Population-specific: training during weight cuts for combat, training while breastfeeding (for partner/family questions), training a teenager safely, training a parent over 50`;

// Rotating research pools for the "deeper" IG phase.
// Previously this phase always ran the SAME 3 hardcoded research queries
// (failure/eccentric tempo, citrulline/pump supplements, tendon isometrics)
// on every single call — which is why every "deeper" batch converged on the
// same handful of topics regardless of what was already used. This pool lets
// each call draw a different, randomized set of pillars/angles instead.
const DEEPER_RESEARCH_POOLS = {
  Training: [
    'proximity to failure RIR RPE autoregulation',
    'lengthened partials eccentric tempo isometric pauses',
    'volume landmarks MEV MAV MRV weekly set distribution',
    'stimulus-to-fatigue ratio exercise selection SFR',
    'daily undulating periodization vs block periodization',
    'rep ranges hypertrophy window mixed-rep training',
  ],
  Nutrition: [
    'protein per-meal distribution leucine threshold',
    'energy availability adaptive thermogenesis diet breaks',
    'carb timing around training glycogen refill',
    'fiber satiety adherence eating-out frameworks',
    'body comp tracking scale weight noise trend',
    'reverse dieting maintenance calorie estimation',
  ],
  Supplements: [
    'citrulline malate beetroot sodium pump performance',
    'creatine dosing forms caffeine tolerance cycling',
    'collagen vitamin C tendon glucosamine fish oil joints',
    'ashwagandha magnesium melatonin sleep supplements',
    'underdosed proprietary blends fat burner claims evidence',
    'beta-alanine work capacity dosing timing',
  ],
  Recovery: [
    'deload structure volume vs intensity cut',
    'sleep quality circadian light exposure naps',
    'heat cold exposure sauna ice bath hypertrophy tradeoff',
    'CNS fatigue myth active recovery HRV',
    'interference effect concurrent training cardio lifting',
    'proactive vs reactive deload frequency',
  ],
  Mindset: [
    'identity-based habits minimum viable session',
    'adherence beats optimal program tracking accountability',
    'plateau psychology training through low motivation',
    'comparison trap ego lifting honest assessment',
    'training across decades sustainable intensity',
  ],
  'Injury Prevention': [
    'isometric tendon loading slow eccentric protocols',
    'acute-to-chronic workload ratio load management',
    'scapular control ankle mobility t-spine extension',
    'niggles vs pushing through modifying load',
    'rotator cuff balance prehab bench shoulder',
  ],
};

// sort(() => Math.random() - 0.5) is a well-known biased shuffle — it does NOT
// produce uniform randomness, it systematically favors early list items. That
// bias is why deeper angles kept converging on the same handful of topics
// (leucine, stimulus-to-fatigue, etc.) regardless of the rotation logic below.
// Fisher-Yates is the actual fix.
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Previously this filtered on q.split(' ')[0] — only the FIRST WORD of each
// query was ever compared against the used-topic list. Measured: of 34 distinct
// first-words, a typical batch matched 3. It was a near no-op, so the rotation
// looked like it was working and mostly wasn't (bug #7).
// Now: score every query by how many of its meaningful words already appear in
// the used list, and prefer the least-overlapping one.
const STOPWORDS = new Set(['to','vs','the','and','of','for','a','in','on','at','by','per','with','from','out','how','why']);

function overlapScore(query, usedText) {
  const words = query.toLowerCase().split(/[^a-z0-9-]+/).filter(w => w.length > 3 && !STOPWORDS.has(w));
  if (words.length === 0) return 0;
  let hits = 0;
  for (const w of words) if (usedText.includes(w)) hits++;
  return hits / words.length;
}

function pickDeeperResearchQueries(sourceTopic, usedTopics, count) {
  const usedText = (usedTopics || '').toLowerCase();
  const pillars = shuffle(Object.keys(DEEPER_RESEARCH_POOLS));
  const queries = [];
  for (const pillar of pillars) {
    if (queries.length >= count) break;
    const ranked = shuffle(DEEPER_RESEARCH_POOLS[pillar])
      .map(q => ({ q, score: overlapScore(q, usedText) }))
      .sort((a, b) => a.score - b.score);
    // Skip this pillar entirely if everything in it is already well covered.
    if (ranked[0].score > 0.5) continue;
    queries.push(`${sourceTopic || ''} ${ranked[0].q}`.trim());
  }
  // If every pillar was saturated, fall back rather than returning nothing.
  if (queries.length === 0) {
    const all = shuffle(Object.values(DEEPER_RESEARCH_POOLS).flat());
    for (let i = 0; i < Math.min(count, all.length); i++) {
      queries.push(`${sourceTopic || ''} ${all[i]}`.trim());
    }
  }
  return queries;
}

// Match the source video's spoken DURATION, not its raw word count.
// Source transcripts are usually English (~150 wpm); the output is Arabic
// (~125 wpm and more compact), so equal duration means fewer Arabic words.
function targetWordsForSource(sourceWordCount) {
  const sourceSeconds = (sourceWordCount / SOURCE_WPM) * 60;
  const arabicWords = Math.round((sourceSeconds / 60) * ARABIC_WPM);
  return Math.max(60, Math.min(400, arabicWords));
}

const baseSystem = `You are the WNAFM Content Engine for Wahab Alsaleh — Khaleeji Arabic men 25-45 in GCC.
VOICE: Direct, coach-like, Khaleeji Arabic (not MSA).
PILLARS: Training, Nutrition, Supplements, Recovery, Mindset, Injury Prevention.

═══ SCIENTIFIC ACCURACY — NON-NEGOTIABLE ═══
RULE 1 — CITATION MATCHING: Only cite a paper if its ACTUAL finding directly supports the EXACT claim. If unsure → DON'T cite, use general logic.
RULE 2 — COMMON-SENSE FALLBACK: Basic knowledge (carbs give energy, protein helps recovery, sleep matters) needs NO citation. Say it confidently. Better no citation than a fake one. ONLY cite when a specific paper specifically supports a specific claim.
RULE 3 — BANNED BRO-SCIENCE: "opens the gates"/"بوابات العضلة", "primes the pump", "switches on growth", "anabolic window", "burns fat like crazy", "activates muscle", "floods your system", dramatic on/off switching, "ATP burst", "literally", "guaranteed".
RULE 4 — HEDGE LANGUAGE: "evidence suggests", "research indicates", "may support", "has been shown to". AVOID "guarantees", "literally", "always", "scientifically proven", "100%".
RULE 5 — NUMBER HONESTY: Never invent percentages/kg/timeframes. Cite exact numbers from studies. No number? Use qualitative language.
RULE 6 — MECHANISM ACCURACY: Don't oversimplify. "insulin helps shuttle nutrients to muscles" not "opens gates". Muscle growth is multifactorial.
RULE 7 — SOURCE-CLAIM SELF-CHECK: Does this paper's actual finding support this exact statement? If unsure → soften or remove citation.

═══ TEMPLATE MODE — LITERAL VS STRUCTURAL ═══
DEFAULT to LITERAL. Escalate to STRUCTURAL only if literal would clearly fail.
LITERAL (any present): 3+ items with parallel structure, "X or Y?" comparison, repeating stems (First/Next/Then), timestamps, listicles, POV scenes, under-60s where structure IS the hook → copy exact sentence structure, swap content.
STRUCTURAL (only if literal breaks): named principles with VARIED internal structure, narrative arcs, multi-step dependent arguments → capture intent: count beats, match number and function.
WHEN UNCERTAIN → LITERAL.
BEAT COUNT FIDELITY: If source has N beats, output has N beats. Never collapse or merge.

═══ BODY LENGTH — MATCH SOURCE ═══
Match the source video's content length and density. If source body is dense with many sentences, write dense with many sentences. If source is sparse, write sparse. Never write a brief summary or abbreviated version of a detailed source. The script body should be the FULL spoken script at the source's natural pacing — not a condensed take.

═══ FITNESS REDIRECT — NON-FITNESS SOURCE ═══
If the source is NOT about fitness (money, relationships, general life advice, etc.), keep the STRUCTURAL SKELETON ONLY: the opening hook-question frame, the number of beats/examples, the list format, the closing pattern.
DO NOT map the source's specific examples, rhetorical devices, or arguments one-to-one into fitness/nutrition equivalents. That is translation with a different noun, not a redirect.
BANNED PATTERN — mapping each specific device the source names into an equivalent fitness device:
  Source names "energy / frequency / manifesting / vibrations" as vague terms money-talkers invent → Output naming "frequency / toxin cleanse / metabolism ignite / alkaline / organic frequency" as vague terms nutrition-talkers invent = STOLEN (this is a literal swap, word-for-word structure preserved)
CORRECT APPROACH: use the hook's QUESTION FRAME (e.g. "what's the one thing about X you've never said on camera") but fill the body with a genuinely different, evidence-grounded WNAFM claim that has nothing to do with mirroring the source's specific list of buzzwords or reasoning chain. The body's actual argument should stand on its own — if you deleted the source, a reader should not be able to reconstruct it from your output.

═══ CUSTOM SPIN — NON-NEGOTIABLE (applies even when the source IS already a fitness video) ═══
LITERAL template mode means you copy the STRUCTURAL FORMAT ONLY (beat count, sentence stems, comparison pattern, ending pattern). It NEVER means translating the source's actual claims, advice, examples, or reasoning into Arabic.
Translating a fitness video's specific tip into Arabic with WNAFM branding is STILL COPYING — a translation with a logo on it is not an original angle.
BEFORE WRITING: identify the source's specific claim/tip per beat. Your corresponding beat must teach a DIFFERENT specific sub-topic (different mechanism, different variable, different population, or a deeper/more advanced layer of the same general area) — not a rephrasing of the same claim.
SELF-CHECK per beat: "If I put my beat next to the source's beat, could someone tell they're just the same point in two languages?" If yes → pick a different, more specific angle from the sub-topic bank (or an evidence-defensible one beyond it) before finalizing.
It is fine for the general PILLAR to overlap (e.g. both about nutrition) — it is NOT fine for the specific mechanism/claim to overlap.

═══ OUTPUT ═══ ONLY valid JSON, no markdown. Each angle has scriptIntegrity. Full Khaleeji Arabic.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!requireAuth(req, res)) return;

  const { transcript, visualHook, handle, views, format, specificRequest, phase, context, recentTopics } = req.body;
  if (!transcript?.trim() && phase !== 'deeper') return res.status(400).json({ error: 'Transcript required' });
  if (!format) return res.status(400).json({ error: 'Format required' });

  try {
    // ─── YOUTUBE — TWO-PHASE: skeleton then enrichment ───
    if (format === 'youtube') {
      const sourceWords = transcript.trim().split(/\s+/).length;
      const sourceMinutes = Math.max(1, Math.round(sourceWords / SOURCE_WPM));

      const avoidList = Array.isArray(recentTopics) && recentTopics.length > 0
        ? recentTopics.slice(0, 60).join(', ')
        : '';

      let scalingHint;
      if (sourceMinutes <= 5) scalingHint = '3-4 chapters';
      else if (sourceMinutes <= 10) scalingHint = '5-7 chapters';
      else if (sourceMinutes <= 15) scalingHint = '7-9 chapters';
      else if (sourceMinutes <= 25) scalingHint = '9-12 chapters';
      else scalingHint = '12-15+ chapters';

      // PHASE 2 — ENRICHMENT (called separately)
      if (phase === 'yt_enrich') {
        const ctx = context || {};
        const chapters = ctx.chapters || [];
        const sourceTopic = ctx.sourceTopic || '';
        const fullResearch = ctx.fullResearch || '';

        const enrichPrompt = `Enrich each chapter's talking points into substantive paragraph-length content for an Arabic YouTube video.

VIDEO TOPIC: "${sourceTopic}"
SOURCE FORMAT: ${ctx.sourceFormat || 'unknown'}
TEMPLATE MODE: ${ctx.templateMode || 'literal'}

CHAPTERS TO ENRICH (each currently has brief talking points — expand them):
${JSON.stringify(chapters.map(c => ({ title: c.title, function: c.function, duration: c.duration, briefPoints: c.points })), null, 2)}

RESEARCH (cite ONLY where directly supports a claim):
${fullResearch.slice(0, 3500)}

FOR EACH CHAPTER:
- Expand each brief talking point into a SUBSTANTIVE 2-3 sentence paragraph in Khaleeji Arabic
- Each enriched point should be expandable by chapter.js into ~90-120 seconds of spoken content
- Keep the same number of points per chapter as the skeleton
- Maintain the chapter's function (intro/principle/example/etc.)
- Apply ALL safeguards: no bro-science, hedge language, common-sense fallback, citation matching
- Each expanded point must teach a genuinely original WNAFM sub-topic, not a translated version of the source's point — see CUSTOM SPIN rule.
- Give every chapter its full intended depth; do not compress later chapters to fit — token budget is ample.
- Add per-chapter sources where research directly supports claims

Return ONLY valid JSON:
{"chapters":[{"title":"same as input","duration":"same as input","function":"same as input","points":["substantive paragraph 1","substantive paragraph 2"],"sources":[{"citation":"","finding":"","url":""}]}]}`;

        const enrichResult = await callClaude({ system: baseSystem, prompt: enrichPrompt, maxTokens: 24000, label: 'yt-enrich' });
        return res.status(200).json({ success: true, chapters: enrichResult.chapters });
      }

      // PHASE 1 — SKELETON
      const researchRun = await runResearch([
        transcript.slice(0, 200),
        `${transcript.slice(0,150)} training programming hypertrophy`,
        `${transcript.slice(0,150)} nutrition recovery injury prevention`
      ]);
      const research = researchRun.text.slice(0, 3500);

      const extraChapter = specificRequest
        ? `\n\nADDITIONAL REQUEST: Include this content/angle: "${specificRequest.slice(0, 150)}". Weave into the structure naturally.`
        : '';

      const prompt = `Source YouTube video from ${handle || 'Unknown'}.

═══ SOURCE LENGTH ═══
Estimated source duration: ~${sourceMinutes} minutes (${sourceWords} transcript words at ~${SOURCE_WPM} spoken wpm).
REQUIRED OUTLINE SIZE: ${scalingHint}. Non-negotiable. Do NOT default to 3-4 chapters for a long source.

═══ SOURCE TRANSCRIPT (study for STRUCTURE only — never copy its content) ═══
"${transcript.slice(0, 1800)}"

═══ RESEARCH FOR YOUR ORIGINAL FITNESS CONTENT ═══
${research}
${extraChapter}

═══ DO NOT REUSE — TOPICS FROM YOUR RECENT APPROVED SCRIPTS ═══
${avoidList ? `These specific sub-topics appeared in Wahab's recent approved YouTube scripts. Do NOT use them again — pick GENUINELY DIFFERENT specific sub-topics this time:\n\n${avoidList}\n\nIf a broader area genuinely fits (e.g. "protein" is unavoidable for a nutrition video), pick a DIFFERENT angle within it that's NOT in the list above. For example, if "protein distribution across meals" is in the avoid list, you could cover "protein quality and amino acid profiles" or "protein needs in caloric deficit" — different specific sub-topic, same broader pillar.\n\nGenuinely fresh sub-topics required — recycling is failure.\n\n═══ COPY VS. ORIGINAL — READ THIS BEFORE GENERATING ═══` : '═══ COPY VS. ORIGINAL — READ THIS BEFORE GENERATING ═══'}

LITERAL MODE means copy the STRUCTURAL FORMAT (numbered list, parallel sentence stems, beat count, ending pattern). It does NOT mean copy the source's specific advice or content. Each numbered item in your output must teach a DIFFERENT specific fitness principle than the source's corresponding item.

This applies double for advice-listicle sources whose tips are general life-advice (sleep, social environment, time, saying no, body care, humility, focus). Those tips translate so naturally to fitness that the model often just translates them. That is COPYING, not originality. Translation with a fitness sticker is still theft.

WORKED EXAMPLE — these patterns are STEALING and must be avoided:
  Source #1 "don't get good at things you hate" → Output #1 "don't specialize in training you hate" = STOLEN
  Source #2 "go to bed and wake up at the same time" → Output #2 "sleep at the same time" = STOLEN
  Source #3 "your body is the only one you have" → Output #3 "your body is the only one you have" = STOLEN (verbatim!)
  Source #4 "stay close to people who want more for you" → Output #4 "stay close to people who want more for you" = STOLEN
  Source #17 "no is a complete sentence" → Output #X "learn to say no" = STOLEN

ORIGINAL means the OUTPUT's specific advice topic must come from WNAFM training/programming/nutrition/recovery/supplements/injury-prevention sub-topics that the source DID NOT cover. Examples of genuinely original numbered fitness advice for a "if I went back to my 20s" listicle:
  - "Start tracking proximity to failure (RIR), not just sets x reps"
  - "Lengthen your warm-up sets and treat them as programming, not ritual"
  - "Stop chasing soreness as a marker of a good workout"
  - "Periodize your year — you can't peak 52 weeks straight"
  - "Master the hip hinge before you load the deadlift"
  - "Learn to autoregulate volume by sleep and life stress"
  - "Build a base of unilateral work before chasing bilateral PRs"
  - "Treat protein distribution across meals, not just total daily intake"
  - "Eat carbs around training, not by clock time"
  - "Add tendon-loading isometrics before you need them"
  - "Filming your lifts is the cheapest coach you'll ever have"
  - "Volume landmarks (MEV/MAV/MRV) matter more than 'just push harder'"

These are SPECIFIC fitness sub-topics with technical substance the source never touched. THAT is originality. Pick from the sub-topic bank or anywhere deeper that fits.

STRUCTURE you DO copy from the source: numbered advice frame, "if I could go back" angle, beat count (target ${scalingHint}), parallel sentence pattern in titles, advice-plus-rationale per beat, recap + CTA at end.

CONTENT you DO NOT copy: the source's specific tips, their examples, their phrasings, their order of topics. None of that.

═══ TASK — SKELETON ONLY ═══

This is PHASE 1: generate the SKELETON. Phase 2 enriches talking points into substantive paragraphs separately.

PHASE 1 OUTPUT REQUIREMENTS:
- Source structure extraction: identify sourceFormat (listicle/teaching-framework/talking-head/etc), templateMode (default literal), brief template summary
- Hook: 2-3 Arabic sentences matching source opening's frame but with WNAFM fitness setup
- All chapter titles in Khaleeji Arabic. Each must teach a SPECIFIC fitness sub-topic the source did not cover. NO source-item paraphrases.
- Per chapter: function label + estimated duration + originalityCheck field (fitness sub-topic drawn from + source item NOT being copied)
- Brief one-line talking points per chapter (Phase 2 will expand)
- Outro + CTA with ManyChat keyword
- Pick best WNAFM pillar
- Fitness redirect if non-fitness source

CITATION RULE: Only cite where research directly supports. Common-sense fallback for basic claims. No fake citations.

Lead magnets: ${LEAD_MAGNETS.map(lm => `${lm.name}=${lm.keyword}`).join(', ')}

Return ONLY this JSON (chapter count matches source, talking points are brief one-liners, EVERY chapter includes originalityCheck):
{"format":"youtube","pillar":"","sourceFormat":"","templateMode":"literal","templateModeReason":"","fitnessRedirect":false,"redirectExplanation":null,"topicArabic":"","topicEnglish":"","title":"","estimatedDuration":"~${sourceMinutes} min","template":"","hook":"","chapters":[{"title":"","duration":"","function":"","originalityCheck":{"fitnessSubTopic":"specific WNAFM sub-topic this draws from","sourceItemNotCopied":"which source item this is NOT borrowing from and why it's different"},"points":["brief one-liner"],"sources":[]}],"outro":"","leadMagnet":{"matched":true,"name":"","keyword":"","newSuggestion":null},"allSources":[{"citation":"","finding":"","url":""}],"scriptIntegrity":{"formatMatchesSource":true,"chapterCountMatchesSource":true,"sourceContentNotCopied":true,"allClaimsCited":true,"hedgeLanguageUsed":true,"notes":""}}`;

      const result = await callClaude({ system: baseSystem, prompt, maxTokens: 20000, label: 'yt-skeleton' });
      result.fullResearch = research;
      result.sourceTranscript = transcript.slice(0, 1000);
      result.enrichStatus = 'pending';
      result.researchHealth = { ok: researchRun.ok, failed: researchRun.failed, errors: researchRun.errors };
      return res.status(200).json({ success: true, result });
    }

    // ─── IG PHASE 1: 6 BEGINNER DEFAULTS ───
    if (phase === 'defaults' || !phase) {
      // Derive an explicit body word-count target from the source, same approach
      // as chapter.js — "match density" with no number was too vague for the
      // model to act on, and the UI's hardcoded 0:03–0:28 label was reinforcing
      // a ~25s/60-80-word norm regardless of actual source length.
      const sourceWordCount = transcript.trim().split(/\s+/).length;
      const targetBodyWords = targetWordsForSource(sourceWordCount);

      const researchRun = await runResearch([
        transcript.slice(0, 200),
        `${transcript.slice(0,150)} training programming hypertrophy`,
        `${transcript.slice(0,150)} nutrition protein diet`,
        `${transcript.slice(0,150)} supplements creatine`,
        `${transcript.slice(0,150)} recovery sleep`,
        `${transcript.slice(0,150)} injury prevention prehab`,
      ]);
      const research = researchRun.text.slice(0, 5000);

      const schema = PILLARS.map(p => `{"type":"${p}","tier":"default","topic":"","hook":"","body":"","cta":"","visualHook":"","sources":[{"citation":"","finding":"","url":""}],"scriptIntegrity":{"formatMatchesSource":true,"allClaimsCited":true,"hedgeLanguageUsed":true,"notes":""}}`).join(',');

      const prompt = `Reel from ${handle || 'Unknown'} — ${views || '—'} views.
SOURCE TRANSCRIPT: "${transcript.slice(0, 700)}"
VISUAL HOOK: "${(visualHook || 'Not specified').slice(0, 100)}"
RESEARCH:
${research}

PROCESS:
1. Read source. Identify EXACT format. Count structural beats. Decide template mode (default literal).
2. Generate 6 BEGINNER DEFAULT angles — one per pillar in this order: Training, Nutrition, Supplements, Recovery, Mindset, Injury Prevention.
3. These are for a BEGINNER audience — obvious foundational topics are GOOD here (creatine, sleep, protein, progressive overload, warming up).
4. ALL 6 use the SAME template structure and beat count as source.
5. BODY LENGTH — explicit target, not a vague match: aim for ~${targetBodyWords} Arabic words per body (source transcript is ${sourceWordCount} words). This may run past what looks like a "normal" 25-second Reel body — that's fine, ignore any on-screen timestamp label, write to the word target, not to a fixed 30-35s Reel assumption.
6. TOKEN BUDGET IS NOT A CONSTRAINT — you have ample room. Give EVERY one of the 6 angles the SAME full body length (~${targetBodyWords} words each). Do NOT write angle 1 in full and then compress angles 4-6 to save space — that is a failure. Each body is independently scored for hitting the word target.
7. Cite only where research supports; else common-sense, no fake citations.

Lead magnets: ${LEAD_MAGNETS.map(lm => `${lm.name}=${lm.keyword}`).join(', ')}

Return ONLY this JSON:
{"format":"ig","pillar":"mixed","sourceFormat":"","templateMode":"literal","templateModeReason":"","hookType":"","topicArabic":"","topicEnglish":"","fitnessRedirect":false,"redirectExplanation":null,"template":"","angles":[${schema}],"leadMagnet":{"matched":true,"name":"","keyword":"","newSuggestion":null}}`;

      const result = await callClaude({ system: baseSystem, prompt, maxTokens: 32000, label: 'ig-defaults' });
      result.fullResearch = research;
      result.sourceTranscript = transcript.slice(0, 3000);
      result.sourceWordCount = sourceWordCount;
      result.researchHealth = { ok: researchRun.ok, failed: researchRun.failed, errors: researchRun.errors };
      return res.status(200).json({ success: true, result });
    }

    // ─── IG PHASE 2: DEEPER CUTS + OPTIONAL CUSTOM ───
    if (phase === 'deeper') {
      const ctx = context || {};
      const hasSpecific = specificRequest && specificRequest.trim().length > 0;
      const deeperCount = hasSpecific ? 3 : 4;
      const usedTopics = (ctx.usedTopics || []).join('; ');

      // Same explicit word-count approach as the defaults phase — fall back to
      // estimating from the stored transcript slice if sourceWordCount wasn't
      // propagated (e.g. older script objects created before this field existed).
      const fallbackWordCount = (ctx.sourceTranscript || transcript || '').trim().split(/\s+/).filter(Boolean).length;
      const sourceWordCount = ctx.sourceWordCount || fallbackWordCount;
      const targetBodyWords = targetWordsForSource(sourceWordCount);

      // Fresh deeper-targeted research — rotates across pillars each call instead
      // of always hitting the same 3 hardcoded topics (see DEEPER_RESEARCH_POOLS).
      const deeperQueries = pickDeeperResearchQueries(ctx.sourceTopic, usedTopics, 3);
      const deeperRun = await runResearch(deeperQueries);
      const research = deeperRun.text.slice(0, 4000);

      const deeperSchema = [];
      for (let i = 0; i < deeperCount; i++) {
        deeperSchema.push(`{"type":"Deeper Cut","tier":"deep","topic":"","hook":"","body":"","cta":"","visualHook":"","sources":[{"citation":"","finding":"","url":""}],"scriptIntegrity":{"formatMatchesSource":true,"allClaimsCited":true,"hedgeLanguageUsed":true,"notes":""}}`);
      }
      if (hasSpecific) {
        deeperSchema.push(`{"type":"Custom","tier":"custom","topic":"","hook":"","body":"","cta":"","visualHook":"","sources":[{"citation":"","finding":"","url":""}],"scriptIntegrity":{"formatMatchesSource":true,"allClaimsCited":true,"hedgeLanguageUsed":true,"notes":""}}`);
      }

      const prompt = `Generate DEEPER-CUT angles for an existing Reel script set.

SOURCE FORMAT: ${ctx.sourceFormat || 'unknown'}
TEMPLATE MODE: ${ctx.templateMode || 'literal'}
TEMPLATE TO FOLLOW (same structure & beat count): ${ctx.template || 'match source structure'}
SOURCE TRANSCRIPT: "${(ctx.sourceTranscript || '').slice(0, 500)}"

ALREADY-USED TOPICS (do NOT repeat these — go deeper/different): ${usedTopics}

${SUBTOPIC_BANK}

DEEPER RESEARCH:
${research}

Generate ${deeperCount} DEEPER-CUT angles${hasSpecific ? ' plus 1 CUSTOM angle' : ''}:
- Each goes ONE LEVEL DEEPER than the obvious beginner take. Surprise an educated viewer.
- Pull from the sub-topic bank OR any more specific, more relevant, evidence-defensible sub-topic that's genuinely deeper. The bank is a guide, not a limit.
- Rotate across different pillars for variety. Do not all cover the same pillar.
- Same template structure and beat count as source.
- BODY LENGTH — explicit target: aim for ~${targetBodyWords} Arabic words per body. Ignore any on-screen 25-second timestamp label — write to the word target. Give every angle the SAME full length; do not compress later angles to fit — token budget is ample.
- Cite only where research supports; else common-sense, no fake citations.${hasSpecific ? `\n- CUSTOM angle fulfills: "${specificRequest.slice(0,150)}" using the same template.` : ''}

Return ONLY this JSON:
{"angles":[${deeperSchema.join(',')}]}`;

      const result = await callClaude({ system: baseSystem, prompt, maxTokens: 26000, label: 'ig-deeper' });
      return res.status(200).json({
        success: true,
        angles: result.angles,
        researchHealth: { ok: deeperRun.ok, failed: deeperRun.failed, errors: deeperRun.errors }
      });
    }

    return res.status(400).json({ error: 'Invalid phase' });
  } catch (error) {
    console.error('Handler error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

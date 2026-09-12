// Shared Claude caller + session guard.
// Every API route uses these so hardening can't drift between routes again
// (bug #4: generate.js was missing the JSON guards that chapter.js had).

import crypto from 'crypto';

export const MODEL = 'claude-sonnet-4-5-20250929';

// Arabic is spoken slower and is more compact than English.
// 150 wpm was an English figure applied to Arabic output everywhere.
export const ARABIC_WPM = 125;
export const SOURCE_WPM = 150; // source transcripts are usually English

const RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504, 529]);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── SESSION ──────────────────────────────────────────────────────────────────
// The password used to be hardcoded in the client bundle (bug #2). Login now
// sets an httpOnly cookie holding an HMAC of APP_PASSWORD; routes verify that.
// No secret ever reaches the browser.

export const SESSION_COOKIE = 'wnafm_session';

export function sessionToken() {
  const secret = process.env.APP_PASSWORD || '';
  return crypto.createHmac('sha256', secret).update('wnafm-os-session-v1').digest('base64url');
}

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

// Returns true if the request is authorised. Accepts the session cookie, and
// still accepts a body password so nothing breaks mid-session on deploy.
export function isAuthed(req) {
  if (!process.env.APP_PASSWORD) return false;
  const cookie = readCookie(req, SESSION_COOKIE);
  if (cookie) {
    const expected = sessionToken();
    const a = Buffer.from(cookie);
    const b = Buffer.from(expected);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }
  const pw = req.body?.password;
  return typeof pw === 'string' && pw.length > 0 && pw === process.env.APP_PASSWORD;
}

export function requireAuth(req, res) {
  if (isAuthed(req)) return true;
  res.status(401).json({ error: 'Unauthorized — log in again.' });
  return false;
}

// ─── CLAUDE ───────────────────────────────────────────────────────────────────

// Pull text out of the content array by BLOCK TYPE, not by position.
// content[0] is not guaranteed to be the text block.
function extractText(data) {
  if (!Array.isArray(data?.content)) return '';
  return data.content
    .filter(b => b && b.type === 'text' && typeof b.text === 'string')
    .map(b => b.text)
    .join('\n')
    .trim();
}

function stripFences(text) {
  return text.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').replace(/```json|```/g, '').trim();
}

// Recover from a preamble before the JSON ("Here is the JSON: {...}").
function sliceToJson(text) {
  const firstObj = text.indexOf('{');
  const firstArr = text.indexOf('[');
  const start = firstObj === -1 ? firstArr : firstArr === -1 ? firstObj : Math.min(firstObj, firstArr);
  if (start <= 0) return text;
  return text.slice(start).trim();
}

export async function callClaudeRaw({ system, prompt, maxTokens, label = 'claude' }) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set in Vercel.');

  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(1200 * attempt * attempt); // 1.2s, 4.8s

    let r;
    try {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: maxTokens,
          ...(system ? { system } : {}),
          messages: [{ role: 'user', content: prompt }]
        })
      });
    } catch (e) {
      lastErr = `network error: ${e.message}`;
      continue;
    }

    if (!r.ok) {
      const body = (await r.text()).slice(0, 300);
      lastErr = `${r.status} — ${body}`;
      if (RETRY_STATUSES.has(r.status)) continue;
      throw new Error(`Claude (${label}) failed: ${lastErr}`);
    }

    const data = await r.json();

    // A truncated response is a silent killer: the JSON is cut mid-string and
    // the parse error that follows tells you nothing about the real cause.
    if (data.stop_reason === 'max_tokens') {
      throw new Error(
        `Claude (${label}) hit the ${maxTokens}-token output cap and the response was cut off mid-JSON. ` +
        `The source is likely too long for one pass — shorten the transcript or split the batch.`
      );
    }

    const text = extractText(data);
    if (!text) {
      lastErr = 'response contained no text block';
      continue;
    }
    return { text, data };
  }

  throw new Error(`Claude (${label}) failed after 3 attempts: ${lastErr}`);
}

export async function callClaude({ system, prompt, maxTokens, label = 'claude' }) {
  const { text } = await callClaudeRaw({ system, prompt, maxTokens, label });
  const cleaned = sliceToJson(stripFences(text));
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error(
      `Claude (${label}) did not return valid JSON (${e.message}). ` +
      `Response started: ${cleaned.slice(0, 160)}`
    );
  }
}

// ─── PERPLEXITY ───────────────────────────────────────────────────────────────
// Failures used to return '' and vanish, so the app would generate against no
// research at all while the header still showed "LIVE RESEARCH ACTIVE".
// Now every query reports its own outcome back to the caller.

export async function runResearch(queries) {
  if (!process.env.PERPLEXITY_API_KEY) {
    return { text: '', ok: 0, failed: queries.length, errors: ['PERPLEXITY_API_KEY is not set in Vercel.'] };
  }

  const settled = await Promise.all(queries.map(async (q) => {
    let lastErr = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await sleep(1500);
      try {
        const r = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
          },
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [{
              role: 'user',
              content: `Find peer-reviewed evidence on: "${q}". 3-4 strongest sources — systematic reviews, meta-analyses, ISSN/ACSM/NSCA position stands, high-quality RCTs. NO opinion pieces or low-N studies. For each: full citation (author, year, journal, title), EXACT specific finding with numbers, and what the study was actually about.`
            }]
          })
        });
        if (!r.ok) {
          lastErr = `${r.status}`;
          if (RETRY_STATUSES.has(r.status)) continue;
          return { ok: false, error: `research "${q.slice(0, 40)}" failed (${lastErr})`, text: '' };
        }
        const d = await r.json();
        const content = d?.choices?.[0]?.message?.content;
        if (typeof content !== 'string' || !content.trim()) {
          lastErr = 'empty response';
          continue;
        }
        return { ok: true, text: content, error: null };
      } catch (e) {
        lastErr = e.message;
      }
    }
    return { ok: false, error: `research "${q.slice(0, 40)}" failed (${lastErr})`, text: '' };
  }));

  return {
    text: settled.filter(s => s.ok).map(s => s.text).join('\n\n---\n\n'),
    ok: settled.filter(s => s.ok).length,
    failed: settled.filter(s => !s.ok).length,
    errors: settled.filter(s => !s.ok).map(s => s.error)
  };
}

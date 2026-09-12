import { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';

// Design tokens — readable, high contrast, brand-aware
const C = {
  bg: '#0a0a0a', card: '#161616', card2: '#0f0f0f',
  border: '#2e2e2e', borderMd: '#3f3f3d',
  text: '#f5f5f3', muted: '#b5b5b0', dim: '#7a7a76',
  green: '#5ec88f', amber: '#f0a83a', red: '#e85f5f', blue: '#3da9d8'
};

const T = {
  display: { fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.08em' },
  label: { fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, fontWeight: 500 },
  body: { fontSize: 15, lineHeight: 1.7, color: C.text, fontWeight: 400 },
  bodyMuted: { fontSize: 14, lineHeight: 1.65, color: C.muted, fontWeight: 400 }
};

const inp = { width: '100%', background: C.card2, border: `1px solid ${C.border}`, color: C.text, padding: '14px 16px', fontSize: 15, fontWeight: 400, outline: 'none', fontFamily: 'DM Sans, sans-serif' };
const lbl = { ...T.label, marginBottom: 8, display: 'block' };

// Estimate spoken seconds from Arabic word count and format as m:ss.
// Recalibrated from 150 wpm (an English figure) to 125 — Arabic is spoken
// slower and is more compact, so 150 overstated every duration by ~20%.
const ARABIC_WPM = 125;
function estSeconds(text) {
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.round((words / ARABIC_WPM) * 60);
}
function fmtTime(totalSeconds) {
  const s = Math.max(0, totalSeconds || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
let _uidCounter = 0;
function uid() {
  _uidCounter += 1;
  return `${Date.now()}-${_uidCounter}`;
}

// Approved entries used to store a full copy of the script — research text,
// transcript and all 10 angles — once PER APPROVED ANGLE. Measured ~33.6k chars
// each, so ~78 entries filled the localStorage quota, after which setItem threw
// inside an empty catch and approvals silently stopped saving (bug #5).
function slimApprovedIG(script, idx) {
  const { fullResearch, sourceTranscript, angles, researchHealth, _specificRequest, ...rest } = script;
  return {
    ...rest,
    id: `${script.id}-${idx}`,
    approvedAngle: angles[idx],
    approvedIdx: idx,
    pillar: angles[idx].type
  };
}
function slimApprovedYT(script) {
  const { sourceTranscript, researchHealth, _specificRequest, ...rest } = script;
  // fullResearch is kept (chapter scripts are generated from it) but capped.
  return { ...rest, fullResearch: String(script.fullResearch || '').slice(0, 2500) };
}
// One-time cleanup of entries saved under the old fat shape.
function migrateApproved(list) {
  return list.map(s => {
    if (s.format === 'youtube') {
      if (!s.sourceTranscript) return s;
      return slimApprovedYT(s);
    }
    if (!s.approvedAngle || (!s.angles && !s.fullResearch && !s.sourceTranscript)) return s;
    const { fullResearch, sourceTranscript, angles, researchHealth, _specificRequest, ...rest } = s;
    return rest;
  });
}

const btnSolid = { padding: '12px 24px', background: C.text, color: C.bg, border: 'none', cursor: 'pointer', fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 };
const btnGhost = { padding: '12px 20px', background: 'transparent', color: C.text, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500 };
const btnBlue = { padding: '12px 20px', background: 'transparent', color: C.blue, border: `1px solid rgba(61,169,216,.4)`, cursor: 'pointer', fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500 };
const btnAmber = { padding: '10px 18px', background: 'transparent', color: C.amber, border: `1px solid rgba(240,168,58,.4)`, cursor: 'pointer', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500 };

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ onLogin, error }) {
  const [pw, setPw] = useState('');
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ ...T.display, fontSize: 44 }}>WNAFM</div>
        <div style={{ ...T.display, fontSize: 16, color: C.muted }}>CONTENT OS</div>
        <div style={{ height: 1, background: C.border, margin: '4px 0' }} />
        <div><label style={lbl}>Password</label><input type="password" style={inp} value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && onLogin(pw)} placeholder="Enter password" autoFocus /></div>
        {error && <div style={{ fontSize: 13, color: C.red }}>{error}</div>}
        <button style={{ ...btnSolid, padding: '14px', width: '100%' }} onClick={() => onLogin(pw)}>Enter →</button>
      </div>
    </div>
  );
}

// ─── EDITABLE FIELD ────────────────────────────────────────────────────────────
function EditableField({ value, onChange, multiline, style }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => { setVal(value); }, [value]);
  return editing ? (
    multiline ? (
      <textarea
        autoFocus
        style={{ ...inp, ...style, minHeight: 80, resize: 'vertical', background: 'rgba(232,168,58,.04)', border: `1px solid ${C.amber}` }}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => { onChange(val); setEditing(false); }}
      />
    ) : (
      <input
        autoFocus
        style={{ ...inp, ...style, background: 'rgba(232,168,58,.04)', border: `1px solid ${C.amber}` }}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => { onChange(val); setEditing(false); }}
        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.target.blur())}
      />
    )
  ) : (
    <div className="editable" style={style} onClick={() => setEditing(true)} title="Click to edit">{val}</div>
  );
}

// ─── SOURCES ───────────────────────────────────────────────────────────────────
function SourcesList({ sources }) {
  if (!sources?.length) return null;
  return (
    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18, marginTop: 16 }}>
      <div style={{ ...T.label, marginBottom: 14 }}>Research Sources</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sources.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: 14, background: C.card2, border: `1px solid ${C.border}` }}>
            <div style={{ width: 6, height: 6, background: C.green, borderRadius: '50%', marginTop: 8, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: C.text, marginBottom: 4, fontWeight: 500 }}>{s.citation}</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.55 }}>{s.finding}</div>
              {s.url && <a href={s.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.blue, marginTop: 8, display: 'inline-block', textDecoration: 'none', borderBottom: `1px solid ${C.blue}40` }}>View Source ↗</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── INTEGRITY BADGE ───────────────────────────────────────────────────────────
function IntegrityBadge({ integrity }) {
  if (!integrity) return null;
  const all = integrity.formatMatchesSource && integrity.allClaimsCited && integrity.hedgeLanguageUsed;
  return (
    <div style={{ padding: 12, background: all ? 'rgba(94,200,143,.05)' : 'rgba(240,168,58,.05)', border: `1px solid ${all ? 'rgba(94,200,143,.25)' : 'rgba(240,168,58,.25)'}`, borderLeft: `3px solid ${all ? C.green : C.amber}` }}>
      <div style={{ ...T.label, color: all ? C.green : C.amber, marginBottom: 8 }}>Script Integrity Check</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, fontSize: 13 }}>
        <div>Format Match: <span style={{ color: integrity.formatMatchesSource ? C.green : C.red }}>{integrity.formatMatchesSource ? '✓' : '⚠'}</span></div>
        <div>Claims Cited: <span style={{ color: integrity.allClaimsCited ? C.green : C.amber }}>{integrity.allClaimsCited ? '✓' : '⚠'}</span></div>
        <div>Hedge Language: <span style={{ color: integrity.hedgeLanguageUsed ? C.green : C.amber }}>{integrity.hedgeLanguageUsed ? '✓' : '⚠'}</span></div>
      </div>
      {integrity.notes && <div style={{ fontSize: 12, color: C.muted, marginTop: 8, fontStyle: 'italic' }}>{integrity.notes}</div>}
    </div>
  );
}

// ─── COPY HELPER ───────────────────────────────────────────────────────────────
function copyToClipboard(text, btnRef) {
  navigator.clipboard.writeText(text);
  if (btnRef?.current) {
    const orig = btnRef.current.textContent;
    btnRef.current.textContent = '✓ COPIED';
    setTimeout(() => { if (btnRef.current) btnRef.current.textContent = orig; }, 1500);
  }
}

function formatScriptForCopy(script, angle) {
  // These were hardcoded 0:00–0:03 / 0:03–0:28 / 0:28–0:35. The on-screen
  // labels were fixed to compute from word count but the COPY output — the
  // thing actually pasted into a shot list — still carried the fake numbers.
  const tHook = estSeconds(angle?.hook);
  const tBody = tHook + estSeconds(angle?.body);
  const tCta = tBody + estSeconds(angle?.cta);
  const sourcesText = (angle?.sources || []).map(s => `• ${s.citation}\n  Finding: ${s.finding}${s.url ? `\n  Link: ${s.url}` : ''}`).join('\n\n');
  return `TOPIC: ${script.topicArabic}\n${script.topicEnglish ? `(${script.topicEnglish})\n` : ''}\nFORMAT: ${script.sourceFormat || 'N/A'}\nPILLAR: ${angle?.type || ''}\nANGLE: ${angle?.topic || ''}\n\n━━━━━━━━━━━━━━━━━━━━\n\nHOOK (${fmtTime(0)}–${fmtTime(tHook)}):\n${angle?.hook || ''}\n\nBODY (${fmtTime(tHook)}–${fmtTime(tBody)}):\n${angle?.body || ''}\n\nCTA (${fmtTime(tBody)}–${fmtTime(tCta)}):\n${angle?.cta || ''}\n\n━━━━━━━━━━━━━━━━━━━━\n\nVISUAL HOOK DIRECTION:\n${angle?.visualHook || ''}\n\n━━━━━━━━━━━━━━━━━━━━\n\nRESEARCH SOURCES:\n\n${sourcesText}\n\n━━━━━━━━━━━━━━━━━━━━\n\nLEAD MAGNET: ${script.leadMagnet?.name || script.leadMagnet?.newSuggestion?.name || ''}\nMANYCHAT KEYWORD: ${script.leadMagnet?.keyword || script.leadMagnet?.newSuggestion?.keyword || ''}`;
}

function formatYTForCopy(script) {
  const chaptersText = (script.chapters || []).map((ch, i) => {
    const points = (ch.points || []).map(p => `  • ${p}`).join('\n');
    return `CHAPTER ${i + 1}: ${ch.title} (${ch.duration})\n${points}`;
  }).join('\n\n');
  const sourcesText = (script.allSources || []).map(s => `• ${s.citation}\n  ${s.finding}${s.url ? `\n  ${s.url}` : ''}`).join('\n\n');
  return `YOUTUBE SCRIPT\n\nTITLE: ${script.title}\n\n━━━━━━━━━━━━━━━━━━━━\n\nHOOK (${fmtTime(0)}–${fmtTime(estSeconds(script.hook))}):\n${script.hook}\n\n━━━━━━━━━━━━━━━━━━━━\n\n${chaptersText}\n\n━━━━━━━━━━━━━━━━━━━━\n\nOUTRO + CTA:\n${script.outro}\n\n━━━━━━━━━━━━━━━━━━━━\n\nSOURCES:\n${sourcesText}\n\n━━━━━━━━━━━━━━━━━━━━\n\nLEAD MAGNET: ${script.leadMagnet?.name || script.leadMagnet?.newSuggestion?.name || ''}\nKEYWORD: ${script.leadMagnet?.keyword || script.leadMagnet?.newSuggestion?.keyword || ''}`;
}

// ─── CAROUSEL PANEL ────────────────────────────────────────────────────────────
function CarouselPanel({ script, angle }) {
  const [carousel, setCarousel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const generate = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/carousel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ script, angle }), credentials: 'same-origin' });
      const d = await r.json();
      if (d.success) setCarousel(d.carousel);
      else setErr(d.error || 'Carousel generation failed.');
    } catch (e) { setErr(e.message || 'Carousel generation failed.'); }
    setLoading(false);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Generating brand-styled carousel...</div>;
  if (!carousel) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 40 }}>
      <div style={{ ...T.bodyMuted, textAlign: 'center', maxWidth: 380 }}>Generates a designed IG carousel from your approved script. Tokens not used unless you click.</div>
      {err && <div style={{ fontSize: 13, color: C.red, textAlign: 'center', maxWidth: 420, lineHeight: 1.6 }}>{err}</div>}
      <button style={btnBlue} onClick={generate}>◈ Generate Designed Carousel</button>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...T.label, color: C.blue }}>{carousel.slideCount} SLIDES — DESIGNED</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
        {carousel.slides?.map((slide, i) => (
          <div key={i} style={{ background: C.card2, border: `1px solid ${C.border}`, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ ...T.display, fontSize: 18 }}>SLIDE {slide.num}</div>
              <div style={{ ...T.label, fontSize: 10, padding: '3px 10px', border: `1px solid ${C.border}` }}>{slide.type}</div>
            </div>
            <div style={{ aspectRatio: '1/1', background: '#0a0a0a', overflow: 'hidden', border: `1px solid ${C.border}`, position: 'relative' }}>
              <div style={{ width: '1080px', height: '1080px', transform: 'scale(0.27)', transformOrigin: 'top left' }} dangerouslySetInnerHTML={{ __html: slide.html }} />
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 8, fontStyle: 'italic' }}>{slide.rationale}</div>
          </div>
        ))}
      </div>
      <button style={btnBlue} onClick={() => {
        const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#222;padding:40px;display:flex;flex-wrap:wrap;gap:20px}</style></head><body>${carousel.slides.map(s => s.html).join('')}</body></html>`;
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }}>↗ Open All Slides in New Tab (for screenshot/save)</button>
    </div>
  );
}

// ─── CHAPTER BLOCK (YT) ────────────────────────────────────────────────────────
function ChapterBlock({ chapter, scriptTopic, fullResearch }) {
  const [fullScript, setFullScript] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const generateFull = async () => {
    setLoading(true); setErr('');
    try {
      const r = await fetch('/api/chapter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chapter, topic: scriptTopic, research: fullResearch }), credentials: 'same-origin' });
      const d = await r.json();
      if (d.success) setFullScript(d.result);
      else setErr(d.error || 'Chapter generation failed.');
    } catch (e) { setErr(e.message || 'Chapter generation failed.'); }
    setLoading(false);
  };
  return (
    <div style={{ background: C.card2, border: `1px solid ${C.border}`, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div dir="rtl" style={{ fontSize: 19, fontWeight: 500, color: C.text, lineHeight: 1.5 }}>{chapter.title}</div>
          {chapter.function && <div style={{ ...T.label, fontSize: 10, color: C.dim, marginTop: 6 }}>{chapter.function}</div>}
        </div>
        <div style={{ ...T.label, fontSize: 11, whiteSpace: 'nowrap' }}>{chapter.duration}</div>
      </div>
      {chapter.originalityCheck && (chapter.originalityCheck.fitnessSubTopic || chapter.originalityCheck.sourceItemNotCopied) && (
        <div style={{ padding: '10px 12px', background: 'rgba(94,200,143,.04)', borderLeft: `2px solid ${C.green}`, marginBottom: 12, fontSize: 12, lineHeight: 1.55 }}>
          <div style={{ ...T.label, fontSize: 9, color: C.green, marginBottom: 6 }}>Originality Check</div>
          {chapter.originalityCheck.fitnessSubTopic && <div style={{ color: C.text, marginBottom: 4 }}><span style={{ color: C.dim, marginRight: 6 }}>Drawn from:</span>{chapter.originalityCheck.fitnessSubTopic}</div>}
          {chapter.originalityCheck.sourceItemNotCopied && <div style={{ color: C.muted, fontStyle: 'italic' }}><span style={{ color: C.dim, marginRight: 6, fontStyle: 'normal' }}>Not copying:</span>{chapter.originalityCheck.sourceItemNotCopied}</div>}
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <div style={{ ...T.label, marginBottom: 10 }}>Key Talking Points</div>
        {chapter.points?.map((pt, i) => (
          <div key={i} dir="rtl" style={{ display: 'flex', gap: 10, padding: '8px 0', textAlign: 'right' }}>
            <div style={{ width: 5, height: 5, background: C.blue, borderRadius: '50%', marginTop: 9, flexShrink: 0 }} />
            <div style={{ fontSize: 17, color: C.text, lineHeight: 1.8 }}>{pt}</div>
          </div>
        ))}
      </div>
      {chapter.sources?.length > 0 && <SourcesList sources={chapter.sources} />}
      {!fullScript && (
        <>
          <button style={{ ...btnBlue, marginTop: 14, fontSize: 11, padding: '8px 16px' }} onClick={generateFull} disabled={loading}>
            {loading ? 'Generating...' : '▶ Generate Full Script'}
          </button>
          {err && <div style={{ marginTop: 10, fontSize: 12, color: C.red, lineHeight: 1.6 }}>{err}</div>}
        </>
      )}
      {fullScript && (
        <div style={{ marginTop: 16, padding: 16, background: C.bg, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.blue}` }}>
          <div style={{ ...T.label, color: C.blue, marginBottom: 10 }}>Full Script</div>
          <div dir="rtl" style={{ fontSize: 19, textAlign: 'right', lineHeight: 1.95, color: C.text, fontWeight: 400 }}>{fullScript.fullScript}</div>
          {fullScript.sources?.length > 0 && <SourcesList sources={fullScript.sources} />}
        </div>
      )}
    </div>
  );
}

// ─── LEAD MAGNET DISPLAY ───────────────────────────────────────────────────────
function LeadMagnetCard({ leadMagnet }) {
  if (!leadMagnet) return null;
  const isNew = !leadMagnet.matched;
  const sug = leadMagnet.newSuggestion;
  return (
    <div style={{ padding: 18, border: `1px solid ${C.border}`, background: C.card2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={T.label}>Lead Magnet</div>
        <div style={{ ...T.label, fontSize: 10, padding: '4px 10px', border: `1px solid ${isNew ? 'rgba(240,168,58,.3)' : 'rgba(94,200,143,.3)'}`, color: isNew ? C.amber : C.green }}>
          {isNew ? '⚡ Suggested New' : '✓ Matched'}
        </div>
      </div>
      {!isNew ? (
        <>
          <div style={{ fontSize: 18, color: C.text, marginBottom: 6, fontWeight: 500 }}>{leadMagnet.name}</div>
          {leadMagnet.keyword && <div style={{ ...T.display, fontSize: 22, color: C.muted }}><span style={{ ...T.label, color: C.dim, marginRight: 10, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.15em' }}>Keyword</span>{leadMagnet.keyword}</div>}
        </>
      ) : (
        <>
          <div style={{ fontSize: 16, color: C.text, fontWeight: 600, marginBottom: 8 }}>{typeof sug === 'object' ? sug?.name : sug}</div>
          {typeof sug === 'object' && (
            <>
              <div style={{ fontSize: 14, color: C.muted, marginBottom: 10, lineHeight: 1.6 }}>{sug.description}</div>
              {sug.keyword && <div style={{ ...T.display, fontSize: 22, color: C.amber, marginBottom: 10 }}><span style={{ ...T.label, color: C.dim, marginRight: 10, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.15em' }}>Suggested Keyword</span>{sug.keyword}</div>}
              {sug.reasoning && <div style={{ fontSize: 13, color: C.muted, fontStyle: 'italic', borderLeft: `2px solid ${C.amber}`, paddingLeft: 12 }}>{sug.reasoning}</div>}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── RESEARCH HEALTH ───────────────────────────────────────────────────────────
// Perplexity failures used to return '' and disappear, so a script could be
// generated against zero research while the header still showed a green
// "LIVE RESEARCH ACTIVE" badge (bug #12).
function ResearchHealth({ health }) {
  if (!health || !health.failed) return null;
  const none = health.ok === 0;
  return (
    <div style={{ padding: 14, background: none ? 'rgba(232,95,95,.06)' : 'rgba(240,168,58,.05)', borderLeft: `3px solid ${none ? C.red : C.amber}` }}>
      <div style={{ ...T.label, color: none ? C.red : C.amber, marginBottom: 6 }}>
        {none ? 'No Research Returned' : 'Partial Research'}
      </div>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
        {health.ok} of {health.ok + health.failed} research queries succeeded.
        {none
          ? ' This script was written with no citations to draw on — check every claim before filming.'
          : ' Some angles had less evidence to work from than others.'}
        {health.errors?.length > 0 && <div style={{ marginTop: 6, color: C.dim, fontSize: 12 }}>{health.errors.join(' · ')}</div>}
      </div>
    </div>
  );
}

// ─── IG CARD ───────────────────────────────────────────────────────────────────
function IGCard({ script, onApprove, onReject, isApproved, onUpdate, onDelete, onRetryDeeper }) {
  const [open, setOpen] = useState(true);
  const [viewIdx, setViewIdx] = useState(0);
  const [selectedSet, setSelectedSet] = useState(new Set([0]));
  const [tab, setTab] = useState('script');
  const [regenerating, setRegenerating] = useState(false);
  const [regenErr, setRegenErr] = useState('');

  const angle = isApproved ? script.approvedAngle : script.angles?.[viewIdx];

  const regenerateAngle = async () => {
    setRegenerating(true); setRegenErr('');
    try {
      const r = await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          angle,
          template: script.template,
          templateMode: script.templateMode,
          sourceFormat: script.sourceFormat,
          sourceTranscript: script.sourceTranscript,
          pillarHint: angle?.type,
          targetBodyWords: script.targetBodyWords || null
        })
      });
      // The old version swallowed every failure into console.error, so a broken
      // endpoint looked identical to a slow one: the button just reset (bug #1).
      const d = await r.json().catch(() => ({ error: `Server returned ${r.status} (not JSON).` }));
      if (d.success && d.angle) {
        const newAngles = [...script.angles];
        newAngles[viewIdx] = d.angle;
        onUpdate({ ...script, angles: newAngles });
      } else {
        setRegenErr(d.error || `Regenerate failed (${r.status}).`);
      }
    } catch (e) { setRegenErr(e.message || 'Regenerate failed.'); }
    setRegenerating(false);
  };

  const toggleSelected = (i) => {
    const s = new Set(selectedSet);
    s.has(i) ? s.delete(i) : s.add(i);
    setSelectedSet(s);
  };

  const updateAngleField = (field, value) => {
    if (isApproved) {
      onUpdate({ ...script, approvedAngle: { ...script.approvedAngle, [field]: value } });
    } else {
      const newAngles = [...script.angles];
      newAngles[viewIdx] = { ...newAngles[viewIdx], [field]: value };
      onUpdate({ ...script, angles: newAngles });
    }
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${open ? C.borderMd : C.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }} onClick={() => setOpen(o => !o)}>
        <div>
          <div style={{ ...T.label, marginBottom: 6 }}>{script.sourceHandle} · <span style={{ color: C.blue }}>IG REEL</span></div>
          <div style={{ ...T.display, fontSize: 36, lineHeight: 1 }}><span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 400, color: C.muted, marginRight: 8, letterSpacing: '0.05em' }}>views</span>{script.viewCount}</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>{script.sourceFormat ? `${script.sourceFormat.toUpperCase()} · ` : ''}{script.hookType}</div>
          {script.templateMode && <div style={{ fontSize: 11, color: script.templateMode === 'literal' ? C.blue : C.amber, marginTop: 6, padding: '3px 8px', border: `1px solid ${script.templateMode === 'literal' ? 'rgba(61,169,216,.3)' : 'rgba(240,168,58,.3)'}`, display: 'inline-block', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>{script.templateMode === 'literal' ? '◆ LITERAL MODE' : '◇ STRUCTURAL MODE'}</div>}
          {script.templateModeReason && <div style={{ fontSize: 11, color: C.dim, marginTop: 6, fontStyle: 'italic' }}>{script.templateModeReason}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ ...T.label, fontSize: 10, padding: '4px 10px', border: `1px solid ${C.borderMd}` }}>{script.pillar}</div>
          {script.fitnessRedirect && <div style={{ fontSize: 10, color: C.amber, padding: '4px 10px', border: '1px solid rgba(240,168,58,.3)' }}>⚡ REDIRECTED</div>}
          {isApproved && <div style={{ fontSize: 11, color: C.green }}>✓ {script.approvedAngle?.topic}</div>}
          <div style={{ color: C.muted, fontSize: 14, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</div>
        </div>
      </div>

      <div dir="rtl" style={{ padding: '0 24px 18px', fontSize: 20, textAlign: 'right', fontWeight: 500, color: C.text, lineHeight: 1.6 }}>{script.topicArabic}</div>

      {open && <>
        <div style={{ height: 1, background: C.border }} />
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, background: C.card2 }}>
          {[['script', 'SCRIPT'], ['carousel', 'CAROUSEL']].map(([k, l]) => (
            <div key={k} onClick={() => setTab(k)} style={{ padding: '14px 22px', fontSize: 11, letterSpacing: '0.15em', color: tab === k ? C.text : C.muted, cursor: 'pointer', borderBottom: tab === k ? `2px solid ${C.text}` : '2px solid transparent', fontWeight: 600 }}>{l}</div>
          ))}
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {script.fitnessRedirect && script.redirectExplanation && (
            <div style={{ padding: 14, background: 'rgba(240,168,58,.04)', borderLeft: `3px solid ${C.amber}` }}>
              <div style={{ ...T.label, color: C.amber, marginBottom: 6 }}>Fitness Redirect Applied</div>
              <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{script.redirectExplanation}</div>
            </div>
          )}

          <ResearchHealth health={script.researchHealth} />

          {tab === 'script' && <>
            {script.template && (
              <div style={{ padding: 16, background: C.card2, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.text}` }}>
                <div style={{ ...T.label, marginBottom: 10 }}>Extracted Viral Template</div>
                <div dir="rtl" style={{ fontSize: 14, color: C.muted, lineHeight: 1.85, fontStyle: 'italic', textAlign: 'right' }}>{script.template}</div>
              </div>
            )}

            {!isApproved && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={T.label}>Tap to view · Check to save</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setSelectedSet(new Set(script.angles?.map((_, i) => i) || []))} style={{ ...btnGhost, padding: '6px 14px', fontSize: 10 }}>All</button>
                    <button onClick={() => setSelectedSet(new Set())} style={{ ...btnGhost, padding: '6px 14px', fontSize: 10 }}>None</button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
                  {script.angles?.map((a, i) => {
                    const isViewed = i === viewIdx;
                    const isChecked = selectedSet.has(i);
                    const tierColor = a.tier === 'deep' ? C.amber : a.tier === 'custom' ? C.blue : C.green;
                    const num = i + 1;
                    return (
                      <div key={i} style={{ position: 'relative', border: `1px solid ${isViewed ? C.text : isChecked ? tierColor : C.border}`, background: isViewed ? 'rgba(245,245,243,.05)' : isChecked ? `${tierColor}14` : 'transparent', transition: 'all .15s' }}>
                        <div onClick={e => { e.stopPropagation(); toggleSelected(i); }} style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, border: `1px solid ${isChecked ? tierColor : C.borderMd}`, background: isChecked ? tierColor : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: C.bg, fontWeight: 700 }}>{isChecked ? '✓' : ''}</div>
                        <div onClick={() => setViewIdx(i)} style={{ padding: '14px 6px 12px', textAlign: 'center', cursor: 'pointer' }}>
                          <div style={{ ...T.display, fontSize: 24, color: isViewed ? C.text : C.muted }}>{num < 10 ? '0' + num : num}</div>
                          <div style={{ ...T.label, fontSize: 9, color: isViewed ? C.text : C.muted, marginTop: 4 }}>{(a.topic || a.type).split(' ')[0]}</div>
                          <div style={{ width: 16, height: 2, background: tierColor, margin: '6px auto 0', opacity: a.tier === 'deep' || a.tier === 'custom' ? 1 : 0.4 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: C.muted }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 2, background: C.green, display: 'inline-block' }} />Beginner Default</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 2, background: C.amber, display: 'inline-block' }} />Deeper Cut</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 2, background: C.blue, display: 'inline-block' }} />Your Request</span>
                </div>
                {!isApproved && script.deeperStatus === 'loading' && (
                  <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(240,168,58,.06)', border: `1px solid rgba(240,168,58,.25)`, fontSize: 12, color: C.amber, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.amber, display: 'inline-block' }} />
                    Generating deeper-cut angles in the background...
                  </div>
                )}
                {!isApproved && script.deeperStatus === 'failed' && (
                  <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(232,95,95,.06)', border: `1px solid rgba(232,95,95,.25)`, fontSize: 12, color: C.red, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <span>Deeper cuts failed to generate.</span>
                    <button style={{ ...btnGhost, padding: '6px 14px', fontSize: 10, color: C.red, borderColor: 'rgba(232,95,95,.4)' }} onClick={() => onRetryDeeper && onRetryDeeper(script.id)}>↻ Retry Deeper Cuts</button>
                  </div>
                )}
              </div>
            )}

            {angle && (
              <div dir="rtl" style={{ background: C.card2, border: `1px solid ${C.border}`, padding: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  {angle.topic && <div style={{ ...T.label, color: angle.tier === 'deep' ? C.amber : angle.tier === 'custom' ? C.blue : C.green }}>{angle.topic}</div>}
                  {!isApproved && <button style={{ ...btnGhost, padding: '6px 12px', fontSize: 10, opacity: regenerating ? .5 : 1 }} onClick={regenerateAngle} disabled={regenerating}>{regenerating ? 'Regenerating...' : '↻ Regenerate'}</button>}
                </div>
                {regenErr && <div dir="ltr" style={{ marginBottom: 14, padding: '10px 12px', background: 'rgba(232,95,95,.06)', border: '1px solid rgba(232,95,95,.25)', fontSize: 12, color: C.red, textAlign: 'left', lineHeight: 1.6 }}>{regenErr}</div>}

                <div dir="ltr" style={{ marginBottom: 18, textAlign: 'left' }}>
                  <div style={{ ...T.label, marginBottom: 8 }}>Hook — {fmtTime(0)}–{fmtTime(estSeconds(angle.hook))}</div>
                </div>
                <div dir="rtl" style={{ marginBottom: 18, textAlign: 'right' }}>
                  <EditableField value={angle.hook} onChange={v => updateAngleField('hook', v)} style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.7, color: C.text, wordBreak: 'break-word', direction: 'rtl' }} />
                </div>

                <div dir="ltr" style={{ marginBottom: 8, textAlign: 'left' }}>
                  <div style={{ ...T.label }}>Body — {fmtTime(estSeconds(angle.hook))}–{fmtTime(estSeconds(angle.hook) + estSeconds(angle.body))}</div>
                </div>
                <div dir="rtl" style={{ marginBottom: 18, textAlign: 'right' }}>
                  <EditableField value={angle.body} multiline onChange={v => updateAngleField('body', v)} style={{ fontSize: 19, fontWeight: 400, lineHeight: 1.95, color: C.text, wordBreak: 'break-word', whiteSpace: 'pre-wrap', direction: 'rtl' }} />
                </div>

                <div dir="ltr" style={{ marginBottom: 8, textAlign: 'left' }}>
                  <div style={{ ...T.label }}>CTA — {fmtTime(estSeconds(angle.hook) + estSeconds(angle.body))}–{fmtTime(estSeconds(angle.hook) + estSeconds(angle.body) + estSeconds(angle.cta))}</div>
                </div>
                <div dir="rtl" style={{ textAlign: 'right' }}>
                  <EditableField value={angle.cta} onChange={v => updateAngleField('cta', v)} style={{ fontSize: 19, color: C.amber, wordBreak: 'break-word', fontWeight: 500, lineHeight: 1.7, direction: 'rtl' }} />
                </div>
              </div>
            )}

            {angle?.visualHook && (
              <div style={{ padding: 14, background: 'rgba(240,168,58,.04)', borderLeft: `3px solid ${C.amber}` }}>
                <div style={{ ...T.label, color: C.amber, marginBottom: 6 }}>Visual Hook Direction</div>
                <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>{angle.visualHook}</div>
              </div>
            )}

            <IntegrityBadge integrity={angle?.scriptIntegrity} />
            <SourcesList sources={angle?.sources} />
            <LeadMagnetCard leadMagnet={script.leadMagnet} />
          </>}

          {tab === 'carousel' && <CarouselPanel script={script} angle={angle} />}
        </div>

        {!isApproved && (
          <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: `1px solid ${C.border}`, background: C.card2, flexWrap: 'wrap' }}>
            <button style={btnGhost} onClick={() => onReject(script.id)}>✕ Reject</button>
            <div style={{ ...T.label, color: selectedSet.size > 0 ? C.green : C.muted, flex: 1, textAlign: 'center' }}>{selectedSet.size} of {script.angles?.length} selected to save</div>
            <button style={{ ...btnSolid, opacity: selectedSet.size === 0 ? .4 : 1 }} onClick={() => selectedSet.size > 0 && onApprove(script, Array.from(selectedSet))} disabled={selectedSet.size === 0}>✓ Save Selected</button>
          </div>
        )}

        {isApproved && (
          <ApprovedFooter
            text={formatScriptForCopy(script, script.approvedAngle)}
            label={`✓ Approved — ${script.approvedAngle?.topic || script.approvedAngle?.type}`}
            sublabel={`Keyword: ${script.leadMagnet?.keyword || ''} · ${script.approvedAngle?.sources?.length || 0} papers`}
            onDelete={onDelete ? () => onDelete(script.id) : null}
          />
        )}
      </>}
    </div>
  );
}

function ApprovedFooter({ text, label, sublabel, onDelete }) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  return (
    <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(94,200,143,.05)', borderTop: '1px solid rgba(94,200,143,.2)', flexWrap: 'wrap' }}>
      <div style={{ width: 9, height: 9, background: C.green, borderRadius: '50%' }} />
      <div style={{ flex: 1 }}>
        <div style={{ ...T.label, color: C.green }}>{label}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{sublabel}</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {onDelete && (confirming ? (
          <>
            <button style={{ ...btnGhost, fontSize: 11 }} onClick={() => setConfirming(false)}>Cancel</button>
            <button style={{ ...btnGhost, fontSize: 11, color: C.red, borderColor: 'rgba(232,95,95,.4)' }} onClick={onDelete}>Confirm Delete</button>
          </>
        ) : (
          <button style={{ ...btnGhost, fontSize: 11, color: C.red, borderColor: 'rgba(232,95,95,.3)' }} onClick={() => setConfirming(true)}>🗑 Delete</button>
        ))}
        <button style={btnBlue} onClick={() => {
          navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}>{copied ? '✓ COPIED' : '📋 COPY ALL'}</button>
      </div>
    </div>
  );
}

// ─── YT CARD ───────────────────────────────────────────────────────────────────
function YTCard({ script, onApprove, onReject, isApproved, onDelete, onRetryEnrich }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ background: C.card, border: `1px solid ${open ? C.borderMd : C.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }} onClick={() => setOpen(o => !o)}>
        <div>
          <div style={{ ...T.label, marginBottom: 6 }}>{script.sourceHandle} · <span style={{ color: C.red }}>YOUTUBE</span></div>
          <div dir="rtl" style={{ fontSize: 22, fontWeight: 500, textAlign: 'right', marginTop: 8, color: C.text, lineHeight: 1.5 }}>{script.title}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ ...T.label, fontSize: 10, padding: '4px 10px', border: `1px solid ${C.borderMd}` }}>{script.pillar}</div>
          {script.sourceFormat && <div style={{ fontSize: 10, color: C.muted, padding: '3px 8px', border: `1px solid ${C.border}`, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{script.sourceFormat}</div>}
          {script.templateMode && <div style={{ fontSize: 10, color: script.templateMode === 'literal' ? C.blue : C.amber, padding: '3px 8px', border: `1px solid ${script.templateMode === 'literal' ? 'rgba(61,169,216,.3)' : 'rgba(240,168,58,.3)'}`, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>{script.templateMode === 'literal' ? '◆ LITERAL' : '◇ STRUCTURAL'}</div>}
          {script.fitnessRedirect && <div style={{ fontSize: 10, color: C.amber, padding: '3px 8px', border: '1px solid rgba(240,168,58,.3)' }}>⚡ REDIRECTED</div>}
          {script.chapters?.length > 0 && <div style={{ fontSize: 10, color: C.dim, padding: '3px 8px' }}>{script.chapters.length} chapters</div>}
          {isApproved && <div style={{ fontSize: 11, color: C.green }}>✓ Approved</div>}
          <div style={{ color: C.muted, fontSize: 14, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</div>
        </div>
      </div>

      <div dir="rtl" style={{ padding: '0 24px 18px', fontSize: 18, textAlign: 'right', color: C.muted, lineHeight: 1.6 }}>{script.topicArabic}</div>

      {open && <>
        <div style={{ height: 1, background: C.border }} />
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {script.fitnessRedirect && script.redirectExplanation && (
            <div style={{ padding: 14, background: 'rgba(240,168,58,.04)', borderLeft: `3px solid ${C.amber}` }}>
              <div style={{ ...T.label, color: C.amber, marginBottom: 6 }}>Fitness Redirect Applied</div>
              <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{script.redirectExplanation}</div>
            </div>
          )}
          {script.templateModeReason && (
            <div style={{ padding: '10px 14px', background: C.card2, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.blue}` }}>
              <div style={{ ...T.label, marginBottom: 4, color: C.blue }}>Template Mode Reasoning</div>
              <div style={{ fontSize: 13, color: C.muted, fontStyle: 'italic', lineHeight: 1.6 }}>{script.templateModeReason}</div>
            </div>
          )}
          {!isApproved && script.enrichStatus === 'loading' && (
            <div style={{ padding: '10px 14px', background: 'rgba(240,168,58,.06)', border: `1px solid rgba(240,168,58,.25)`, fontSize: 12, color: C.amber, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.amber, display: 'inline-block' }} />
              Enriching chapter talking points in the background...
            </div>
          )}
          {!isApproved && script.enrichStatus === 'failed' && (
            <div style={{ padding: '10px 14px', background: 'rgba(232,95,95,.06)', border: `1px solid rgba(232,95,95,.25)`, fontSize: 12, color: C.red, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <span>Chapter enrichment failed. Talking points are skeleton-only.</span>
              <button style={{ ...btnGhost, padding: '6px 14px', fontSize: 10, color: C.red, borderColor: 'rgba(232,95,95,.4)' }} onClick={() => onRetryEnrich && onRetryEnrich(script.id)}>↻ Retry Enrichment</button>
            </div>
          )}
          <div style={{ background: C.card2, border: `1px solid ${C.border}`, padding: 18 }}>
            <div style={{ ...T.label, marginBottom: 10 }}>Hook — Opening 30 Seconds</div>
            <div dir="rtl" style={{ fontSize: 19, textAlign: 'right', lineHeight: 1.9, color: C.text, fontWeight: 400 }}>{script.hook}</div>
          </div>
          {script.chapters?.map((ch, i) => <ChapterBlock key={i} chapter={ch} scriptTopic={script.topicEnglish} fullResearch={script.fullResearch || ''} />)}
          <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.green}`, padding: 18 }}>
            <div style={{ ...T.label, color: C.green, marginBottom: 10 }}>Outro + CTA</div>
            <div dir="rtl" style={{ fontSize: 19, textAlign: 'right', lineHeight: 1.9, color: C.amber, fontWeight: 500 }}>{script.outro}</div>
          </div>
          <IntegrityBadge integrity={script.scriptIntegrity} />
          <LeadMagnetCard leadMagnet={script.leadMagnet} />
          {script.allSources?.length > 0 && <SourcesList sources={script.allSources} />}
        </div>

        {!isApproved && (
          <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: `1px solid ${C.border}`, background: C.card2 }}>
            <button style={btnGhost} onClick={() => onReject(script.id)}>✕ Reject</button>
            <button style={btnSolid} onClick={() => onApprove(script)}>✓ Approve</button>
          </div>
        )}

        {isApproved && (
          <ApprovedFooter
            text={formatYTForCopy(script)}
            label="✓ Approved — YouTube Script"
            sublabel={`Keyword: ${script.leadMagnet?.keyword || ''}`}
            onDelete={onDelete ? () => onDelete(script.id) : null}
          />
        )}
      </>}
    </div>
  );
}

// ─── APPROVED SECTION WITH IG/YT SUBTABS ──────────────────────────────────────
function BackfillPanel({ ytApproved }) {
  const [avoidCount, setAvoidCount] = useState(0);
  const [status, setStatus] = useState('');

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('wnafm_recentYTTopics') || '[]');
      const cutoff = Date.now() - (60 * 24 * 60 * 60 * 1000);
      const normalized = raw.map(e => typeof e === 'string' ? { topic: e, ts: 0 } : e);
      const active = normalized.filter(e => e.ts >= cutoff).length;
      setAvoidCount(active);
    } catch { setAvoidCount(0); }
  }, [ytApproved.length]);

  const extractTopics = (scripts) => {
    const out = [];
    for (const s of scripts) {
      for (const ch of (s.chapters || [])) {
        const t = (ch.originalityCheck && ch.originalityCheck.fitnessSubTopic) || ch.title || '';
        if (t && t.trim().length > 2) out.push(t.trim());
      }
    }
    return out;
  };

  const backfill = () => {
    const topics = extractTopics(ytApproved);
    if (topics.length === 0) {
      setStatus('No sub-topics found in approved YouTube scripts.');
      return;
    }
    try {
      const now = Date.now();
      const newEntries = topics.map(t => ({ topic: t, ts: now }));
      const existing = JSON.parse(localStorage.getItem('wnafm_recentYTTopics') || '[]');
      const normalized = existing.map(e => typeof e === 'string' ? { topic: e, ts: 0 } : e);
      // Dedup by topic string, keeping the newer timestamp
      const seen = new Map();
      for (const entry of [...newEntries, ...normalized]) {
        const existing = seen.get(entry.topic);
        if (!existing || entry.ts > existing.ts) seen.set(entry.topic, entry);
      }
      const merged = Array.from(seen.values()).slice(0, 200);
      localStorage.setItem('wnafm_recentYTTopics', JSON.stringify(merged));
      const cutoff = now - (60 * 24 * 60 * 60 * 1000);
      const active = merged.filter(e => e.ts >= cutoff).length;
      setAvoidCount(active);
      setStatus(`Added ${topics.length} topics from ${ytApproved.length} approved YT scripts. ${active} are active (last 60 days), older entries age out automatically.`);
    } catch (e) {
      setStatus('Backfill failed: ' + e.message);
    }
  };

  const clearList = () => {
    if (!confirm('Clear the entire YT avoid list? Future YT generations will have no recycling protection until you approve more scripts.')) return;
    try {
      localStorage.setItem('wnafm_recentYTTopics', '[]');
      setAvoidCount(0);
      setStatus('Avoid list cleared.');
    } catch (e) { setStatus('Clear failed: ' + e.message); }
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ ...T.label, marginBottom: 6 }}>Anti-Recycle List</div>
          <div style={{ fontSize: 14, color: C.text }}>
            <span style={{ ...T.display, fontSize: 24, color: avoidCount > 0 ? C.green : C.muted, marginRight: 10 }}>{avoidCount}</span>
            <span style={{ color: C.muted, fontSize: 13 }}>active topics being avoided · topics age out after 60 days</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={{ ...btnBlue, fontSize: 11, padding: '10px 16px' }} onClick={backfill} disabled={ytApproved.length === 0}>
            ↻ Backfill from {ytApproved.length} Approved
          </button>
          {avoidCount > 0 && <button style={{ ...btnGhost, fontSize: 11, padding: '10px 16px', color: C.red, borderColor: 'rgba(232,95,95,.3)' }} onClick={clearList}>Clear List</button>}
        </div>
      </div>
      {status && <div style={{ fontSize: 12, color: C.muted, padding: 10, background: C.card2, borderLeft: `2px solid ${C.green}` }}>{status}</div>}
      {avoidCount === 0 && ytApproved.length > 0 && (
        <div style={{ fontSize: 12, color: C.amber, padding: 10, background: 'rgba(240,168,58,.05)', borderLeft: `2px solid ${C.amber}` }}>
          Your {ytApproved.length} approved YT scripts were created before anti-recycle tracking existed. Click Backfill to seed the avoid list with their sub-topics — future generations will then avoid these.
        </div>
      )}
    </div>
  );
}

function ApprovedSection({ approved, updateScript, onDeleteApproved }) {
  const [subTab, setSubTab] = useState('ig');
  const igApproved = approved.filter(s => s.format !== 'youtube');
  const ytApproved = approved.filter(s => s.format === 'youtube');
  const list = subTab === 'ig' ? igApproved : ytApproved;

  return (
    <>
      <div style={{ ...T.display, fontSize: 28 }}>APPROVED</div>
      <div style={{ display: 'flex', gap: 8, marginTop: -8 }}>
        <div onClick={() => setSubTab('ig')} style={{
          padding: '12px 22px',
          fontSize: 12,
          letterSpacing: '0.15em',
          color: subTab === 'ig' ? C.text : C.muted,
          background: subTab === 'ig' ? C.card : 'transparent',
          border: `1px solid ${subTab === 'ig' ? C.borderMd : C.border}`,
          cursor: 'pointer',
          fontWeight: 600
        }}>
          IG REELS ({igApproved.length})
        </div>
        <div onClick={() => setSubTab('youtube')} style={{
          padding: '12px 22px',
          fontSize: 12,
          letterSpacing: '0.15em',
          color: subTab === 'youtube' ? C.text : C.muted,
          background: subTab === 'youtube' ? C.card : 'transparent',
          border: `1px solid ${subTab === 'youtube' ? C.borderMd : C.border}`,
          cursor: 'pointer',
          fontWeight: 600
        }}>
          YOUTUBE ({ytApproved.length})
        </div>
      </div>
      {subTab === 'youtube' && <BackfillPanel ytApproved={ytApproved} />}
      {list.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: 60, textAlign: 'center' }}>
          <div style={{ ...T.display, fontSize: 22, color: C.muted }}>NO {subTab === 'ig' ? 'IG REELS' : 'YOUTUBE SCRIPTS'} YET</div>
        </div>
      ) : list.map((s, i) => s.format === 'youtube'
        ? <YTCard key={s.id || i} script={s} onApprove={() => {}} onReject={() => {}} isApproved={true} onDelete={onDeleteApproved} />
        : <IGCard key={s.id || i} script={s} onApprove={() => {}} onReject={() => {}} isApproved={true} onUpdate={updateScript} onDelete={onDeleteApproved} />
      )}
    </>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
export default function Home() {
  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginErr, setLoginErr] = useState('');
  const [tab, setTab] = useState('submit');
  // Pending scripts used to live in React state only — one refresh, one closed
  // tab or one phone lock mid-generation wiped the whole batch (bug #8).
  const [scripts, setScripts] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = JSON.parse(localStorage.getItem('wnafm_pending') || '[]');
      // Any phase that was mid-flight when the page died is now orphaned —
      // mark it failed so the Retry button appears instead of a stuck spinner.
      return raw.map(s => ({
        ...s,
        deeperStatus: s.deeperStatus === 'loading' ? 'failed' : s.deeperStatus,
        enrichStatus: s.enrichStatus === 'loading' ? 'failed' : s.enrichStatus
      }));
    } catch { return []; }
  });
  const [approved, setApproved] = useState(() => {
    if (typeof window === 'undefined') return [];
    try { return migrateApproved(JSON.parse(localStorage.getItem('wnafm_approved') || '[]')); } catch { return []; }
  });
  const [trash, setTrash] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const t = JSON.parse(localStorage.getItem('wnafm_trash') || '[]');
      // Auto-expire 7 days
      const now = Date.now();
      return t.filter(item => (now - item.rejectedAt) < 7 * 24 * 60 * 60 * 1000);
    } catch { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState('');
  const [loadPct, setLoadPct] = useState(0);
  const [error, setError] = useState('');
  const [monthCount, setMonthCount] = useState(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const storedMonth = localStorage.getItem('wnafm_monthKey');
      if (storedMonth !== currentMonth) {
        // New month — reset counter
        localStorage.setItem('wnafm_monthKey', currentMonth);
        localStorage.setItem('wnafm_monthCount', '0');
        return 0;
      }
      return parseInt(localStorage.getItem('wnafm_monthCount') || '0');
    } catch { return 0; }
  });
  const [format, setFormat] = useState('ig');
  const [form, setForm] = useState({ transcript: '', visualHook: '', handle: '', views: '', specificRequest: '' });
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [storageWarning, setStorageWarning] = useState('');

  // The password was hardcoded here as a literal and shipped in the client
  // bundle, so anyone could read it and bill the API keys. Auth is now an
  // httpOnly session cookie set by /api/auth (bug #2).

  // Validate an existing session on load so a refresh doesn't force re-login.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/auth', { credentials: 'same-origin' });
        const d = await r.json();
        if (!cancelled && d.authed) setAuthed(true);
      } catch {}
      if (!cancelled) setAuthChecked(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // A QuotaExceededError used to vanish into an empty catch, so approvals
    // stopped persisting with no signal at all (bug #5).
    try {
      localStorage.setItem('wnafm_approved', JSON.stringify(approved));
      localStorage.setItem('wnafm_trash', JSON.stringify(trash));
      localStorage.setItem('wnafm_pending', JSON.stringify(scripts));
      localStorage.setItem('wnafm_monthCount', String(monthCount));
      if (storageWarning) setStorageWarning('');
    } catch (e) {
      setStorageWarning(
        'Browser storage is full — your last change was NOT saved. ' +
        'Delete some approved scripts or empty the trash, then try again.'
      );
    }
  }, [approved, trash, scripts, monthCount]);

  const handleLogin = async (pw) => {
    try {
      const r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password: pw })
      });
      const d = await r.json();
      if (d.success) setAuthed(true);
      else setLoginErr(d.error || 'Wrong password.');
    } catch { setLoginErr('Connection error.'); }
  };

  const generateOne = async (formData, overrideFormat) => {
    const r = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ ...formData, format: overrideFormat || format })
    });
    const d = await r.json().catch(() => ({ error: `Server returned ${r.status} (not JSON).` }));
    if (!r.ok || !d.result) throw new Error(d.error || `Generation failed (${r.status}).`);
    return d.result;
  };

  // Phase 2 — fetch deeper-cut angles for an existing IG script
  const fetchDeeper = async (scriptObj) => {
    const usedTopics = (scriptObj.angles || []).map(a => a.topic).filter(Boolean);
    const r = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        transcript: scriptObj.sourceTranscript || ' ',
        format: 'ig',
        phase: 'deeper',
        specificRequest: scriptObj._specificRequest || '',
        context: {
          sourceTopic: scriptObj.topicEnglish,
          sourceFormat: scriptObj.sourceFormat,
          templateMode: scriptObj.templateMode,
          template: scriptObj.template,
          sourceTranscript: scriptObj.sourceTranscript,
          usedTopics
        }
      })
    });
    const d = await r.json().catch(() => ({ error: `Server returned ${r.status} (not JSON).` }));
    if (!r.ok || !Array.isArray(d.angles)) throw new Error(d.error || `Deeper generation failed (${r.status}).`);
    return d.angles;
  };

  const retryEnrich = useCallback(async (scriptId) => {
    setScripts(prev => prev.map(s => s.id === scriptId ? { ...s, enrichStatus: 'loading' } : s));
    const target = scripts.find(s => s.id === scriptId);
    if (!target) return;
    try {
      const r = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          transcript: target.sourceTranscript || ' ',
          format: 'youtube',
          phase: 'yt_enrich',
          context: {
            sourceTopic: target.topicEnglish || target.topicArabic,
            sourceFormat: target.sourceFormat,
            templateMode: target.templateMode,
            chapters: target.chapters || [],
            fullResearch: target.fullResearch || ''
          }
        })
      });
      const d = await r.json();
      if (r.ok && d.success && Array.isArray(d.chapters)) {
        setScripts(prev => prev.map(s => s.id === scriptId
          ? { ...s, chapters: d.chapters, enrichStatus: 'done' }
          : s));
      } else {
        setScripts(prev => prev.map(s => s.id === scriptId ? { ...s, enrichStatus: 'failed' } : s));
      }
    } catch (e) {
      setScripts(prev => prev.map(s => s.id === scriptId ? { ...s, enrichStatus: 'failed' } : s));
    }
  }, [scripts]);

  const retryDeeper = useCallback(async (scriptId) => {
    setScripts(prev => prev.map(s => s.id === scriptId ? { ...s, deeperStatus: 'loading' } : s));
    const target = scripts.find(s => s.id === scriptId);
    if (!target) return;
    try {
      const deeperAngles = await fetchDeeper(target);
      setScripts(prev => prev.map(s => s.id === scriptId
        ? { ...s, angles: [...(s.angles || []).filter(a => a.tier === 'default'), ...deeperAngles], deeperStatus: 'done' }
        : s));
    } catch (e) {
      setScripts(prev => prev.map(s => s.id === scriptId ? { ...s, deeperStatus: 'failed' } : s));
    }
  }, [scripts]);

  const handleSubmit = useCallback(async () => {
    if (!form.transcript.trim() || loading) return;
    setLoading(true); setError(''); setTab('pending');

    if (format === 'youtube') {
      setLoadStep('Generating YouTube skeleton (chapter structure)...'); setLoadPct(45);
      let recentYTTopics = [];
      try {
        const raw = JSON.parse(localStorage.getItem('wnafm_recentYTTopics') || '[]');
        const cutoff = Date.now() - (60 * 24 * 60 * 60 * 1000); // 60 days
        recentYTTopics = raw
          .map(e => typeof e === 'string' ? { topic: e, ts: 0 } : e)
          .filter(e => e.ts >= cutoff)
          .map(e => e.topic);
      } catch {}
      try {
        const skeleton = await generateOne({ ...form, recentTopics: recentYTTopics });
        const scriptId = uid();
        const scriptObj = {
          id: scriptId,
          sourceHandle: form.handle || 'Unknown',
          viewCount: form.views || '—',
          format,
          enrichStatus: 'loading',
          ...skeleton
        };
        setScripts(prev => [scriptObj, ...prev]);
        setLoadPct(100);
        setLoading(false); setLoadPct(0);
        setForm({ transcript: '', visualHook: '', handle: '', views: '', specificRequest: '' });

        // Phase 2 — enrich talking points in background
        try {
          const enrichRes = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              transcript: scriptObj.sourceTranscript || ' ',
              format: 'youtube',
              phase: 'yt_enrich',
              context: {
                sourceTopic: scriptObj.topicEnglish || scriptObj.topicArabic,
                sourceFormat: scriptObj.sourceFormat,
                templateMode: scriptObj.templateMode,
                chapters: scriptObj.chapters || [],
                fullResearch: scriptObj.fullResearch || ''
              }
            })
          });
          const enrichData = await enrichRes.json();
          if (enrichRes.ok && enrichData.success && Array.isArray(enrichData.chapters)) {
            setScripts(prev => prev.map(s => s.id === scriptId
              ? { ...s, chapters: enrichData.chapters, enrichStatus: 'done' }
              : s));
          } else {
            setScripts(prev => prev.map(s => s.id === scriptId ? { ...s, enrichStatus: 'failed' } : s));
          }
        } catch (e) {
          setScripts(prev => prev.map(s => s.id === scriptId ? { ...s, enrichStatus: 'failed' } : s));
        }
      } catch (e) { setError(e.message); setTab('submit'); setLoading(false); setLoadPct(0); }
      return;
    }

    // IG — two phase
    setLoadStep('Researching 6 pillars + generating beginner defaults...'); setLoadPct(30);
    try {
      const phase1 = await generateOne({ ...form, phase: 'defaults' });
      const scriptId = uid();
      const scriptObj = {
        id: scriptId,
        sourceHandle: form.handle || 'Unknown',
        viewCount: form.views || '—',
        format,
        deeperStatus: 'loading',
        _specificRequest: form.specificRequest || '',
        ...phase1
      };
      setScripts(prev => [scriptObj, ...prev]);
      setLoadPct(100);
      setLoading(false); setLoadPct(0);
      setForm({ transcript: '', visualHook: '', handle: '', views: '', specificRequest: '' });

      // Phase 2 fires in background
      try {
        const deeperAngles = await fetchDeeper(scriptObj);
        setScripts(prev => prev.map(s => s.id === scriptId
          ? { ...s, angles: [...(s.angles || []), ...deeperAngles], deeperStatus: 'done' }
          : s));
      } catch (e) {
        setScripts(prev => prev.map(s => s.id === scriptId ? { ...s, deeperStatus: 'failed' } : s));
      }
    } catch (e) {
      setError(e.message); setTab('submit');
      setLoading(false); setLoadPct(0);
    }
  }, [form, format, loading]);

  const handleBulkSubmit = useCallback(async () => {
    if (!bulkText.trim() || loading) return;
    const items = bulkText.split('---').map(s => s.trim()).filter(s => s.length > 30);
    if (items.length === 0) return;
    setLoading(true); setError(''); setTab('pending');
    setBulkProgress({ done: 0, total: items.length });

    // Bulk used to skip phase 2 entirely and never set deeperStatus, so bulk
    // batches silently arrived with 6 angles and no indication why (bug #13).
    // It now runs the same two-phase path as a single submit.
    const failures = [];
    for (let i = 0; i < items.length; i++) {
      setLoadStep(`Processing transcript ${i + 1} of ${items.length}...`);
      setLoadPct(Math.round(((i + 0.5) / items.length) * 100));
      try {
        const result = await generateOne({
          transcript: items[i], visualHook: '', handle: 'Bulk', views: '—', specificRequest: '',
          phase: format === 'ig' ? 'defaults' : undefined
        });
        const scriptId = uid();
        const scriptObj = {
          id: scriptId,
          sourceHandle: 'Bulk',
          viewCount: '—',
          format,
          ...(format === 'ig' ? { deeperStatus: 'loading' } : { enrichStatus: 'loading' }),
          ...result
        };
        setScripts(prev => [scriptObj, ...prev]);

        if (format === 'ig') {
          try {
            const deeperAngles = await fetchDeeper(scriptObj);
            setScripts(prev => prev.map(s => s.id === scriptId
              ? { ...s, angles: [...(s.angles || []), ...deeperAngles], deeperStatus: 'done' }
              : s));
          } catch (e) {
            setScripts(prev => prev.map(s => s.id === scriptId ? { ...s, deeperStatus: 'failed' } : s));
          }
        }
      } catch (e) {
        failures.push(`#${i + 1}: ${e.message}`);
      }
      setBulkProgress({ done: i + 1, total: items.length });
    }
    if (failures.length > 0) setError(`${failures.length} of ${items.length} failed — ${failures.join(' | ')}`);
    setBulkText('');
    setBulkMode(false);
    setLoading(false); setLoadPct(0);
  }, [bulkText, format, loading]);

  const handleApproveIG = useCallback((script, indices) => {
    const idxArray = Array.isArray(indices) ? indices : [indices];
    const allApproved = idxArray.map((i) => slimApprovedIG(script, i));
    setApproved(prev => [...prev, ...allApproved]);
    setMonthCount(c => c + idxArray.length);
    setScripts(prev => prev.filter(s => s.id !== script.id));
  }, []);

  const handleApproveYT = useCallback((script) => {
    setApproved(prev => [...prev, slimApprovedYT(script)]);
    setMonthCount(c => c + 1);
    setScripts(prev => prev.filter(s => s.id !== script.id));
    // Anti-recycle (YT only, separate from IG): store timestamped sub-topics
    try {
      const now = Date.now();
      const newEntries = (script.chapters || [])
        .map(c => c.originalityCheck?.fitnessSubTopic || c.title || '')
        .filter(t => t && t.trim().length > 2)
        .map(topic => ({ topic, ts: now }));
      if (newEntries.length > 0) {
        const existing = JSON.parse(localStorage.getItem('wnafm_recentYTTopics') || '[]');
        // Migrate any old bare-string entries to timestamped shape (treat as old, will age out)
        const normalized = existing.map(e => typeof e === 'string' ? { topic: e, ts: 0 } : e);
        const merged = [...newEntries, ...normalized].slice(0, 200);
        localStorage.setItem('wnafm_recentYTTopics', JSON.stringify(merged));
      }
    } catch {}
  }, []);

  const handleReject = useCallback((id) => {
    setScripts(prev => {
      const found = prev.find(s => s.id === id);
      if (found) setTrash(t => [{ ...found, rejectedAt: Date.now() }, ...t]);
      return prev.filter(s => s.id !== id);
    });
  }, []);

  const restoreFromTrash = useCallback((id) => {
    setTrash(prev => {
      const found = prev.find(s => s.id === id);
      if (found) {
        const { rejectedAt, ...script } = found;
        setScripts(s => [script, ...s]);
      }
      return prev.filter(s => s.id !== id);
    });
  }, []);

  const permanentDelete = useCallback((id) => {
    setTrash(prev => prev.filter(s => s.id !== id));
  }, []);

  const updateScript = useCallback((updated) => {
    if (approved.find(a => a.id === updated.id)) {
      setApproved(prev => prev.map(s => s.id === updated.id ? updated : s));
    } else {
      setScripts(prev => prev.map(s => s.id === updated.id ? updated : s));
    }
  }, [approved]);

  const deleteApproved = useCallback((id) => {
    setApproved(prev => prev.filter(s => s.id !== id));
    setMonthCount(c => Math.max(0, c - 1));
  }, []);

  if (!authed) {
    if (!authChecked) return <div style={{ minHeight: '100vh', background: C.bg }} />;
    return <Login onLogin={handleLogin} error={loginErr} />;
  }

  const pending = scripts;

  return (
    <>
      <Head>
        <title>WNAFM Content OS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '100%', overflowX: 'hidden' }}>
        {/* TOPBAR */}
        <div style={{ background: '#0d0d0d', borderBottom: `1px solid ${C.border}`, padding: '0 28px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ ...T.display, fontSize: 24 }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: C.muted, fontWeight: 400, marginRight: 14, letterSpacing: '0.1em' }}>WNAFM /</span>CONTENT OS
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', border: '1px solid rgba(94,200,143,.3)', fontSize: 11, letterSpacing: '0.15em', color: C.green, background: 'rgba(94,200,143,.05)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} />LIVE RESEARCH ACTIVE
          </div>
        </div>

        {/* TABS */}
        <div style={{ background: '#0d0d0d', borderBottom: `1px solid ${C.border}`, display: 'flex', padding: '0 28px' }}>
          {[['submit', 'SUBMIT'], ['pending', `PENDING (${pending.length})`], ['approved', `APPROVED (${approved.length})`], ['trash', `TRASH (${trash.length})`], ['vault', 'VAULT']].map(([k, l]) => (
            <div key={k} onClick={() => setTab(k)} style={{ padding: '16px 20px', fontSize: 12, letterSpacing: '0.15em', color: tab === k ? C.text : C.muted, cursor: 'pointer', borderBottom: tab === k ? `2px solid ${C.text}` : '2px solid transparent', fontWeight: 600 }}>{l}</div>
          ))}
        </div>

        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: '100%' }}>
          {/* STATS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[['This Month', `${monthCount}/40`, C.text], ['Approved', approved.length, C.green], ['Pending', pending.length, C.text], ['Trash', trash.length, C.muted]].map(([l, v, c]) => (
              <div key={l} style={{ background: C.card, border: `1px solid ${C.border}`, padding: '16px 18px' }}>
                <div style={{ ...T.label, marginBottom: 8 }}>{l}</div>
                <div style={{ ...T.display, fontSize: 32, color: c }}>{v}</div>
              </div>
            ))}
          </div>

          {error && <div style={{ background: 'rgba(232,95,95,.08)', border: '1px solid rgba(232,95,95,.25)', padding: '14px 18px', fontSize: 14, color: C.red, lineHeight: 1.6 }}>{error}</div>}
          {storageWarning && <div style={{ background: 'rgba(240,168,58,.08)', border: '1px solid rgba(240,168,58,.3)', padding: '14px 18px', fontSize: 14, color: C.amber, lineHeight: 1.6 }}>{storageWarning}</div>}

          {/* SUBMIT */}
          {tab === 'submit' && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ ...T.display, fontSize: 26 }}>SUBMIT</div>
                <button style={{ ...btnGhost, fontSize: 11 }} onClick={() => setBulkMode(m => !m)}>{bulkMode ? '← Single' : '⚡ Bulk Mode'}</button>
              </div>

              <div>
                <label style={lbl}>Format</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div onClick={() => setFormat('ig')} style={{ padding: 18, border: `1px solid ${format === 'ig' ? C.text : C.border}`, cursor: 'pointer', textAlign: 'center', background: format === 'ig' ? 'rgba(245,245,243,.04)' : 'transparent' }}>
                    <div style={{ ...T.display, fontSize: 22, color: format === 'ig' ? C.text : C.muted }}>IG REEL</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>6 pillar scripts + deeper cuts · Carousel on demand</div>
                  </div>
                  <div onClick={() => setFormat('youtube')} style={{ padding: 18, border: `1px solid ${format === 'youtube' ? C.text : C.border}`, cursor: 'pointer', textAlign: 'center', background: format === 'youtube' ? 'rgba(245,245,243,.04)' : 'transparent' }}>
                    <div style={{ ...T.display, fontSize: 22, color: format === 'youtube' ? C.text : C.muted }}>YOUTUBE</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Outline · Full script per chapter</div>
                    {format === 'youtube' && (() => {
                      let active = 0, expired = 0;
                      try {
                        const raw = JSON.parse(localStorage.getItem('wnafm_recentYTTopics') || '[]');
                        const cutoff = Date.now() - (60 * 24 * 60 * 60 * 1000);
                        const normalized = raw.map(e => typeof e === 'string' ? { topic: e, ts: 0 } : e);
                        active = normalized.filter(e => e.ts >= cutoff).length;
                        expired = normalized.length - active;
                      } catch {}
                      return active > 0 || expired > 0 ? (
                        <div style={{ marginTop: 10, fontSize: 10, color: C.green, padding: '4px 8px', border: `1px solid rgba(94,200,143,.25)`, display: 'inline-block', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                          Avoiding {active} topics{expired > 0 ? ` · ${expired} aged out` : ''}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>

              {bulkMode ? (
                <>
                  <div>
                    <label style={lbl}>Bulk Transcripts <span style={{ color: C.dim, marginLeft: 8 }}>(separate each with ---)</span></label>
                    <textarea style={{ ...inp, minHeight: 280, resize: 'vertical' }} placeholder={`Transcript 1...\n---\nTranscript 2...\n---\nTranscript 3...`} value={bulkText} onChange={e => setBulkText(e.target.value)} />
                  </div>
                  <div style={{ fontSize: 13, color: C.muted, padding: 14, border: `1px solid ${C.border}`, background: C.card2, lineHeight: 1.7 }}>
                    <span style={{ color: C.amber }}>SEQUENTIAL PROCESSING</span> — Transcripts processed one at a time. Slow but safe. {bulkText.trim() && <span style={{ color: C.green }}>Detected: {bulkText.split('---').filter(s => s.trim().length > 30).length} transcripts</span>}
                  </div>
                  <button style={{ ...btnSolid, alignSelf: 'flex-start', opacity: bulkText.trim().length > 30 && !loading ? 1 : .4 }} onClick={handleBulkSubmit} disabled={bulkText.trim().length < 30 || loading}>
                    {loading ? `Processing ${bulkProgress.done}/${bulkProgress.total}...` : `▶ Generate All (${bulkText.split('---').filter(s => s.trim().length > 30).length})`}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div><label style={lbl}>Source Handle</label><input style={inp} placeholder="@handle" value={form.handle} onChange={e => setForm(f => ({ ...f, handle: e.target.value }))} /></div>
                    <div><label style={lbl}>View Count</label><input style={inp} placeholder="2.1M" value={form.views} onChange={e => setForm(f => ({ ...f, views: e.target.value }))} /></div>
                  </div>
                  <div><label style={lbl}>{format === 'ig' ? 'SortFeed Transcript' : 'Topic or Transcript'}</label><textarea style={{ ...inp, minHeight: 130, resize: 'vertical' }} placeholder="Paste here..." value={form.transcript} onChange={e => setForm(f => ({ ...f, transcript: e.target.value }))} /></div>
                  {format === 'ig' && <div><label style={lbl}>Visual Hook Note</label><input style={inp} placeholder="e.g. Opens with before/after" value={form.visualHook} onChange={e => setForm(f => ({ ...f, visualHook: e.target.value }))} /></div>}
                  <div><label style={lbl}>Specific Request <span style={{ color: C.dim, marginLeft: 8 }}>(optional)</span></label><input style={inp} placeholder="e.g. Make one about Ramadan training" value={form.specificRequest} onChange={e => setForm(f => ({ ...f, specificRequest: e.target.value }))} /></div>
                  <div style={{ fontSize: 13, color: C.muted, padding: 14, border: `1px solid ${C.border}`, background: C.card2, lineHeight: 1.7 }}>
                    <span style={{ color: C.green }}>SAFEGUARDS ACTIVE</span> — Multi-angle research · Citation matching · Hedge language · Bro-science banned · Common-sense fallback · Integrity self-check
                  </div>
                  <button style={{ ...btnSolid, alignSelf: 'flex-start', opacity: form.transcript.trim().length > 20 && !loading ? 1 : .4 }} onClick={handleSubmit} disabled={form.transcript.trim().length < 20 || loading}>
                    {loading ? 'Processing...' : `▶ Generate ${format === 'ig' ? '6 Pillar Scripts + Deeper Cuts' : 'YouTube Outline'}`}
                  </button>
                </>
              )}
            </div>
          )}

          {/* PENDING */}
          {tab === 'pending' && <>
            <div><div style={{ ...T.display, fontSize: 28 }}>PENDING REVIEW</div><div style={{ ...T.label, marginTop: 4 }}>{pending.length} awaiting your decision</div></div>
            {loading && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <div style={{ ...T.display, fontSize: 24 }}>GENERATING</div>
                <div style={{ ...T.label }}>{loadStep}</div>
                <div style={{ width: '100%', height: 3, background: C.border, marginTop: 10 }}><div style={{ height: '100%', background: C.text, width: `${loadPct}%`, transition: 'width .6s ease' }} /></div>
              </div>
            )}
            {!loading && pending.length === 0 && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: 60, textAlign: 'center' }}>
                <div style={{ ...T.display, fontSize: 22, color: C.muted, marginBottom: 8 }}>NO PENDING SCRIPTS</div>
                <div style={{ fontSize: 13, color: C.muted }}>Go to SUBMIT to generate</div>
              </div>
            )}
            {pending.map(s => s.format === 'youtube'
              ? <YTCard key={s.id} script={s} onApprove={handleApproveYT} onReject={handleReject} isApproved={false} onRetryEnrich={retryEnrich} />
              : <IGCard key={s.id} script={s} onApprove={handleApproveIG} onReject={handleReject} isApproved={false} onUpdate={updateScript} onRetryDeeper={retryDeeper} />
            )}
          </>}

          {/* APPROVED */}
          {tab === 'approved' && <ApprovedSection approved={approved} updateScript={updateScript} onDeleteApproved={deleteApproved} />}

          {/* TRASH */}
          {tab === 'trash' && <>
            <div><div style={{ ...T.display, fontSize: 28 }}>TRASH</div><div style={{ ...T.label, marginTop: 4 }}>Auto-deleted after 7 days</div></div>
            {trash.length === 0 ? (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: 60, textAlign: 'center' }}>
                <div style={{ ...T.display, fontSize: 22, color: C.muted }}>TRASH IS EMPTY</div>
              </div>
            ) : trash.map(s => {
              const daysLeft = Math.max(0, 7 - Math.floor((Date.now() - s.rejectedAt) / (24 * 60 * 60 * 1000)));
              return (
                <div key={s.id} style={{ background: C.card, border: `1px solid ${C.border}`, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...T.label }}>{s.sourceHandle} · {s.format?.toUpperCase()}</div>
                    <div dir="rtl" style={{ fontSize: 18, textAlign: 'right', marginTop: 6, color: C.text, lineHeight: 1.6 }}>{s.topicArabic}</div>
                    <div style={{ ...T.label, color: C.amber, marginTop: 8 }}>Deletes in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button style={btnGhost} onClick={() => permanentDelete(s.id)}>✕ Delete Now</button>
                    <button style={btnBlue} onClick={() => restoreFromTrash(s.id)}>↺ Restore</button>
                  </div>
                </div>
              );
            })}
          </>}

          {/* VAULT */}
          {tab === 'vault' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ ...T.display, fontSize: 28 }}>VAULT & LIBRARY</div>
              <div style={{ background: 'rgba(94,200,143,.05)', border: '1px solid rgba(94,200,143,.15)', padding: 20, color: C.text, lineHeight: 1.8 }}>
                <div style={{ ...T.label, color: C.green, marginBottom: 10 }}>HOW IT WORKS</div>
                <div style={{ fontSize: 14, color: C.muted }}>Multi-angle research per submission · Template-faithful generation · 10-rule scientific accuracy safeguards · Common-sense fallback for basic claims · Self-reported integrity check · Bulk mode for batch processing · Edit any field inline before approving · Carousel and full chapter scripts generated on demand to save tokens.</div>
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: 20 }}>
                <div style={{ ...T.label, marginBottom: 14 }}>Google Drive — WNAFM-OS</div>
                {[['Root', 'https://drive.google.com/drive/folders/1vd0c7Tdfvz_SqbpcjU0WVTuBP_C3A_Ad'], ['Research Vault', 'https://drive.google.com/drive/folders/1JTjn42BmeDVNAyjSsAFeXFJl8-VfnMGe'], ['Approved Scripts', 'https://drive.google.com/drive/folders/1tQfhfycDCLxFN8CFlQdWFLR7ZCpIs0df']].map(([name, url]) => (
                  <div key={url} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
                    <span style={{ fontSize: 15, color: C.text }}>{name}</span>
                    <a href={url} target="_blank" rel="noreferrer" style={{ ...T.label, fontSize: 11, color: C.muted, textDecoration: 'none', border: `1px solid ${C.border}`, padding: '6px 12px' }}>OPEN ↗</a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Dongne: a swipe feed of tiny Korean reps. A spaced-repetition scheduler picks every card,
// so however long you scroll, each swipe is the most useful thing to see next.

const DAY = 864e5, MIN = 6e4;
const KEY = "dongne.v1";

// ───────────────────────── content index ─────────────────────────
const ITEMS = {};
for (const s of SENTENCES) ITEMS[s.id] = s;
for (const d of DIALOGUES) ITEMS[d.id] = d;
const SCENE = Object.fromEntries(SCENES.map((s) => [s.id, s]));
const PAT = Object.fromEntries(PATTERNS.map((p) => [p.id, p]));
const BY_PAT = {};
for (const s of SENTENCES) for (const p of s.pats) (BY_PAT[p] = BY_PAT[p] || []).push(s.id);
for (const w of WORDS) ITEMS[w.id] = w;
const TOPIC = Object.fromEntries(TOPICS.map((t) => [t.id, t]));
const BY_TOPIC = {};
for (const w of WORDS) (BY_TOPIC[w.topic] = BY_TOPIC[w.topic] || []).push(w.id);
// a word's example with the [bracketed] form pulled out: { before, form, after }
function exParts(w) { const m = w.ex.match(/^(.*?)\[(.+?)\](.*)$/); return m ? { before: m[1], form: m[2], after: m[3] } : { before: w.ex, form: "", after: "" }; }
const exPlain = (w) => w.ex.replace(/[[\]]/g, "");
const isVerb = (w) => /다$/.test(w.ko);

// ───────────────────────── saved state ─────────────────────────
function blank() {
  return {
    v: 1, items: {}, days: {}, culture: {}, friends: {}, handled: {}, custom: [],
    focus: null, onboarded: false, total: 0,
    settings: { name: "", goal: 20, newPerDay: 20, rate: 0.9, voice: "", autoplay: true, autoAdvance: true, quiet: false, showEn: false, level: 2 },
  };
}
// level: 1 beginner (everything in order) · 2 elementary (skim the survival basics) ·
// 3 intermediate (skim all earlier scenes; new material is mostly vocabulary + level-4 grammar)
const LEVELS = { 1: "Beginner", 2: "Elementary", 3: "Intermediate" };
let state = load();
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && raw.v === 1) {
      const b = blank(), st = { ...b, ...raw, settings: { ...b.settings, ...raw.settings } };
      if (!raw.settings?.level && raw.onboarded) st.settings.level = 3;   // progress from before levels existed
      return st;
    }
  } catch (e) {}
  return blank();
}
let saveTimer = 0;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }, 300); }
addEventListener("pagehide", () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} });

const ymd = (t = Date.now()) => { const d = new Date(t); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
function today() { return (state.days[ymd()] = state.days[ymd()] || { cards: 0, right: 0, new: 0, secs: 0 }); }
function streak() {
  let n = 0, t = Date.now();
  const met = (k) => (state.days[k]?.cards || 0) >= state.settings.goal;
  if (!met(ymd(t))) t -= DAY;
  while (met(ymd(t))) { n++; t -= DAY; }
  return n;
}

// ───────────────────────── text helpers ─────────────────────────
const hasBatchim = (ch) => { const c = ch.codePointAt(0) - 0xac00; return c >= 0 && c < 11172 ? c % 28 !== 0 : true; };
function fill(s) {
  const name = state.settings.name.trim() || "에런";
  return s.replace(/\{name\}/g, name).replace(/(.)\{이에요\}/g, (m, ch) => ch + (hasBatchim(ch) ? "이에요" : "예요"));
}
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[(Math.random() * a.length) | 0];

function h(tag, props, ...kids) {
  const [t, ...cls] = tag.split(".");
  const el = document.createElement(t || "div");
  if (cls.length) el.className = cls.join(" ");
  if (props) for (const [k, v] of Object.entries(props)) {
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "html") el.innerHTML = v;
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : String(k));
  return el;
}
const $ = (s, el = document) => el.querySelector(s);
// card parts are often optional (null); the DOM would print those as the text "null"
const _replace = Element.prototype.replaceChildren;
Element.prototype.replaceChildren = function (...kids) { return _replace.apply(this, kids.flat().filter((k) => k != null && k !== false)); };

// ───────────────────────── scheduler ─────────────────────────
// step 0/1 = learning (minutes apart), step 2 = review (days). s = stability in days.
// known = already knew it (skips learning). days = how long until it's checked again.
// Skimmed easy phrases you already knew don't count against today's new-item cap.
function introduce(id, known, days = 4, countNew = true) {
  const now = Date.now();
  state.items[id] = known
    ? { s: days, step: 2, due: now + days * DAY, reps: 1, lapses: 0, last: now }
    : { s: 0, step: 0, due: now + MIN, reps: 1, lapses: 0, last: now };
  if (countNew) today().new++;
}
function grade(id, g) {   // 1 again · 2 hard · 3 good · 4 easy
  const r = state.items[id], now = Date.now();
  if (!r) return;
  r.reps++;
  if (g === 1) { r.wrong = (r.wrong || 0) + 1; r.lastWrong = now; }   // for Review: mistakes & weakest
  if (r.step < 2) {
    if (g === 1) { r.step = 0; r.due = now + MIN; }
    else if (g === 4 || r.step === 1) { r.step = 2; r.s = g === 4 ? 3 : 1; r.due = now + r.s * DAY; }
    else { r.step = 1; r.due = now + 10 * MIN; }
  } else if (g === 1) {
    r.lapses++; r.s = Math.max(0.5, r.s * 0.25); r.step = 1; r.due = now + 10 * MIN;
  } else {
    const ease = Math.max(1.3, 2.5 - 0.15 * r.lapses);
    let f = g === 2 ? 1.2 : g === 3 ? ease : ease * 1.4;
    if (now < r.due) f = 1 + (f - 1) * Math.min(1, (now - r.last) / DAY / r.s);   // early reviews earn less
    r.s = Math.min(365, r.s * f);
    r.due = now + r.s * DAY * (0.95 + Math.random() * 0.1);
  }
  r.last = now;
}
const known = (id) => { const r = state.items[id]; return !!r && r.step >= 2; };
function weight(id) { const r = state.items[id]; return !r ? 0 : r.step < 2 ? 0.1 : Math.min(1, 0.25 + r.s / 28); }
function sceneStats(sc) {
  const ids = ORDER[sc];
  let seen = 0, k = 0, m = 0, solid = 0;
  for (const id of ids) { if (state.items[id]) seen++; if (known(id)) k++; if (known(id) && state.items[id].s >= 3) solid++; m += weight(id); }
  return { total: ids.length, seen, known: k, mastery: m / ids.length, canHandle: solid / ids.length >= 0.8 };
}
const friendLevel = (sc) => Math.min(5, Math.floor(sceneStats(sc).mastery * 5 + 1e-9));
const useCasual = (sc) => SCENE[sc].char.elder && friendLevel(sc) >= 3;

// New material comes from three streams, mixed by level:
//   w = vocabulary (one topic after another in rotation, so similar words don't pile up)
//   g = the intermediate scenes (level-4 grammar), rotating between them
//   s = the earlier scenes in order (below your level they arrive as quick "skim" checks)
const PLANS = { 1: ["s", "s", "s", "w", "s", "s"], 2: ["s", "w", "s", "g", "w", "s"], 3: ["w", "w", "g", "w", "s", "w", "w", "g"] };
let newTurn = 0;
const unseen = (ex) => (id) => !state.items[id] && !ex.has(id);
function nextWord(ex, topic) {
  if (topic) return (BY_TOPIC[topic] || []).find(unseen(ex)) || null;
  // the topic you've started least, so topics advance side by side
  let best = null, bestN = Infinity;
  for (const t of TOPICS) {
    const ids = BY_TOPIC[t.id], id = ids.find(unseen(ex));
    if (!id) continue;
    const n = ids.filter((i) => state.items[i]).length;
    if (n < bestN) { best = id; bestN = n; }
  }
  return best;
}
function nextScene(ex, scenes, rotate) {
  if (!rotate) { for (const sc of scenes) { const id = ORDER[sc].find(unseen(ex)); if (id) return id; } return null; }
  let best = null, bestP = Infinity;
  for (const sc of scenes) {
    const id = ORDER[sc].find(unseen(ex));
    if (!id) continue;
    const p = sceneStats(sc).seen / ORDER[sc].length;
    if (p < bestP) { best = id; bestP = p; }
  }
  return best;
}
const EARLY = SCENES.filter((s) => s.lvl < 3).map((s) => s.id), INTER = SCENES.filter((s) => s.lvl >= 3).map((s) => s.id);
function nextNew(ex) {
  const f = state.focus, L = state.settings.level || 2;
  if (f?.type === "pattern") { const id = (BY_PAT[f.id] || []).find(unseen(ex)); if (id) return id; }
  if (f?.type === "scene") { const id = ORDER[f.id].find(unseen(ex)); if (id) return id; }
  if (f?.type === "topic") { const id = nextWord(ex, f.id); if (id) return id; }
  const mine = BY_TOPIC.mine.find(unseen(ex));     // words you added yourself come first
  if (mine) return mine;
  const seen = Object.keys(state.items).length;
  const from = (src) => src === "w" ? (L > 1 || seen >= 60 ? nextWord(ex) : null)
    : src === "g" ? nextScene(ex, INTER, true) : nextScene(ex, EARLY, false);
  const plan = PLANS[L] || PLANS[2];
  for (let k = 0; k < plan.length; k++) {
    const id = from(plan[(newTurn + k) % plan.length]);
    if (id) { newTurn = (newTurn + k + 1) % plan.length; return id; }
  }
  return from("w") || from("g") || from("s");
}
// below your level, an earlier-scene phrase is "easy": it comes in a batch to skim
const isEasy = (it) => it.kind === "s" && SCENE[it.scene].lvl < (state.settings.level || 2);
function skimBatch(firstId, ex) {
  const it = ITEMS[firstId], ids = [];
  for (const id of ORDER[it.scene].slice(ORDER[it.scene].indexOf(firstId))) {
    if (ids.length >= 6) break;
    if (state.items[id] || ex.has(id)) continue;
    if (ITEMS[id].kind !== "s") break;    // stop at a dialogue: it gets played properly
    ids.push(id);
  }
  return ids;
}
function pickItem(ex) {
  const now = Date.now();
  const due = Object.entries(state.items).filter(([id, r]) => r.due <= now && ITEMS[id] && !ex.has(id))
    .sort((a, b) => (a[1].step < 2 ? 0 : 1) - (b[1].step < 2 ? 0 : 1) || a[1].due - b[1].due);
  const t = today();
  const nw = nextNew(ex);
  const seenCount = Object.keys(state.items).length;
  const newOk = nw && (t.new < state.settings.newPerDay + (t.extraNew || 0) || seenCount < 10);
  if (due.length && due[0][1].step < 2) return due[0][0];
  if (due.length && (!newOk || Math.random() < 0.7)) return due[0][0];
  if (newOk) return nw;
  if (nw && !t.capShown) {
    t.capShown = true;
    events.push({ kind: "event", icon: "🌙", title: "Today's new phrases: done",
      text: "From here it's bonus practice on phrases you've already met, which still counts. Feeling good? You can take on more today.",
      action: { label: "+10 new phrases today", fn: () => { t.extraNew = (t.extraNew || 0) + 10; t.capShown = false; save(); refreshAhead(); toast("10 more new phrases coming up"); } } });
  }
  // bonus practice: whatever is closest to due
  const soon = Object.entries(state.items).filter(([id]) => ITEMS[id] && !ex.has(id)).sort((a, b) => a[1].due - b[1].due);
  return soon.length ? soon[(Math.random() * Math.min(6, soon.length)) | 0][0] : nw;
}

function sibling(it) {
  const pats = it.pats.slice().sort((a, b) => (BY_PAT[a]?.length || 0) - (BY_PAT[b]?.length || 0));
  for (const p of pats) {
    if (p === "ayo" || p === "formal") continue;
    const opts = (BY_PAT[p] || []).filter((id) => id !== it.id && known(id) && !ITEMS[id].hear);
    if (opts.length) return { sib: ITEMS[pick(opts)], pat: PAT[p] };
  }
  return null;
}
function tileCount(it) { return fill(it.ko).split(" ").length; }
let lastType = "";
function chooseType(it) {
  const r = state.items[it.id];
  if (it.kind === "d") return r && Math.random() < (r.step >= 2 ? 0.6 : 0.3) ? "reply" : "dialog";
  const q = state.settings.quiet, voice = Speech.hasVoice();
  if (it.kind === "w") {
    if (!r) return "wintro";
    // recognize it → recall it → produce it, as the word settles in
    let wp = r.step < 2 ? ["wmean", "wrecall", "wcloze", "wlisten"]
      : r.s < 7 ? ["wrecall", "wcloze", "wspell", "wsay", "wlisten", "wmean"]
      : ["wsay", "wspell", "wcloze", "wrecall"];
    wp = wp.filter((t) => !(t === "wlisten" && !voice) && !(t === "wspell" && !spellable(it)) && !(t === "wcloze" && !exParts(it).form));
    const v = wp.filter((t) => t !== lastType);
    return (lastType = pick(v.length ? v : wp));
  }
  if (!r) return "intro";
  let pool;
  if (r.step < 2) pool = it.hear ? ["listen", "read", "hearko"] : ["listen", "read", "build", "cloze", "hearko"];
  else if (r.s < 7) pool = it.hear ? ["listen", "speed", "read", "shadow", "hearko"] : ["build", "say", "shadow", "swap", "listen", "speed", "cloze", "hearko"];
  else pool = it.hear ? ["speed", "listen", "shadow", "hearko"] : ["say", "say", "swap", "speed", "build", "shadow", "cloze"];
  const n = tileCount(it);
  pool = pool.filter((t) =>
    !((t === "build" || t === "swap") && (n < 2 || n > 8)) &&
    !(t === "swap" && !sibling(it)) &&
    !(t === "cloze" && !clozeTarget(it)) &&
    !(t === "shadow" && (q || !window.MediaRecorder)) &&
    !((t === "listen" || t === "speed" || t === "hearko") && !voice));
  if (!pool.length) pool = ["read"];
  const varied = pool.filter((t) => t !== lastType);
  return (lastType = pick(varied.length ? varied : pool));
}

// ───────────────────────── feed ─────────────────────────
const feed = $("#feed");
const cards = [];          // { el, spec, answered, onShow, onLeave }
const events = [];
let active = null, sinceCulture = 0, sinceMatch = 0;

// Review sessions, started from the Review tab: only due items, or a fixed list (recent
// mistakes, weakest items), with no new material. A miss in a list session comes back
// at the end of the queue, up to twice, so it's drilled until it sticks.
let session = null;    // { kind, title, queue, total, served, right, retries }
function startSession(kind, title, ids) {
  session = { kind, title, queue: ids ? ids.slice() : null, total: ids ? ids.length : dueNow().length, served: 0, right: 0, retries: {} };
  hud(); showView("feed");
  if (started) refreshAhead();
}
function endSession(msg) { session = null; hud(); if (msg) toast(msg); }
function dueNow(ex = new Set()) {
  const now = Date.now();
  return Object.entries(state.items).filter(([id, r]) => r.due <= now && ITEMS[id] && !ex.has(id))
    .sort((a, b) => (a[1].step < 2 ? 0 : 1) - (b[1].step < 2 ? 0 : 1) || a[1].due - b[1].due).map(([id]) => id);
}
function sessionNext(ex) {
  if (session.kind === "due") return dueNow(ex)[0] || null;
  const q = session.queue;
  for (let i = 0; i < q.length; i++) if (!ex.has(q[i]) || q.length - i <= 1) { const id = q.splice(i, 1)[0]; if (ITEMS[id] && state.items[id]) return id; i--; }
  return null;
}
const sessionLeft = () => !session ? 0 : session.kind === "due" ? dueNow().length : session.queue.length;

function nextSpec() {
  if (events.length) return events.shift();
  const t = today();
  if (session) {
    const ex = new Set(cards.slice(-3).flatMap((c) => (c.spec.item ? [c.spec.item.id] : [])));
    const id = sessionNext(ex);
    if (!id) {
      const s = session; endSession();
      return { kind: "event", icon: "✅", title: s.kind === "due" ? "All caught up!" : `${s.title}: done`,
        text: s.done ? `${s.done} cards, ${s.right} right the first time through. Back to your normal mix now.` : "Nothing left to review right now. Back to your normal mix." };
    }
    session.served++;
    const item = ITEMS[id], type = chooseType(item);
    return { kind: "item", item, type, cloze: type === "cloze" ? clozeTarget(item) : null, session: true };
  }
  if (sinceCulture >= 11) {
    const unlocked = new Set(SCENES.filter((s) => sceneStats(s.id).seen).map((s) => s.id));
    const pool = CULTURE.filter((c) => unlocked.has(c.scene));
    const fresh = pool.filter((c) => !state.culture[c.id]);
    const c = fresh[0] || (pool.length && Math.random() < 0.3 ? pool.sort((a, b) => state.culture[a.id] - state.culture[b.id])[0] : null);
    if (c) { sinceCulture = 0; return { kind: "culture", c }; }
  }
  if (sinceMatch >= 12) {
    const pairs = glossPairs();
    if (pairs.length >= 10) { sinceMatch = 0; return { kind: "match", pairs: pairs.slice(0, 5) }; }
  }
  const ex = new Set(cards.slice(-6).flatMap((c) => (c.spec.item ? [c.spec.item.id] : c.spec.ids || [])));
  const id = pickItem(ex);
  if (!id) return { kind: "event", icon: "🏆", title: "You've met every phrase in Dongne", text: "Incredible. Keep swiping to review, and go use it with real people!" };
  sinceCulture++; sinceMatch++;
  if (!state.items[id] && isEasy(ITEMS[id])) return { kind: "skim", ids: skimBatch(id, ex) };
  const item = ITEMS[id], type = chooseType(item);
  return { kind: "item", item, type, cloze: type === "cloze" ? clozeTarget(item) : null };
}

// Word pairs for the matching game, from the glosses of phrases you've already met.
function glossPairs() {
  const seenW = new Set(), seenM = new Set(), out = [];
  for (const w of shuffle(WORDS.filter((w) => state.items[w.id]))) {
    const m = w.en.replace(/\s*\(.*?\)/g, "").split(/[,;]/)[0].trim();
    if (w.ko.length > 8 || m.length > 24 || seenM.has(m)) continue;
    seenW.add(w.ko); seenM.add(m); out.push([w.ko, m]);
    if (out.length >= 3) break;      // leave room for words from phrases too
  }
  for (const s of shuffle(SENTENCES.filter((s) => state.items[s.id] && s.gl))) {
    for (const g of s.gl.split("|")) {
      let [w, m] = g.split("=");
      if (!m || w.length > 8) continue;
      m = m.replace(/\s*\(.*?\)/g, "").split(",")[0].trim();
      if (!m || m.length > 22 || seenW.has(w) || seenM.has(m)) continue;
      seenW.add(w); seenM.add(m); out.push([w, m]);
    }
  }
  return out;
}

// Fill-the-blank: blank the particle or ending the phrase is tagged with, and offer the same
// word with a different particle/ending. Every option is a real form; only one fits.
const CLOZE_PARTICLES = { topic: ["은", "는"], subj: ["이", "가"], obj: ["을", "를"], e: ["에", "에"], eseo: ["에서", "에서"], do: ["도", "도"], hago: ["이랑", "랑"] };
// wrong options per correct particle, leaving out swaps that are also fine in real speech
// (제주도를 가 봤어요, 셔츠에 어울리는, 계산을 어디서 해요 …)
const CLOZE_SWAP = { topic: ["e", "eseo", "hago", "do"], subj: ["obj", "e", "eseo", "hago"], obj: ["subj", "e", "eseo"], e: ["subj", "eseo", "hago"], eseo: ["e", "obj", "subj"], do: ["topic", "obj", "e"], hago: ["eseo", "obj", "subj"] };
const CLOZE_ENDINGS = [
  { pats: ["myeon", "nikka", "ryeogo"], ends: ["면", "니까", "려고"] },     // all attach to the (으) form
  { pats: ["geodeun", "janha", "deora"], ends: ["거든요", "잖아요", "더라고요"] },   // the English cues which: "you see" / "you know" / "turned out"
];
function withParticle(stem, k, b) {
  if (k === "subj" && { 저: 1, 나: 1, 너: 1 }[stem]) return { 저: "제", 나: "내", 너: "네" }[stem] + "가";
  return stem + CLOZE_PARTICLES[k][b ? 0 : 1];
}
const NOT_PARTICLE = new Set(["많이", "같이", "따로", "포도", "정도", "제가", "내가", "네가", "아이", "오이", "둘이", "길이"]);
function clozeTarget(it) {
  const text = fill(it.ko), punct = (text.match(/[.!?~]+$/) || [""])[0];
  const words = text.slice(0, text.length - punct.length).split(" ");
  const pick = (stemOf, makeOpts) => {
    for (let i = 0; i < words.length; i++) {
      const tail = (words[i].match(/,$/) || [""])[0], w = words[i].slice(0, words[i].length - tail.length);
      const hit = stemOf(w);
      if (hit) return { words, i, punct, answer: words[i], opts: makeOpts(hit).map((o) => o + tail) };
    }
    return null;
  };
  for (const p of shuffle(it.pats)) {
    const g = CLOZE_PARTICLES[p];
    if (g) {
      const r = pick((w) => {
        if (NOT_PARTICLE.has(w)) return null;
        for (const form of new Set(g)) {
          if (!w.endsWith(form) || w.length <= form.length) continue;
          const stem = w.slice(0, -form.length), b = hasBatchim(stem.slice(-1));
          if (g[0] !== g[1] && form !== g[b ? 0 : 1]) continue;   // 커피는 yes, 커피은 no: it isn't really a particle
          if (form === "는" && /[하되리우니시]$/.test(stem)) continue;   // 좋아하는, 배우는: a verb ending, not the topic marker
          return { stem, b };
        }
        return null;
      }, ({ stem, b }) => shuffle(CLOZE_SWAP[p]).slice(0, 3).map((k) => withParticle(stem, k, b)));
      if (r) return r;
    }
    const fam = CLOZE_ENDINGS.find((f) => f.pats.includes(p));
    if (fam) {
      const r = pick((w) => {
        const e = fam.ends.find((e) => w.endsWith(e) && w.length > e.length);
        return e ? { base: w.slice(0, -e.length), e } : null;
      }, ({ base, e }) => fam.ends.filter((x) => x !== e).map((x) => base + x));
      if (r) return r;
    }
  }
  return null;
}

function appendCard() {
  const spec = nextSpec();
  const card = { spec, answered: false };
  card.el = render(card);
  card.el._card = card;
  cards.push(card);
  feed.append(card.el);
  io.observe(card.el);
  return card;
}

const io = new IntersectionObserver((ents) => {
  for (const e of ents) if (e.isIntersecting && e.intersectionRatio >= 0.6) activate(e.target._card);
}, { root: feed, threshold: [0.6] });

function activate(card) {
  if (!card || card === active) return;
  if (active) leave(active);
  active = card;
  const i = cards.indexOf(card);
  while (cards.length - 1 < i + 1) appendCard();
  card.onShow?.();
  // trim far-behind cards so a long session stays light
  if (i > 30) {
    const drop = cards.splice(0, 20), hgt = feed.clientHeight;
    for (const c of drop) { io.unobserve(c.el); c.el.remove(); }
    feed.scrollTop -= 20 * hgt;
  }
}
function leave(card) {
  Speech.stop(); Speech.stopListening(); Speech.stopRecording();
  card.onLeave?.();
  if (card.spec.kind === "skim") return card.finishSkim?.();     // swiped on: untapped ones count as known
  if (card.spec.kind !== "item" || card.answered) return;
  if (card.spec.type === "intro" || card.spec.type === "wintro") return introduceCard(card, false);
  // swiped past without answering: no grade, just let other cards through for a few minutes
  const id = card.spec.item.id;
  if (!state.items[id]) introduce(id, false);   // a brand-new dialogue skipped unplayed
  const r = state.items[id];
  if (r.due <= Date.now() + 5 * MIN) { r.due = Date.now() + 5 * MIN; save(); }
}
function advance() {
  const i = cards.indexOf(active);
  if (i < 0) return;
  if (!cards[i + 1]) appendCard();
  cards[i + 1].el.scrollIntoView({ behavior: "smooth" });
}
// rebuild cards the user hasn't reached yet (after settings like quiet mode change)
function refreshAhead() {
  const i = cards.indexOf(active);
  for (const c of cards.splice(i + 1)) { io.unobserve(c.el); c.el.remove(); }
  appendCard();
}

function finish(card, g, { silent } = {}) {
  if (card.answered) return;
  card.answered = true;
  const it = card.spec.item, t = today();
  if (!state.items[it.id]) introduce(it.id, false);
  grade(it.id, g);
  t.cards++; state.total++;
  if (g >= 3) t.right++;
  if (session && card.spec.session) {
    const rt = session.retries;
    session.done = (session.done || 0) + 1;
    if (g >= 3 && !rt[it.id]) session.right++;
    if (g === 1 && session.queue && (rt[it.id] || 0) < 2) { rt[it.id] = (rt[it.id] || 0) + 1; session.queue.push(it.id); }
    hud();
  }
  afterAnswer(it.scene);
  card.el.classList.add("done", g >= 3 ? "good" : "bad");
  save(); hud();
  if (!silent && state.settings.autoAdvance && g >= 3) setTimeout(() => card === active && advance(), 1300);
}
function introduceCard(card, knew) {
  if (card.answered) return;
  card.answered = true;
  const it = card.spec.item;
  introduce(it.id, knew);
  today().cards++; state.total++;
  afterAnswer(it.scene);
  save(); hud();
}
function afterAnswer(sc) {
  const t = today();
  // daily snapshot of what you know, for the Progress chart
  let kw = 0, kp = 0;
  for (const id in state.items) if (state.items[id].step >= 2 && ITEMS[id]) ITEMS[id].kind === "w" ? kw++ : kp++;
  t.knownW = kw; t.knownP = kp;
  if (t.cards >= state.settings.goal && !t.goalShown) {
    t.goalShown = true;
    events.push({ kind: "event", icon: "🔥", title: `Daily goal done! ${streak()}-day streak`, text: "That's real practice instead of scrolling. Keep going; every swipe still counts." });
  }
  if (!SCENE[sc]) return wordMilestone();     // a vocabulary word, not a scene
  const lvl = friendLevel(sc), prev = state.friends[sc] || 0;
  if (lvl > prev) { state.friends[sc] = lvl; events.push(friendEvent(sc, lvl)); }
  if (!state.handled[sc] && sceneStats(sc).canHandle) {
    state.handled[sc] = true;
    events.push({ kind: "event", icon: SCENE[sc].icon, title: "New real-world skill unlocked", text: `You can now: ${SCENE[sc].can}. Go try it for real!` });
  }
}
const wordsKnown = () => WORDS.filter((w) => known(w.id)).length;
function wordMilestone() {
  const n = wordsKnown(), step = Math.floor(n / 25) * 25;
  if (step > 0 && step > (state.wordMile || 0)) {
    state.wordMile = step;
    events.push({ kind: "event", icon: "📚", title: `${step} new words in the bank`, text: "Each one comes back right before you'd forget it. Try slipping one into a real conversation today." });
  }
}
function friendEvent(sc, lvl) {
  const ch = SCENE[sc].char;
  const lines = {
    1: `${ch.name} is starting to recognize you.`,
    2: `${ch.name} smiles when you walk in.`,
    3: ch.elder ? `${ch.name} has started talking to you in 반말. From an elder, that's affection: you've become one of theirs. Keep using 존댓말 back!` : `${ch.name} thinks you're really fun to talk to.`,
    4: `${ch.name} treats you like a regular now.`,
    5: `${ch.name} would call you family. Scene mastered!`,
  };
  return { kind: "event", icon: ch.emoji, title: `${ch.name} ${"♥".repeat(lvl)}${"♡".repeat(5 - lvl)}`, text: lines[lvl] };
}

// ───────────────────────── card pieces ─────────────────────────
const LABEL = { intro: "New phrase", listen: "Listen", read: "Read", build: "Build it", swap: "Same pattern", say: "Say it", shadow: "Shadow", speed: "Real speed", dialog: "Your turn", cloze: "Fill the blank", hearko: "Which did you hear?", reply: "Quick reply" };

function shell(card, label, ...body) {
  const it = card.spec.item, sc = it && SCENE[it.scene], tp = it && TOPIC[it.topic];
  return h("section.card", null, h("div.card-in", null,
    h("div.card-top", null,
      sc ? h("span.chip", null, sc.icon + " " + sc.ko) : tp ? h("span.chip.word-chip", null, tp.icon + " 단어 · " + tp.ko) : null,
      h("span.label", null, label)),
    h("div.card-body", null, ...body),
    h("div.swipe-hint", null, "swipe up ↑")));
}
function audioBtns(text, extra = {}) {
  return h("div.audio-row", null,
    h("button.icon-btn", { "aria-label": "Play", onclick: () => Speech.say(text, state.settings.rate) }, "🔊"),
    h("button.icon-btn", { "aria-label": "Play slowly", onclick: () => Speech.say(text, Math.max(0.4, state.settings.rate * 0.6)) }, "🐢"),
    extra.fast ? h("button.icon-btn", { "aria-label": "Play fast", onclick: () => Speech.say(text, Math.min(1.6, state.settings.rate * 1.35)) }, "⚡") : null);
}
function glossList(gl) {
  if (!gl) return null;
  return h("ul.gloss", null, gl.split("|").map((g) => {
    const [w, m] = g.split("=");
    return m ? h("li", null, h("b", null, w), " ", m) : h("li.note", null, w);
  }));
}
function patternPills(it) {
  const box = h("div.pat-box");
  const pills = it.pats.filter((p) => PAT[p]).map((p) => h("button.pill", {
    onclick: (e) => {
      const open = box.dataset.p === p;
      box.dataset.p = open ? "" : p;
      box.replaceChildren(...(open ? [] : patExplain(PAT[p])));
      e.currentTarget.parentNode.querySelectorAll(".pill").forEach((b) => b.classList.toggle("on", !open && b === e.currentTarget));
    },
  }, PAT[p].ko));
  return pills.length ? h("div", null, h("div.pills", null, pills), box) : null;
}
function patExplain(p) { return [h("div.pat-en", null, p.en), h("div.pat-how", null, p.how), h("div.pat-note", null, p.note)]; }
function ko(text, cls = "") { return h("div.ko" + (cls ? "." + cls : ""), { lang: "ko" }, fill(text)); }
function en(text, cls = "") { return h("div.en" + (cls ? "." + cls : ""), null, fill(text)); }
function grades(card, opts = [1, 3]) {
  const names = { 1: "Again", 2: "Hard", 3: "Good", 4: "Easy" };
  return h("div.grades", null, opts.map((g) => h("button.btn.g" + g, { onclick: (e) => { e.currentTarget.parentNode.querySelectorAll("button").forEach((b) => (b.disabled = true)); finish(card, g); } }, names[g])));
}
function choices(card, correct, distractors, onDone, cls = "") {
  const opts = shuffle([correct, ...distractors]);
  const box = h("div.choices");
  for (const o of opts) box.append(h("button.choice" + cls, {
    onclick: (e) => {
      if (card.answered) return;
      const ok = o === correct;
      e.currentTarget.classList.add(ok ? "right" : "wrong");
      if (!ok) [...box.children].find((b) => b.textContent === correct)?.classList.add("right");
      box.querySelectorAll("button").forEach((b) => (b.disabled = true));
      onDone(ok);
    },
  }, o));
  return box;
}
function enDistractors(it, n = 3) {
  const target = fill(it.en);
  const same = shuffle(SENTENCES.filter((s) => s.scene === it.scene && s.id !== it.id)).map((s) => fill(s.en));
  const any = shuffle(SENTENCES.filter((s) => s.id !== it.id)).map((s) => fill(s.en));
  return [...new Set([...same, ...any])].filter((e) => e !== target).slice(0, n);
}
function micErrorText(err) {
  return {
    "not-allowed": "Microphone blocked. Allow it in the browser's site settings.",
    "service-not-allowed": "Speech check isn't allowed here. Use the reveal button instead.",
    network: "Speech check needs a connection, or Korean offline speech installed on your phone (see Settings).",
    "no-speech": "Didn't catch anything. Tap the mic, wait for “Listening…”, then speak.",
    busy: "The mic was busy. Tap again.",
    aborted: "Stopped. Tap the mic to try again.",
    "audio-capture": "No microphone found.",
    unsupported: "This browser has no speech check. Use reveal instead.",
    "language-not-supported": "Korean speech isn't installed on this phone (see Settings).",
  }[err] || "Couldn't hear that. Try again.";
}
// Mark target syllables the recognizer didn't hear (syllable-level LCS). live = still
// speaking, so unheard syllables are "not yet" (grey) instead of "missed" (red).
function syllableHits(said, target) {
  const a = [...said.replace(/[\s.,!?~…]/g, "")], b = [...fill(target)];
  const bc = b.map((c) => (/[\s.,!?~…]/.test(c) ? null : c));
  const t = bc.filter(Boolean);
  const dp = Array.from({ length: a.length + 1 }, () => new Array(t.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = t.length - 1; j >= 0; j--)
    dp[i][j] = a[i] === t[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hit = new Set();
  for (let i = 0, j = 0; i < a.length && j < t.length;) {
    if (a[i] === t[j]) { hit.add(j); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  return { b, bc, hit, missed: t.length - hit.size };
}
function diffView(said, target, live = false) {
  const { b, bc, hit } = syllableHits(said, target);
  let k = 0;
  return h("div.ko.diff" + (live ? ".live-diff" : ""), { lang: "ko" }, b.map((c, idx) => (bc[idx] === null ? c : h("span", { class: hit.has(k++) ? "hit" : live ? "pend" : "miss" }, c))));
}
const PERFECT = 0.92, CLOSE = 0.65;
// The verdict box after speaking: a clear right / close / wrong, the match %, what was
// heard, and which syllables were missed.
// "Perfect" needs every syllable: on a long sentence one wrong verb barely dents the score.
const speechLevel = (r, target) => r.score >= PERFECT && syllableHits(r.text, target).missed === 0 ? "ok" : r.score >= CLOSE ? "meh" : "bad";
function verdict(r, target, msgs = {}) {
  const lvl = speechLevel(r, target);
  const head = { ok: msgs.ok || "✓ 완벽해요! Sounds right.", meh: msgs.meh || "Almost! Red parts were missed.", bad: msgs.bad || "✗ Not quite. Listen and try again." }[lvl];
  navigator.vibrate?.(lvl === "ok" ? 35 : lvl === "meh" ? [25, 60, 25] : [60, 50, 60]);
  return { lvl, el: [
    h("div.verdict-head", null, h("span", null, head), h("span.pct." + lvl, null, Math.round(r.score * 100) + "%")),
    diffView(r.text, target),
    h("div.heard", null, "Heard: “", r.text || "…", "”")] };
}
// The mic button shared by say / intro / dialog / words. onResult gets {text, score, index, alts} or {error}.
// While you talk it shows the target lighting up syllable by syllable and a live match bar,
// and it stops by itself as soon as you've said it right.
function micButton(target, onResult, label = "🎤 Say it") {
  const targets = (Array.isArray(target) ? target : [target]).map((t) => fill(t));
  const bestOf = (alts) => {
    let b = { text: alts[0] || "", score: 0, index: 0 };
    targets.forEach((tg, i) => { const x = Speech.best(alts, tg); if (x.score > b.score) b = { ...x, index: i }; });
    return b;
  };
  const status = h("div.mic-status"), live = h("div.mic-target"), heard = h("div.heard-live");
  const fillBar = h("div.meter-fill"), meter = h("div.meter", null, fillBar);
  const panel = h("div.mic-live", { hidden: true }, status, live, meter, heard);
  const setLive = (text) => {
    const b = bestOf(text ? [text] : []);
    live.replaceChildren(diffView(text, targets[b.index], true));
    heard.textContent = text ? "“" + text + "”" : "";
    fillBar.style.width = Math.round(b.score * 100) + "%";
    fillBar.className = "meter-fill " + ({ ok: "ok", meh: "meh" }[speechLevel(b, targets[b.index])] || "");
  };
  const btn = h("button.btn.mic", {
    onclick: async () => {
      if (btn.classList.contains("on")) return Speech.stopListening();
      Speech.stop();
      btn.classList.add("on"); btn.textContent = "■ Done talking";
      panel.hidden = false; status.textContent = "Starting the mic…";
      if (targets.length === 1) setLive(""); else { live.replaceChildren(); heard.textContent = ""; fillBar.style.width = "0"; }
      const quiet = setTimeout(() => (status.textContent = "Still listening… speak up, or check the mic is allowed"), 5000);
      const longest = Math.max(...targets.map((t) => t.length));
      const r = await Speech.listen({
        onState: (s) => (status.textContent = s === "listening" ? "🎤 Listening… speak now" : "👂 Hearing you…"),
        onInterim: (text) => { clearTimeout(quiet); setLive(text); },
        stopWhen: (alts) => { const b = bestOf(alts); return b.score >= 0.97 && speechLevel(b, targets[b.index]) === "ok"; },
        maxMs: 5000 + longest * 300,
      });
      clearTimeout(quiet);
      btn.classList.remove("on"); btn.textContent = "🎤 Try again";
      panel.hidden = true;
      if (r.error) return onResult({ error: r.error });
      onResult({ ...bestOf(r.alts), alts: r.alts });
    },
  }, label);
  return h("div.mic-wrap", null, btn, panel);
}

// ───────────────────────── card types ─────────────────────────
function render(card) {
  const s = card.spec;
  if (s.kind === "culture") return cultureCard(card);
  if (s.kind === "event") return eventCard(card);
  if (s.kind === "mission") return missionCard(card);
  if (s.kind === "match") return matchCard(card);
  if (s.kind === "skim") return skimCard(card);
  return ({ intro: introCard, listen: listenCard, read: readCard, build: buildCard, swap: buildCard, say: sayCard, shadow: shadowCard, speed: listenCard,
    dialog: dialogCard, cloze: clozeCard, hearko: hearKoCard, reply: replyCard,
    wintro: wordIntroCard, wmean: wordChoiceCard, wrecall: wordChoiceCard, wlisten: wordChoiceCard, wcloze: wordClozeCard, wspell: wordSpellCard, wsay: wordSayCard })[s.type](card);
}

// ───────────────────────── vocabulary cards ─────────────────────────
const spellable = (w) => /^[가-힣]{2,5}$/.test(w.ko);
const rate = () => state.settings.rate;
// wrong options: same topic first (fine distinctions), or other topics with the same word
// class when a sentence slot must stay unambiguous; words you've met come first
function wordDistractors(w, n = 3, { sameClass = false, crossTopic = false } = {}) {
  const ok = WORDS.filter((x) => x.id !== w.id && x.en !== w.en && x.ko !== w.ko && (!sameClass || isVerb(x) === isVerb(w)));
  const seenFirst = (a) => [...shuffle(a.filter((x) => state.items[x.id])), ...shuffle(a.filter((x) => !state.items[x.id]))];
  const other = seenFirst(ok.filter((x) => x.topic !== w.topic));
  return (crossTopic ? other : [...shuffle(ok.filter((x) => x.topic === w.topic)), ...other]).slice(0, n);
}
function exLine(w, mode) {
  const p = exParts(w);
  const mid = mode === "blank" ? h("span.blank", null, "＿＿＿") : h("mark", null, p.form);
  return h("div.ko.ex", { lang: "ko" }, p.before, mid, p.after);
}
function exBox(w, blurEn = false) {
  if (!w.ex) return null;     // your own words may have no example
  return h("div.ex-box", null,
    h("div.ex-row", null, exLine(w), h("button.icon-btn.small", { "aria-label": "Play example", onclick: () => Speech.say(exPlain(w), rate()) }, "🔊")),
    h("div.en.dim" + (blurEn ? ".blur" : ""), { onclick: (e) => e.currentTarget.classList.remove("blur") }, w.exEn));
}
function wordHead(w) { return h("div.word-big", { lang: "ko", onclick: () => Speech.say(w.ko, rate()) }, w.ko); }
function wordMic(w, fb, onGood) {
  if (state.settings.quiet || !Speech.canListen()) return null;
  const form = exParts(w).form;
  return micButton(form && form !== w.ko ? [w.ko, form] : [w.ko], (r) => {
    if (r.error) { fb.className = "feedback bad"; return (fb.textContent = micErrorText(r.error)); }
    const v = verdict(r, r.index === 1 ? form : w.ko);
    fb.className = "feedback " + v.lvl; fb.replaceChildren(...v.el);
    if (v.lvl === "ok") onGood?.(r); else Speech.say(w.ko, rate());
  }, "🎤 Say the word");
}

function wordIntroCard(card) {
  const w = card.spec.item, fb = h("div.feedback");
  card.onShow = () => state.settings.autoplay && Speech.say(w.ko, rate());
  return shell(card, "New word",
    wordHead(w), en(w.en), audioBtns(w.ko), exBox(w),
    wordMic(w, fb), fb,
    h("div.grades", null,
      h("button.btn.ghost", { onclick: () => { introduceCard(card, true); advance(); } }, "I know this"),
      h("button.btn.primary", { onclick: () => { introduceCard(card, false); advance(); } }, "Got it ↑")));
}

// wmean: Korean → meaning · wlisten: hear it → meaning · wrecall: meaning → Korean
function wordChoiceCard(card) {
  const w = card.spec.item, mode = card.spec.type, after = h("div.reveal");
  const dis = wordDistractors(w);
  const play = () => Speech.say(w.ko, rate());
  const done = (ok) => {
    after.replaceChildren(mode === "wrecall" ? null : h("div.word-mid", { lang: "ko" }, w.ko), mode === "wrecall" ? null : en(w.en, "dim"), exBox(w));
    play(); finish(card, ok ? 3 : 1);
  };
  if (mode === "wrecall") {
    return shell(card, "Which word?",
      h("div.prompt", null, "Which Korean word means…"), h("div.en-prompt.big-en", null, w.en),
      choices(card, w.ko, dis.map((x) => x.ko), done, ".ko-choice"), after);
  }
  if (mode === "wlisten") card.onShow = () => setTimeout(play, 250);
  else card.onShow = () => state.settings.autoplay && play();
  return shell(card, mode === "wlisten" ? "Hear the word" : "What does it mean?",
    mode === "wlisten" ? h("div.prompt", null, "Listen. What does this word mean?") : null,
    mode === "wlisten" ? h("button.big-play", { onclick: play, "aria-label": "Play" }, "🔊") : wordHead(w),
    choices(card, w.en, dis.map((x) => x.en), done), after);
}

// the word blanked out of its example sentence; options are other words' dictionary forms
function wordClozeCard(card) {
  const w = card.spec.item, p = exParts(w), after = h("div.reveal");
  const line = exLine(w, "blank"), blank = line.querySelector(".blank");
  return shell(card, "Which word fits?",
    h("div.prompt", null, "Pick the word that fits the gap"), line,
    h("div.en.dim.blur", { onclick: (e) => e.currentTarget.classList.remove("blur") }, w.exEn),
    choices(card, w.ko, wordDistractors(w, 3, { sameClass: true, crossTopic: true }).map((x) => x.ko), (ok) => {
      blank.textContent = p.form; blank.className = "blank " + (ok ? "hit" : "miss");
      card.el.querySelector(".blur")?.classList.remove("blur");
      after.replaceChildren(h("div.dim.small", null, w.ko, " = ", w.en));
      Speech.say(exPlain(w), rate()); finish(card, ok ? 3 : 1);
    }, ".ko-choice"), after);
}

// build the word from syllable tiles
function wordSpellCard(card) {
  const w = card.spec.item, syl = [...w.ko];
  const extra = [];
  for (const x of shuffle(WORDS)) {
    if (extra.length >= 3) break;
    const c = pick([...x.ko.replace(/\s/g, "")]);
    if (!syl.includes(c) && !extra.includes(c) && /[가-힣]/.test(c)) extra.push(c);
  }
  const answer = h("div.answer.spell"), pool = h("div.tiles"), fb = h("div.feedback");
  const check = () => {
    if (answer.children.length !== syl.length) return;
    const got = [...answer.children].map((b) => b.textContent).join(""), ok = got === w.ko;
    [...answer.children].forEach((b, i) => b.classList.toggle("wrong", b.textContent !== syl[i]));
    card.el.querySelectorAll(".tile").forEach((b) => (b.disabled = true));
    fb.className = "feedback " + (ok ? "ok" : "bad");
    fb.replaceChildren(h("div", null, ok ? "✓ 맞아요!" : "It's:"), h("div.word-mid", { lang: "ko" }, w.ko), exBox(w));
    Speech.say(w.ko, rate()); finish(card, ok ? 3 : 1);
  };
  for (const c of shuffle([...syl, ...extra])) {
    const b = h("button.tile", { onclick: () => { if (card.answered) return; (b.parentNode === pool ? answer : pool).append(b); check(); } }, c);
    pool.append(b);
  }
  return shell(card, "Spell it", h("div.prompt", null, "Build the Korean word for…"), h("div.en-prompt.big-en", null, w.en),
    h("div.hint.dim.small", null, `${syl.length} syllables`), answer, pool, fb);
}

// produce it: say the word (checked by the mic) or say it in your head and reveal
function wordSayCard(card) {
  const w = card.spec.item, out = h("div.reveal"), fb = h("div.feedback");
  const reveal = () => {
    showBtn.remove();
    out.replaceChildren(wordHead(w), exBox(w), grades(card, [1, 2, 3, 4]));
    Speech.say(w.ko, rate());
  };
  const showBtn = h("button.btn.ghost", { onclick: reveal }, state.settings.quiet ? "Say it in your head, then reveal" : "Show answer");
  const mic = wordMic(w, fb, (r) => {
    if (card.answered) return;
    showBtn.remove(); mic?.remove();
    out.replaceChildren(wordHead(w), exBox(w));
    Speech.say(w.ko, rate()); finish(card, r.score >= 0.97 ? 4 : 3);
  });
  return shell(card, "Say the word", h("div.prompt", null, "How do you say…"), h("div.en-prompt.big-en", null, w.en),
    w.exEn ? h("div.dim.small", null, "as in: “", w.exEn, "”") : null,
    mic, fb, showBtn, out);
}

// ───────────────────────── skim (easy phrases below your level) ─────────────────────────
function skimCard(card) {
  const ids = card.spec.ids, sc = SCENE[ITEMS[ids[0]].scene], marked = new Set();
  const msg = h("div.feedback");
  const rows = ids.map((id) => {
    const it = ITEMS[id], enEl = h("div.skim-en.blur", null, fill(it.en));
    const row = h("button.skim-row", { onclick: () => {
      if (card.answered) return;
      const on = !marked.has(id);
      on ? marked.add(id) : marked.delete(id);
      row.classList.toggle("new", on); enEl.classList.remove("blur");
      if (on) Speech.say(fill(it.ko), rate());
    } }, h("div.skim-ko", { lang: "ko" }, fill(it.ko)), enEl);
    return row;
  });
  card.finishSkim = () => {
    if (card.answered) return;
    card.answered = true;
    for (const id of ids) marked.has(id) ? introduce(id, false) : introduce(id, true, 12, false);
    today().cards++; state.total++; afterAnswer(sc.id); save(); hud();
    card.el.querySelectorAll(".skim-row").forEach((b) => (b.disabled = true));
    msg.className = "feedback ok";
    msg.textContent = marked.size ? `${marked.size} added to practice, ${ids.length - marked.size} marked known.` : "All known. Nice!";
  };
  return h("section.card", null, h("div.card-in", null,
    h("div.card-top", null, h("span.chip", null, sc.icon + " " + sc.ko), h("span.label", null, "Quick check")),
    h("div.card-body", null,
      h("div.prompt", null, "Know these already? Tap any that are new to you."),
      h("div.skim", null, rows), msg,
      h("button.btn.primary", { onclick: () => { card.finishSkim(); advance(); } }, "Done, I know the rest ↑")),
    h("div.swipe-hint", null, "swipe up ↑ · untapped = known")));
}

function clozeCard(card) {
  const it = card.spec.item, c = card.spec.cloze;
  const blank = h("span.blank", null, "＿＿＿");
  const line = h("div.ko.big", { lang: "ko" }, c.words.flatMap((w, i) => [i ? " " : "", i === c.i ? blank : w]), c.punct);
  const fb = h("div.reveal");
  return shell(card, LABEL.cloze,
    h("div.prompt", null, "Which form fits?"),
    h("div.en-prompt", null, fill(it.en)),
    line,
    choices(card, c.answer, c.opts, (ok) => {
      blank.textContent = c.answer; blank.className = "blank " + (ok ? "hit" : "miss");
      fb.replaceChildren(audioBtns(fill(it.ko)), patternPills(it));
      Speech.say(fill(it.ko), state.settings.rate);
      finish(card, ok ? 3 : 1);
    }, ".ko-choice"),
    fb);
}

function hearKoCard(card) {
  const it = card.spec.item, target = fill(it.ko);
  const near = SENTENCES.filter((s) => s.id !== it.id && (s.scene === it.scene || s.pats.some((p) => it.pats.includes(p))))
    .map((s) => fill(s.ko)).filter((k) => k !== target)
    .sort((a, b) => Math.abs(a.length - target.length) - Math.abs(b.length - target.length)).slice(0, 7);
  const play = () => Speech.say(target, state.settings.rate);
  const reveal = h("div.reveal");
  card.onShow = () => setTimeout(play, 250);
  return shell(card, LABEL.hearko,
    h("div.prompt", null, "Listen, then pick the Korean you heard"),
    h("div.audio-row.center", null,
      h("button.big-play", { onclick: play, "aria-label": "Play" }, "🔊"),
      h("button.icon-btn", { "aria-label": "Play slowly", onclick: () => Speech.say(target, Math.max(0.4, state.settings.rate * 0.6)) }, "🐢")),
    choices(card, target, shuffle(near).slice(0, 3), (ok) => {
      reveal.replaceChildren(en(it.en));
      finish(card, ok ? 3 : 1);
      play();
    }, ".ko-choice"),
    reveal);
}

// One exchange from a dialogue you've already played: what do you say back?
function replyCard(card) {
  const d = card.spec.item, sc = SCENE[d.scene], casual = useCasual(d.scene);
  const mine = d.turns.map((t, i) => (t.who === "me" ? i : -1)).filter((i) => i >= 0);
  const k = pick(mine), turn = d.turns[k];
  const prev = d.turns.slice(0, k).reverse().find((t) => t.who === "npc");
  const line = prev ? (casual && prev.casual ? prev.casual : prev.ko) : "";
  const fb = h("div.feedback"), chat = h("div.chat");
  chat.append(h("div.bubble.npc", null, h("span.who", null, sc.char.emoji),
    h("div", null, h("div.b-ko", { lang: "ko", onclick: () => Speech.say(fill(line), state.settings.rate) }, fill(line)),
      h("div.b-en" + (state.settings.showEn ? "" : ".blur"), { onclick: (e) => e.currentTarget.classList.remove("blur") }, fill(prev?.en || "")))));
  const right = turn.opts.find((o) => o.ok);
  const box = h("div.choices", null, shuffle(turn.opts).map((o) => h("button.choice.ko-choice", { lang: "ko", onclick: (e) => {
    if (card.answered) return;
    box.querySelectorAll("button").forEach((b) => { b.disabled = true; if (b.textContent === fill(right.ko)) b.classList.add("right"); });
    if (!o.ok) { e.currentTarget.classList.add("wrong"); fb.className = "feedback bad"; fb.replaceChildren(h("div", null, "✗ ", fill(o.en)), h("div.why", null, o.why || "")); }
    else { fb.className = "feedback ok"; fb.replaceChildren(h("div", null, "✓ ", fill(o.en))); }
    Speech.say(fill(right.ko), state.settings.rate);
    finish(card, o.ok ? 3 : 1);
  } }, fill(o.ko))));
  card.onShow = () => line && Speech.say(fill(line), state.settings.rate);
  return shell(card, LABEL.reply,
    h("div.dlg-head", null, h("span.avatar", null, sc.char.emoji), h("div", null, h("b", null, sc.char.name), h("div.dim", null, d.title))),
    chat, h("div.prompt", null, "What do you say back?"), box, fb);
}

// Bonus game: match Korean words to their meanings (not scheduled, just fast vocab reps).
function matchCard(card) {
  const pairs = card.spec.pairs;
  let sel = null, left = pairs.length, misses = 0;
  const msg = h("div.feedback");
  const tap = (btn) => {
    if (btn.disabled) return;
    if (btn.dataset.side === "ko") Speech.say(btn.textContent, state.settings.rate);
    if (!sel || sel.dataset.side === btn.dataset.side) {
      sel?.classList.remove("sel"); sel = btn; btn.classList.add("sel"); return;
    }
    if (sel.dataset.k === btn.dataset.k) {
      for (const b of [sel, btn]) { b.classList.remove("sel"); b.classList.add("matched"); b.disabled = true; }
      if (--left === 0) {
        msg.className = "feedback ok";
        msg.textContent = misses ? `All matched, with ${misses} miss${misses > 1 ? "es" : ""}.` : "✓ Perfect match!";
        card.answered = true; card.el.classList.add("done", "good");
        today().cards++; state.total++; save(); hud();
        if (state.settings.autoAdvance) setTimeout(() => card === active && advance(), 1300);
      }
    } else {
      misses++;
      for (const b of [sel, btn]) { b.classList.add("wrong"); setTimeout(() => b.classList.remove("wrong", "sel"), 450); }
    }
    sel = null;
  };
  const col = (side) => h("div.match-col", null, shuffle(pairs.map((p, k) => [p, k])).map(([p, k]) =>
    h("button.match-btn", { "data-side": side, "data-k": k, lang: side === "ko" ? "ko" : null, onclick: (e) => tap(e.currentTarget) }, side === "ko" ? p[0] : p[1])));
  return h("section.card", null, h("div.card-in", null,
    h("div.card-top", null, h("span.chip", null, "🧩 bonus"), h("span.label", null, "Match the pairs")),
    h("div.card-body", null, h("div.prompt", null, "Tap a Korean word, then its meaning"), h("div.match", null, col("ko"), col("en")), msg),
    h("div.swipe-hint", null, "swipe up ↑")));
}

function introCard(card) {
  const it = card.spec.item, sc = SCENE[it.scene];
  const fb = h("div.feedback");
  const el = shell(card, it.hear ? "New · you'll hear this" : "New phrase",
    ko(it.ko, "big"), en(it.en), audioBtns(fill(it.ko)),
    glossList(it.gl), patternPills(it),
    !it.hear && !state.settings.quiet && Speech.canListen() ? micButton(it.ko, (r) => {
      if (r.error) { fb.className = "feedback bad"; return (fb.textContent = micErrorText(r.error)); }
      const v = verdict(r, it.ko, { meh: "Close! Listen once more and try again." });
      fb.className = "feedback " + v.lvl; fb.replaceChildren(...v.el);
      if (v.lvl !== "ok") Speech.say(fill(it.ko), state.settings.rate);
    }, "🎤 Try saying it") : null,
    fb,
    h("div.grades", null,
      h("button.btn.ghost", { onclick: () => { introduceCard(card, true); advance(); } }, "I know this"),
      h("button.btn.primary", { onclick: () => { introduceCard(card, false); advance(); } }, "Got it ↑")));
  if (!state.items[it.id] && ORDER[it.scene][0] === it.id) el.querySelector(".card-body").prepend(h("div.scene-intro", null, `${sc.icon} ${sc.place}: ${sc.char.emoji} ${sc.char.name}, ${sc.char.role}`));
  card.onShow = () => state.settings.autoplay && Speech.say(fill(it.ko), state.settings.rate);
  return el;
}

function listenCard(card) {
  const it = card.spec.item, fast = card.spec.type === "speed";
  const rate = fast ? Math.min(1.6, state.settings.rate * 1.3) : state.settings.rate;
  const play = () => Speech.say(fill(it.ko), rate);
  const reveal = h("div.reveal");
  const el = shell(card, fast ? LABEL.speed : LABEL.listen,
    h("div.prompt", null, fast ? "Natural speed. What did they say?" : "What did you hear?"),
    h("button.big-play", { onclick: play, "aria-label": "Play" }, "🔊"),
    choices(card, fill(it.en), enDistractors(it), (ok) => {
      reveal.replaceChildren(ko(it.ko), audioBtns(fill(it.ko)));
      finish(card, ok ? 3 : 1);
      play();
    }),
    reveal);
  card.onShow = () => setTimeout(play, 250);
  return el;
}

function readCard(card) {
  const it = card.spec.item;
  const el = shell(card, LABEL.read,
    ko(it.ko, "big"),
    choices(card, fill(it.en), enDistractors(it), (ok) => { finish(card, ok ? 3 : 1); Speech.say(fill(it.ko), state.settings.rate); }));
  return el;
}

const PARTICLE_SWAP = [["에서", "에"], ["를", "을"], ["을", "를"], ["는", "은"], ["은", "는"], ["가", "이"], ["에", "에서"], ["랑", "이랑"]];
function buildCard(card) {
  const it = card.spec.item, swap = card.spec.type === "swap" ? sibling(it) : null;
  const text = fill(it.ko);
  const punct = (text.match(/[.!?~]+$/) || [""])[0];
  const words = text.slice(0, text.length - punct.length).split(" ");
  const extra = [];
  for (const w of shuffle(words)) {
    const sw = PARTICLE_SWAP.find(([a]) => w.endsWith(a) && w.length > a.length);
    if (sw) { const alt = w.slice(0, -sw[0].length) + sw[1]; if (!words.includes(alt)) { extra.push(alt); break; } }
  }
  const want = words.length > 4 ? 2 : 1;
  for (const s of shuffle(SENTENCES)) {
    if (extra.length >= want) break;
    const w = pick(fill(s.ko).replace(/[.!?~]+$/, "").split(" "));
    if (!words.includes(w) && !extra.includes(w)) extra.push(w);
  }
  const answer = h("div.answer"), pool = h("div.tiles"), fb = h("div.feedback");
  const check = () => {
    if (answer.children.length !== words.length) return;
    const got = [...answer.children].map((b) => b.textContent);
    const ok = got.join(" ") === words.join(" ");
    [...answer.children].forEach((b, i) => b.classList.toggle("wrong", b.textContent !== words[i]));
    pool.querySelectorAll("button").forEach((b) => (b.disabled = true));
    answer.querySelectorAll("button").forEach((b) => (b.disabled = true));
    fb.replaceChildren(ok ? h("div", null, "✓ 맞아요!") : h("div", null, "Correct order:"), ko(it.ko), audioBtns(text));
    fb.className = "feedback " + (ok ? "ok" : "bad");
    Speech.say(text, state.settings.rate);
    finish(card, ok ? 3 : 1);
  };
  for (const w of shuffle([...words, ...extra])) {
    const b = h("button.tile", { onclick: () => {
      if (card.answered) return;
      (b.parentNode === pool ? answer : pool).append(b);
      check();
    } }, w);
    pool.append(b);
  }
  const head = swap
    ? h("div.swap-box", null, h("div.swap-pat", null, swap.pat.ko, " · ", swap.pat.en), ko(swap.sib.ko), en(swap.sib.en, "dim"), h("div.swap-arrow", null, "now say:"))
    : null;
  return shell(card, swap ? LABEL.swap : LABEL.build, head, h("div.prompt.en-prompt", null, fill(it.en)), answer, pool, fb);
}

function sayCard(card) {
  const it = card.spec.item;
  const out = h("div.reveal"), fb = h("div.feedback");
  const reveal = (sel = [1, 2, 3, 4]) => {
    out.replaceChildren(ko(it.ko, "big"), audioBtns(fill(it.ko)), glossList(it.gl), grades(card, sel));
    Speech.say(fill(it.ko), state.settings.rate);
    showBtn.remove();
  };
  const showBtn = h("button.btn.ghost", { onclick: () => reveal() }, state.settings.quiet ? "Say it in your head, then reveal" : "Show answer");
  const mic = !state.settings.quiet && Speech.canListen() ? micButton(it.ko, (r) => {
    if (card.answered) return;
    if (r.error) { fb.className = "feedback bad"; return (fb.textContent = micErrorText(r.error)); }
    const v = verdict(r, it.ko, { bad: "✗ Not quite. Try again, or show the answer." });
    fb.className = "feedback " + v.lvl; fb.replaceChildren(...v.el);
    if (v.lvl === "ok") {
      out.replaceChildren(audioBtns(fill(it.ko))); showBtn.remove(); mic.remove();
      Speech.say(fill(it.ko), state.settings.rate);
      finish(card, r.score >= 0.97 ? 4 : 3);
    } else if (v.lvl === "meh") reveal([1, 2, 3]);
  }) : null;
  return shell(card, LABEL.say,
    h("div.prompt", null, "How do you say…"),
    h("div.en-prompt.big-en", null, fill(it.en)),
    patternPills(it), mic, fb, showBtn, out);
}

function shadowCard(card) {
  const it = card.spec.item, text = fill(it.ko);
  let mine = null;
  const ctl = h("div.shadow-ctl"), out = h("div.reveal");
  const recBtn = h("button.btn.mic", {
    onclick: async () => {
      if (recBtn.classList.contains("on")) return Speech.stopRecording();
      Speech.stop();
      recBtn.classList.add("on"); recBtn.textContent = "● Recording… (tap to stop)";
      const r = await Speech.record(2500 + text.length * 350);
      recBtn.classList.remove("on"); recBtn.textContent = "⏺ Record again";
      if (r.error) { out.textContent = r.error === "denied" ? "Microphone blocked. Allow it in site settings." : "Recording isn't supported here."; return; }
      mine = r.url;
      ctl.replaceChildren(
        h("button.btn", { onclick: () => Speech.say(text, state.settings.rate) }, "▶ Native"),
        h("button.btn", { onclick: () => Speech.play(mine) }, "▶ You"),
        h("button.btn", { onclick: async () => { await Speech.say(text, state.settings.rate); await Speech.play(mine); } }, "🔁 Both"));
      if (!card.answered) out.replaceChildren(h("div.prompt", null, "Did yours match the rhythm and sounds?"), grades(card, [1, 3]));
      await Speech.say(text, state.settings.rate); await Speech.play(mine);
    },
  }, "⏺ Record yourself");
  card.onShow = () => state.settings.autoplay && Speech.say(text, state.settings.rate);
  return shell(card, LABEL.shadow,
    h("div.prompt", null, "Listen, then say it exactly like them"),
    ko(it.ko, "big"), en(it.en, "dim"), audioBtns(text), recBtn, ctl, out);
}

function dialogCard(card) {
  const d = card.spec.item, sc = SCENE[d.scene], casual = useCasual(d.scene);
  const chat = h("div.chat"), opts = h("div.choices"), fb = h("div.feedback");
  let i = 0, mistakes = 0, started = false;
  const bubble = (who, ko, enText) => {
    const enEl = h("div.b-en" + (state.settings.showEn ? "" : ".blur"), { onclick: (e) => e.currentTarget.classList.remove("blur") }, fill(enText));
    const b = h("div.bubble." + who, null, who === "npc" ? h("span.who", null, sc.char.emoji) : null,
      h("div", null, h("div.b-ko", { lang: "ko", onclick: () => Speech.say(fill(ko), state.settings.rate) }, fill(ko)), enEl));
    chat.append(b);
    chat.scrollTop = chat.scrollHeight;
  };
  async function step() {
    while (i < d.turns.length && d.turns[i].who === "npc") {
      const t = d.turns[i++];
      const line = casual && t.casual ? t.casual : t.ko;
      bubble("npc", line, t.en);
      if (card !== active) return;
      await Speech.say(fill(line), state.settings.rate);
    }
    if (i >= d.turns.length) return done();
    const t = d.turns[i];
    opts.replaceChildren(...shuffle(t.opts).map((o) => h("button.choice.ko-choice", { lang: "ko", onclick: (e) => choose(o, e.currentTarget) }, fill(o.ko))));
    if (!state.settings.quiet && Speech.canListen()) opts.append(micButton(t.opts.map((o) => o.ko), (r) => {
      if (r.error) { fb.className = "feedback bad"; return (fb.textContent = micErrorText(r.error)); }
      if (r.score < 0.55) { fb.className = "feedback bad"; fb.textContent = `✗ Heard “${r.text}”, which doesn't match any reply. Try again or tap one.`; return; }
      const o = t.opts[r.index];
      choose(o, [...opts.querySelectorAll(".choice")].find((b) => b.textContent === fill(o.ko)));
      if (o.ok) { fb.className = "feedback ok"; fb.textContent = `🎤 ✓ Understood: “${r.text}” (${Math.round(r.score * 100)}%)`; }
    }, "🎤 Say your reply"));
    function choose(o, btn) {
      if (o.ok) {
        fb.replaceChildren(); fb.className = "feedback";
        opts.replaceChildren();
        bubble("me", o.ko, o.en);
        i++;
        Speech.say(fill(o.ko), state.settings.rate).then(() => setTimeout(step, 250));
      } else {
        mistakes++;
        btn.classList.add("wrong"); btn.disabled = true;
        fb.className = "feedback bad";
        fb.replaceChildren(h("div", null, "✗ ", fill(o.en)), h("div.why", null, o.why || ""));
      }
    }
  }
  function done() {
    opts.replaceChildren(h("div.feedback." + (mistakes ? "meh" : "ok"), null, mistakes ? `Done, with ${mistakes} slip${mistakes > 1 ? "s" : ""}. It'll come back soon.` : "✓ Smooth conversation!"));
    if (!state.items[d.id]) { introduce(d.id, false); if (!mistakes) grade(d.id, 3); today().cards++; state.total++; card.answered = true; afterAnswer(d.scene); save(); hud(); }
    else finish(card, mistakes ? 1 : 3, { silent: true });
  }
  card.onShow = () => { if (!started) { started = true; step(); } };
  const head = h("div.dlg-head", null, h("span.avatar", null, sc.char.emoji), h("div", null, h("b", null, sc.char.name), h("div.dim", null, d.title)),
    casual ? h("span.tag", null, "반말 ♥") : null);
  return shell(card, LABEL.dialog, head, chat, opts, fb);
}

function cultureCard(card) {
  const c = card.spec.c, sc = SCENE[c.scene];
  card.onShow = () => { state.culture[c.id] = Date.now(); save(); };
  return h("section.card.culture", null, h("div.card-in", null,
    h("div.card-top", null, h("span.chip", null, sc.icon + " " + sc.ko), h("span.label", null, "눈치 · culture")),
    h("div.card-body", null, h("div.big-icon", null, "💡"), h("h2", null, c.title), h("p.culture-body", null, c.body)),
    h("div.swipe-hint", null, "swipe up ↑")));
}
function eventCard(card) {
  const e = card.spec;
  return h("section.card.event", null, h("div.card-in", null,
    h("div.card-body", null, h("div.big-icon.pop", null, e.icon), h("h2", null, e.title), h("p", null, e.text),
      e.action ? h("button.btn.primary", { onclick: (ev) => { ev.currentTarget.disabled = true; e.action.fn(); advance(); } }, e.action.label) : null),
    h("div.swipe-hint", null, "swipe up ↑")));
}

// ───────────────────────── HUD ─────────────────────────
function hud() {
  const t = today(), g = state.settings.goal, p = Math.min(1, t.cards / g);
  $("#ring-fg").style.strokeDashoffset = String(100 - p * 100);
  $("#ring-n").textContent = t.cards;
  $("#ring").classList.toggle("full", p >= 1);
  $("#streak").textContent = "🔥 " + streak();
  $("#quiet").textContent = state.settings.quiet ? "🤫" : "🎤";
  $("#quiet").title = state.settings.quiet ? "Quiet mode: no speaking cards" : "Speaking on";
  const f = state.focus, fc = $("#focus");
  fc.classList.toggle("mode", !!session);
  fc.textContent = session ? `🔁 ${session.title} · ${sessionLeft()} left ✕`
    : f ? (f.type === "scene" ? SCENE[f.id].icon + " " + SCENE[f.id].en : f.type === "topic" ? TOPIC[f.id].icon + " " + TOPIC[f.id].en : "📐 " + PAT[f.id].ko) : "🏘️ " + LEVELS[state.settings.level || 2];
}
$("#quiet").onclick = () => {
  state.settings.quiet = !state.settings.quiet; save(); hud(); refreshAhead();
  toast(state.settings.quiet ? "Quiet mode: no speaking cards (good for the bus)" : "Speaking cards are back");
};
$("#focus").onclick = () => { if (session) { endSession("Review stopped. Back to your normal mix."); refreshAhead(); } else showView("map"); };
$("#gear").onclick = () => showView(view === "settings" ? "feed" : "settings");
function toast(msg, ms = 2200) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), ms);
}

// time spent practicing (only while the feed is on screen)
setInterval(() => { if (document.visibilityState === "visible" && view === "feed" && started) { today().secs += 5; save(); } }, 5000);

// ───────────────────────── views ─────────────────────────
let view = "feed";
function showView(v) {
  view = v;
  document.querySelectorAll(".view").forEach((el) => el.classList.toggle("on", el.id === "view-" + v));
  document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("on", b.dataset.v === v));
  $("#gear").classList.toggle("on", v === "settings");
  if (v !== "feed") { Speech.stop(); Speech.stopListening(); }
  ({ map: renderMap, grammar: renderGrammar, words: renderWords, review: renderReview, progress: renderProgress, settings: renderSettings })[v]?.();
  $("#view-" + v).scrollTop = 0;
}
document.querySelectorAll("nav button").forEach((b) => (b.onclick = () => showView(b.dataset.v)));

function setFocus(f) {
  state.focus = f; save(); hud(); refreshAhead();
  toast(f ? "New phrases will come from there first" : "Following the normal path");
}

function renderMap() {
  const knownN = Object.keys(state.items).filter(known).length;
  const patsKnown = PATTERNS.filter((p) => (BY_PAT[p.id] || []).filter(known).length >= 3).length;
  const el = $("#view-map");
  el.replaceChildren(
    h("h1", null, "우리 동네 ", h("span.dim", null, "your neighborhood")),
    h("div.stats", null,
      stat("💬", knownN - wordsKnown(), "phrases known"),
      stat("📚", wordsKnown(), "words known"),
      stat("📐", patsKnown, "patterns")),
    h("button.focus-all" + (state.focus ? "" : ".on"), { onclick: () => { setFocus(null); renderMap(); } }, `🏘️ Normal mix (${LEVELS[state.settings.level || 2]})`, state.focus ? "" : " ✓"),
    h("h3", null, "단어 ", h("span.dim", null, "vocabulary")),
    h("div.topics", null, TOPICS.filter((t) => BY_TOPIC[t.id].length).map((t) => {
      const ids = BY_TOPIC[t.id], seen = ids.filter((i) => state.items[i]).length;
      const m = ids.reduce((a, i) => a + weight(i), 0) / ids.length;
      const focused = state.focus?.type === "topic" && state.focus.id === t.id;
      return h("div.topic" + (focused ? ".focused" : ""), { onclick: () => topicSheet(t) },
        h("div.topic-name", null, t.icon, " ", h("b", { lang: "ko" }, t.ko), " ", h("span.dim", null, t.en)),
        h("div.bar", null, h("div.bar-seen", { style: `width:${(seen / ids.length) * 100}%` }), h("div.bar-known", { style: `width:${m * 100}%` })),
        h("div.topic-foot", null, h("span.dim.small", null, `${seen}/${ids.length}`),
          h("button.focus-btn.small" + (focused ? ".on" : ""), { onclick: (e) => { e.stopPropagation(); setFocus(focused ? null : { type: "topic", id: t.id }); renderMap(); } }, focused ? "Focused" : "Focus")));
    })),
    h("h3", null, "장면 ", h("span.dim", null, "scenes")),
    h("div.scenes", null, SCENES.map((sc) => {
      const st = sceneStats(sc.id), lvl = friendLevel(sc.id);
      const focused = state.focus?.type === "scene" && state.focus.id === sc.id;
      return h("div.scene" + (st.seen ? "" : ".locked") + (focused ? ".focused" : ""), { onclick: () => sceneSheet(sc) },
        h("div.scene-icon", null, sc.icon),
        h("div.scene-main", null,
          h("div.scene-name", null, h("b", { lang: "ko" }, sc.ko), " ", h("span.dim", null, sc.en), state.handled[sc.id] ? h("span.badge", null, "✓ can handle") : null),
          h("div.scene-char", null, sc.char.emoji, " ", sc.char.name, " ", h("span.hearts", null, "♥".repeat(lvl) + "♡".repeat(5 - lvl))),
          h("div.bar", null, h("div.bar-seen", { style: `width:${(st.seen / st.total) * 100}%` }), h("div.bar-known", { style: `width:${st.mastery * 100}%` }))),
        h("button.focus-btn" + (focused ? ".on" : ""), { onclick: (e) => { e.stopPropagation(); setFocus(focused ? null : { type: "scene", id: sc.id }); renderMap(); } }, focused ? "Focused" : "Focus"));
    })));
}
function stat(icon, n, label) { return h("div.stat", null, h("div.stat-n", null, icon, " ", n), h("div.stat-l", null, label)); }

function sheet(...kids) {
  const bg = h("div.sheet-bg", { onclick: (e) => e.target === bg && bg.remove() },
    h("div.sheet", null, h("button.sheet-x", { onclick: () => bg.remove(), "aria-label": "Close" }, "✕"), ...kids));
  document.body.append(bg);
}
function sceneSheet(sc) {
  const st = sceneStats(sc.id);
  sheet(
    h("h2", null, sc.icon, " ", h("span", { lang: "ko" }, sc.ko), " · ", sc.en),
    h("p.dim", null, sc.place, ": ", sc.char.emoji, " ", sc.char.name, ", ", sc.char.role),
    h("p", null, h("b", null, "Goal: "), sc.can, "."),
    h("p.dim", null, `${st.seen}/${st.total} met · ${st.known} known`),
    h("div.phrases", null, ORDER[sc.id].map((id) => {
      const it = ITEMS[id], r = state.items[id];
      const dot = h("span.dot" + (!r ? "" : known(id) ? (r.s >= 7 ? ".mature" : ".known") : ".learning"));
      if (it.kind === "d") return h("div.phrase.dlg", null, dot, "💬 ", it.title);
      return h("div.phrase", { onclick: () => Speech.say(fill(it.ko), state.settings.rate) }, dot, h("span.p-ko", { lang: "ko" }, fill(it.ko)), h("span.p-en", null, fill(it.en)));
    })));
}

function topicSheet(t) {
  sheet(
    h("h2", null, t.icon, " ", h("span", { lang: "ko" }, t.ko), " · ", t.en),
    h("p.dim", null, `${BY_TOPIC[t.id].filter((i) => state.items[i]).length}/${BY_TOPIC[t.id].length} met · ${BY_TOPIC[t.id].filter(known).length} known`),
    h("div.phrases", null, BY_TOPIC[t.id].map((id) => {
      const w = ITEMS[id], r = state.items[id];
      return h("div.phrase", { onclick: () => Speech.say(w.ko, rate()) },
        h("span.dot" + (!r ? "" : known(id) ? (r.s >= 7 ? ".mature" : ".known") : ".learning")),
        h("span.p-ko", { lang: "ko" }, w.ko), h("span.p-en", null, w.en));
    })));
}

function renderGrammar() {
  const el = $("#view-grammar");
  const lvls = { 1: "Level 1 · the skeleton", 2: "Level 2 · tenses, wants & requests", 3: "Level 3 · sounding natural", 4: "Level 4 · intermediate" };
  el.replaceChildren(h("h1", null, "문법 ", h("span.dim", null, "patterns")),
    h("p.dim", null, "Every pattern is taught inside real phrases. Tap one to see it in action, or focus it to get its phrases first."),
    ...(state.settings.level >= 3 ? [4, 3, 2, 1] : [1, 2, 3, 4]).map((l) => h("section", null, h("h3", null, lvls[l]),
      PATTERNS.filter((p) => p.lvl === l).map((p) => {
        const ids = BY_PAT[p.id] || [], k = ids.filter(known).length;
        const focused = state.focus?.type === "pattern" && state.focus.id === p.id;
        const det = h("details.pat", null,
          h("summary", null, h("b", { lang: "ko" }, p.ko), h("span.dim", null, " ", p.en), h("span.pat-count", null, `${k}/${ids.length}`)),
          ...patExplain(p).slice(1),
          h("div.phrases", null, ids.slice(0, 6).map((id) => h("div.phrase", { onclick: () => Speech.say(fill(ITEMS[id].ko), state.settings.rate) },
            h("span.dot" + (known(id) ? ".known" : state.items[id] ? ".learning" : "")), h("span.p-ko", { lang: "ko" }, fill(ITEMS[id].ko)), h("span.p-en", null, fill(ITEMS[id].en))))),
          ids.length ? h("button.focus-btn" + (focused ? ".on" : ""), { onclick: () => { setFocus(focused ? null : { type: "pattern", id: p.id }); renderGrammar(); } }, focused ? "Focused ✓" : "Focus this pattern") : null);
        return det;
      }))));
}

// ───────────────────────── 단어장 · My words ─────────────────────────
let wordsUI = { q: "", filter: "all", limit: 120, open: null };
function nextLabel(r) {
  if (!r) return "not met";
  const d = (r.due - Date.now()) / DAY;
  return d <= 0 ? "due" : d < 1 / 24 ? Math.max(1, Math.round(d * 1440)) + "m" : d < 1 ? Math.round(d * 24) + "h" : Math.round(d) + "d";
}
function renderWords() {
  const el = $("#view-words"), u = wordsUI;
  const all = Object.values(ITEMS);
  const pool = {
    all: all.filter((it) => state.items[it.id] || it.custom),
    learning: all.filter((it) => state.items[it.id] && !known(it.id)),
    known: all.filter((it) => known(it.id)),
    mine: all.filter((it) => it.custom),
    unmet: all.filter((it) => !state.items[it.id] && !it.custom),
  }[u.filter];
  const label = (it) => it.kind === "d" ? "💬 " + it.title : fill(it.ko);
  const search = h("input.search", { type: "search", placeholder: "Search Korean or English", value: u.q, oninput: (e) => { u.q = e.target.value; u.limit = 120; renderList(); } });
  const chips = h("div.filter-chips", null, [["all", "All met"], ["learning", "Learning"], ["known", "Known"], ["mine", "⭐ Mine"], ["unmet", "Not met yet"]].map(([k, t]) =>
    h("button.fchip" + (u.filter === k ? ".on" : ""), { onclick: () => { u.filter = k; u.limit = 120; renderWords(); } }, t)));
  const list = h("div.wlist");
  function renderList() {
    const qq = u.q.trim().toLowerCase();
    const rows = pool.filter((it) => !qq || label(it).toLowerCase().includes(qq) || fill(it.en || "").toLowerCase().includes(qq))
      .sort((a, b) => (state.items[b.id]?.last || (b.custom ? Infinity : 0)) - (state.items[a.id]?.last || (a.custom ? Infinity : 0)));
    list.replaceChildren(
      h("div.dim.small", null, `${rows.length} ${rows.length === 1 ? "item" : "items"}`),
      ...rows.slice(0, u.limit).map(wordRow),
      rows.length > u.limit ? h("button.btn.wide", { onclick: () => { u.limit += 200; renderList(); } }, `Show more (${rows.length - u.limit})`) : null,
      !rows.length ? h("p.dim", null, u.filter === "mine" ? "No words of your own yet. Tap ＋ Add a word for anything you hear and want to keep." : "Nothing here yet.") : null);
  }
  el.replaceChildren(
    h("h1", null, "단어장 ", h("span.dim", null, "my words")),
    h("div.words-top", null, search, h("button.btn.primary", { onclick: () => wordForm() }, "＋ Add a word")),
    chips, list);
  renderList();
}
function wordRow(it) {
  const r = state.items[it.id], open = wordsUI.open === it.id;
  const dot = h("span.dot" + (!r ? "" : known(it.id) ? (r.s >= 7 ? ".mature" : ".known") : ".learning"));
  const say = () => Speech.say(it.kind === "w" ? it.ko : fill(it.ko || ""), rate());
  const row = h("div.wrow" + (open ? ".open" : ""), null,
    h("button.wrow-main", { onclick: () => { wordsUI.open = open ? null : it.id; if (!open && it.kind !== "d") say(); row.replaceWith(wordRow(it)); } },
      dot,
      h("span.wrow-ko", { lang: "ko" }, it.kind === "d" ? "💬 " + it.title : fill(it.ko)),
      h("span.wrow-next.dim.small", null, (it.custom ? "⭐ " : "") + nextLabel(r)),
      h("span.wrow-en.dim", null, it.kind === "d" ? SCENE[it.scene].en + " dialogue" : fill(it.en))));
  if (open) {
    const det = h("div.wrow-detail");
    if (it.kind === "w") { if (it.ex) det.append(exBox(it)); }
    else if (it.kind === "s") det.append(glossList(it.gl) || "", patternPills(it) || "");
    if (it.kind !== "d") det.append(h("div.btn-row", null, h("button.btn.small", { onclick: say }, "🔊 Play"),
      it.custom ? h("button.btn.small", { onclick: () => wordForm(it) }, "✏️ Edit") : null,
      it.custom ? h("button.btn.small.danger", { onclick: () => deleteCustom(it) }, "🗑 Delete") : null));
    if (r) det.append(h("div.dim.small", null, `Practiced ${r.reps}× · missed ${r.wrong || 0}× · next: ${nextLabel(r)}`));
    row.append(det);
  }
  return row;
}

// your own words: stored in state.custom, studied like the built-in vocabulary
const MINE = { id: "mine", ko: "내 단어", en: "My words", icon: "⭐" };
TOPICS.push(MINE); TOPIC.mine = MINE; BY_TOPIC.mine = [];
function autoBracket(ko, ex) {
  if (!ex || /\[.+?\]/.test(ex)) return ex || "";
  const stem = ko.replace(/\s/g, "").replace(/다$/, "").slice(0, Math.max(1, ko.replace(/다$/, "").length - 1));
  if (!/다$/.test(ko) && ex.includes(ko)) return ex.replace(ko, "[" + ko + "]");    // a noun: just the word, not its particle
  const toks = ex.split(" ");
  const i = toks.findIndex((t) => t.includes(ko) || (stem && t.includes(stem)));
  if (i < 0) return ex;
  const m = toks[i].match(/^(.*?)([.,!?~…]*)$/);
  toks[i] = "[" + m[1] + "]" + m[2];
  return toks.join(" ");
}
function registerCustom(c) {
  const w = ITEMS[c.id] || { id: c.id, kind: "w", topic: "mine", custom: true };
  Object.assign(w, { ko: c.ko, en: c.en, ex: autoBracket(c.ko, c.ex), exEn: c.exEn || "" });
  if (!ITEMS[c.id]) { ITEMS[c.id] = w; WORDS.push(w); BY_TOPIC.mine.push(c.id); }
  return w;
}
function wordForm(edit) {
  const c = edit ? state.custom.find((x) => x.id === edit.id) : null;
  const f = (ph, val, lang) => h("input.name-in", { placeholder: ph, value: val || "", lang: lang || null });
  const koIn = f("Korean, e.g. 눈치", c?.ko, "ko"), enIn = f("Meaning, e.g. reading the room", c?.en);
  const exIn = f("Example sentence (optional)", c?.ex, "ko"), exEnIn = f("Example in English (optional)", c?.exEn);
  const err = h("div.warn.small");
  sheet(h("h2", null, edit ? "Edit word" : "＋ Add a word"),
    h("p.dim.small", null, "Heard something you want to keep? It joins your feed with the same exercises as the built-in words."),
    h("div.form", null, koIn, enIn, exIn, exEnIn,
      h("p.dim.small", null, "Tip: put the word in [brackets] inside the example to get fill-in-the-gap practice too. Otherwise Dongne tries to find it."),
      err,
      h("button.btn.primary.wide", { onclick: (e) => {
        const ko = koIn.value.trim(), en = enIn.value.trim();
        if (!ko || !en) return (err.textContent = "Korean and meaning are both needed.");
        const data = { ko, en, ex: exIn.value.trim(), exEn: exEnIn.value.trim() };
        if (c) Object.assign(c, data); else state.custom.push({ id: "c:" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), added: Date.now(), ...data });
        registerCustom(c || state.custom[state.custom.length - 1]);
        save(); e.currentTarget.closest(".sheet-bg").remove();
        toast(c ? "Saved" : `Added “${ko}”. It'll show up in your feed soon.`);
        if (!c) { wordsUI.filter = "mine"; if (started) refreshAhead(); }
        renderWords();
      } }, edit ? "Save" : "Add to my words")));
  setTimeout(() => koIn.focus(), 50);
}
function deleteCustom(it) {
  if (!confirm(`Delete “${it.ko}” and its progress?`)) return;
  state.custom = state.custom.filter((x) => x.id !== it.id);
  delete state.items[it.id]; delete ITEMS[it.id];
  WORDS.splice(WORDS.indexOf(it), 1); BY_TOPIC.mine.splice(BY_TOPIC.mine.indexOf(it.id), 1);
  save(); wordsUI.open = null; if (started) refreshAhead(); renderWords();
}
for (const c of state.custom || []) registerCustom(c);

// ───────────────────────── 기록 · Progress ─────────────────────────
const SVGNS = "http://www.w3.org/2000/svg";
function s(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  for (const k of kids.flat()) if (k != null) el.append(k.nodeType ? k : document.createTextNode(String(k)));
  return el;
}
// a bar with 4px rounded top corners, square on the baseline
function barPath(x, y, w, hgt, r = 4) {
  if (hgt <= 0) return "";
  r = Math.min(r, w / 2, hgt);
  return `M${x},${y + hgt}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + hgt}Z`;
}
const dayKey = (offset) => ymd(Date.now() + offset * DAY);
const shortDate = (k) => new Date(k + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
const weekday = (k) => new Date(k + "T12:00").toLocaleDateString(undefined, { weekday: "short" });
function bestStreak() {
  const goal = state.settings.goal, keys = Object.keys(state.days).filter((k) => state.days[k].cards >= goal).sort();
  let best = 0, run = 0, prev = null;
  for (const k of keys) { run = prev && (new Date(k + "T12:00") - new Date(prev + "T12:00")) / DAY === 1 ? run + 1 : 1; best = Math.max(best, run); prev = k; }
  return best;
}
// one readout line under a chart; hover or tap a mark to fill it
function readout(def) { const el = h("div.readout", null, def); el.def = def; return el; }
function hoverMark(mark, out, text) {
  const show = () => { out.textContent = text; mark.classList.add("hot"); };
  const hide = () => { out.textContent = out.def; mark.classList.remove("hot"); };
  mark.addEventListener("pointerenter", show); mark.addEventListener("pointerleave", hide); mark.addEventListener("click", show);
}

function heatmap() {
  const goal = state.settings.goal, weeks = 12;
  const start = new Date(); start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (weeks - 1) * 7);      // Monday, 11 weeks back
  const cell = 14, gap = 3, W = weeks * (cell + gap), H = 7 * (cell + gap);
  const out = readout("Tap a day to see it");
  const svg = s("svg", { viewBox: `0 0 ${W + 18} ${H}`, class: "heat", role: "img", "aria-label": "Practice calendar, last 12 weeks" });
  ["M", "", "W", "", "F", "", ""].forEach((t, i) => t && svg.append(s("text", { x: 0, y: i * (cell + gap) + cell - 3, class: "ax" }, t)));
  for (let w = 0; w < weeks; w++) for (let d = 0; d < 7; d++) {
    const dt = new Date(start); dt.setDate(start.getDate() + w * 7 + d);
    if (dt > new Date()) continue;
    const k = ymd(dt.getTime()), day = state.days[k], n = day?.cards || 0;
    const lvl = !n ? 0 : n < goal * 0.25 ? 1 : n < goal * 0.5 ? 2 : n < goal ? 3 : 4;
    const r = s("rect", { x: 18 + w * (cell + gap), y: d * (cell + gap), width: cell, height: cell, rx: 3, class: "hc l" + lvl });
    hoverMark(r, out, `${shortDate(k)}: ${n} cards${day?.secs ? ` · ${Math.round(day.secs / 60)} min` : ""}${n >= goal ? " · goal met 🔥" : ""}`);
    svg.append(r);
  }
  const legend = h("div.heat-legend.dim.small", null, "Less ", [0, 1, 2, 3, 4].map((l) => h("span.hc-key.l" + l)), " More (goal = ", goal, " cards)");
  return [svg, legend, out];
}

function knownChart() {
  const keys = Object.keys(state.days).filter((k) => state.days[k].knownW != null).sort();
  if (keys.length < 2) return [h("p.dim.small", null, "This chart fills in as you practice: one point per day.")];
  const pts = keys.map((k) => ({ k, w: state.days[k].knownW, p: state.days[k].knownP }));
  const W = 320, H = 150, L = 30, R = 64, T = 10, B = 22;
  const max = Math.max(5, ...pts.map((d) => Math.max(d.w, d.p)));
  const raw = max / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), nr = raw / mag;
  const step = Math.max(1, (nr <= 1 ? 1 : nr <= 2 ? 2 : nr <= 5 ? 5 : 10) * mag);     // 3–5 gridlines
  const top = Math.ceil(max / step) * step;
  const x = (i) => L + (i / (pts.length - 1)) * (W - L - R), y = (v) => T + (1 - v / top) * (H - T - B);
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "linechart", role: "img", "aria-label": "Words and phrases known over time" });
  for (let v = 0; v <= top; v += step) svg.append(s("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), class: v ? "grid" : "base" }), s("text", { x: L - 6, y: y(v) + 4, class: "ax", "text-anchor": "end" }, v));
  svg.append(s("text", { x: L, y: H - 6, class: "ax" }, shortDate(pts[0].k)), s("text", { x: W - R, y: H - 6, class: "ax", "text-anchor": "end" }, shortDate(pts[pts.length - 1].k)));
  const series = [["w", "Words", "c1"], ["p", "Phrases", "c2"]];
  const last = pts[pts.length - 1];
  // direct labels at the line ends, nudged apart if they'd collide
  let ly = { w: y(last.w), p: y(last.p) };
  if (Math.abs(ly.w - ly.p) < 14) { const mid = (ly.w + ly.p) / 2, up = ly.w < ly.p ? "w" : "p"; ly[up] = mid - 7; ly[up === "w" ? "p" : "w"] = mid + 7; }
  for (const [key, name, cls] of series) {
    svg.append(s("polyline", { points: pts.map((d, i) => `${x(i)},${y(d[key])}`).join(" "), class: "ln " + cls }));
    svg.append(s("circle", { cx: x(pts.length - 1), cy: y(last[key]), r: 4, class: "dot-end " + cls }));
    svg.append(s("text", { x: W - R + 8, y: ly[key] + 4, class: "lbl" }, `${name} ${last[key]}`));
  }
  // crosshair + readout
  const out = readout(`Today: ${last.w} words · ${last.p} phrases known`);
  const cross = s("line", { y1: T, y2: H - B, class: "cross", visibility: "hidden" });
  const hits = s("rect", { x: L, y: T, width: W - L - R, height: H - T - B, fill: "transparent" });
  const move = (e) => {
    const r = svg.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(pts.length - 1, Math.round(((px - L) / (W - L - R)) * (pts.length - 1))));
    cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.setAttribute("visibility", "visible");
    out.textContent = `${shortDate(pts[i].k)}: ${pts[i].w} words · ${pts[i].p} phrases known`;
  };
  hits.addEventListener("pointermove", move); hits.addEventListener("pointerdown", move);
  hits.addEventListener("pointerleave", () => { cross.setAttribute("visibility", "hidden"); out.textContent = out.def; });
  svg.append(cross, hits);
  const legend = h("div.chart-legend.small", null, series.map(([, name, cls]) => h("span", null, h("i.key." + cls), name)));
  const table = h("details.chart-table.small", null, h("summary", null, "Show as table"),
    h("table", null, h("tr", null, h("th", null, "Day"), h("th", null, "Words"), h("th", null, "Phrases")),
      pts.slice(-14).reverse().map((d) => h("tr", null, h("td", null, shortDate(d.k)), h("td", null, d.w), h("td", null, d.p)))));
  return [legend, svg, out, table];
}

// simple single-series bar chart: [{label, value, note}]
function bars(data, unit, aria) {
  const W = 320, H = 120, T = 16, B = 20, n = data.length, slot = W / n, bw = Math.min(28, slot * 0.55);
  const max = Math.max(1, ...data.map((d) => d.value));
  const out = readout("Tap a bar for details");
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "barchart", role: "img", "aria-label": aria });
  svg.append(s("line", { x1: 0, x2: W, y1: H - B, y2: H - B, class: "base" }));
  const peak = data.reduce((a, d, i) => (d.value > data[a].value ? i : a), 0);
  data.forEach((d, i) => {
    const hgt = (d.value / max) * (H - T - B), x = i * slot + (slot - bw) / 2;
    const g = s("g", { class: "bar-g" });
    g.append(s("rect", { x: i * slot, y: 0, width: slot, height: H, fill: "transparent" }));     // big hit target
    g.append(s("path", { d: barPath(x, H - B - hgt, bw, hgt), class: "bar c1" }));
    if (i === peak && d.value) g.append(s("text", { x: x + bw / 2, y: H - B - hgt - 4, class: "lbl", "text-anchor": "middle" }, d.value));
    g.append(s("text", { x: x + bw / 2, y: H - 5, class: "ax", "text-anchor": "middle" }, d.label));
    hoverMark(g, out, d.note || `${d.label}: ${d.value} ${unit}`);
    svg.append(g);
  });
  return [svg, out];
}

function masteryList(rows, onFocus) {
  if (!rows.length) return h("p.dim.small", null, "Shows up once you've met a few items in each.");
  return h("div.mastery", null, rows.map((r) => h("div.m-row", null,
    h("div.m-name", null, r.name), h("div.m-bar", null, h("div.m-fill", { style: `width:${Math.round(r.m * 100)}%` })),
    h("span.m-pct.small", null, Math.round(r.m * 100) + "%"),
    h("button.focus-btn.small", { onclick: () => onFocus(r) }, "Practice"))));
}

// drill the items you've met in a pattern or topic, weakest first
const drillGroup = (r) => startSession("weak", r.name, r.ids.filter((i) => state.items[i]).sort((a, b) => weight(a) - weight(b)).slice(0, 20));
function renderProgress() {
  const el = $("#view-progress"), goal = state.settings.goal;
  const last7 = [...Array(7)].map((_, i) => dayKey(i - 6));
  const wk = last7.map((k) => state.days[k] || {});
  const cards7 = wk.reduce((a, d) => a + (d.cards || 0), 0), right7 = wk.reduce((a, d) => a + (d.right || 0), 0);
  const mins7 = Math.round(wk.reduce((a, d) => a + (d.secs || 0), 0) / 60);
  const total = Object.values(state.days).reduce((a, d) => a + (d.cards || 0), 0);
  // weakest patterns / topics: average mastery over the items you've met (at least 3)
  const avg = (ids) => { const met = ids.filter((i) => state.items[i]); return met.length >= 3 ? met.reduce((a, i) => a + weight(i), 0) / met.length : null; };
  const weakPats = PATTERNS.map((p) => ({ ids: BY_PAT[p.id] || [], name: p.ko, m: avg(BY_PAT[p.id] || []) })).filter((r) => r.m != null).sort((a, b) => a.m - b.m).slice(0, 5);
  const weakTopics = TOPICS.map((t) => ({ ids: BY_TOPIC[t.id] || [], name: t.icon + " " + t.en, m: avg(BY_TOPIC[t.id] || []) })).filter((r) => r.m != null).sort((a, b) => a.m - b.m).slice(0, 5);
  const fc = forecast(7);
  el.replaceChildren(
    h("h1", null, "기록 ", h("span.dim", null, "progress")),
    h("div.stats", null,
      stat("🔥", streak(), "day streak"), stat("🏆", bestStreak(), "best streak"),
      stat("⏱️", mins7, "min this week"), stat("🎯", cards7 ? Math.round((right7 / cards7) * 100) + "%" : "–", "right this week"),
      stat("🃏", total, "cards ever")),
    h("section.chart-card", null, h("h3", null, "Practice calendar"), ...heatmap()),
    h("section.chart-card", null, h("h3", null, "Known over time"), ...knownChart()),
    h("section.chart-card", null, h("h3", null, "Minutes, last 7 days"),
      ...bars(last7.map((k, i) => { const d = wk[i], m = Math.round((d.secs || 0) / 60);
        return { label: i === 6 ? "Today" : weekday(k), value: m, note: `${shortDate(k)}: ${m} min · ${d.cards || 0} cards${d.cards ? ` · ${Math.round(((d.right || 0) / d.cards) * 100)}% right` : ""}` }; }), "min", "Minutes practiced, last 7 days")),
    h("section.chart-card", null, h("h3", null, "Reviews coming up"),
      ...bars(fc.map((n, i) => ({ label: i === 0 ? "Today" : i === 1 ? "Tmrw" : weekday(dayKey(i)), value: n, note: `${i === 0 ? "Today (incl. overdue)" : shortDate(dayKey(i))}: ${n} reviews due` })), "reviews", "Reviews due over the next 7 days")),
    h("section.chart-card", null, h("h3", null, "Weakest grammar"), masteryList(weakPats, drillGroup)),
    h("section.chart-card", null, h("h3", null, "Weakest vocab topics"), masteryList(weakTopics, drillGroup)),
    h("p.dim.small", null, `Goal: ${goal} cards a day (change it in ⚙ Settings).`));
}

// ───────────────────────── 복습 · Review ─────────────────────────
const mistakeIds = () => Object.entries(state.items).filter(([id, r]) => ITEMS[id] && r.lastWrong && Date.now() - r.lastWrong < 7 * DAY)
  .sort((a, b) => b[1].lastWrong - a[1].lastWrong).map(([id]) => id);
function weakestIds(n = 20) {
  return Object.entries(state.items).filter(([id, r]) => ITEMS[id] && (r.wrong || 0) + (r.lapses || 0) > 0)
    .map(([id, r]) => [id, ((r.wrong || 0) + 2 * (r.lapses || 0)) / Math.max(3, r.reps)])
    .sort((a, b) => b[1] - a[1]).slice(0, n).map(([id]) => id);
}
function forecast(days) {   // reviews due on each of the next `days` days (index 0 = today, including overdue)
  const out = new Array(days).fill(0), start = new Date(); start.setHours(0, 0, 0, 0);
  for (const id in state.items) {
    if (!ITEMS[id]) continue;
    const d = Math.max(0, Math.floor((state.items[id].due - start) / DAY));
    if (d < days) out[d]++;
  }
  return out;
}
function renderReview() {
  const el = $("#view-review"), due = dueNow(), mist = mistakeIds(), weak = weakestIds(), fc = forecast(7);
  const name = (id) => (ITEMS[id].kind === "d" ? "💬 " + ITEMS[id].title : fill(ITEMS[id].ko));
  const preview = (ids) => ids.length ? h("div.rv-preview", null, ids.slice(0, 4).map((id) => h("span.rv-pill", { lang: "ko" }, name(id))), ids.length > 4 ? h("span.dim.small", null, `+${ids.length - 4} more`) : null) : null;
  const box = (icon, title, n, desc, ids, kind) => h("div.rv-card", null,
    h("div.rv-head", null, h("span.rv-icon", null, icon), h("div", null, h("b", null, title), h("div.dim.small", null, desc)), h("span.rv-n" + (n ? "" : ".zero"), null, n)),
    preview(ids),
    h("button.btn" + (n ? ".primary" : "") + ".wide", { disabled: !n, onclick: () => startSession(kind, title, kind === "due" ? null : ids) }, n ? "Start ↑" : "Nothing here right now"));
  el.replaceChildren(
    h("h1", null, "복습 ", h("span.dim", null, "review")),
    session ? h("div.rv-banner", null, `🔁 ${session.title} in progress: ${sessionLeft()} left`,
      h("div.btn-row", null, h("button.btn.primary", { onclick: () => showView("feed") }, "Continue"), h("button.btn", { onclick: () => { endSession("Review stopped"); refreshAhead(); renderReview(); } }, "Stop"))) : null,
    box("⏰", "Due now", due.length, "Only what's due, no new material, until you're caught up", due, "due"),
    box("🩹", "Fix my mistakes", mist.length, "Everything you missed in the last 7 days. Misses come back until they stick.", mist, "mistakes"),
    box("🎯", "Weakest 20", weak.length, "The words and phrases you miss most often", weak, "weak"),
    h("h3", null, "What's coming"),
    h("div.stats", null, stat("📅", fc[0], "today"), stat("🌅", fc[1], "tomorrow"), stat("🗓️", fc.reduce((a, b) => a + b, 0), "next 7 days")));
}

let installEvt = null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e; });
function renderSettings() {
  const st = state.settings, el = $("#view-settings");
  const row = (label, input, hint) => h("label.set-row", null, h("div", null, h("div", null, label), hint ? h("div.dim.small", null, hint) : null), input);
  const num = (key, opts) => h("select", { onchange: (e) => { st[key] = +e.target.value; save(); hud(); } }, opts.map((o) => h("option", { value: o, selected: st[key] === o }, o)));
  const tog = (key, after) => h("input", { type: "checkbox", checked: st[key], onchange: (e) => { st[key] = e.target.checked; save(); hud(); after?.(); } });
  const voices = Speech.voices();
  const srStatus = h("div.dim.small", null, Speech.canListen() ? "Checking…" : "Not available in this browser.");
  if (Speech.canListen()) Speech.onDeviceStatus().then((s) => {
    srStatus.replaceChildren(s === "available" ? "✓ On-device Korean installed: speech check works offline." :
      s === "downloadable" || s === "downloading" ? h("span", null, "On-device Korean can be downloaded. ", h("button.btn.small", { onclick: async () => { srStatus.textContent = "Downloading…"; srStatus.textContent = (await Speech.installOnDevice()) ? "✓ Installed" : "Couldn't install. Use the Android tip below."; } }, "Download")) :
      "Uses your phone's Google speech service. For offline use, install Korean offline speech (tip below).");
  });
  // voice test: did Korean audio actually start?
  const voiceOut = h("div.small.test-out");
  const testVoice = h("button.btn.small", { onclick: async (e) => {
    e.preventDefault();
    voiceOut.className = "small test-out"; voiceOut.textContent = "Playing…";
    const before = Speech.health().ok;
    await Speech.say("안녕하세요. 소리가 잘 들려요?", st.rate);
    const hl = Speech.health();
    if (hl.ok > before) { voiceOut.className = "small test-out ok"; voiceOut.textContent = `✓ Korean voice works (${hl.voice}). Heard nothing? Turn up the media volume.`; }
    else if (hl.last === "nokorean") { voiceOut.className = "small test-out bad"; voiceOut.replaceChildren(h("b", null, "✗ No Korean voice installed: it was read by a non-Korean voice (or not at all). "), VOICE_FIX); }
    else { voiceOut.className = "small test-out bad"; voiceOut.replaceChildren(h("b", null, "✗ No Korean audio started. "), VOICE_FIX); }
  } }, "▶ Test voice");
  const micOut = h("div.feedback");
  const testMic = Speech.canListen() ? micButton("안녕하세요. 만나서 반가워요.", (r) => {
    if (r.error) { micOut.className = "feedback bad"; return (micOut.textContent = micErrorText(r.error)); }
    const v = verdict(r, "안녕하세요. 만나서 반가워요.", { ok: "✓ Speech check works!" });
    micOut.className = "feedback " + v.lvl; micOut.replaceChildren(...v.el);
  }, "🎤 Test: say “안녕하세요. 만나서 반가워요.”") : null;
  el.replaceChildren(h("h1", null, "설정 ", h("span.dim", null, "settings")),
    row("Your level", h("select", { onchange: (e) => { st.level = +e.target.value; save(); hud(); refreshAhead(); toast(`${LEVELS[st.level]}: new cards now follow that mix`); } },
      [1, 2, 3].map((l) => h("option", { value: l, selected: (st.level || 2) === l }, LEVELS[l]))),
      "Intermediate: mostly new vocabulary and level-4 grammar; easier phrases come as quick checks"),
    row("Your name in Hangul", h("input", { value: st.name, placeholder: "에런", oninput: (e) => { st.name = e.target.value; save(); } }), "Used in dialogues: 저는 ___이에요"),
    row("Daily goal (cards)", num("goal", [10, 20, 30, 50, 100])),
    row("New words & phrases per day", num("newPerDay", [5, 10, 15, 20, 25, 30, 40, 50]), "Reviews are unlimited; this caps brand-new material"),
    h("h3", null, "Sound & speaking"),
    h("div.test-box", null, h("div.test-row", null, testVoice, h("span.dim.small", null, "Plays a Korean sentence")), voiceOut,
      testMic, micOut),
    row("Korean voice", voices.length
      ? h("select", { onchange: (e) => { st.voice = e.target.value; Speech.setVoice(st.voice); save(); Speech.say("안녕하세요. 만나서 반가워요.", st.rate); } },
        h("option", { value: "" }, "Default"), voices.map((v) => h("option", { value: v.name, selected: st.voice === v.name }, v.name + (v.localService ? " (offline)" : ""))))
      : h("span.warn", null, "No Korean voice listed"), voices.length ? null : VOICE_FIX),
    row("Speaking speed", h("input", { type: "range", min: 0.5, max: 1.3, step: 0.05, value: st.rate, onchange: (e) => { st.rate = +e.target.value; save(); Speech.say("천천히 말해 주세요.", st.rate); } })),
    row("Auto-play audio", tog("autoplay")),
    row("Auto-advance when right", tog("autoAdvance")),
    row("Quiet mode", tog("quiet", refreshAhead), "No speaking cards, for the bus or library"),
    row("Show dialogue translations", tog("showEn"), "Off = blurred until you tap (better listening practice)"),
    row("Speech check", srStatus),
    h("details.tip", null, h("summary", null, "Make speaking work offline on Android"),
      h("ol", null,
        h("li", null, "Open the Google app → your profile → Settings → Voice → Offline speech recognition → install 한국어 (Korean)."),
        h("li", null, "Settings → Accessibility → Text-to-speech → Google → Language/voice data → install Korean."),
        h("li", null, "Record & compare (shadow cards) always works offline."))),
    h("h3", null, "App"),
    installEvt ? h("button.btn.primary.wide", { onclick: async () => { installEvt.prompt(); installEvt = null; renderSettings(); } }, "📲 Install Dongne on your home screen") :
      h("p.dim.small", null, "Install: Chrome menu ⋮ → Add to Home screen. Put it where your doom-scroll app used to be."),
    h("div.btn-row", null,
      h("button.btn", { onclick: exportData }, "⬇ Back up progress"),
      h("button.btn", { onclick: importData }, "⬆ Restore backup")),
    h("button.btn.danger.wide", { onclick: () => { if (confirm("Erase ALL progress? This can't be undone.")) replaceState(blank()); } }, "Reset all progress"),
    h("p.dim.small", null, `Dongne · ${SENTENCES.length} phrases · ${WORDS.length} words · ${DIALOGUES.length} dialogues · ${PATTERNS.length} patterns · all on this phone, no account.`));
}
const VOICE_FIX = "On Android: Settings → Accessibility → Text-to-speech output → Preferred engine: Speech Services by Google → ⚙ → Install voice data → Korean (한국어). Then fully close and reopen Chrome. On a computer, Microsoft Edge has Korean voices built in.";
// warn once per session if Korean audio fails, and stop serving listening cards
let voiceWarned = false;
Speech.onHealth((status) => {
  if (status === "ok" || voiceWarned) return;
  voiceWarned = true;
  toast(status === "nokorean" ? "🔇 No Korean voice on this device. Settings → Test voice shows how to add it." : "🔇 No Korean audio came out. Settings → Test voice shows the fix.", 7000);
  if (Speech.health().broken && started) refreshAhead();
});
// swap in a whole new state; it must go through `state` because pagehide saves `state`
function replaceState(data) {
  state = data;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  location.reload();
}
function exportData() {
  const a = h("a", { href: URL.createObjectURL(new Blob([JSON.stringify(state)], { type: "application/json" })), download: `dongne-backup-${ymd()}.json` });
  document.body.append(a); a.click(); a.remove();
}
function importData() {
  const inp = h("input", { type: "file", accept: "application/json,.json", onchange: async () => {
    try {
      const data = JSON.parse(await inp.files[0].text());
      if (data.v !== 1 || !data.items) throw 0;
      replaceState(data);
    } catch (e) { toast("That file isn't a Dongne backup"); }
  } });
  inp.click();
}

// ───────────────────────── start ─────────────────────────
let started = false;
function splash() {
  const t = today(), first = !state.onboarded;
  const nameIn = h("input.name-in", { placeholder: "에런", value: state.settings.name, lang: "ko" });
  let lvl = state.settings.level || 2;
  const lvlDesc = { 1: "New to Korean: start from greetings", 2: "Know the basics: skim them, start with real conversations", 3: "Past the basics: push me with new words and grammar" };
  const lvlBox = h("div.level-pick", null, [1, 2, 3].map((l) => h("button.level-btn" + (l === lvl ? ".on" : ""), { onclick: (e) => {
    lvl = l; lvlBox.querySelectorAll(".level-btn").forEach((b) => b.classList.toggle("on", b === e.currentTarget));
  } }, h("b", null, LEVELS[l]), h("span.dim.small", null, lvlDesc[l]))));
  const el = h("div.splash", null, h("div.splash-in", null,
    h("div.logo", { lang: "ko" }, "동네"),
    h("div.tagline", null, first ? "Your Korean neighborhood. Swipe instead of scroll." : `${t.cards}/${state.settings.goal} today · 🔥 ${streak()}`),
    first ? h("div.onboard", null,
      h("p", null, "Every swipe is a tiny rep: hear it, say it, build it, chat with locals. A smart scheduler brings each phrase back right before you'd forget it."),
      h("div.onboard-label", null, "Your Korean level"), lvlBox,
      h("label", null, "Your name in Hangul (for dialogues)", nameIn),
      h("p.dim.small", null, "🎤 tap = speaking on · 🤫 = quiet mode for public places")) : null,
    h("button.btn.primary.start", { onclick: () => {
      if (first) { state.settings.name = nameIn.value.trim(); state.settings.level = lvl; state.onboarded = true; save(); }
      el.remove(); begin();
    } }, first ? "시작하기 · Start" : "계속하기 · Continue"),
    h("p.warn.small.voice-warn", { hidden: true }, "No Korean voice found on this device. If audio stays silent, see Settings.")));
  document.body.append(el);
  setTimeout(() => { if (!Speech.hasVoice()) el.querySelector(".voice-warn")?.removeAttribute("hidden"); }, 1500);   // voices load late
}
function begin() {
  started = true;
  // a spoken line right after the tap unlocks audio for the whole session
  appendCard(); appendCard();
  activate(cards[0]);
}
document.addEventListener("keydown", (e) => {
  if (view !== "feed" || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName)) return;
  if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); advance(); }
  if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); const i = cards.indexOf(active); cards[i - 1]?.el.scrollIntoView({ behavior: "smooth" }); }
});
Speech.setVoice(state.settings.voice);
if (new URLSearchParams(location.search).get("quiet") === "1") state.settings.quiet = true;   // home-screen shortcut
hud();
splash();
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});

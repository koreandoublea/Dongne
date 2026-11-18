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

// ───────────────────────── saved state ─────────────────────────
function blank() {
  return {
    v: 1, items: {}, days: {}, missions: {}, culture: {}, friends: {}, handled: {},
    focus: null, onboarded: false, total: 0,
    settings: { name: "", goal: 20, newPerDay: 20, rate: 0.9, voice: "", autoplay: true, autoAdvance: true, quiet: false, showEn: false },
  };
}
let state = load();
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && raw.v === 1) { const b = blank(); return { ...b, ...raw, settings: { ...b.settings, ...raw.settings } }; }
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

// ───────────────────────── scheduler ─────────────────────────
// step 0/1 = learning (minutes apart), step 2 = review (days). s = stability in days.
function introduce(id, known) {
  const now = Date.now();
  state.items[id] = known
    ? { s: 4, step: 2, due: now + 4 * DAY, reps: 1, lapses: 0, last: now }
    : { s: 0, step: 0, due: now + MIN, reps: 1, lapses: 0, last: now };
  today().new++;
}
function grade(id, g) {   // 1 again · 2 hard · 3 good · 4 easy
  const r = state.items[id], now = Date.now();
  if (!r) return;
  r.reps++;
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

function nextNew(ex) {
  const f = state.focus;
  if (f?.type === "pattern") {
    const id = (BY_PAT[f.id] || []).find((id) => !state.items[id] && !ex.has(id));
    if (id) return id;
  }
  const scenes = f?.type === "scene" ? [f.id, ...SCENES.map((s) => s.id)] : SCENES.map((s) => s.id);
  for (const sc of scenes) { const id = ORDER[sc].find((id) => !state.items[id] && !ex.has(id)); if (id) return id; }
  return null;
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
  if (!r) return "intro";
  const q = state.settings.quiet, voice = Speech.hasVoice();
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

function nextSpec() {
  if (events.length) return events.shift();
  const t = today();
  if (sinceCulture >= 11) {
    const unlocked = new Set(SCENES.filter((s) => sceneStats(s.id).seen).map((s) => s.id));
    const pool = CULTURE.filter((c) => unlocked.has(c.scene));
    const fresh = pool.filter((c) => !state.culture[c.id]);
    const c = fresh[0] || (pool.length && Math.random() < 0.3 ? pool.sort((a, b) => state.culture[a.id] - state.culture[b.id])[0] : null);
    if (c) { sinceCulture = 0; return { kind: "culture", c }; }
  }
  if (t.cards >= 25 && !t.missionShown && !Object.values(state.missions).some((ts) => ts.some((x) => ymd(x) === ymd()))) {
    t.missionShown = true;
    const m = pick(MISSIONS.filter((m) => m.lvl <= 1 + Math.floor(Object.keys(state.items).length / 80)));
    return { kind: "mission", m };
  }
  if (sinceMatch >= 12) {
    const pairs = glossPairs();
    if (pairs.length >= 10) { sinceMatch = 0; return { kind: "match", pairs: pairs.slice(0, 5) }; }
  }
  const ex = new Set(cards.slice(-4).filter((c) => c.spec.item).map((c) => c.spec.item.id));
  const id = pickItem(ex);
  if (!id) return { kind: "event", icon: "🏆", title: "You've met every phrase in Dongne", text: "Incredible. Keep swiping to review, and go use it with real people!" };
  sinceCulture++; sinceMatch++;
  const item = ITEMS[id], type = chooseType(item);
  return { kind: "item", item, type, cloze: type === "cloze" ? clozeTarget(item) : null };
}

// Word pairs for the matching game, from the glosses of phrases you've already met.
function glossPairs() {
  const seenW = new Set(), seenM = new Set(), out = [];
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
  if (card.spec.kind !== "item" || card.answered) return;
  if (card.spec.type === "intro") return introduceCard(card, false);
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
  if (t.cards >= state.settings.goal && !t.goalShown) {
    t.goalShown = true;
    events.push({ kind: "event", icon: "🔥", title: `Daily goal done! ${streak()}-day streak`, text: "That's real practice instead of scrolling. Keep going; every swipe still counts." });
  }
  const lvl = friendLevel(sc), prev = state.friends[sc] || 0;
  if (lvl > prev) { state.friends[sc] = lvl; events.push(friendEvent(sc, lvl)); }
  if (!state.handled[sc] && sceneStats(sc).canHandle) {
    state.handled[sc] = true;
    events.push({ kind: "event", icon: SCENE[sc].icon, title: "New real-world skill unlocked", text: `You can now: ${SCENE[sc].can}. Go try it for real!` });
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
  const it = card.spec.item, sc = it && SCENE[it.scene];
  return h("section.card", null, h("div.card-in", null,
    h("div.card-top", null,
      sc ? h("span.chip", null, sc.icon + " " + sc.ko) : null,
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
    "no-speech": "Didn't hear anything. Try again a little louder.",
    "audio-capture": "No microphone found.",
    unsupported: "This browser has no speech check. Use reveal instead.",
    "language-not-supported": "Korean speech isn't installed on this phone (see Settings).",
  }[err] || "Couldn't hear that. Try again.";
}
// Mark target syllables the recognizer didn't hear (syllable-level LCS).
function diffView(said, target) {
  const a = [...said.replace(/\s/g, "")], b = [...fill(target)];
  const bc = b.map((c) => (/[\s.,!?~…]/.test(c) ? null : c));
  const t = bc.filter(Boolean);
  const dp = Array.from({ length: a.length + 1 }, () => new Array(t.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = t.length - 1; j >= 0; j--)
    dp[i][j] = a[i] === t[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hit = new Set();
  for (let i = 0, j = 0; i < a.length && j < t.length;) {
    if (a[i] === t[j]) { hit.add(j); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  let k = 0;
  return h("div.ko.diff", { lang: "ko" }, b.map((c, idx) => (bc[idx] === null ? c : h("span", { class: hit.has(k++) ? "hit" : "miss" }, c))));
}
// The mic button shared by say / intro / dialog. onResult gets {text, score, alts} or {error}.
function micButton(target, onResult, label = "🎤 Say it") {
  const live = h("div.live");
  const btn = h("button.btn.mic", {
    onclick: async () => {
      if (btn.classList.contains("on")) return Speech.stopListening();
      Speech.stop();
      btn.classList.add("on"); btn.textContent = "● Listening… (tap to stop)"; live.textContent = "";
      const r = await Speech.listen({ onInterim: (t) => (live.textContent = t) });
      btn.classList.remove("on"); btn.textContent = label; live.textContent = "";
      if (r.error) return onResult({ error: r.error });
      const targets = Array.isArray(target) ? target : [target];
      let best = { text: "", score: 0, index: 0 };
      targets.forEach((tg, i) => { const b = Speech.best(r.alts, fill(tg)); if (b.score > best.score) best = { ...b, index: i }; });
      if (!best.text) best.text = r.alts[0] || "";
      onResult(best);
    },
  }, label);
  return h("div.mic-wrap", null, btn, live);
}

// ───────────────────────── card types ─────────────────────────
function render(card) {
  const s = card.spec;
  if (s.kind === "culture") return cultureCard(card);
  if (s.kind === "event") return eventCard(card);
  if (s.kind === "mission") return missionCard(card);
  if (s.kind === "match") return matchCard(card);
  return ({ intro: introCard, listen: listenCard, read: readCard, build: buildCard, swap: buildCard, say: sayCard, shadow: shadowCard, speed: listenCard,
    dialog: dialogCard, cloze: clozeCard, hearko: hearKoCard, reply: replyCard })[s.type](card);
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
      fb.className = "feedback";
      if (r.error) return (fb.textContent = micErrorText(r.error));
      fb.replaceChildren(diffView(r.text, it.ko), h("div", null, r.score >= 0.92 ? "✓ Sounds right!" : r.score >= 0.65 ? "Close! Listen once more and try again." : `Heard: “${r.text}”`));
      fb.classList.add(r.score >= 0.92 ? "ok" : "meh");
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
    fb.className = "feedback";
    if (r.error) return (fb.textContent = micErrorText(r.error));
    fb.replaceChildren(h("div.heard", null, "You said: “", r.text, "”"), diffView(r.text, it.ko));
    if (r.score >= 0.92) {
      fb.classList.add("ok"); fb.prepend(h("div", null, "✓ 완벽해요! Perfect."));
      out.replaceChildren(audioBtns(fill(it.ko))); showBtn.remove(); mic.remove();
      Speech.say(fill(it.ko), state.settings.rate);
      finish(card, r.score >= 0.97 ? 4 : 3);
    } else if (r.score >= 0.65) {
      fb.classList.add("meh"); fb.prepend(h("div", null, "Close! Red parts were missed."));
      reveal([1, 2, 3]);
    } else {
      fb.classList.add("bad"); fb.prepend(h("div", null, "Not quite. Try again, or reveal."));
    }
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
      if (r.error) return (fb.textContent = micErrorText(r.error));
      if (r.score < 0.55) { fb.className = "feedback bad"; fb.textContent = `Heard “${r.text}”. Didn't match a reply; try again or tap one.`; return; }
      const o = t.opts[r.index];
      choose(o, [...opts.querySelectorAll(".choice")].find((b) => b.textContent === fill(o.ko)));
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
function missionCard(card) {
  const m = card.spec.m;
  const body = h("div.card-body", null, h("div.big-icon", null, "🎯"), h("div.label", null, "Real-world mission"), h("h2", null, m.ko), h("p", null, m.en),
    h("div.grades", null,
      h("button.btn.ghost", { onclick: () => advance() }, "Later"),
      h("button.btn.primary", { onclick: (e) => { logMission(m.id); e.currentTarget.parentNode.replaceWith(h("p.ok-text", null, "대박! Logged. That's worth more than 100 cards.")); } }, "I did it ✓")),
    h("p.dim.small", null, "Speaking to real people is what turns app practice into fluency."));
  return h("section.card.mission", null, h("div.card-in", null, body, h("div.swipe-hint", null, "swipe up ↑")));
}
function logMission(id) { (state.missions[id] = state.missions[id] || []).push(Date.now()); save(); }

// ───────────────────────── HUD ─────────────────────────
function hud() {
  const t = today(), g = state.settings.goal, p = Math.min(1, t.cards / g);
  $("#ring-fg").style.strokeDashoffset = String(100 - p * 100);
  $("#ring-n").textContent = t.cards;
  $("#ring").classList.toggle("full", p >= 1);
  $("#streak").textContent = "🔥 " + streak();
  $("#quiet").textContent = state.settings.quiet ? "🤫" : "🎤";
  $("#quiet").title = state.settings.quiet ? "Quiet mode: no speaking cards" : "Speaking on";
  const f = state.focus;
  $("#focus").textContent = f ? (f.type === "scene" ? SCENE[f.id].icon + " " + SCENE[f.id].en : "📐 " + PAT[f.id].ko) : "🏘️ All scenes";
}
$("#quiet").onclick = () => {
  state.settings.quiet = !state.settings.quiet; save(); hud(); refreshAhead();
  toast(state.settings.quiet ? "Quiet mode: no speaking cards (good for the bus)" : "Speaking cards are back");
};
$("#focus").onclick = () => showView("map");
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2200);
}

// time spent practicing (only while the feed is on screen)
setInterval(() => { if (document.visibilityState === "visible" && view === "feed" && started) { today().secs += 5; save(); } }, 5000);

// ───────────────────────── views ─────────────────────────
let view = "feed";
function showView(v) {
  view = v;
  document.querySelectorAll(".view").forEach((el) => el.classList.toggle("on", el.id === "view-" + v));
  document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("on", b.dataset.v === v));
  if (v !== "feed") { Speech.stop(); Speech.stopListening(); }
  if (v === "map") renderMap();
  if (v === "grammar") renderGrammar();
  if (v === "missions") renderMissions();
  if (v === "settings") renderSettings();
}
document.querySelectorAll("nav button").forEach((b) => (b.onclick = () => showView(b.dataset.v)));

function setFocus(f) {
  state.focus = f; save(); hud(); refreshAhead();
  toast(f ? "New phrases will come from there first" : "Following the normal path");
}

function renderMap() {
  const knownN = Object.keys(state.items).filter(known).length;
  const patsKnown = PATTERNS.filter((p) => (BY_PAT[p.id] || []).filter(known).length >= 3).length;
  const missionsN = Object.values(state.missions).reduce((a, b) => a + b.length, 0);
  const el = $("#view-map");
  el.replaceChildren(
    h("h1", null, "우리 동네 ", h("span.dim", null, "your neighborhood")),
    h("div.stats", null,
      stat("🔥", streak(), "day streak"),
      stat("⏱️", Math.round(today().secs / 60), "min today"),
      stat("💬", knownN, "phrases known"),
      stat("📐", patsKnown, "patterns"),
      stat("🎯", missionsN, "missions")),
    h("button.focus-all" + (state.focus ? "" : ".on"), { onclick: () => { setFocus(null); renderMap(); } }, "🏘️ All scenes, in order", state.focus ? "" : " ✓"),
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

function renderGrammar() {
  const el = $("#view-grammar");
  const lvls = { 1: "Level 1 · the skeleton", 2: "Level 2 · tenses, wants & requests", 3: "Level 3 · sounding natural" };
  el.replaceChildren(h("h1", null, "문법 ", h("span.dim", null, "patterns")),
    h("p.dim", null, "Every pattern is taught inside real phrases. Tap one to see it in action, or focus it to get its phrases first."),
    ...[1, 2, 3].map((l) => h("section", null, h("h3", null, lvls[l]),
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

function renderMissions() {
  const el = $("#view-missions");
  el.replaceChildren(h("h1", null, "미션 ", h("span.dim", null, "real-world missions")),
    h("p.dim", null, "The app gets you ready; real conversations make you fluent. Log a mission when you do it."),
    h("div.missions", null, MISSIONS.map((m) => {
      const log = state.missions[m.id] || [];
      return h("div.mission-row", null,
        h("div", null, h("b", { lang: "ko" }, m.ko), " ", h("span.lvl", null, "★".repeat(m.lvl)), h("div.small", null, m.en),
          log.length ? h("div.dim.small", null, `Done ${log.length}× · last ${new Date(log[log.length - 1]).toLocaleDateString()}`) : null),
        h("button.btn" + (log.length ? "" : ".primary"), { onclick: () => { logMission(m.id); toast("대박! Mission logged 🎯"); renderMissions(); } }, "Did it ✓"));
    })));
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
  el.replaceChildren(h("h1", null, "설정 ", h("span.dim", null, "settings")),
    row("Your name in Hangul", h("input", { value: st.name, placeholder: "에런", oninput: (e) => { st.name = e.target.value; save(); } }), "Used in dialogues: 저는 ___이에요"),
    row("Daily goal (cards)", num("goal", [10, 20, 30, 50, 100])),
    row("New phrases per day", num("newPerDay", [5, 10, 15, 20, 30, 50]), "Reviews are unlimited; this caps brand-new material"),
    h("h3", null, "Sound & speaking"),
    row("Korean voice", voices.length
      ? h("select", { onchange: (e) => { st.voice = e.target.value; Speech.setVoice(st.voice); save(); Speech.say("안녕하세요. 만나서 반가워요.", st.rate); } },
        h("option", { value: "" }, "Default"), voices.map((v) => h("option", { value: v.name, selected: st.voice === v.name }, v.name + (v.localService ? " (offline)" : ""))))
      : h("span.warn", null, "No Korean voice found"), voices.length ? null : "Android: Settings → Accessibility → Text-to-speech → Google → install Korean"),
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
    h("p.dim.small", null, `Dongne · ${SENTENCES.length} phrases · ${DIALOGUES.length} dialogues · ${PATTERNS.length} patterns · all on this phone, no account.`));
}
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
  const el = h("div.splash", null, h("div.splash-in", null,
    h("div.logo", { lang: "ko" }, "동네"),
    h("div.tagline", null, first ? "Your Korean neighborhood. Swipe instead of scroll." : `${t.cards}/${state.settings.goal} today · 🔥 ${streak()}`),
    first ? h("div.onboard", null,
      h("p", null, "Every swipe is a tiny rep: hear it, say it, build it, chat with locals. A smart scheduler brings each phrase back right before you'd forget it."),
      h("label", null, "Your name in Hangul (for dialogues)", nameIn),
      h("p.dim.small", null, "🎤 tap = speaking on · 🤫 = quiet mode for public places")) : null,
    h("button.btn.primary.start", { onclick: () => {
      if (first) { state.settings.name = nameIn.value.trim(); state.onboarded = true; save(); }
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

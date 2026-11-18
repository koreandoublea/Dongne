// Speech: the phone's own Korean voice (TTS), Chrome's Korean speech recognizer for
// "did they understand you?", and a plain recorder for record-and-compare. Nothing here
// is bundled with the app, so it stays tiny; everything degrades to "tap to reveal".

const Speech = (() => {
  const synth = window.speechSynthesis;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let voices = [];
  let voiceName = "";
  const badVoices = new Set();     // voices that errored on this device; skipped from then on

  function loadVoices() {
    if (!synth) return;
    voices = synth.getVoices().filter((v) => /^ko/i.test(v.lang));
  }
  if (synth) { loadVoices(); synth.addEventListener?.("voiceschanged", loadVoices); }

  function voice() {
    const ok = voices.filter((v) => !badVoices.has(v.name));
    return ok.find((v) => v.name === voiceName) || ok.find((v) => v.localService) || ok[0] || null;
  }

  // ── voice health: did audio actually start? The app warns once if it never does. ──
  const health = { ok: 0, fail: 0, last: "untested", voice: "" };
  const listeners = [];
  function report(status, detail = "") {
    health.last = status;
    if (status === "ok") { health.ok++; health.voice = detail; } else health.fail++;
    listeners.forEach((f) => f(status, detail));
  }

  // Resolves when speaking ends. Android Chrome drops an utterance queued right after
  // cancel(), so we only cancel when something is playing and then wait a beat before
  // speaking. Utterances are kept referenced because Chrome can garbage-collect them
  // mid-speech and never fire onend; a length-based timeout settles it either way.
  const keep = new Set();
  let token = 0;
  function say(text, rate = 0.9) {
    return new Promise((done) => {
      if (!synth || !text) { if (!synth) report("none"); return done(false); }
      const my = ++token;
      const busy = synth.speaking || synth.pending;
      if (busy) synth.cancel();
      try { synth.resume(); } catch (e) {}    // desktop Chrome can get stuck "paused"
      if (!busy) return speakNow(text, rate, done, my, true);      // same tick as the tap
      setTimeout(() => (my === token ? speakNow(text, rate, done, my, true) : done(false)), 180);
    });
  }
  function speakNow(text, rate, done, my, mayRetry) {
    loadVoices();     // the list can arrive late without a voiceschanged event
    const u = new SpeechSynthesisUtterance(text.replace(/[~…]/g, " "));
    u.lang = "ko-KR";
    const v = voice();
    if (v) u.voice = v;
    u.rate = rate;
    keep.add(u);
    let started = false, settled = false;
    const end = (ok) => { if (settled) return; settled = true; clearTimeout(t1); clearTimeout(t2); keep.delete(u); done(ok); };
    // voices listed but none Korean: the phone reads Hangul with a non-Korean voice (or silence)
    const noKorean = !v && synth.getVoices().length > 0;
    u.onstart = () => { started = true; report(noKorean ? "nokorean" : "ok", v ? v.name : "default voice"); };
    u.onend = () => end(true);
    u.onerror = (e) => {
      const err = e.error || "error";
      if (err === "interrupted" || err === "canceled") return end(false);
      if (err === "not-allowed") return end(false);          // no tap yet this session; the next tap works
      if (mayRetry && v && my === token) {                   // that voice is broken here: try another / the default
        badVoices.add(v.name); settled = true; clearTimeout(t1); clearTimeout(t2); keep.delete(u);
        return speakNow(text, rate, done, my, false);
      }
      report("error", err); end(false);
    };
    // never started within 3 s (and nothing newer replaced it): treat as silent
    const t1 = setTimeout(() => { if (!started && !settled && my === token && !synth.speaking) report("silent"); }, 3000);
    const t2 = setTimeout(() => end(true), 3000 + text.length * 260 / rate);
    synth.speak(u);
  }
  function stop() { token++; if (synth && (synth.speaking || synth.pending)) synth.cancel(); }
  // Korean audio confirmed broken here (failed and never once worked): hide listening cards
  const broken = () => health.ok === 0 && (health.fail >= 2 || health.last === "nokorean");

  // ── recognition ──
  // On-device recognition is only requested when Chrome says the Korean model is installed;
  // asking for it blindly made some phones fail silently.
  let localState = "unknown";
  if (SR && typeof SR.available === "function") {
    try { SR.available({ langs: ["ko-KR"], processLocally: true }).then((s) => (localState = s)).catch(() => {}); } catch (e) {}
  }
  function canListen() { return !!SR; }

  // listen({ onState, onInterim, stopWhen, maxMs }) → { alts: [...], error }
  //   onState("listening" | "hearing"), onInterim(text, isFinal), stopWhen(alts) → true ends early.
  // It always settles: Android can keep the mic open long after you stop talking, so we
  // stop after a pause, cap the length, and abort if stop() never produces an end event.
  function listen(opts = {}) {
    const { onState, onInterim, stopWhen, maxMs = 9000 } = opts;
    return new Promise((resolve) => {
      if (!SR) return resolve({ error: "unsupported", alts: [] });
      let rec;
      try { rec = new SR(); } catch (e) { return resolve({ error: "unsupported", alts: [] }); }
      rec.lang = "ko-KR";
      rec.interimResults = true;
      rec.maxAlternatives = 5;
      rec.continuous = false;
      const local = "processLocally" in rec && localState === "available";
      if (local) rec.processLocally = true;
      let alts = [], err = null, finished = false, lastHeard = 0, stopping = false;
      const timers = [];
      const cleanup = () => { finished = true; timers.forEach(clearTimeout); clearInterval(iv); if (Speech.current?.rec === rec) Speech.current = null; };
      const finish = () => { if (finished) return; cleanup(); resolve({ error: alts.length ? null : (err || "no-speech"), alts }); };
      const stop = () => {
        if (finished || stopping) return;
        stopping = true;
        try { rec.stop(); } catch (e) {}
        timers.push(setTimeout(() => { try { rec.abort(); } catch (e) {} finish(); }, 1500));
      };
      rec.onstart = () => onState?.("listening");
      rec.onsoundstart = rec.onspeechstart = () => onState?.("hearing");
      rec.onresult = (e) => {
        // Android sometimes splits one utterance into several results: join them
        const res = Array.from(e.results);
        const head = res.slice(0, -1).map((r) => r[0].transcript).join(" ");
        const last = res[res.length - 1];
        alts = Array.from(last, (a) => (head + " " + a.transcript).trim()).filter(Boolean);
        lastHeard = Date.now();
        onState?.("hearing");
        onInterim?.(alts[0] || "", last.isFinal);
        if (stopWhen?.(alts)) stop();
      };
      rec.onerror = (e) => { err = e.error; };
      rec.onend = () => {
        if (finished) return;
        if (local && !alts.length && (err === "language-not-supported" || err === "service-not-allowed" || err === "network")) {
          localState = "unavailable"; cleanup();
          return resolve(listen(opts));                    // on-device failed: retry with the normal service
        }
        finish();
      };
      const iv = setInterval(() => { if (lastHeard && Date.now() - lastHeard > 1700) stop(); }, 250);
      timers.push(setTimeout(stop, maxMs));
      Speech.current = { rec, stop };
      try { rec.start(); } catch (e) { cleanup(); resolve({ error: "busy", alts: [] }); }
    });
  }
  function stopListening() { Speech.current?.stop(); }

  // Chrome 139+ can install an on-device Korean model. Older builds only have the Google
  // app's offline pack (Android settings), which Chrome uses on its own when offline.
  async function onDeviceStatus() {
    if (!SR || typeof SR.available !== "function") return "unknown";
    try { return (localState = await SR.available({ langs: ["ko-KR"], processLocally: true })); } catch (e) { return "unknown"; }
  }
  async function installOnDevice() {
    if (!SR || typeof SR.install !== "function") return false;
    try { const ok = await SR.install({ langs: ["ko-KR"], processLocally: true }); if (ok) localState = "available"; return ok; } catch (e) { return false; }
  }

  // ── recorder (always local) ──
  let stream = null;
  async function record(maxMs) {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return { error: "unsupported" };
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch (e) { return { error: "denied" }; }
    const rec = new MediaRecorder(stream);
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise((r) => (rec.onstop = r));
    rec.start();
    const timer = setTimeout(() => rec.state === "recording" && rec.stop(), maxMs);
    Speech.stopRecording = () => rec.state === "recording" && rec.stop();
    await stopped;
    clearTimeout(timer);
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
    return { url: URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || "audio/webm" })) };
  }
  function play(url) {
    return new Promise((done) => { const a = new Audio(url); a.onended = a.onerror = () => done(); a.play().catch(done); });
  }

  // ── scoring: compare at the jamo level so 먹어요 vs 머거요 counts as close ──
  const L = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  const V = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
  const T = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
  function jamo(s) {
    const out = [];
    for (const ch of normalize(s)) {
      const c = ch.codePointAt(0) - 0xac00;
      if (c >= 0 && c < 11172) {
        out.push(L[(c / 588) | 0], V[((c % 588) / 28) | 0]);
        if (c % 28) out.push(T[c % 28]);
      } else out.push(ch);
    }
    return out;
  }
  function normalize(s) { return s.toLowerCase().replace(/[\s.,!?~…'"“”‘’()\-]/g, ""); }
  function lev(a, b) {
    const m = a.length, n = b.length;
    if (!m || !n) return m || n;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  function similarity(said, target) {
    const a = jamo(said), b = jamo(target);
    if (!b.length) return 0;
    return Math.max(0, 1 - lev(a, b) / Math.max(a.length, b.length));
  }
  function best(alts, target) {
    let top = { text: alts[0] || "", score: 0 };
    for (const t of alts) { const s = similarity(t, target); if (s > top.score) top = { text: t, score: s }; }
    return top;
  }

  return {
    say, stop, voice, voices: () => voices, setVoice: (n) => (voiceName = n),
    // some Android builds list no voices at all yet still speak ko-KR, so only a list
    // without Korean in it counts as "no voice", unless playback has actually failed
    hasVoice: () => !!synth && !broken() && (voices.length > 0 || synth.getVoices().length === 0),
    health: () => ({ ...health, broken: broken() }), onHealth: (f) => listeners.push(f),
    canListen, listen, stopListening, onDeviceStatus, installOnDevice,
    record, play, similarity, best, current: null, stopRecording: () => {},
  };
})();

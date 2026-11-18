// Speech: the phone's own Korean voice (TTS), Chrome's Korean speech recognizer for
// "did they understand you?", and a plain recorder for record-and-compare. Nothing here
// is bundled with the app, so it stays tiny; everything degrades to "tap to reveal".

const Speech = (() => {
  const synth = window.speechSynthesis;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let voices = [];
  let voiceName = "";

  function loadVoices() {
    if (!synth) return;
    voices = synth.getVoices().filter((v) => /^ko/i.test(v.lang));
  }
  if (synth) { loadVoices(); synth.addEventListener?.("voiceschanged", loadVoices); }

  function voice() {
    return voices.find((v) => v.name === voiceName) || voices.find((v) => v.localService) || voices[0] || null;
  }

  // Resolves when speaking ends (or right away if there's no voice). Android sometimes never
  // fires onend, so a length-based timeout settles it too.
  function say(text, rate = 0.9) {
    return new Promise((done) => {
      if (!synth) return done(false);
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[~…]/g, " "));
      u.lang = "ko-KR";
      const v = voice();
      if (v) u.voice = v;
      u.rate = rate;
      let settled = false;
      const end = (ok) => { if (!settled) { settled = true; clearTimeout(t); done(ok); } };
      const t = setTimeout(() => end(true), 1500 + text.length * 260 / rate);
      u.onend = () => end(true);
      u.onerror = () => end(false);
      synth.speak(u);
    });
  }
  function stop() { synth?.cancel(); }

  // ── recognition ──
  let localOk = null;     // null = untried; true/false once we know if on-device works
  function canListen() { return !!SR; }

  function listen({ onInterim } = {}) {
    return new Promise((resolve) => {
      if (!SR) return resolve({ error: "unsupported", alts: [] });
      const rec = new SR();
      rec.lang = "ko-KR";
      rec.interimResults = true;
      rec.maxAlternatives = 5;
      rec.continuous = false;
      if ("processLocally" in rec && localOk !== false) rec.processLocally = true;
      let alts = [];
      let err = null;
      rec.onresult = (e) => {
        const r = e.results[e.results.length - 1];
        alts = Array.from(r, (a) => a.transcript.trim()).filter(Boolean);
        if (!r.isFinal) onInterim?.(alts[0] || "");
      };
      rec.onerror = (e) => { err = e.error; };
      rec.onend = () => {
        // on-device asked for but not installed: remember, retry through the normal path once
        if (rec.processLocally && (err === "language-not-supported" || err === "service-not-allowed")) {
          localOk = false;
          return resolve(listen({ onInterim }));
        }
        if (rec.processLocally && !err) localOk = true;
        resolve({ error: alts.length ? null : (err || "no-speech"), alts });
      };
      Speech.current = rec;
      try { rec.start(); } catch (e) { resolve({ error: "busy", alts: [] }); }
    });
  }
  function stopListening() { try { Speech.current?.stop(); } catch (e) {} }

  // Chrome 139+ can install an on-device Korean model. Older builds only have the Google
  // app's offline pack (Android settings), which Chrome uses on its own when offline.
  async function onDeviceStatus() {
    if (!SR || typeof SR.available !== "function") return "unknown";
    try { return await SR.available({ langs: ["ko-KR"], processLocally: true }); } catch (e) { return "unknown"; }
  }
  async function installOnDevice() {
    if (!SR || typeof SR.install !== "function") return false;
    try { return await SR.install({ langs: ["ko-KR"], processLocally: true }); } catch (e) { return false; }
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
    // without Korean in it counts as "no voice"
    hasVoice: () => !!synth && (voices.length > 0 || synth.getVoices().length === 0),
    canListen, listen, stopListening, onDeviceStatus, installOnDevice,
    record, play, similarity, best, current: null, stopRecording: () => {},
  };
})();

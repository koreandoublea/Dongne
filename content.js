// Dongne content. Plain JS (no fetch) so the app also opens from file://.
//
//   S(scene, ko, en, patterns, glosses)  a sentence you learn to understand AND say
//   H(scene, ko, en, patterns, glosses)  a sentence you mostly HEAR (staff, announcements)
//   D(id, scene, title, turns)            a scene dialogue; N() = local speaks, M() = your reply
//
// patterns: space-separated PATTERNS ids. glosses: "word=meaning|word=meaning"; a part with
// no "=" is shown as a note. "{name}" is the learner's name, "{이에요}" picks 이에요/예요 for
// whatever comes right before it. Item ids come from the Korean text, so editing an English
// line keeps progress but rewording the Korean starts that sentence over.

const PATTERNS = [
  // level 1: the skeleton of a sentence
  { id: "topic", ko: "은/는", en: "topic marker: 'as for…'", lvl: 1,
    how: "consonant + 은 (책은) · vowel + 는 (저는)",
    note: "Marks what you're talking about, often for contrast: 저는 커피, 친구는 차 (me coffee, my friend tea)." },
  { id: "subj", ko: "이/가", en: "subject marker", lvl: 1,
    how: "consonant + 이 (물이) · vowel + 가 (커피가) · 저 + 가 = 제가",
    note: "Points at who/what does or is something, especially new info. Used with 있어요, 없어요, 좋아요, 아파요." },
  { id: "obj", ko: "을/를", en: "object marker", lvl: 1,
    how: "consonant + 을 (밥을) · vowel + 를 (커피를)",
    note: "Marks what the action is done to. Very often dropped in casual speech: 밥 먹었어요?" },
  { id: "e", ko: "에", en: "to / at (place, time)", lvl: 1,
    how: "N + 에: 학교에 가요 · 세 시에 · 집에 있어요",
    note: "Where you go, when something happens, or where something IS." },
  { id: "eseo", ko: "에서", en: "at (action place) / from", lvl: 1,
    how: "N + 에서: 카페에서 공부해요 · 미국에서 왔어요",
    note: "Where an action happens, or where you come from. Compare: 집에 있어요 (am at home) vs 집에서 쉬어요 (rest at home)." },
  { id: "do", ko: "도", en: "also, too", lvl: 1,
    how: "replaces 은/는/이/가/을/를: 저도 · 커피도",
    note: "저도요! (Me too!) is one of the most useful replies there is." },
  { id: "hago", ko: "하고 / (이)랑", en: "and / with", lvl: 1,
    how: "N + 하고 · vowel + 랑 (친구랑) · consonant + 이랑 (동생이랑)",
    note: "랑 is the chatty spoken version. 친구랑 = with a friend." },
  { id: "ieyo", ko: "이에요/예요", en: "to be: 'it's N / I'm N'", lvl: 1,
    how: "consonant + 이에요 (학생이에요) · vowel + 예요 (커피예요)",
    note: "Questions use the same form with rising tone: 뭐예요? 어디예요?" },
  { id: "anieyo", ko: "이/가 아니에요", en: "is not N", lvl: 1,
    how: "N + 이/가 아니에요: 학생이 아니에요",
    note: "The negative of 이에요/예요." },
  { id: "isseo", ko: "있어요 / 없어요", en: "there is, have / there isn't", lvl: 1,
    how: "N + 이/가 있어요: 시간 있어요? · 없어요",
    note: "Also 'to be located': 화장실이 어디 있어요? Hugely common in shops: 디카페인 있어요?" },
  { id: "ayo", ko: "-아요/어요", en: "polite present (해요체)", lvl: 1,
    how: "stem with ㅏ/ㅗ + 아요 (가요, 와요) · other + 어요 (먹어요, 마셔요) · 하다 → 해요",
    note: "THE everyday polite style for strangers, shops, and new people. Same form for statements, questions, and suggestions; tone does the work." },
  { id: "qw", ko: "뭐 · 어디 · 언제 · 누구 · 왜 · 어떻게 · 얼마 · 몇", en: "question words", lvl: 1,
    how: "what · where · when · who · why · how · how much · how many",
    note: "Korean keeps them in place: 이거 뭐예요? (this what is?). 몇 is used with counters: 몇 명, 몇 시." },
  { id: "this", ko: "이 · 그 · 저", en: "this · that · that over there", lvl: 1,
    how: "이거 / 그거 / 저거 (thing) · 여기 / 거기 / 저기 (place)",
    note: "이거 주세요 (this one please) plus pointing gets you very far." },
  { id: "juseyo", ko: "N 주세요 / -아/어 주세요", en: "please give / please do for me", lvl: 1,
    how: "N + 주세요 (물 주세요) · verb -아/어 + 주세요 (말해 주세요, 데워 주세요)",
    note: "Your most-used request. Add 좀 to soften: 물 좀 주세요." },
  { id: "seyo", ko: "-(으)세요", en: "polite request / honorific", lvl: 1,
    how: "vowel stem + 세요 (가세요) · consonant + 으세요 (앉으세요)",
    note: "Two jobs: politely telling someone to do something, and asking about THEM respectfully (뭐 하세요? = what do you do?)." },
  { id: "count", ko: "개 · 잔 · 명 · 병 · 분 · 살", en: "counters with native numbers", lvl: 1,
    how: "하나→한, 둘→두, 셋→세, 넷→네, 스물→스무 before a counter: 한 잔, 두 명, 세 개",
    note: "Things: 개 · cups: 잔 · people: 명 (honorific 분) · bottles: 병 · age: 살. Prices use Sino numbers (천, 만)." },
  { id: "formal", ko: "-ㅂ니다/습니다", en: "formal style (합니다체)", lvl: 1,
    how: "vowel stem + ㅂ니다 · consonant + 습니다 · questions -ㅂ니까?",
    note: "Announcements, news, staff scripts, and set phrases (감사합니다, 잘 먹겠습니다). Recognize it; you rarely need to produce more than the set phrases." },

  // level 2: tenses, wants, and requests
  { id: "past", ko: "-았/었어요", en: "past tense", lvl: 2,
    how: "ㅏ/ㅗ + 았어요 (갔어요) · other + 었어요 (먹었어요) · 하다 → 했어요",
    note: "Also for states that started: 배불렀어요, 왔어요. 다 왔어요 = I'm (almost) here." },
  { id: "future", ko: "-(으)ㄹ 거예요", en: "will / going to", lvl: 2,
    how: "vowel + ㄹ 거예요 (갈 거예요) · consonant + 을 거예요 (먹을 거예요)",
    note: "Plans and predictions." },
  { id: "want", ko: "-고 싶어요", en: "want to (do)", lvl: 2,
    how: "verb stem + 고 싶어요: 가고 싶어요, 먹고 싶어요",
    note: "For what YOU want. Asking someone: 뭐 먹고 싶어요?" },
  { id: "an", ko: "안 / -지 않아요", en: "not, don't", lvl: 2,
    how: "안 + verb (안 가요) · 하다 verbs: 공부 안 해요 · longer: 가지 않아요",
    note: "Spoken Korean prefers short 안." },
  { id: "mot", ko: "못", en: "can't (unable)", lvl: 2,
    how: "못 + verb: 못 가요 · 하다 verbs: 운동 못 해요 · 잘 못 해요 (not good at)",
    note: "안 = don't (choice), 못 = can't (ability/circumstance). 매운 거 잘 못 먹어요 sounds humble and natural." },
  { id: "lsu", ko: "-(으)ㄹ 수 있어요/없어요", en: "can / can't", lvl: 2,
    how: "vowel + ㄹ 수 있어요 (할 수 있어요) · consonant + 을 수 있어요 (먹을 수 있어요)",
    note: "Ability or possibility. 영어 할 수 있어요? = can you speak English?" },
  { id: "dodwae", ko: "-아/어도 돼요?", en: "may I? / it's okay to", lvl: 2,
    how: "verb -아/어 + 도 돼요: 앉아도 돼요? 써도 돼요?",
    note: "Asking permission. The answer is 네, 돼요 / 네, 그럼요, or 안 돼요." },
  { id: "aya", ko: "-아/어야 돼요", en: "have to", lvl: 2,
    how: "verb -아/어 + 야 돼요: 가야 돼요, 갈아타야 돼요",
    note: "Also -아/어야 해요, same meaning. Great excuse-maker: 내일 일찍 일어나야 돼요." },
  { id: "lkka", ko: "-(으)ㄹ까요?", en: "shall we? / shall I?", lvl: 2,
    how: "vowel + ㄹ까요 (갈까요?) · consonant + 을까요 (먹을까요?)",
    note: "Suggestions and offers. Staff use it too: 영수증 드릴까요? (shall I give you the receipt?)" },
  { id: "llae", ko: "-(으)ㄹ래요?", en: "want to? / I'll have", lvl: 2,
    how: "vowel + ㄹ래요 (볼래요?) · consonant + 을래요 (먹을래요?)",
    note: "Casual-friendly invitation (커피 마실래요?) or stating your choice (저는 라면 먹을래요)." },
  { id: "lge", ko: "-(으)ㄹ게요", en: "I'll (promise/decision)", lvl: 2,
    how: "vowel + ㄹ게요 (갈게요) · consonant + 을게요 (먹을게요)",
    note: "Your decision that affects the listener: 카드로 할게요, 먼저 갈게요. Not for asking questions." },
  { id: "go", ko: "-고", en: "and (then)", lvl: 2,
    how: "verb/adj stem + 고: 먹고 가요, 싸고 맛있어요",
    note: "Links actions or descriptions. 먹고 갈게요 = I'll eat (here) and go." },
  { id: "ing", ko: "-고 있어요", en: "be -ing", lvl: 2,
    how: "verb stem + 고 있어요: 가고 있어요, 공부하고 있어요",
    note: "Happening now, or these days. 지금 가고 있어요 = on my way." },
  { id: "reo", ko: "-(으)러 가요", en: "go (somewhere) to do", lvl: 2,
    how: "vowel + 러 (보러 가요) · consonant + 으러 (먹으러 가요)",
    note: "Purpose of going/coming. 장 보러 가요 = going grocery shopping." },
  { id: "eottae", ko: "어때요?", en: "how is…? / how about…?", lvl: 2,
    how: "N + 어때요? · 어땠어요? (how was it)",
    note: "Opinions and suggestions in one word: 토요일 어때요?" },
  { id: "jima", ko: "-지 마세요", en: "please don't", lvl: 2,
    how: "verb stem + 지 마세요 · casual: -지 마",
    note: "걱정하지 마세요 (don't worry) is the one you'll say most." },
  { id: "honor", ko: "드시다 · 계시다 · 성함", en: "honorific words", lvl: 2,
    how: "먹다/마시다 → 드시다 · 있다 → 계시다 · 이름 → 성함 · 사람 → 분",
    note: "Staff use these about YOU (드시고 가세요?). You use them about others, never about yourself." },

  // level 3: connecting ideas like a real conversation
  { id: "aseo", ko: "-아서/어서", en: "so (reason) / and then", lvl: 3,
    how: "verb -아/어 + 서: 바빠서, 걸어서, 건너서",
    note: "Reason (출근해야 돼서 = because I have to work) or a sequence where the 2nd action builds on the 1st. Not with suggestions; use -니까 there." },
  { id: "jiman", ko: "-지만", en: "but", lvl: 3,
    how: "stem + 지만: 맛있지만 비싸요",
    note: "Clear contrast. Softer, more common: -는데." },
  { id: "nikka", ko: "-(으)니까", en: "because (with suggestions)", lvl: 3,
    how: "vowel + 니까 (비싸니까) · consonant + 으니까 (늦었으니까)",
    note: "Use when the second half is a suggestion or request: 비 오니까 우산 챙기세요." },
  { id: "myeon", ko: "-(으)면", en: "if / when", lvl: 3,
    how: "vowel + 면 (오면) · consonant + 으면 (먹으면)",
    note: "도착하면 연락 주세요 = text me when you arrive." },
  { id: "neunde", ko: "-는데 / -(으)ㄴ데", en: "background / 'but…'", lvl: 3,
    how: "verb + 는데 (가는데) · adj + (으)ㄴ데 (좋은데) · past + 는데 (했는데)",
    note: "The glue of real conversation: sets up context, softens, or trails off politely. 재미있는데 좀 힘들어요." },
  { id: "neyo", ko: "-네요", en: "oh! (reacting)", lvl: 3,
    how: "stem + 네요: 맛있네요, 잘하시네요",
    note: "Reacting to something you just noticed. Makes you sound warm and natural." },
  { id: "jyo", ko: "-죠?", en: "right? / isn't it?", lvl: 3,
    how: "stem + 죠 (contraction of 지요): 맛있죠?",
    note: "Seeking agreement. Answer with 네, 그렇죠!" },
  { id: "bwa", ko: "-아/어 보다", en: "try (doing)", lvl: 3,
    how: "verb -아/어 + 보세요 / 볼게요 / 봤어요",
    note: "입어 봐도 돼요? (may I try it on?) · 가 본 적 있어요? (ever been?)" },
  { id: "jeok", ko: "-(으)ㄴ 적 있어요", en: "have ever (done)", lvl: 3,
    how: "verb -아/어 본 적 있어요: 가 본 적 있어요?",
    note: "Experience questions, great for small talk." },
  { id: "gat", ko: "-(으)ㄴ/는/(으)ㄹ 것 같아요", en: "I think / it seems", lvl: 3,
    how: "future guess: 늦을 것 같아요 · now: 좋은 것 같아요",
    note: "Koreans soften opinions with this constantly. Using it makes you sound polite and fluent." },
  { id: "boda", ko: "보다 (더)", en: "more than", lvl: 3,
    how: "N + 보다 (더) + adj: 이거보다 싼 거",
    note: "Comparisons: 어제보다 더 추워요." },
  { id: "banmal", ko: "반말 -아/어", en: "casual speech (drop 요)", lvl: 3,
    how: "polite minus 요: 먹어요 → 먹어 · 이에요 → 이야/야 · 네 → 응",
    note: "With close friends, or when someone older invites you to (말 놓기). Using it uninvited with strangers or elders is rude." },
  { id: "ja", ko: "-자 / -(으)ㄹ래?", en: "let's / wanna? (casual)", lvl: 3,
    how: "stem + 자 (가자!) · -(으)ㄹ래? (먹을래?)",
    note: "Casual suggestions between friends." },

  // describing yourself, shopping for clothes, traveling, meeting family
  { id: "mod", ko: "-(으)ㄴ / -는 + N", en: "describing a noun", lvl: 2,
    how: "adjective + (으)ㄴ: 큰 사이즈, 밝은 성격 · verb + 는: 좋아하는 음식",
    note: "The description goes BEFORE the noun: 제가 제일 좋아하는 음식 = the food I like most." },
  { id: "gi", ko: "-는 거", en: "-ing (a verb as a thing)", lvl: 2,
    how: "verb + 는 거: 요리하는 거 좋아해요 · 잘 웃는 거예요",
    note: "Turns a verb into something you like, hate, or are good at. Written style: -기 (요리하기)." },
  { id: "si", ko: "-(으)시-", en: "honorific verbs (about elders)", lvl: 2,
    how: "하다 → 하세요 / 하셨어요 · 다니다 → 다니세요 · 이다 → 이세요",
    note: "Use it about your partner's parents, older people, and even your own parents when talking to elders. Never about yourself." },
  { id: "pyeon", ko: "-(으)ㄴ/는 편이에요", en: "tend to be / on the … side", lvl: 3,
    how: "adj + (으)ㄴ 편이에요 (조용한 편이에요) · verb + 는 편이에요 (잘 먹는 편이에요)",
    note: "The modest way to describe yourself. Koreans avoid flat claims about their own good points." },
  { id: "ttae", ko: "-(으)ㄹ 때", en: "when (doing)", lvl: 3,
    how: "vowel + ㄹ 때 (쉴 때) · consonant + 을 때 (시간 있을 때) · N 때 (휴가 때)",
    note: "시간 있을 때 보통 뭐 해요? = what do you usually do when you have time?" },
  { id: "boyeo", ko: "-아/어 보여요", en: "looks (adjective)", lvl: 3,
    how: "adj -아/어 + 보여요: 커 보여요, 젊어 보이세요",
    note: "How something looks: 이거 좀 작아 보여요. A compliment to elders: 젊어 보이세요!" },
  { id: "ryeogo", ko: "-(으)려고", en: "in order to / planning to", lvl: 3,
    how: "vowel + 려고 (사려고) · consonant + 으려고 (먹으려고) · -(으)려고요 as a short reply",
    note: "선물 사려고 왔어요 = I came to buy a gift. 체크인하려고요 = I'd like to check in." },
  { id: "julal", ko: "-(으)ㄹ 줄 알아요", en: "know how to", lvl: 3,
    how: "vowel + ㄹ 줄 알아요 (칠 줄 알아요) · consonant + 을 줄 (먹을 줄) · can't: -ㄹ 줄 몰라요",
    note: "Skills: 기타 칠 줄 알아요, 운전할 줄 몰라요." },
  { id: "ji", ko: "-(으)ㄴ 지 + time + 됐어요", en: "it's been (time) since", lvl: 3,
    how: "verb + (으)ㄴ 지: 만난 지 2년 됐어요 · 온 지 한 달 됐어요",
    note: "Couples always get asked: 사귄 지 얼마나 됐어요? (how long have you been dating?)" },
];

const SCENES = [
  { id: "basics", ko: "동네 입구", en: "Basics", icon: "👋", place: "Neighborhood gate",
    char: { name: "박 아저씨", role: "the building's security guard", emoji: "👮", elder: true },
    can: "Greet people, thank them, and keep a conversation going when you're lost" },
  { id: "meet", ko: "첫 만남", en: "Meeting people", icon: "🤝", place: "Language exchange",
    char: { name: "지수", role: "your language-exchange partner", emoji: "🙋‍♀️" },
    can: "Introduce yourself and answer the usual first questions" },
  { id: "aboutme", ko: "나에 대해", en: "Describing yourself", icon: "🪞", place: "Tutoring session",
    char: { name: "김 선생님", role: "your Korean tutor", emoji: "👩‍🏫", elder: true },
    can: "Describe your personality, hobbies, family, and why you're learning Korean" },
  { id: "cafe", ko: "카페", en: "Café", icon: "☕", place: "Corner café",
    char: { name: "윤 사장님", role: "the café owner", emoji: "👩‍🍳", elder: true },
    can: "Order drinks exactly the way you like them" },
  { id: "store", ko: "편의점", en: "Convenience store", icon: "🏪", place: "GS25 on the corner",
    char: { name: "태현", role: "the part-timer at the register", emoji: "🧑‍💼" },
    can: "Buy things, heat food, top up your card, and answer the clerk's questions" },
  { id: "restaurant", ko: "식당", en: "Restaurant", icon: "🍲", place: "Kimchi stew place",
    char: { name: "이모", role: "the restaurant auntie", emoji: "👵", elder: true },
    can: "Get a table, order, ask for refills, and pay" },
  { id: "transit", ko: "지하철·택시", en: "Getting around", icon: "🚕", place: "Station & taxi stand",
    char: { name: "기사님", role: "a chatty taxi driver", emoji: "🚖", elder: true },
    can: "Take taxis, ride the subway, and ask for directions" },
  { id: "shopping", ko: "시장·쇼핑", en: "Shopping & market", icon: "🛍️", place: "Traditional market",
    char: { name: "시장 아주머니", role: "a market vendor", emoji: "🧺", elder: true },
    can: "Ask prices, sizes, and colors, and haggle a little" },
  { id: "clothes", ko: "옷 가게", en: "Clothes shopping", icon: "👕", place: "Myeongdong boutique",
    char: { name: "수아", role: "the shop assistant", emoji: "💁‍♀️" },
    can: "Find your size, try things on, say how it fits, and get a tax refund" },
  { id: "hotel", ko: "호텔·공항", en: "Hotel & airport", icon: "🧳", place: "Incheon Airport & your hotel",
    char: { name: "프런트 직원", role: "the hotel front-desk clerk", emoji: "🛎️" },
    can: "Check in, fix problems with your room, and get through the airport" },
  { id: "sights", ko: "관광", en: "Sightseeing", icon: "📸", place: "Gyeongbokgung Palace",
    char: { name: "가이드 아저씨", role: "a friendly tour guide", emoji: "🧢", elder: true },
    can: "Buy tickets, ask for photos and recommendations, and rent a hanbok" },
  { id: "smalltalk", ko: "스몰토크", en: "Small talk", icon: "💬", place: "The gym",
    char: { name: "동현", role: "your gym buddy", emoji: "🏋️" },
    can: "Chat about age, hobbies, weekends, and life in Korea" },
  { id: "plans", ko: "약속 잡기", en: "Making plans", icon: "📅", place: "KakaoTalk",
    char: { name: "지수", role: "texting you on KakaoTalk", emoji: "📱" },
    can: "Suggest plans, pick a time and place, and say you're running late" },
  { id: "night", ko: "술자리·노래방", en: "Night out", icon: "🍻", place: "Pojangmacha & noraebang",
    char: { name: "동현", role: "out with you and his friends", emoji: "🎤" },
    can: "Handle drinking etiquette, karaoke, and leaving gracefully" },
  { id: "friends", ko: "반말 친구", en: "Friends (반말)", icon: "🫶", place: "Han River park",
    char: { name: "지수", role: "now a close friend", emoji: "🫶" },
    can: "Switch to casual speech with friends" },
  { id: "inlaws", ko: "가족 만남", en: "Meeting the family", icon: "🏡", place: "Your partner's parents' home",
    char: { name: "어머님", role: "your partner Jimin's mother", emoji: "👩‍🦳", elder: true },
    can: "Greet your partner's parents, describe yourself politely, and handle the family dinner" },
  { id: "trouble", ko: "도움 요청", en: "Getting help", icon: "💊", place: "Pharmacy",
    char: { name: "약사님", role: "the neighborhood pharmacist", emoji: "🧑‍⚕️", elder: true },
    can: "Describe symptoms, get medicine, and handle lost items" },
  { id: "daily", ko: "일상 대화", en: "Everyday talk", icon: "☀️", place: "Your street",
    char: { name: "옆집 할머니", role: "your next-door grandma", emoji: "👵", elder: true },
    can: "Talk about weather, feelings, and your day" },
];

const SENTENCES = [];
const DIALOGUES = [];
const ORDER = {};    // scene -> item ids in teaching order (sentences and dialogues mixed)

function _hash(s) { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
function _add(scene, id) { (ORDER[scene] = ORDER[scene] || []).push(id); }
function S(scene, ko, en, pats = "", gl = "", hear = false) {
  const id = scene + ":" + _hash(ko);
  SENTENCES.push({ id, kind: "s", scene, ko, en, pats: pats ? pats.split(" ") : [], gl, hear });
  _add(scene, id);
}
function H(scene, ko, en, pats = "", gl = "") { S(scene, ko, en, pats, gl, true); }
function N(ko, en, casual) { return { who: "npc", ko, en, casual }; }
function M(...opts) { return { who: "me", opts: opts.map(([ko, en, why], i) => ({ ko, en, why, ok: i === 0 })) }; }
function D(id, scene, title, turns) { DIALOGUES.push({ id: "d:" + id, kind: "d", scene, title, turns }); _add(scene, "d:" + id); }

// ───────────────────────── 동네 입구 · Basics ─────────────────────────
S("basics", "안녕하세요.", "Hello.", "seyo", "lit. 'are you at peace?'|works any time of day");
S("basics", "감사합니다.", "Thank you.", "formal", "the standard thank-you");
S("basics", "고맙습니다.", "Thank you.", "formal", "native-Korean thank-you, a touch warmer");
S("basics", "괜찮아요.", "It's okay. / No thanks.", "ayo", "괜찮다=to be okay|also a polite 'no thanks'");
S("basics", "네, 맞아요.", "Yes, that's right.", "ayo", "네=yes|맞다=to be correct");
S("basics", "아니요, 괜찮아요.", "No, I'm fine (thanks).", "ayo", "아니요=no");
S("basics", "저기요.", "Excuse me! (getting attention)", "", "lit. 'over there'|calls staff or a stranger");
S("basics", "잠깐만요.", "Just a moment. / Excuse me (squeezing past)", "", "잠깐=a moment|만=just");
S("basics", "죄송합니다.", "I'm sorry.", "formal", "formal apology, safest with strangers");
S("basics", "미안해요.", "Sorry.", "ayo", "softer, for small things");
S("basics", "다시 한 번 말해 주세요.", "Please say it one more time.", "juseyo", "다시=again|한 번=one time|말하다=to say");
S("basics", "천천히 말해 주세요.", "Please speak slowly.", "juseyo", "천천히=slowly");
D("guard-hello", "basics", "Morning at the building gate", [
  N("안녕하세요! 출근해요?", "Hello! Off to work?", "어, 왔어? 출근해?"),
  M(["네, 안녕하세요!", "Yes, hello!"],
    ["응, 안녕!", "Yeah, hi!", "That's 반말: too casual for an older man you barely know."],
    ["안녕히 가세요!", "Goodbye (to someone leaving)!", "That's a goodbye, and you're the one leaving."]),
  N("오늘 날씨 춥다. 따뜻하게 입어요.", "It's cold today. Dress warm.", "오늘 춥다. 따뜻하게 입고 다녀."),
  M(["감사합니다. 좋은 하루 보내세요!", "Thank you. Have a good day!"],
    ["괜찮아요. 안 추워요.", "It's fine. I'm not cold.", "Not wrong, but brushing off an elder's care sounds cold. A thank-you lands better."],
    ["죄송합니다.", "I'm sorry.", "Nothing to apologize for here."]),
]);
S("basics", "잘 모르겠어요.", "I'm not sure. / I don't really know.", "ayo", "잘=well|모르다=to not know");
S("basics", "이해 못 했어요.", "I didn't understand.", "mot past", "이해하다=to understand|못=couldn't");
S("basics", "한국어 조금 할 수 있어요.", "I can speak a little Korean.", "lsu", "한국어=Korean|조금=a little");
S("basics", "영어 할 수 있어요?", "Can you speak English?", "lsu", "영어=English");
S("basics", "이거 한국어로 뭐예요?", "What's this in Korean?", "this qw ieyo", "이거=this|한국어로=in Korean|뭐=what");
S("basics", "이게 무슨 뜻이에요?", "What does this mean?", "qw ieyo", "이게=this (subject)|무슨=what kind of|뜻=meaning");
S("basics", "화장실 어디예요?", "Where's the bathroom?", "qw ieyo", "화장실=bathroom|어디=where");
S("basics", "안녕히 계세요.", "Goodbye. (to someone staying)", "seyo honor", "you're leaving, they stay|계시다=honorific 'stay'");
S("basics", "안녕히 가세요.", "Goodbye. (to someone leaving)", "seyo", "they're leaving|가다=to go");
S("basics", "수고하세요.", "Take care! (leaving a shop)", "seyo", "lit. 'keep up the hard work'|said to staff as you leave");
S("basics", "좋은 하루 보내세요.", "Have a good day.", "seyo", "좋은=good|하루=day|보내다=to spend");
S("basics", "실례합니다.", "Excuse me. (formal)", "formal", "before interrupting or asking a stranger something");
D("guard-package", "basics", "A package for you", [
  N("택배 왔어요. 여기 이름 맞아요?", "A package came. Is this your name?", "택배 왔어. 이거 이름 맞지?"),
  M(["네, 맞아요. 감사합니다!", "Yes, that's right. Thank you!"],
    ["네, 아니에요.", "Yes, it isn't.", "Mixed signals: 네 + 아니에요 contradicts itself."],
    ["이게 무슨 뜻이에요?", "What does this mean?", "He asked a simple yes/no question."]),
  N("다음부터는 경비실에서 찾아가요.", "Next time, pick it up from the guard office.", "다음부터는 경비실에서 찾아가."),
  M(["죄송한데 천천히 말해 주세요.", "Sorry, but please speak slowly."],
    ["천천히 말해요.", "Speak slowly.", "Sounds like an order. Add 주세요 to make it a polite request."],
    ["저도요.", "Me too.", "Doesn't respond to what he said."]),
  N("다음부터는, 경비실에서, 찾아가요. 알았죠?", "Next time — from the guard office — pick it up. Got it?", "다음부터는, 경비실에서, 찾아가. 알았지?"),
  M(["네, 알겠습니다. 감사합니다!", "Yes, understood. Thank you!"],
    ["몰라요.", "I don't know.", "Too blunt, and you did get it this time."],
    ["안녕히 계세요.", "Goodbye.", "A goodbye before answering him is abrupt."]),
]);

// ───────────────────────── 첫 만남 · Meeting people ─────────────────────────
S("meet", "처음 뵙겠습니다.", "Nice to meet you. (very polite)", "formal honor", "lit. 'I see you for the first time'|뵙다=humble 'to see'");
S("meet", "만나서 반가워요.", "Nice to meet you.", "aseo ayo", "만나다=to meet|반갑다=to be glad");
S("meet", "저는 {name}{이에요}.", "I'm {name}.", "topic ieyo", "저=I (polite)");
S("meet", "이름이 뭐예요?", "What's your name?", "subj qw ieyo", "이름=name");
H("meet", "성함이 어떻게 되세요?", "May I ask your name? (very polite)", "honor qw", "성함=honorific 'name'|어떻게 되세요=how is it (polite)");
S("meet", "어느 나라 사람이에요?", "Which country are you from?", "qw ieyo", "어느=which|나라=country|사람=person");
S("meet", "저는 미국 사람이에요.", "I'm American.", "topic ieyo", "미국=USA|사람=person");
S("meet", "미국에서 왔어요.", "I'm from the US. (I came from the US)", "eseo past", "오다=to come|왔어요=came");
S("meet", "한국어 공부하고 있어요.", "I'm studying Korean.", "ing", "공부하다=to study");
H("meet", "한국어 잘하시네요!", "You speak Korean so well!", "neyo seyo", "잘하다=to be good at|people WILL say this");
S("meet", "아니에요, 아직 잘 못해요.", "Oh no, I'm not good yet.", "mot", "아직=still/yet|the humble reply to a compliment");
D("exchange-intro", "meet", "First language exchange", [
  N("안녕하세요! 혹시 {name} 씨?", "Hi! Are you {name}, by any chance?"),
  M(["네, 맞아요. 만나서 반가워요!", "Yes, that's me. Nice to meet you!"],
    ["네, {name} 씨예요.", "Yes, I'm Mr./Ms. {name}.", "Never put 씨 on your own name; it's a title for others."],
    ["안녕히 가세요!", "Goodbye!", "You just met!"]),
  N("저는 지수예요. 한국어 공부한 지 얼마나 됐어요?", "I'm Jisu. How long have you been studying Korean?"),
  M(["일 년 정도 됐어요. 아직 잘 못해요.", "About a year. I'm not good yet."],
    ["저는 지수예요.", "I'm Jisu.", "That's her name, not yours!"],
    ["네, 공부해요.", "Yes, I study.", "She asked how long, not whether."]),
  N("에이, 한국어 잘하시는데요?", "Come on, you speak Korean well!"),
  M(["아니에요. 감사합니다!", "Oh no, not really. Thank you!"],
    ["네, 저 한국어 잘해요.", "Yes, I'm good at Korean.", "Accepting compliments outright sounds a bit boastful. The humble deflection is expected."],
    ["죄송합니다.", "I'm sorry.", "No need to apologize for a compliment."]),
]);
H("meet", "한국에 온 지 얼마나 됐어요?", "How long have you been in Korea?", "past qw", "온 지=since coming|얼마나=how long");
S("meet", "한 달 됐어요.", "It's been a month.", "past count", "한 달=one month|되다=to become (amount of time)");
S("meet", "무슨 일 하세요?", "What do you do (for work)?", "seyo qw", "무슨 일=what work");
S("meet", "저는 학생이에요.", "I'm a student.", "topic ieyo", "학생=student");
S("meet", "대학교에 다녀요.", "I go to university.", "e ayo", "대학교=university|다니다=to attend regularly");
S("meet", "저도요.", "Me too.", "do", "저=I|도=too|요 keeps it polite");
S("meet", "카톡 있어요?", "Do you have KakaoTalk?", "isseo", "카톡=KakaoTalk, everyone's messenger");
S("meet", "번호 좀 알려 줄 수 있어요?", "Could you give me your number?", "juseyo lsu", "번호=number|알려 주다=to let (someone) know");
S("meet", "다음에 또 만나요.", "Let's meet again next time.", "ayo", "다음에=next time|또=again");
S("meet", "오늘 반가웠어요.", "It was nice meeting you today.", "past", "반갑다=to be glad (to see)");
D("exchange-numbers", "meet", "Wrapping up the exchange", [
  N("오늘 진짜 재미있었어요!", "Today was really fun!"),
  M(["저도요! 다음에 또 만나요.", "Me too! Let's meet again next time."],
    ["저는요.", "As for me.", "Unfinished: 저는요 sounds like you're about to say something else."],
    ["재미없어요.", "It's not fun.", "Ouch."]),
  N("좋아요! 카톡 있어요?", "Sure! Do you have KakaoTalk?"),
  M(["네, 있어요. 아이디 알려 줄게요.", "Yes, I do. I'll give you my ID."],
    ["네, 없어요.", "Yes, I don't.", "네 + 없어요 contradicts itself; if you don't, say 아니요, 없어요."],
    ["카톡이 뭐예요?", "What's KakaoTalk?", "Everyone in Korea uses it. Worth installing!"]),
]);

// ───────────────────────── 카페 · Café ─────────────────────────
H("cafe", "주문하시겠어요?", "Would you like to order?", "seyo", "주문하다=to order");
S("cafe", "아이스 아메리카노 한 잔 주세요.", "One iced americano, please.", "juseyo count", "한 잔=one cup");
S("cafe", "따뜻한 라떼 두 잔 주세요.", "Two hot lattes, please.", "juseyo count", "따뜻한=warm, hot|두 잔=two cups");
H("cafe", "드시고 가세요?", "For here? (lit. drinking and going?)", "honor go seyo", "드시다=honorific eat/drink");
S("cafe", "여기서 마시고 갈게요.", "I'll drink it here.", "eseo go lge", "여기서=here|마시다=to drink");
S("cafe", "포장해 주세요.", "To go, please.", "juseyo", "포장=packing, takeout");
S("cafe", "테이크아웃이요.", "Takeout.", "", "noun + 이요 = super common short answer");
S("cafe", "큰 걸로 주세요.", "A large one, please.", "juseyo", "큰=big|걸로=with the one");
S("cafe", "덜 달게 해 주세요.", "Less sweet, please.", "juseyo", "덜=less|달게=sweetly");
S("cafe", "샷 추가해 주세요.", "Add a shot, please.", "juseyo", "추가하다=to add");
S("cafe", "얼음 조금만 넣어 주세요.", "Just a little ice, please.", "juseyo", "얼음=ice|조금만=just a little|넣다=to put in");
D("cafe-order", "cafe", "Ordering at the counter", [
  N("어서 오세요! 주문하시겠어요?", "Welcome! Ready to order?", "어서 와~ 오늘은 뭐 줄까?"),
  M(["아이스 아메리카노 한 잔 주세요.", "One iced americano, please."],
    ["아이스 아메리카노 한 잔 줘.", "Gimme an iced americano.", "That's 반말: too casual with the café owner."],
    ["아이스 아메리카노 한 잔 마셨어요.", "I drank an iced americano.", "Past tense: you haven't had it yet."]),
  N("드시고 가세요?", "For here?", "여기서 마시고 갈 거야?"),
  M(["네, 여기서 마시고 갈게요.", "Yes, I'll drink it here."],
    ["네, 드시고 갈게요.", "Yes, I'll (honorably) drink here.", "드시다 is honorific: never use it about yourself. Use 마시다."],
    ["포장 있어요?", "Is there packing?", "Unclear. To-go would be 포장해 주세요."]),
  N("네, 사천오백 원입니다.", "Okay, that's 4,500 won.", "사천오백 원이야."),
  M(["카드로 할게요.", "I'll pay by card."],
    ["카드로 할까요?", "Shall I do card?", "You're telling her, not asking; -(으)ㄹ게요 fits."],
    ["사천오백 원 주세요.", "Please give me 4,500 won.", "You're paying, not collecting!"]),
]);
S("cafe", "뭐가 제일 맛있어요?", "What's the best thing here?", "subj qw", "제일=most|맛있다=to be tasty");
S("cafe", "디카페인 있어요?", "Do you have decaf?", "isseo", "디카페인=decaf");
S("cafe", "여기 앉아도 돼요?", "May I sit here?", "dodwae", "앉다=to sit");
S("cafe", "와이파이 비밀번호 알려 주세요.", "Please tell me the Wi-Fi password.", "juseyo", "비밀번호=password");
S("cafe", "화장실 비밀번호가 뭐예요?", "What's the bathroom code?", "subj qw ieyo", "café bathrooms are often locked with a code");
S("cafe", "카드로 계산할게요.", "I'll pay by card.", "lge", "계산하다=to pay, settle the bill");
H("cafe", "영수증 필요하세요?", "Do you need the receipt?", "seyo", "영수증=receipt|필요하다=to need");
S("cafe", "영수증은 버려 주세요.", "Please throw away the receipt.", "topic juseyo", "버리다=to throw away");
H("cafe", "진동벨 울리면 가지러 오세요.", "Come pick it up when the buzzer rings.", "myeon reo seyo", "진동벨=vibrating buzzer|울리다=to ring|가지러=to get");
S("cafe", "커피 진짜 맛있네요.", "The coffee is really good!", "neyo", "진짜=really");
S("cafe", "잘 마셨습니다.", "Thanks for the drink. (leaving)", "formal past", "lit. 'I drank well'");
D("cafe-custom", "cafe", "Making it your way", [
  N("또 오셨네요! 오늘도 아이스 아메리카노?", "You're back! Iced americano again today?", "또 왔네! 오늘도 아아?"),
  M(["네! 근데 오늘은 덜 달게 바닐라 라떼 주세요.", "Yes! But today a vanilla latte, less sweet please."],
    ["네! 근데 오늘은 바닐라 라떼 덜 달아요.", "Yes! But today vanilla latte is less sweet.", "That's describing the latte, not asking for it. -게 해 주세요 makes it a request."],
    ["아니요, 아이스 아메리카노 주세요.", "No, iced americano please.", "아니요 then ordering exactly that is contradictory."]),
  N("얼음은 많이 넣어 드릴까요?", "Shall I put in lots of ice?", "얼음 많이 넣어 줄까?"),
  M(["아니요, 조금만 넣어 주세요.", "No, just a little please."],
    ["네, 조금 넣어 드릴게요.", "Yes, I'll put a little in for you.", "넣어 드릴게요 means YOU will do it for her."],
    ["얼음이 없어요.", "There's no ice.", "She's offering, not asking whether you have ice."]),
  N("네, 금방 해 드릴게요. 진동벨 울리면 가지러 오세요.", "Sure, coming right up. Come get it when the buzzer rings.", "금방 해 줄게. 벨 울리면 가지러 와."),
  M(["네, 감사합니다!", "Okay, thank you!"],
    ["진동벨 주세요.", "Give me the buzzer.", "She's already giving it to you."],
    ["안녕히 계세요.", "Goodbye.", "You're still waiting for your drink!"]),
]);

// ───────────────────────── 편의점 · Convenience store ─────────────────────────
S("store", "이거 얼마예요?", "How much is this?", "this qw ieyo", "얼마=how much");
H("store", "봉투 필요하세요?", "Do you need a bag?", "seyo", "봉투=bag (bags cost extra)");
S("store", "봉투 하나 주세요.", "One bag, please.", "juseyo count", "하나=one");
S("store", "이거 데워 주세요.", "Please heat this up.", "this juseyo", "데우다=to heat up");
S("store", "전자레인지 써도 돼요?", "Can I use the microwave?", "dodwae", "전자레인지=microwave|쓰다=to use");
S("store", "이거 원 플러스 원이에요?", "Is this buy-one-get-one?", "this ieyo", "1+1 deals are everywhere");
H("store", "하나 더 가져오셔도 돼요.", "You can bring one more.", "dodwae seyo", "더=more|가져오다=to bring");
H("store", "포인트 적립하시겠어요?", "Would you like to collect points?", "seyo", "적립=saving up (points)");
S("store", "멤버십 없어요.", "I don't have a membership.", "isseo", "없다=to not have");
S("store", "교통카드 충전해 주세요.", "Please top up my transit card.", "juseyo", "교통카드=transit card|충전=charging");
S("store", "만 원 충전해 주세요.", "Charge 10,000 won, please.", "juseyo", "만=10,000");
D("store-checkout", "store", "At the register", [
  N("봉투 필요하세요?", "Do you need a bag?"),
  M(["네, 하나 주세요.", "Yes, one please."],
    ["네, 하나 있어요.", "Yes, I have one.", "If you have one, the answer is 아니요, 괜찮아요."],
    ["네, 봉투예요.", "Yes, it's a bag.", "Doesn't answer the question."]),
  N("포인트 적립하시겠어요?", "Would you like to collect points?"),
  M(["아니요, 괜찮아요.", "No, that's okay."],
    ["포인트 주세요.", "Give me points.", "You'd need a membership; 괜찮아요 is the easy way out."],
    ["네, 적립했어요.", "Yes, I collected.", "Past tense doesn't fit; nothing happened yet."]),
  N("카드 꽂아 주세요.", "Please insert your card."),
  M(["네. 그리고 이거 데워 주세요.", "Okay. And please heat this up."],
    ["카드 꽂아 주세요.", "Please insert your card.", "That's what HE says."],
    ["데워요.", "(It) heats.", "Not a request. Use -아/어 주세요."]),
]);
S("store", "젓가락 주세요.", "Chopsticks, please.", "juseyo", "젓가락=chopsticks");
S("store", "삼각김밥 어디 있어요?", "Where are the triangle kimbap?", "qw isseo", "삼각김밥=triangle rice ball");
S("store", "우유는 저쪽에 있어요.", "The milk is over there.", "topic e isseo", "저쪽=that side, over there");
S("store", "뜨거운 물 어디 있어요?", "Where's the hot water?", "qw isseo", "뜨거운=hot|물=water");
S("store", "컵라면 먹고 갈게요.", "I'll eat the cup ramen here.", "go lge", "컵라면=cup noodles");
H("store", "영수증 드릴까요?", "Shall I give you the receipt?", "lkka honor", "드리다=humble 'give'");
H("store", "카드 꽂아 주세요.", "Please insert your card.", "juseyo", "꽂다=to insert");
S("store", "이거 많이 매워요?", "Is this very spicy?", "this ayo", "많이=a lot|맵다=to be spicy");
H("store", "신분증 보여 주세요.", "Please show your ID.", "juseyo", "신분증=ID card|보여 주다=to show");
D("store-ramen", "store", "Late-night ramen", [
  N("이거 계산하시겠어요?", "Ringing this up?"),
  M(["네. 근데 뜨거운 물 어디 있어요?", "Yes. But where's the hot water?"],
    ["네. 근데 뜨거운 물 있어요.", "Yes. But there's hot water.", "Statement, not a question: add 어디 to ask where."],
    ["아니요, 계산하세요.", "No, you pay.", "Confusing: you're the customer."]),
  N("저쪽에 있어요. 여기서 드시고 가세요?", "Over there. Eating here?"),
  M(["네, 먹고 갈게요.", "Yes, I'll eat here."],
    ["네, 드시고 갈게요.", "Yes, I'll (honorably) eat here.", "Honorific 드시다 is for others, never yourself."],
    ["네, 먹었어요.", "Yes, I ate.", "You haven't eaten it yet."]),
]);

// ───────────────────────── 식당 · Restaurant ─────────────────────────
H("restaurant", "몇 분이세요?", "How many people?", "count honor qw", "분=honorific counter for people");
S("restaurant", "두 명이요.", "Two people.", "count", "명=counter for people");
S("restaurant", "혼자 왔어요.", "I came alone.", "past", "혼자=alone");
S("restaurant", "메뉴판 좀 주세요.", "Can I get a menu, please?", "juseyo", "메뉴판=menu|좀=softener");
S("restaurant", "추천해 주세요.", "Please recommend something.", "juseyo", "추천하다=to recommend");
S("restaurant", "김치찌개 하나랑 비빔밥 하나 주세요.", "One kimchi stew and one bibimbap, please.", "hago count juseyo", "랑=and");
S("restaurant", "저 매운 거 잘 못 먹어요.", "I can't really eat spicy food.", "mot", "매운 거=spicy stuff");
S("restaurant", "덜 맵게 해 주세요.", "Make it less spicy, please.", "juseyo", "덜=less|맵게=spicily");
S("restaurant", "파 빼 주세요.", "No green onions, please.", "juseyo", "파=green onion|빼다=to take out");
H("restaurant", "고기는 2인분부터 주문돼요.", "Meat orders start at 2 servings.", "topic", "인분=servings|부터=from");
D("restaurant-order", "restaurant", "Lunch at the stew place", [
  N("어서 오세요! 몇 분이세요?", "Welcome! How many?", "왔어? 몇 명이야?"),
  M(["혼자 왔어요.", "I came alone."],
    ["한 분이에요.", "One honorable person.", "분 is honorific: don't use it for yourself. Say 한 명이요 or 혼자요."],
    ["몇 분이세요?", "How many?", "That's her question."]),
  N("이쪽에 앉으세요. 뭐 드릴까요?", "Sit over here. What can I get you?", "여기 앉아. 뭐 줄까?"),
  M(["김치찌개 하나 주세요. 근데 덜 맵게 해 주세요.", "One kimchi stew please. But less spicy, please."],
    ["김치찌개 하나 드릴게요.", "I'll give you one kimchi stew.", "드릴게요 = I'll give (to you). You want to receive: 주세요."],
    ["김치찌개 맛있어요?", "Is kimchi stew good?", "Fine to ask, but then you still haven't ordered."]),
  N("네~ 물은 셀프예요.", "Okay~ Water is self-serve.", "알았어~ 물은 셀프야."),
  M(["아, 네! 감사합니다.", "Oh, okay! Thank you."],
    ["물 주세요.", "Water, please.", "She just said water is self-serve: grab it yourself."],
    ["셀프 주세요.", "Self, please.", "Not a thing."]),
]);
H("restaurant", "물은 셀프예요.", "Water is self-serve.", "topic ieyo", "셀프=self-service");
S("restaurant", "이모, 여기 반찬 좀 더 주세요!", "Auntie, more side dishes here please!", "juseyo", "반찬=side dishes (refills are free)");
S("restaurant", "앞접시 주세요.", "Small plates, please.", "juseyo", "앞접시=individual plates for sharing");
S("restaurant", "공깃밥 하나 추가요.", "One more bowl of rice.", "count", "공깃밥=bowl of rice|추가=addition");
H("restaurant", "맛있게 드세요.", "Enjoy your meal.", "honor seyo", "맛있게=deliciously");
S("restaurant", "잘 먹겠습니다.", "Thank you for the food. (before eating)", "formal", "lit. 'I will eat well'");
S("restaurant", "진짜 맛있어요!", "It's really delicious!", "ayo", "진짜=really");
S("restaurant", "잘 먹었습니다.", "Thank you for the meal. (after)", "formal past", "say it to staff on the way out");
S("restaurant", "계산은 어디서 해요?", "Where do I pay?", "topic eseo qw", "계산=bill, paying");
S("restaurant", "따로 계산할게요.", "We'll pay separately.", "lge", "따로=separately");
S("restaurant", "오늘은 제가 살게요.", "Today it's on me.", "topic lge", "사다=to buy (treat)");
S("restaurant", "포장 돼요?", "Can I get it to go?", "", "포장=takeout|되다=to be possible");
D("restaurant-pay", "restaurant", "Paying up", [
  N("맛있게 드셨어요?", "Did you enjoy your meal?", "맛있게 먹었어?"),
  M(["네, 진짜 맛있었어요. 잘 먹었습니다!", "Yes, it was really good. Thank you for the meal!"],
    ["네, 맛있게 드셨어요.", "Yes, I (honorably) ate deliciously.", "Echoing 드시다 about yourself is the classic mistake. Use 먹었어요."],
    ["잘 먹겠습니다!", "Thanks for the food (before eating)!", "That's for BEFORE you eat."]),
  N("다음에 또 와요~", "Come again~", "다음에 또 와~"),
  M(["네, 또 올게요! 안녕히 계세요.", "Yes, I'll come again! Goodbye."],
    ["네, 안녕히 가세요.", "Yes, goodbye (to someone leaving).", "She's staying; you're leaving: 안녕히 계세요."],
    ["네, 또 와요.", "Yes, come again.", "You're echoing her invitation back at her."]),
]);

// ───────────────────────── 지하철·택시 · Getting around ─────────────────────────
H("transit", "어디로 모실까요?", "Where can I take you?", "lkka honor", "모시다=to escort (honorific)");
S("transit", "홍대입구역으로 가 주세요.", "Hongik University Station, please.", "juseyo", "역=station|으로=toward");
S("transit", "여기로 가 주세요.", "Please take me here. (showing your phone)", "this juseyo", "여기=here");
S("transit", "얼마나 걸려요?", "How long does it take?", "qw ayo", "걸리다=to take (time)");
S("transit", "카드 돼요?", "Do you take cards?", "", "되다=to work, be possible");
S("transit", "여기서 세워 주세요.", "Please stop here.", "eseo juseyo", "세우다=to stop (a car)");
S("transit", "저 앞에서 내려 주세요.", "Please drop me off up ahead.", "eseo juseyo", "앞=front|내리다=to get off");
S("transit", "천천히 가 주세요.", "Please drive slowly.", "juseyo", "천천히=slowly");
D("taxi-ride", "transit", "Taxi to Hongdae", [
  N("어디로 모실까요?", "Where can I take you?", "어디 가?"),
  M(["홍대입구역으로 가 주세요.", "Hongik Univ. Station, please."],
    ["홍대입구역에서 가 주세요.", "Please go from Hongik Univ. Station.", "에서 = from/at. The destination takes (으)로 or 에."],
    ["홍대입구역 모실까요?", "Shall I escort Hongik Station?", "That's his line, and honorific at that."]),
  N("외국에서 오셨어요? 한국말 잘하시네!", "Are you from abroad? You speak Korean well!", "외국에서 왔어? 한국말 잘하네!"),
  M(["아니에요, 아직 많이 배워야 돼요.", "Not at all, I still have to learn a lot."],
    ["네, 잘해요.", "Yes, I'm good at it.", "Accepting outright sounds boastful."],
    ["외국에서 오셨어요.", "(Someone honorable) came from abroad.", "Honorific about yourself: say 왔어요."]),
  N("다 왔어요. 어디서 세워 드릴까요?", "We're here. Where shall I stop?", "다 왔다. 어디서 세워 줄까?"),
  M(["저 앞에서 세워 주세요. 카드 돼요?", "Stop up ahead please. Do you take card?"],
    ["저 앞에서 세워 드릴게요.", "I'll stop up ahead for you.", "드릴게요 = you'll do it for him. He's driving!"],
    ["다 왔어요.", "We're here.", "He just said that."]),
]);
S("transit", "강남역 어떻게 가요?", "How do I get to Gangnam Station?", "qw ayo", "어떻게=how");
S("transit", "몇 호선 타야 돼요?", "Which line do I need to take?", "qw aya", "호선=subway line|타다=to ride");
H("transit", "2호선 타세요.", "Take Line 2.", "seyo", "lines are numbered: 이호선");
S("transit", "어디서 갈아타요?", "Where do I transfer?", "eseo qw", "갈아타다=to transfer");
S("transit", "이 버스 시청 가요?", "Does this bus go to City Hall?", "this ayo", "시청=City Hall");
H("transit", "이번 역은 시청, 시청역입니다.", "This stop is City Hall Station.", "formal", "이번 역=this station");
H("transit", "내리실 문은 왼쪽입니다.", "The doors will open on your left.", "formal honor", "내리실=(you) who will get off|왼쪽=left");
S("transit", "3번 출구 어디예요?", "Where's Exit 3?", "qw ieyo", "출구=exit|번=number");
S("transit", "걸어서 갈 수 있어요?", "Can I walk there?", "aseo lsu", "걸어서=on foot");
S("transit", "길을 잃어버렸어요.", "I'm lost.", "obj past", "길=road, way|잃어버리다=to lose");
H("transit", "쭉 가세요.", "Go straight.", "seyo", "쭉=straight on");
H("transit", "오른쪽으로 도세요.", "Turn right.", "seyo", "오른쪽=right|돌다=to turn");
H("transit", "횡단보도 건너서 왼쪽이에요.", "Cross the crosswalk and it's on the left.", "aseo ieyo", "횡단보도=crosswalk|건너다=to cross");
S("transit", "막차 몇 시예요?", "What time is the last train?", "qw ieyo", "막차=last train/bus|몇 시=what time");
D("subway-ask", "transit", "Lost in the station", [
  N("뭐 찾으세요? 도와드릴까요?", "Looking for something? Can I help?"),
  M(["네, 강남역 어떻게 가요?", "Yes, how do I get to Gangnam Station?"],
    ["네, 도와드릴게요.", "Yes, I'll help you.", "She's offering to help YOU."],
    ["아니요, 길을 잃어버렸어요.", "No, I'm lost.", "아니요 then admitting you're lost is contradictory."]),
  N("2호선 타고 가시면 돼요. 여기서 세 정거장이에요.", "Just take Line 2. It's three stops from here."),
  M(["어디서 갈아타요?", "Where do I transfer?"],
    ["세 정거장 주세요.", "Three stops, please.", "You're not ordering stops."],
    ["2호선이 뭐예요?", "What's Line 2?", "Possible, but she already explained."]),
  N("안 갈아타도 돼요. 그냥 쭉 가시면 돼요.", "You don't need to transfer. Just stay on."),
  M(["아, 감사합니다!", "Ah, thank you!"],
    ["안 갈아타요.", "I don't transfer.", "Grammatical, but a thank-you is the natural response."],
    ["죄송합니다.", "I'm sorry.", "She helped you: thank, don't apologize."]),
]);

// ───────────────────────── 시장·쇼핑 · Shopping & market ─────────────────────────
S("shopping", "그냥 구경하는 거예요.", "I'm just looking.", "ieyo", "구경하다=to look around");
S("shopping", "이거 입어 봐도 돼요?", "Can I try this on?", "this bwa dodwae", "입다=to wear (clothes)");
S("shopping", "다른 색 있어요?", "Do you have another color?", "isseo", "다른=other|색=color");
S("shopping", "더 큰 사이즈 있어요?", "Do you have a bigger size?", "isseo", "더=more|큰=big");
S("shopping", "이거 잘 어울려요?", "Does this suit me?", "this ayo", "어울리다=to suit");
S("shopping", "한 개에 얼마예요?", "How much for one?", "count qw ieyo", "개=counter for things");
H("shopping", "만 오천 원이에요.", "It's 15,000 won.", "ieyo", "만=10,000|오천=5,000");
S("shopping", "좀 비싸네요.", "That's a bit expensive.", "neyo", "비싸다=to be expensive");
S("shopping", "좀 깎아 주세요.", "Can you give me a discount?", "juseyo", "깎다=to cut (the price)");
H("shopping", "현금으로 하면 싸게 해 줄게요.", "If you pay cash, I'll give you a deal.", "myeon lge", "현금=cash|싸게=cheaply");
S("shopping", "이거보다 싼 거 있어요?", "Is there something cheaper than this?", "boda isseo", "싼 거=cheap one");
D("market-haggle", "shopping", "Haggling at the market", [
  N("구경하고 가세요! 귤 싸요, 싸!", "Come take a look! Tangerines, cheap, cheap!", "와서 구경해! 귤 싸, 싸!"),
  M(["귤 한 봉지에 얼마예요?", "How much for a bag of tangerines?"],
    ["귤 한 봉지 얼마 주세요.", "Please give me how much one bag.", "Mixed up: ask 얼마예요? first."],
    ["귤이 싸요?", "Are tangerines cheap?", "She just said they're cheap."]),
  N("오천 원이에요. 엄청 달아요.", "It's 5,000 won. Super sweet.", "오천 원. 엄청 달아."),
  M(["좀 비싸네요. 좀 깎아 주세요.", "That's a bit pricey. Can you knock it down?"],
    ["좀 비싸네요. 좀 깎아 줄게요.", "A bit pricey. I'll give you a discount.", "줄게요 = YOU'LL give the discount."],
    ["엄청 달아요.", "Super sweet.", "That's her sales pitch."]),
  N("에이, 그럼 하나 더 줄게. 사천 원!", "Oh, fine, I'll throw in an extra. 4,000 won!", "에이, 그럼 덤으로 하나 더 줄게. 사천 원!"),
  M(["감사합니다! 많이 파세요!", "Thank you! Sell lots!"],
    ["안 사요.", "I'm not buying.", "Rude after she gave you a deal."],
    ["사천 원 주세요.", "Give me 4,000 won.", "You pay her, not the other way."]),
]);
S("shopping", "이걸로 할게요.", "I'll take this one.", "lge", "이걸로=with this one");
S("shopping", "좀 더 생각해 볼게요.", "I'll think about it a bit more.", "bwa lge", "생각하다=to think");
S("shopping", "맛봐도 돼요?", "Can I taste it?", "dodwae", "맛보다=to taste");
S("shopping", "세일해요?", "Is it on sale?", "ayo", "세일=sale");
S("shopping", "교환 돼요?", "Can I exchange it?", "", "교환=exchange");
S("shopping", "환불하고 싶어요.", "I'd like a refund.", "want", "환불=refund");
S("shopping", "선물 포장 돼요?", "Can you gift-wrap it?", "", "선물=gift|포장=wrapping");
H("shopping", "덤으로 하나 더 줄게.", "I'll throw in one more for free.", "banmal lge", "덤=freebie, extra|vendors often use 반말 warmly");
S("shopping", "많이 파세요!", "Sell lots! (friendly bye to vendors)", "seyo", "팔다=to sell");
D("store-tryon", "shopping", "Trying on a jacket", [
  N("찾으시는 거 있으세요?", "Looking for anything in particular?", "뭐 찾아?"),
  M(["아니요, 그냥 구경하는 거예요.", "No, I'm just looking."],
    ["네, 구경해요.", "Yes, I look around.", "네 means you ARE looking for something specific."],
    ["찾으세요.", "(You honorably) look for it.", "That's a command to her."]),
  N("천천히 보세요~", "Take your time~", "천천히 봐~"),
  M(["이거 입어 봐도 돼요?", "Can I try this on?"],
    ["이거 입어 보세요.", "Please try this on.", "That's telling HER to try it on."],
    ["이거 입었어요.", "I wore this.", "Past tense: haven't tried it yet."]),
  N("그럼요! 너무 잘 어울려요!", "Of course! It looks great on you!", "그럼! 너무 잘 어울린다!"),
  M(["음… 좀 더 생각해 볼게요.", "Hmm… I'll think about it a bit more."],
    ["음… 좀 더 생각해 보세요.", "Hmm… you think about it more.", "-보세요 tells HER to think."],
    ["잘 어울려요!", "It suits you!", "You're the one wearing it."]),
]);

// ───────────────────────── 스몰토크 · Small talk ─────────────────────────
S("smalltalk", "몇 살이에요?", "How old are you?", "qw count ieyo", "살=years of age");
S("smalltalk", "저는 스물다섯 살이에요.", "I'm 25.", "topic count ieyo", "스물다섯=25 (native number)");
H("smalltalk", "몇 년생이에요?", "What year were you born?", "qw ieyo", "년생=born in (year)|how people figure out age order");
S("smalltalk", "취미가 뭐예요?", "What are your hobbies?", "subj qw ieyo", "취미=hobby");
S("smalltalk", "저는 운동하는 거 좋아해요.", "I like working out.", "topic ayo", "운동하다=to exercise|좋아하다=to like");
S("smalltalk", "주말에 뭐 했어요?", "What did you do on the weekend?", "e qw past", "주말=weekend");
S("smalltalk", "친구랑 영화 봤어요.", "I watched a movie with a friend.", "hago past", "영화=movie|보다=to watch");
S("smalltalk", "요즘 뭐 해요?", "What are you up to these days?", "qw ayo", "요즘=these days");
D("gym-chat", "smalltalk", "Chatting between sets", [
  N("운동 자주 오시네요! 한국 분 아니시죠?", "You come to work out a lot! You're not Korean, right?"),
  M(["네, 미국 사람이에요. 반가워요!", "Right, I'm American. Nice to meet you!"],
    ["아니요, 한국 분이에요.", "No, I'm an honorable Korean.", "분 is honorific (never for yourself), and you're not Korean anyway!"],
    ["운동 자주 와요?", "Do you come often?", "Fine to ask later; answer his question first."]),
  N("오, 그렇구나. 한국 생활 어때요?", "Oh, I see. How's life in Korea?"),
  M(["재미있는데 좀 힘들어요.", "It's fun, but a little hard."],
    ["재미있는데요 좀.", "It's fun but… a bit.", "Word order is off: the 는데 clause comes first, then the rest."],
    ["한국 생활 어때요?", "How's life in Korea?", "That's his question."]),
  N("하하, 그렇죠. 실례지만 몇 살이에요?", "Haha, I bet. Sorry to ask, but how old are you?"),
  M(["스물다섯 살이에요. 동현 씨는요?", "I'm 25. How about you, Donghyun?"],
    ["스물다섯 개예요.", "I'm 25 things.", "Age uses 살, not 개 (things)."],
    ["실례합니다.", "Excuse me.", "He's not in your way; just answer."]),
]);
S("smalltalk", "한국 음식 좋아해요?", "Do you like Korean food?", "ayo", "음식=food");
S("smalltalk", "제일 좋아하는 음식은 떡볶이예요.", "My favorite food is tteokbokki.", "topic ieyo", "제일 좋아하는=most liked");
S("smalltalk", "제주도에 가 본 적 있어요?", "Have you ever been to Jeju Island?", "e jeok", "제주도=Jeju Island");
S("smalltalk", "아니요, 아직 못 가 봤어요.", "No, I haven't been yet.", "mot bwa past", "아직=yet");
S("smalltalk", "한국 생활 어때요?", "How's life in Korea?", "eottae", "생활=daily life");
S("smalltalk", "재미있는데 좀 힘들어요.", "It's fun, but a bit tough.", "neunde", "재미있다=to be fun|힘들다=to be hard");
S("smalltalk", "무슨 드라마 봐요?", "What dramas do you watch?", "qw ayo", "드라마=TV drama");
S("smalltalk", "형제 있어요?", "Do you have siblings?", "isseo", "형제=siblings");
S("smalltalk", "여동생이 하나 있어요.", "I have one younger sister.", "subj count isseo", "여동생=younger sister");
S("smalltalk", "그거 진짜 좋은 것 같아요.", "I think that's really good.", "gat", "좋다=to be good");
S("smalltalk", "아, 그렇군요.", "Oh, I see.", "", "polite 'I see', keeps the other person talking");
S("smalltalk", "진짜요?", "Really?", "", "the most useful reaction word");
S("smalltalk", "대박!", "No way! / Awesome!", "", "lit. 'jackpot'");
D("gym-weekend", "smalltalk", "Monday at the gym", [
  N("주말에 뭐 했어요?", "What did you do over the weekend?"),
  M(["친구랑 영화 봤어요. 동현 씨는요?", "I watched a movie with a friend. And you?"],
    ["친구랑 영화 볼 거예요.", "I'm going to watch a movie with a friend.", "Future tense, but the weekend already happened."],
    ["주말에 뭐 했어요?", "What did you do?", "Answer first, then ask back."]),
  N("저는 제주도 갔다 왔어요. 제주도 가 봤어요?", "I went to Jeju and back. Have you been?"),
  M(["아니요, 아직 못 가 봤어요. 어땠어요?", "No, not yet. How was it?"],
    ["아니요, 아직 안 가 봐요.", "No, I don't try going yet.", "Experience needs past tense: 못 가 봤어요."],
    ["네, 제주도예요.", "Yes, it's Jeju.", "Doesn't answer the question."]),
  N("완전 좋았어요! 꼭 가 보세요.", "It was amazing! You have to go."),
  M(["대박! 다음에 꼭 가 볼게요.", "Awesome! I'll definitely go next time."],
    ["대박! 꼭 가 보세요.", "Awesome! You have to go.", "Repeating his advice back at him."],
    ["완전 좋았어요.", "It was amazing.", "You haven't been!"]),
]);

// ───────────────────────── 약속 잡기 · Making plans ─────────────────────────
S("plans", "이번 주말에 시간 있어요?", "Are you free this weekend?", "e isseo", "이번 주말=this weekend|시간=time");
S("plans", "같이 밥 먹을까요?", "Shall we grab a meal together?", "lkka", "같이=together|밥=rice, meal");
S("plans", "커피 한잔할래요?", "Want to grab a coffee?", "llae", "한잔하다=to have a drink");
S("plans", "좋아요! 몇 시에 만날까요?", "Sounds good! What time should we meet?", "qw e lkka", "만나다=to meet");
S("plans", "토요일 오후 두 시 어때요?", "How about Saturday at 2 PM?", "eottae", "토요일=Saturday|오후=afternoon");
S("plans", "어디서 만날까요?", "Where should we meet?", "eseo lkka", "어디서=where (at)");
S("plans", "강남역 11번 출구 앞에서 만나요.", "Let's meet in front of Gangnam Station Exit 11.", "eseo ayo", "출구=exit|앞=in front");
S("plans", "미안해요, 그날은 안 돼요.", "Sorry, that day doesn't work.", "topic an", "그날=that day|안 되다=doesn't work");
S("plans", "다른 날은 어때요?", "How about another day?", "eottae", "다른 날=another day");
S("plans", "저는 일요일이 좋아요.", "Sunday works for me.", "topic subj ayo", "일요일=Sunday");
S("plans", "뭐 먹고 싶어요?", "What do you want to eat?", "want qw", "먹다=to eat");
S("plans", "아무거나 괜찮아요.", "Anything's fine.", "ayo", "아무거나=anything");
D("kakao-plan", "plans", "KakaoTalk: weekend plans", [
  N("{name} 씨! 이번 주말에 시간 있어요?", "{name}! Are you free this weekend?"),
  M(["네, 있어요! 왜요?", "Yes, I am! Why?"],
    ["네, 시간이에요.", "Yes, it's time.", "시간 있어요 = have time. 시간이에요 = 'it's time (to)'."],
    ["주말이 뭐예요?", "What's a weekend?", "You know this one!"]),
  N("같이 밥 먹을까요? 맛있는 데 알아요.", "Shall we eat together? I know a good place."),
  M(["좋아요! 몇 시에 만날까요?", "Great! What time shall we meet?"],
    ["좋아요! 몇 시에 만났어요?", "Great! What time did we meet?", "Past tense: the meeting hasn't happened."],
    ["좋아요! 밥 먹을까요?", "Great! Shall we eat?", "She just asked that."]),
  N("토요일 저녁 6시 어때요?", "How about Saturday 6 PM?"),
  M(["미안해요, 그날은 안 돼요. 일요일은 어때요?", "Sorry, that day doesn't work. How about Sunday?"],
    ["미안해요, 그날은 못 돼요.", "Sorry, that day can't become.", "The fixed phrase is 안 돼요 (doesn't work)."],
    ["토요일 저녁 6시예요.", "It's Saturday 6 PM.", "Doesn't answer whether it works."]),
  N("일요일 좋아요! 그럼 강남역에서 봐요.", "Sunday's good! See you at Gangnam Station then."),
  M(["네, 도착하면 연락 주세요!", "Okay, message me when you arrive!"],
    ["네, 도착하면 연락 드세요!", "Okay, honorably eat a contact when you arrive!", "드세요 = please eat. You want 주세요."],
    ["강남역이 어디예요?", "Where's Gangnam Station?", "Possible, but you can look that up."]),
]);
S("plans", "조금 늦을 것 같아요.", "I think I'll be a little late.", "gat", "조금=a little|늦다=to be late");
S("plans", "거의 다 왔어요.", "I'm almost there.", "past", "거의=almost|다 왔다=to have (all) arrived");
S("plans", "어디쯤이에요?", "Where are you (roughly)?", "qw ieyo", "쯤=about, around");
S("plans", "도착하면 연락 주세요.", "Message me when you get there.", "myeon juseyo", "도착하다=to arrive|연락=contact, message");
S("plans", "먼저 들어가 있을게요.", "I'll go in first.", "lge", "먼저=first|들어가다=to go in");
S("plans", "내일 시간 되면 같이 영화 볼래요?", "If you're free tomorrow, want to see a movie together?", "myeon llae", "시간 되다=to have time");
S("plans", "비 오면 실내에서 놀아요.", "If it rains, let's hang out indoors.", "myeon eseo", "비 오다=to rain|실내=indoors|놀다=to hang out");
S("plans", "오늘 정말 즐거웠어요.", "I had a great time today.", "past", "즐겁다=to be enjoyable");
S("plans", "집에 잘 들어가세요.", "Get home safe.", "e seyo", "said when parting at night");
D("kakao-late", "plans", "KakaoTalk: running late", [
  N("저 도착했어요! 어디쯤이에요?", "I'm here! Where are you?"),
  M(["미안해요, 조금 늦을 것 같아요.", "Sorry, I think I'll be a bit late."],
    ["미안해요, 조금 늦었을 것 같아요.", "Sorry, I think I was late.", "Use the future guess 늦을 것 같아요."],
    ["저도 도착했어요!", "I arrived too!", "Then you wouldn't be late!"]),
  N("괜찮아요~ 천천히 와요.", "No worries~ Take your time."),
  M(["고마워요! 거의 다 왔어요.", "Thanks! I'm almost there."],
    ["고마워요! 천천히 와요.", "Thanks! Take your time.", "That's her line to you."],
    ["거의 다 올 거예요.", "(I) will almost all come.", "The fixed phrase is 거의 다 왔어요 (past, for 'almost here')."]),
  N("그럼 먼저 들어가 있을게요. 2층이에요!", "Then I'll go in first. It's on the 2nd floor!"),
  M(["네, 금방 갈게요!", "Okay, I'll be there soon!"],
    ["네, 금방 가세요!", "Okay, go quickly!", "-세요 tells HER to go."],
    ["2층이 뭐예요?", "What's 2nd floor?", "층 = floor. You've got this."]),
]);

// ───────────────────────── 술자리·노래방 · Night out ─────────────────────────
S("night", "건배!", "Cheers!", "", "the standard toast");
S("night", "짠!", "Cheers! (casual)", "", "the clinking sound");
S("night", "위하여!", "To us! (toast)", "", "lit. 'for the sake of'");
S("night", "한 잔 받으세요.", "Let me pour you a drink. (lit. please receive a glass)", "count seyo", "받다=to receive|pour with two hands");
S("night", "제가 따라 드릴게요.", "Let me pour for you.", "lge honor", "따르다=to pour|드리다=humble 'give'");
S("night", "소주 한 병 더 주세요.", "One more bottle of soju, please.", "count juseyo", "병=bottle");
S("night", "저는 술 잘 못 마셔요.", "I can't drink much.", "topic mot", "술=alcohol");
S("night", "오늘은 조금만 마실게요.", "I'll just drink a little today.", "topic lge", "조금만=just a little");
S("night", "안주 뭐 시킬까요?", "What should we order to eat with it?", "qw lkka", "안주=drinking snacks|시키다=to order");
D("pocha-pour", "night", "First round at the pojangmacha", [
  N("자, {name} 씨! 한 잔 받으세요.", "Here, {name}! Have a drink."),
  M(["감사합니다! 제가 따라 드릴게요.", "Thank you! Let me pour for you."],
    ["감사합니다! 제가 따라 줄게요.", "Thanks! I'll pour for ya.", "With someone older, use humble 드릴게요."],
    ["제가 따를게요. 제 잔에.", "I'll pour. Into my glass.", "Pouring your own drink is a faux pas."]),
  N("오~ 매너 좋네. 건배!", "Ooh~ nice manners. Cheers!"),
  M(["건배!", "Cheers!"],
    ["잘 먹겠습니다!", "Thanks for the food!", "Wrong moment: that's for before eating."],
    ["안녕하세요!", "Hello!", "Too late for that."]),
  N("원샷! 술 잘 마셔요?", "Bottoms up! Can you drink a lot?"),
  M(["아니요, 저는 술 잘 못 마셔요. 조금만 마실게요.", "No, I can't drink much. I'll just have a little."],
    ["아니요, 저는 술 안 잘 마셔요.", "No, I don't well drink.", "안 doesn't go with 잘. For ability, use 잘 못."],
    ["네, 원샷 주세요.", "Yes, give me one shot.", "원샷 means 'bottoms up', not a shot glass."]),
]);
S("night", "2차 갈까요?", "Shall we go for round two?", "lkka", "2차=second round (next place)");
S("night", "노래방 갈래요?", "Want to go to karaoke?", "llae", "노래방=karaoke room");
S("night", "이 노래 알아요?", "Do you know this song?", "this ayo", "노래=song|알다=to know");
S("night", "노래 진짜 잘하시네요!", "You're a really good singer!", "neyo seyo", "잘하다=to be good at");
S("night", "저는 노래 못해요.", "I can't sing.", "topic mot", "못하다=to be bad at");
S("night", "한 곡 더!", "One more song!", "count", "곡=counter for songs");
S("night", "오늘은 제가 쏠게요.", "Tonight's on me.", "topic lge", "쏘다=to shoot (slang: to treat)");
S("night", "나눠서 내요.", "Let's split it.", "aseo ayo", "나누다=to divide|내다=to pay");
S("night", "내일 출근해야 돼서 먼저 갈게요.", "I have to work tomorrow, so I'll head out first.", "aya aseo lge", "출근하다=to go to work|먼저=first");
S("night", "괜찮아요? 물 좀 마셔요.", "Are you okay? Drink some water.", "ayo", "물=water");
S("night", "택시 잡아 줄게요.", "I'll get you a taxi.", "lge", "잡다=to catch");
S("night", "취했어요.", "I'm drunk.", "past", "취하다=to get drunk");
D("night-leave", "night", "Leaving round two", [
  N("3차 노래방 갈래요?", "Want to hit karaoke for round three?"),
  M(["미안해요, 내일 출근해야 돼서 먼저 갈게요.", "Sorry, I have to work tomorrow, so I'll head out first."],
    ["미안해요, 내일 출근해야 돼서 먼저 가세요.", "Sorry, I have to work tomorrow, so you go first.", "-세요 tells THEM to go."],
    ["미안해요, 내일 출근했어서 먼저 갈게요.", "Sorry, I worked tomorrow so I'll go.", "Mixed tenses. Needs 출근해야 돼서."]),
  N("에이~ 아쉽다. 오늘 재미있었어요!", "Aww, too bad. Tonight was fun!"),
  M(["저도요! 오늘 정말 즐거웠어요.", "Me too! I had a great time tonight."],
    ["저도요! 오늘 정말 즐거울 거예요.", "Me too! Tonight will be great.", "The night is over: use past tense."],
    ["아쉽다.", "Too bad.", "Copying their 반말 line to a group you're still polite with."]),
  N("집에 잘 들어가요! 택시 잡아 줄까요?", "Get home safe! Want me to get you a taxi?"),
  M(["괜찮아요, 지하철 탈게요. 다음에 봐요!", "It's okay, I'll take the subway. See you next time!"],
    ["괜찮아요, 택시 잡아 줄게요.", "It's okay, I'll get you a taxi.", "They offered to get YOU one."],
    ["네, 지하철 잡아 주세요.", "Yes, catch me a subway please.", "You don't 'catch' (잡다) a subway; that's for taxis."]),
]);

// ───────────────────────── 반말 친구 · Friends ─────────────────────────
S("friends", "우리 말 놓을까요?", "Shall we drop the formalities?", "lkka", "말을 놓다=to speak casually|usually the older person offers");
S("friends", "응, 좋아! 편하게 말해.", "Yeah, sure! Talk comfortably.", "banmal", "응=yeah (casual 네)|편하게=comfortably");
S("friends", "뭐 해?", "What are you doing?", "banmal qw", "polite: 뭐 해요?");
S("friends", "밥 먹었어?", "Did you eat? (also: how are you?)", "banmal past", "polite: 밥 먹었어요?");
S("friends", "응, 먹었어. 너는?", "Yeah, I ate. You?", "banmal past topic", "너=you (only with close friends/younger)");
S("friends", "어디야?", "Where are you?", "banmal qw", "polite: 어디예요?");
S("friends", "지금 가고 있어.", "I'm on my way now.", "banmal ing", "polite: 지금 가고 있어요");
S("friends", "같이 가자!", "Let's go together!", "ja", "가다 → 가자");
S("friends", "배고파. 뭐 먹을래?", "I'm hungry. Wanna eat something?", "banmal ja", "배고프다=to be hungry");
D("friends-switch", "friends", "Dropping the formalities", [
  N("우리 이제 친하니까… 말 놓을까요?", "We're close now… shall we talk casually?"),
  M(["응, 좋아! 편하게 말해.", "Yeah, sure! Talk comfortably."],
    ["네, 좋아요! 편하게 말하세요.", "Yes, good! Please speak comfortably.", "Polite, but she just offered 반말. Accepting in 반말 seals the deal."],
    ["싫어요.", "No way.", "Turning it down flatly is hurtful; if you want to stay polite, say it softly."]),
  N("좋아! 그럼 지금 뭐 해?", "Great! So what are you doing now?"),
  M(["그냥 집에 있어. 너는?", "Just at home. You?"],
    ["그냥 집에 있어요. 너는요?", "Just at home. You (polite)?", "너 + 요 is a mismatch: 너 is casual-only."],
    ["뭐 해?", "What are you doing?", "That's her question."]),
  N("나 홍대인데, 나올래?", "I'm in Hongdae, wanna come out?"),
  M(["좋아! 지금 갈게.", "Sure! I'll come now."],
    ["좋아! 지금 가세요.", "Sure! Go now (polite).", "-세요 is polite AND tells her to go."],
    ["나와요.", "Come out (polite).", "Doesn't answer, and slips back to polite."]),
]);
S("friends", "진짜? 대박!", "Really? No way!", "banmal", "polite: 진짜요?");
S("friends", "나도 그렇게 생각해.", "I think so too.", "banmal do", "나=I (casual 저)|그렇게=that way");
S("friends", "괜찮아, 걱정하지 마.", "It's okay, don't worry.", "banmal jima", "걱정하다=to worry");
S("friends", "미안, 늦었어.", "Sorry, I'm late.", "banmal past", "미안=sorry (casual)");
S("friends", "고마워!", "Thanks!", "banmal", "polite: 고마워요");
S("friends", "보고 싶었어.", "I missed you.", "banmal want past", "lit. 'I wanted to see you'");
S("friends", "이따 봐!", "See you later!", "banmal", "이따=a little later");
S("friends", "잘 자.", "Good night.", "banmal", "자다=to sleep");
S("friends", "내일 시간 돼?", "Are you free tomorrow?", "banmal", "polite: 시간 돼요?");
S("friends", "몰라. 생각해 볼게.", "Dunno. I'll think about it.", "banmal bwa lge", "모르다 → 몰라");
S("friends", "아 맞다!", "Oh, right! (just remembered)", "banmal", "맞다=to be right");
S("friends", "그니까!", "I know, right! / Exactly!", "banmal", "short for 그러니까");
S("friends", "헐.", "Whoa. / OMG.", "", "shock or disbelief");
D("friends-late", "friends", "Late again", [
  N("야, 어디야? 나 벌써 왔어.", "Hey, where are you? I'm already here."),
  M(["미안, 늦었어! 지금 가고 있어.", "Sorry, I'm late! On my way now."],
    ["죄송합니다, 늦었습니다!", "I sincerely apologize for being late!", "Way too formal with a close friend; it sounds like a joke or like you're upset."],
    ["어디야?", "Where are you?", "She's already there. You're the late one."]),
  N("괜찮아, 천천히 와. 배고파?", "It's fine, take your time. Hungry?"),
  M(["응, 완전 배고파. 뭐 먹을래?", "Yeah, starving. What do you wanna eat?"],
    ["응, 완전 배고파요.", "Yeah, totally hungry (polite).", "응 + 요 mixes casual and polite. Pick one: 응, 배고파."],
    ["배고파?", "Hungry?", "That's her question."]),
  N("떡볶이 먹자!", "Let's have tteokbokki!"),
  M(["좋아! 이따 봐!", "Sure! See you soon!"],
    ["좋아요! 이따 봐요!", "Sure! See you soon! (polite)", "Not wrong, just stiff after you've dropped formalities."],
    ["떡볶이 먹었어.", "I ate tteokbokki.", "Past tense doesn't fit a plan."]),
]);

// ───────────────────────── 도움 요청 · Getting help ─────────────────────────
S("trouble", "도와주세요!", "Help me, please!", "juseyo", "돕다=to help");
S("trouble", "머리가 아파요.", "I have a headache.", "subj ayo", "머리=head|아프다=to hurt");
S("trouble", "배가 아파요.", "My stomach hurts.", "subj ayo", "배=stomach");
S("trouble", "감기에 걸렸어요.", "I caught a cold.", "e past", "감기=a cold|걸리다=to catch (illness)");
S("trouble", "열이 나요.", "I have a fever.", "subj ayo", "열=fever");
S("trouble", "기침이 나요.", "I have a cough.", "subj ayo", "기침=cough");
S("trouble", "감기약 있어요?", "Do you have cold medicine?", "isseo", "약=medicine");
H("trouble", "하루에 세 번 드세요.", "Take it three times a day.", "e count honor seyo", "하루=one day|번=times");
H("trouble", "식후에 드세요.", "Take it after meals.", "e honor seyo", "식후=after a meal");
S("trouble", "알레르기가 있어요.", "I have an allergy.", "subj isseo", "알레르기=allergy");
D("pharmacy-cold", "trouble", "At the pharmacy", [
  N("어디가 불편하세요?", "What seems to be the problem?", "어디가 아파?"),
  M(["감기에 걸렸어요. 열이 나요.", "I caught a cold. I have a fever."],
    ["감기를 걸렸어요.", "I caught a cold (wrong particle).", "걸리다 takes 에: 감기에 걸렸어요."],
    ["불편하세요.", "(You honorably) are uncomfortable.", "Honorific about yourself, and it doesn't answer."]),
  N("기침도 해요?", "Are you coughing too?", "기침도 해?"),
  M(["네, 기침도 나요.", "Yes, I'm coughing too."],
    ["네, 기침이에요.", "Yes, it's a cough.", "Doesn't really say you have one. Use 기침도 나요."],
    ["아니요, 기침도 나요.", "No, I'm coughing too.", "아니요 then saying yes is contradictory."]),
  N("이 약 하루에 세 번, 식후에 드세요.", "Take this medicine three times a day, after meals.", "이 약 하루에 세 번, 밥 먹고 먹어."),
  M(["네, 감사합니다. 얼마예요?", "Okay, thank you. How much is it?"],
    ["네, 하루에 세 번 드실게요.", "Yes, I'll honorably take it three times.", "드시다 is for others. You'd say 먹을게요."],
    ["식후가 뭐예요?", "What's 식후?", "Okay to ask! (It means after meals.) But you can also just thank her."]),
]);
S("trouble", "병원이 어디 있어요?", "Where's the hospital?", "subj qw isseo", "병원=hospital, clinic");
S("trouble", "구급차 불러 주세요.", "Please call an ambulance.", "juseyo", "구급차=ambulance|부르다=to call");
S("trouble", "지갑을 잃어버렸어요.", "I lost my wallet.", "obj past", "지갑=wallet");
S("trouble", "핸드폰을 놓고 내렸어요.", "I left my phone behind when I got off.", "obj go past", "놓다=to leave, put down|내리다=to get off");
S("trouble", "경찰서가 어디예요?", "Where's the police station?", "subj qw ieyo", "경찰서=police station");
S("trouble", "이거 고기 들어가요?", "Does this have meat in it?", "this ayo", "고기=meat|들어가다=to go in");
S("trouble", "충전기 빌릴 수 있어요?", "Could I borrow a charger?", "lsu", "충전기=charger|빌리다=to borrow");
S("trouble", "문제가 생겼어요.", "A problem came up.", "subj past", "문제=problem|생기다=to arise");
S("trouble", "영어 하시는 분 계세요?", "Is there anyone who speaks English?", "honor", "분=person (honorific)|계시다=to be (honorific)");
S("trouble", "괜찮으세요?", "Are you okay?", "seyo", "ask a stranger this, not 괜찮아?");
S("trouble", "조심하세요!", "Be careful!", "seyo", "조심하다=to be careful");
D("lost-phone", "trouble", "Left your phone in a taxi", [
  N("무슨 일이세요?", "What's the matter?"),
  M(["택시에 핸드폰을 놓고 내렸어요.", "I left my phone in a taxi."],
    ["택시에서 핸드폰이 놓고 내렸어요.", "My phone left it in the taxi and got off.", "The phone is the object: 핸드폰을."],
    ["핸드폰 주세요.", "Give me a phone.", "Too abrupt; explain what happened."]),
  N("아이고. 택시 영수증 있어요?", "Oh no. Do you have the taxi receipt?"),
  M(["아니요, 없어요. 어떻게 해요?", "No, I don't. What do I do?"],
    ["아니요, 있어요.", "No, I have it.", "아니요 + 있어요 contradicts itself."],
    ["영수증 버려 주세요.", "Please throw away the receipt.", "That's café talk, and the opposite of what you need."]),
  N("괜찮아요. 제 전화로 한번 걸어 볼게요.", "It's okay. I'll try calling it with my phone."),
  M(["정말 감사합니다!", "Thank you so much!"],
    ["제 전화로 걸어 볼게요.", "I'll try calling with my phone.", "That's their offer, and you don't have your phone."],
    ["괜찮아요.", "It's fine / no thanks.", "괜찮아요 here could sound like you're refusing the help."]),
]);

// ───────────────────────── 일상 대화 · Everyday talk ─────────────────────────
S("daily", "오늘 날씨 좋네요.", "Nice weather today!", "neyo", "날씨=weather");
S("daily", "비가 올 것 같아요.", "Looks like it's going to rain.", "subj gat", "비=rain|오다=to come");
S("daily", "우산 챙기세요.", "Take an umbrella.", "seyo", "우산=umbrella|챙기다=to take along");
S("daily", "너무 추워요.", "It's so cold.", "ayo", "춥다=to be cold");
S("daily", "피곤해요.", "I'm tired.", "ayo", "피곤하다=to be tired");
S("daily", "배고파요.", "I'm hungry.", "ayo", "배고프다=to be hungry");
S("daily", "졸려요.", "I'm sleepy.", "ayo", "졸리다=to be sleepy");
H("daily", "어디 가세요?", "Where are you off to? (a greeting)", "qw seyo", "neighbors ask this to say hi");
S("daily", "장 보러 가요.", "I'm going grocery shopping.", "reo", "장 보다=to buy groceries");
S("daily", "운동하러 가요.", "I'm going to work out.", "reo", "운동=exercise");
H("daily", "밥은 먹었어요?", "Have you eaten? (a greeting)", "topic past", "a caring 'how are you'");
S("daily", "아직 안 먹었어요.", "Not yet.", "an past", "아직=yet");
D("grandma-greet", "daily", "Bumping into grandma", [
  N("어디 가요?", "Where are you off to?", "어디 가?"),
  M(["장 보러 가요. 할머니는요?", "Grocery shopping. How about you, grandma?"],
    ["장 보러 가세요.", "(You honorably) go shopping.", "-세요 makes it about her, or a command."],
    ["어디 가요?", "Where are you going?", "Answer first: it's a greeting."]),
  N("밥은 먹었어요?", "Have you eaten?", "밥은 먹었어?"),
  M(["아직 안 먹었어요.", "Not yet."],
    ["아직 못 먹을 거예요.", "I won't be able to eat yet.", "Odd future. Just: 아직 안 먹었어요."],
    ["네, 밥이에요.", "Yes, it's rice.", "She's asking if you've eaten."]),
  N("아이고, 이거 가져가서 먹어요. 내가 만든 김치전이에요.", "Oh my, take this and eat it. It's kimchi pancake I made.", "아이고, 이거 가져가서 먹어. 내가 만든 김치전이야."),
  M(["우와, 감사합니다! 맛있게 먹을게요!", "Wow, thank you! I'll enjoy it!"],
    ["우와, 감사합니다! 맛있게 드세요!", "Wow, thanks! Enjoy your meal!", "드세요 tells HER to eat. You're the one eating."],
    ["괜찮아요, 안 먹어요.", "It's okay, I don't eat that.", "Turning down a grandma's food flatly is a big no. Accept with thanks."]),
]);
S("daily", "오늘 하루 어땠어요?", "How was your day?", "eottae past", "하루=a day");
S("daily", "좀 바빴어요.", "I was a bit busy.", "past", "바쁘다=to be busy");
S("daily", "주말에 집에서 쉬었어요.", "I rested at home on the weekend.", "e eseo past", "쉬다=to rest");
S("daily", "기분이 좋아요.", "I'm in a good mood.", "subj ayo", "기분=mood");
S("daily", "요즘 스트레스 많이 받아요.", "I'm really stressed these days.", "ayo", "스트레스 받다=to get stressed");
H("daily", "이거 드셔 보세요.", "Try this. (offering food)", "honor bwa seyo", "드셔 보다=honorific 'try eating'");
S("daily", "맛있게 먹을게요!", "I'll enjoy it!", "lge", "said when receiving food");
S("daily", "감기 조심하세요.", "Watch out for colds.", "seyo", "caring goodbye in winter");
S("daily", "시간 진짜 빠르네요.", "Time really flies.", "neyo", "빠르다=to be fast");
S("daily", "비 오니까 우산 가져가세요.", "It's raining, so take an umbrella.", "nikka seyo", "가져가다=to take along");
S("daily", "어제보다 더 추워요.", "It's colder than yesterday.", "boda ayo", "어제=yesterday");
S("daily", "맛있지만 좀 비싸요.", "It's tasty, but a bit expensive.", "jiman", "맛있다=to be tasty|비싸다=to be pricey");
S("daily", "이 동네 진짜 좋죠?", "This neighborhood is really nice, right?", "jyo this", "동네=neighborhood");
D("grandma-weather", "daily", "Rainy afternoon", [
  N("비가 올 것 같네. 우산 있어요?", "Looks like rain. Do you have an umbrella?", "비 올 것 같네. 우산 있어?"),
  M(["아니요, 없어요. 어떡하죠?", "No, I don't. What should I do?"],
    ["아니요, 있어요.", "No, I have one.", "아니요 + 있어요 contradicts itself."],
    ["비가 와요?", "Is it raining?", "She said it LOOKS like it will."]),
  N("이거 가져가요. 비 오니까 감기 조심하고.", "Take this. It's raining, so watch out for colds.", "이거 가져가. 비 오니까 감기 조심하고."),
  M(["감사합니다! 내일 꼭 돌려 드릴게요.", "Thank you! I'll definitely give it back tomorrow."],
    ["감사합니다! 내일 꼭 돌려 줄게요.", "Thanks! I'll give it back tomorrow (plain).", "With an elder, use humble 드릴게요."],
    ["우산 주세요.", "Give me an umbrella.", "She's already handing it to you."]),
]);

// ───────────────────────── 나에 대해 · Describing yourself ─────────────────────────
S("aboutme", "자기소개를 할게요.", "Let me introduce myself.", "obj lge", "자기소개=self-introduction");
S("aboutme", "저는 대학생이에요.", "I'm a college student.", "topic ieyo", "대학생=college student");
S("aboutme", "전공은 경영학이에요.", "My major is business.", "topic ieyo", "전공=major|swap in yours: 컴퓨터 공학 (CS), 경제학 (econ), 생물학 (bio)");
S("aboutme", "졸업하고 회사에서 일하고 싶어요.", "After graduating, I want to work at a company.", "go eseo want", "졸업하다=to graduate|회사=company");
S("aboutme", "성격이 밝은 편이에요.", "I'm generally a cheerful person.", "subj pyeon mod", "성격=personality|밝다=bright, cheerful");
S("aboutme", "좀 조용한 편이에요.", "I'm on the quiet side.", "pyeon mod", "조용하다=to be quiet");
S("aboutme", "처음에는 낯을 좀 가리는데 금방 친해져요.", "I'm shy at first, but I warm up fast.", "neunde", "낯을 가리다=to be shy with new people|금방=soon|친해지다=to get close");
S("aboutme", "시간 있을 때 보통 운동해요.", "When I have time, I usually work out.", "ttae", "보통=usually");
S("aboutme", "요리하는 거 좋아해요.", "I like cooking.", "gi", "요리하다=to cook");
S("aboutme", "매운 음식도 잘 먹는 편이에요.", "I can handle spicy food pretty well, too.", "do pyeon mod", "매운 음식=spicy food");
S("aboutme", "기타 칠 줄 알아요.", "I know how to play guitar.", "julal", "기타를 치다=to play guitar");
D("tutor-intro", "aboutme", "Self-introduction practice", [
  N("자, 오늘은 자기소개 한번 해 볼까요?", "Okay, shall we try a self-introduction today?", "자, 오늘은 자기소개 한번 해 볼래?"),
  M(["네! 저는 {name}{이에요}. 미국에서 왔어요.", "Sure! I'm {name}. I'm from the US."],
    ["네! 저는 {name} 씨예요.", "Sure! I'm Mr./Ms. {name}.", "Never put 씨 on your own name."],
    ["네, 자기소개 해 보세요.", "Sure, go ahead and introduce yourself.", "That tells the TEACHER to do it."]),
  N("좋아요. 성격은 어때요?", "Good. What's your personality like?", "좋아. 성격은 어때?"),
  M(["밝은 편이에요. 근데 처음에는 낯을 좀 가려요.", "I'm pretty cheerful. But I'm a little shy at first."],
    ["밝은 편이세요.", "(You honorably) tend to be cheerful.", "-세요 is honorific: never about yourself."],
    ["성격이 좋아해요.", "My personality likes.", "좋아해요 means 'to like'. Describe yourself with an adjective: 밝아요, 조용해요."]),
  N("쉴 때는 보통 뭐 해요?", "What do you usually do when you're off?", "쉴 때는 보통 뭐 해?"),
  M(["요리하는 거 좋아해요. 기타도 칠 줄 알아요.", "I like cooking. I can also play guitar."],
    ["요리 좋아하는 거예요.", "It's the liking-cooking thing.", "Garbled order. 요리하는 거 좋아해요 = I like cooking."],
    ["쉴 때 뭐 해요?", "What do you do when you rest?", "That's her question. Answer it!"]),
]);
S("aboutme", "한국어는 아직 잘 못하지만 열심히 배우고 있어요.", "My Korean isn't good yet, but I'm working hard at it.", "topic mot jiman ing", "열심히=hard, diligently|배우다=to learn");
S("aboutme", "한국 문화에 관심이 많아요.", "I'm really interested in Korean culture.", "e subj", "문화=culture|관심=interest");
S("aboutme", "한국 친구들이랑 이야기하고 싶어서 한국어를 배워요.", "I'm learning Korean because I want to talk with Korean friends.", "hago want aseo obj", "이야기하다=to talk");
S("aboutme", "우리 가족은 네 명이에요.", "There are four people in my family.", "topic count ieyo", "우리 가족=my family (lit. our)");
S("aboutme", "부모님하고 남동생이 있어요.", "I have my parents and a younger brother.", "hago subj isseo", "부모님=parents|남동생=younger brother");
S("aboutme", "저는 첫째예요.", "I'm the oldest child.", "topic ieyo", "첫째=first child|막내=youngest|외동=only child");
S("aboutme", "제 꿈은 한국에서 살아 보는 거예요.", "My dream is to try living in Korea.", "topic eseo bwa gi", "꿈=dream|살다=to live");
S("aboutme", "키가 좀 큰 편이에요.", "I'm kind of tall.", "subj pyeon mod", "키=height");
S("aboutme", "저는 아침형 인간이에요.", "I'm a morning person.", "topic ieyo", "아침형 인간=morning person|저녁형=night owl");
S("aboutme", "제 장점은 잘 웃는 거예요.", "My strong point is that I smile a lot.", "topic gi", "장점=strong point|웃다=to smile, laugh");
S("aboutme", "단점은 성격이 좀 급한 거예요.", "My weak point is that I'm a bit impatient.", "topic subj gi", "단점=weak point|급하다=to be impatient");
D("tutor-why", "aboutme", "Why Korean?", [
  N("근데 왜 한국어 배워요?", "So why are you learning Korean?", "근데 왜 한국어 배워?"),
  M(["한국 친구들이랑 이야기하고 싶어서 배워요.", "Because I want to talk with my Korean friends."],
    ["한국 친구들이랑 이야기하고 싶으니까 배우세요.", "Because you want to talk with Korean friends, learn it.", "배우세요 tells HER to learn. About yourself: 배워요."],
    ["한국어 배웠어요.", "I learned Korean.", "Doesn't answer why."]),
  N("와, 멋있다! 그럼 장점은 뭐예요?", "Wow, that's great! So what's your strong point?", "와, 멋있다! 그럼 장점은 뭐야?"),
  M(["잘 웃는 거예요. 단점은 좀 급한 거예요.", "That I smile a lot. My weak point is that I'm a bit impatient."],
    ["장점이에요.", "It's a strong point.", "No actual answer."],
    ["잘 웃었어요.", "I smiled a lot.", "Past tense describes one moment, not your character. Use 잘 웃는 거예요."]),
  N("하하, 솔직하네요. 한국 사람들이 좋아할 거예요.", "Haha, how honest. Korean people will like that.", "하하, 솔직하네. 한국 사람들이 좋아할 거야."),
  M(["감사합니다. 열심히 할게요!", "Thank you. I'll work hard!"],
    ["감사합니다. 열심히 하세요!", "Thank you. Work hard!", "-세요 tells HER to work hard."],
    ["네, 솔직해요.", "Yes, I'm honest.", "Accepting a compliment flatly sounds a bit proud. Thank her instead."]),
]);

// ───────────────────────── 옷 가게 · Clothes shopping ─────────────────────────
H("clothes", "뭐 찾으시는 거 있으세요?", "Looking for anything in particular?", "honor seyo", "찾다=to look for");
S("clothes", "청바지 좀 보고 싶어요.", "I'd like to look at some jeans.", "want", "청바지=jeans");
S("clothes", "이거 M 사이즈 있어요?", "Do you have this in a medium?", "this isseo", "sizes said in English: 엠 사이즈");
S("clothes", "탈의실이 어디예요?", "Where's the fitting room?", "subj qw ieyo", "탈의실=fitting room");
H("clothes", "입어 보셔도 돼요.", "You can try it on.", "bwa dodwae honor", "입어 보다=to try on");
S("clothes", "좀 작아요. 한 사이즈 큰 걸로 주세요.", "It's a bit small. One size up, please.", "juseyo mod", "작다=small|큰 걸로=a bigger one");
S("clothes", "허리가 좀 커요.", "It's a bit big in the waist.", "subj ayo", "허리=waist");
S("clothes", "길이가 너무 길어요.", "It's too long.", "subj ayo", "길이=length|길다=long");
S("clothes", "이거 너무 끼는 것 같아요.", "I think this is too tight.", "this gat", "끼다=to be tight");
S("clothes", "딱 맞아요!", "It fits perfectly!", "ayo", "딱=exactly|맞다=to fit");
S("clothes", "이 색깔 저한테 어울려요?", "Does this color suit me?", "this ayo", "색깔=color|저한테=on me");
H("clothes", "너무 잘 어울리세요!", "It looks great on you!", "honor", "staff say this a LOT");
D("clothes-fit", "clothes", "Finding jeans that fit", [
  N("어서 오세요~ 찾으시는 거 있으세요?", "Welcome~ Looking for anything?"),
  M(["청바지 좀 보고 싶어요.", "I'd like to look at some jeans."],
    ["청바지 찾으세요?", "Are you looking for jeans?", "That asks HER."],
    ["청바지가 있어요.", "There are jeans.", "A statement, not a request."]),
  N("이쪽에 있어요. 사이즈 어떻게 되세요?", "They're over here. What size are you?"),
  M(["보통 M 입어요. 입어 봐도 돼요?", "Usually a medium. Can I try them on?"],
    ["보통 M 입으세요.", "(You honorably) wear medium.", "Honorific -세요 about yourself. Say 입어요."],
    ["사이즈가 어떻게 되세요?", "What size are you?", "That's her question."]),
  N("그럼요! 탈의실은 저쪽이에요.", "Of course! The fitting room is over there."),
  N("어떠세요? 잘 맞으세요?", "(a few minutes later) How are they? Do they fit?"),
  M(["허리가 좀 커요. 한 사이즈 작은 걸로 주세요.", "A bit big in the waist. One size down, please."],
    ["허리가 좀 커요. 한 사이즈 작은 걸로 줄게요.", "A bit big in the waist. I'll give you a smaller one.", "줄게요 = YOU will give. You want 주세요."],
    ["딱 맞아요. 한 사이즈 작은 걸로 주세요.", "They fit perfectly. One size down, please.", "If they fit perfectly, why change?"]),
]);
S("clothes", "이거 좀 커 보여요.", "This looks a bit big.", "this boyeo", "크다=big → 커 보여요");
S("clothes", "검은색으로 있어요?", "Do you have it in black?", "isseo", "검은색=black|흰색=white|파란색=blue|빨간색=red");
S("clothes", "이거 세일 상품이에요?", "Is this on sale?", "this ieyo", "상품=item, product");
H("clothes", "이 상품은 30% 할인돼요.", "This item is 30% off.", "topic", "할인=discount|퍼센트=percent");
S("clothes", "택스 리펀 돼요?", "Can I get a tax refund?", "", "tourists can get VAT back at Tax Free shops");
H("clothes", "여권 보여 주시겠어요?", "Could you show me your passport?", "juseyo honor", "여권=passport");
S("clothes", "신발 사이즈는 270이에요.", "My shoe size is 270.", "topic ieyo", "Korea uses mm: 270 ≈ US men's 9");
S("clothes", "이 셔츠랑 어울리는 바지 있어요?", "Do you have pants that go with this shirt?", "hago mod isseo", "셔츠=shirt|바지=pants");
S("clothes", "엄마 선물 사려고 왔어요.", "I came to buy a gift for my mom.", "ryeogo past", "선물=gift");
S("clothes", "이거 두 개 다 살게요.", "I'll take both of these.", "count lge", "다=all|사다=to buy");
D("clothes-taxfree", "clothes", "Paying and tax refund", [
  N("이걸로 계산해 드릴까요?", "Shall I ring these up for you?"),
  M(["네. 혹시 택스 리펀 돼요?", "Yes. By any chance, can I get a tax refund?"],
    ["네, 계산해 드릴게요.", "Yes, I'll ring them up for you.", "That's the clerk's job, not yours."],
    ["택스 리펀 주세요 계산.", "Tax refund give me checkout.", "Garbled word order."]),
  N("네, 돼요. 여권 보여 주시겠어요?", "Yes, you can. Could I see your passport?"),
  M(["네, 여기 있어요.", "Sure, here it is."],
    ["여권 보여 주세요.", "Please show me your passport.", "That asks HER for her passport."],
    ["여권이 아니에요.", "It's not a passport.", "Hand it over!"]),
  N("선물 포장도 해 드릴까요?", "Would you like it gift-wrapped too?"),
  M(["네, 엄마 선물이에요. 포장해 주세요.", "Yes, it's a gift for my mom. Please wrap it."],
    ["네, 포장해 드릴게요.", "Yes, I'll wrap it for you.", "드릴게요 means YOU'll wrap it."],
    ["아니요, 포장해 주세요.", "No, please wrap it.", "아니요 then asking for wrapping contradicts itself."]),
]);

// ───────────────────────── 호텔·공항 · Hotel & airport ─────────────────────────
S("hotel", "체크인하려고요.", "I'd like to check in.", "ryeogo", "-(으)려고요=I intend to (a polite way to state your purpose)");
S("hotel", "{name} 이름으로 예약했어요.", "I have a reservation under {name}.", "past", "이름으로=under the name|예약하다=to reserve");
H("hotel", "체크인은 3시부터예요.", "Check-in starts at 3.", "topic ieyo", "부터=from");
S("hotel", "짐 좀 맡겨도 돼요?", "Can I leave my luggage here?", "dodwae", "짐=luggage|맡기다=to leave in someone's care");
S("hotel", "체크아웃은 몇 시예요?", "What time is checkout?", "topic qw ieyo", "몇 시=what time");
S("hotel", "조식 포함이에요?", "Is breakfast included?", "ieyo", "조식=breakfast (hotel)|포함=included");
H("hotel", "조식은 7시부터 10시까지예요.", "Breakfast is from 7 to 10.", "topic ieyo", "까지=until");
S("hotel", "방에 수건이 없어요.", "There are no towels in my room.", "e subj isseo", "방=room|수건=towel");
S("hotel", "에어컨이 안 돼요.", "The air conditioning doesn't work.", "subj an", "안 되다=to not work");
S("hotel", "방 좀 바꿔 주실 수 있어요?", "Could you change my room?", "juseyo lsu honor", "바꾸다=to change");
S("hotel", "택시 좀 불러 주세요.", "Please call me a taxi.", "juseyo", "부르다=to call");
D("hotel-checkin", "hotel", "Checking in", [
  N("안녕하세요, 체크인하시겠어요?", "Hello, checking in?"),
  M(["네, {name} 이름으로 예약했어요.", "Yes, I have a reservation under {name}."],
    ["네, 체크인하시겠어요.", "Yes, (you honorably) will check in.", "Honorific about yourself. Say 체크인하려고요."],
    ["네, 예약할 거예요.", "Yes, I'm going to make a reservation.", "Future: but you already booked."]),
  N("네, 확인됐습니다. 조식 포함이세요.", "Okay, confirmed. Breakfast is included."),
  M(["아, 좋네요! 조식은 몇 시부터예요?", "Oh, nice! What time does breakfast start?"],
    ["조식 포함해 주세요.", "Please include breakfast.", "It already is!"],
    ["포함이세요.", "(You honorably) are included.", "Just echoing the honorific back."]),
  N("7시부터예요. 짐 들어 드릴까요?", "From 7. Shall I carry your bags?"),
  M(["괜찮아요, 제가 들게요. 감사합니다!", "It's okay, I'll carry them. Thank you!"],
    ["네, 짐 들어 드릴게요.", "Yes, I'll carry the bags for you.", "That offers to carry THEIR bags."],
    ["7시부터예요.", "From 7.", "Just repeating."]),
]);
S("hotel", "근처에 맛집 있어요?", "Are there any good places to eat nearby?", "e isseo", "근처=nearby|맛집=great food spot");
S("hotel", "하루 더 묵을 수 있어요?", "Can I stay one more night?", "lsu", "하루 더=one more day|묵다=to stay (lodging)");
S("hotel", "창가 자리로 주세요.", "A window seat, please.", "juseyo", "창가=by the window|통로=aisle");
H("hotel", "부칠 짐 있으세요?", "Any bags to check?", "seyo", "부치다=to check (luggage)");
S("hotel", "이거 기내에 가지고 타도 돼요?", "Can I take this on the plane?", "this dodwae", "기내=in the cabin");
S("hotel", "탑승구가 어디예요?", "Where's the gate?", "subj qw ieyo", "탑승구=boarding gate");
S("hotel", "비행기가 지연됐어요.", "My flight was delayed.", "subj past", "비행기=airplane|지연되다=to be delayed");
S("hotel", "공항철도는 어디서 타요?", "Where do I catch the airport train?", "topic eseo qw", "공항철도=airport railroad (AREX)");
S("hotel", "환전은 어디서 할 수 있어요?", "Where can I exchange money?", "topic eseo lsu", "환전=currency exchange");
S("hotel", "유심은 어디서 사요?", "Where do I buy a SIM card?", "topic eseo qw", "유심=SIM card");
H("hotel", "즐거운 여행 되세요!", "Have a great trip!", "seyo mod", "즐겁다=to be enjoyable");
D("hotel-problem", "hotel", "Calling the front desk", [
  N("네, 프런트입니다. 무엇을 도와드릴까요?", "Front desk. How can I help you?"),
  M(["에어컨이 안 돼요. 방 좀 바꿔 주실 수 있어요?", "The AC doesn't work. Could you change my room?"],
    ["에어컨이 안 해요.", "The AC doesn't do.", "For machines that don't work, say 안 돼요."],
    ["무엇을 도와드릴까요?", "How can I help you?", "That's their line."]),
  N("정말 죄송합니다. 바로 다른 방으로 바꿔 드릴게요.", "We're so sorry. We'll move you to another room right away."),
  M(["감사합니다. 그리고 수건도 좀 더 주세요.", "Thank you. And some more towels, please."],
    ["죄송합니다.", "I'm sorry.", "They apologized. You don't need to."],
    ["바꿔 드릴게요.", "I'll change it for you.", "Wrong direction: that's their offer."]),
]);
D("airport-checkin", "hotel", "Airport check-in counter", [
  N("여권 주시겠어요? 부칠 짐 있으세요?", "Passport, please? Any bags to check?"),
  M(["네, 하나 있어요. 창가 자리로 주세요.", "Yes, one. A window seat, please."],
    ["네, 부칠 짐 있으세요.", "Yes, (you honorably) have bags.", "Honorific about yourself."],
    ["아니요, 하나 있어요.", "No, I have one.", "아니요 then 'I have one' contradicts itself."]),
  N("네, 창가 자리로 드렸습니다. 탑승구는 23번이에요.", "Okay, you've got a window seat. Your gate is 23."),
  M(["감사합니다. 이거 기내에 가지고 타도 돼요?", "Thanks. Can I take this on board?"],
    ["23번 주세요.", "Number 23, please.", "She just told you your gate."],
    ["탑승구가 23번이세요.", "(Honorable) gate is 23.", "Echoing with an odd honorific."]),
  N("네, 괜찮아요. 즐거운 여행 되세요!", "Yes, that's fine. Have a great trip!"),
  M(["감사합니다! 수고하세요.", "Thank you! Have a good one."],
    ["즐거운 여행 되세요!", "Have a great trip!", "She's not the one traveling!"],
    ["괜찮아요.", "It's fine.", "Just a thank-you works here."]),
]);

// ───────────────────────── 관광 · Sightseeing ─────────────────────────
S("sights", "사진 좀 찍어 주실 수 있어요?", "Could you take a picture for us?", "juseyo lsu honor", "사진을 찍다=to take a photo");
S("sights", "여기 눌러 주세요.", "Just press here.", "juseyo", "누르다=to press");
S("sights", "한 장만 더 부탁드려요.", "Just one more, please.", "count", "장=counter for photos|부탁드리다=to ask a favor (humble)");
S("sights", "여기서 사진 찍어도 돼요?", "Can I take pictures here?", "eseo dodwae", "찍다=to take (a photo)");
S("sights", "입장료가 얼마예요?", "How much is admission?", "subj qw ieyo", "입장료=admission fee");
S("sights", "몇 시까지 열어요?", "How late are you open?", "qw ayo", "열다=to open");
H("sights", "한복 입으면 무료예요.", "It's free if you wear hanbok.", "myeon ieyo", "한복=traditional clothes|무료=free");
S("sights", "한복 빌리고 싶어요.", "I'd like to rent a hanbok.", "want", "빌리다=to rent, borrow");
S("sights", "여기 뭐가 유명해요?", "What's this place famous for?", "subj qw ayo", "유명하다=to be famous");
S("sights", "꼭 가 봐야 하는 곳 추천해 주세요.", "Please recommend a must-see place.", "bwa aya mod juseyo", "꼭=definitely|곳=place");
S("sights", "경치가 정말 예쁘네요!", "The view is so beautiful!", "subj neyo", "경치=scenery|예쁘다=pretty");
D("sights-photo", "sights", "Photo at the palace", [
  N("여기가 포토존이에요! 사진 찍어 줄까요?", "This is the photo spot! Want me to take your picture?", "여기가 포토존이야! 사진 찍어 줄까?"),
  M(["네, 좋아요! 여기 눌러 주세요.", "Yes, please! Just press here."],
    ["네, 사진 찍어 드릴게요.", "Yes, I'll take your picture.", "That offers to take HIS photo."],
    ["사진 찍었어요?", "Did you take a picture?", "He hasn't yet. He's offering."]),
  N("자, 하나, 둘, 셋! 잘 나왔어요.", "Okay, one, two, three! It came out great.", "자, 하나, 둘, 셋! 잘 나왔다."),
  M(["감사합니다! 한 장만 더 부탁드려요.", "Thank you! Just one more, please."],
    ["한 장만 더 찍어 드릴게요.", "I'll take one more for you.", "드릴게요 = YOU'll take it for him."],
    ["잘 나왔어요.", "It came out great.", "Echoing him. Thank him and ask for another!"]),
  N("그럼요! 이번엔 웃어요~ 김치!", "Sure! Smile this time~ Kimchi!", "그래! 이번엔 웃어~ 김치!"),
  M(["김치~!", "Kimchi~!"],
    ["감기~!", "A cold~!", "감기 = a cold. Koreans say 김치 for photos."],
    ["웃으세요.", "Please smile.", "Telling HIM to smile."]),
]);
S("sights", "여기서 얼마나 걸려요?", "How long does it take from here?", "eseo qw", "걸리다=to take (time)");
S("sights", "해 지기 전에 가야 돼요.", "We have to go before sunset.", "aya", "해가 지다=the sun sets|전에=before");
S("sights", "바다 보러 부산에 왔어요.", "I came to Busan to see the ocean.", "reo e past", "바다=sea, ocean");
S("sights", "투어 예약하고 싶어요.", "I'd like to book a tour.", "want", "예약하다=to book");
S("sights", "영어 가이드 있어요?", "Is there an English-speaking guide?", "isseo", "가이드=tour guide");
S("sights", "기념품 가게가 어디 있어요?", "Where's the souvenir shop?", "subj qw isseo", "기념품=souvenir|가게=shop");
S("sights", "줄이 너무 길어요.", "The line is so long.", "subj ayo", "줄=line, queue");
S("sights", "여기 처음 와 봤어요.", "It's my first time here.", "bwa past", "처음=first time");
H("sights", "관람 시간은 6시까지입니다.", "Viewing hours end at 6.", "formal topic", "관람=viewing (a site, show)");
S("sights", "이번 여행에서 여기가 제일 좋았어요.", "This was the best place on this trip.", "eseo subj past", "여행=trip|제일=most");
S("sights", "같이 사진 찍어요!", "Let's take a picture together!", "ayo", "같이=together");
D("sights-palace", "sights", "Gyeongbokgung tickets", [
  N("경복궁 처음 와 봤어요?", "First time at Gyeongbokgung?", "경복궁 처음 와 봤어?"),
  M(["네, 처음 와 봤어요. 입장료가 얼마예요?", "Yes, it's my first time. How much is admission?"],
    ["네, 처음 오셨어요.", "Yes, (someone honorable) came for the first time.", "Honorific about yourself."],
    ["아니요, 처음이에요.", "No, it's my first time.", "아니요 contradicts 'first time'."]),
  N("삼천 원이에요. 근데 한복 입으면 무료예요.", "It's 3,000 won. But it's free if you wear hanbok.", "삼천 원. 근데 한복 입으면 공짜야."),
  M(["진짜요? 그럼 한복 빌리고 싶어요.", "Really? Then I want to rent a hanbok."],
    ["진짜요? 그럼 한복 빌려 드릴게요.", "Really? Then I'll lend you a hanbok.", "That would be YOU lending HIM one."],
    ["한복이 무료예요?", "Is hanbok free?", "Not quite: ENTRY is free if you wear one."]),
  N("길 건너서 빌릴 수 있어요. 관람 시간은 6시까지예요.", "You can rent one across the street. It's open until 6.", "길 건너면 빌릴 수 있어. 6시까지니까 서둘러."),
  M(["네, 그럼 빨리 갔다 올게요!", "Okay, I'll go get one and come right back!"],
    ["6시까지 열어 주세요.", "Please stay open until 6.", "You can't ask the palace to stay open!"],
    ["길 건너세요.", "Cross the street.", "Telling HIM to cross."]),
]);

// ───────────────────────── 가족 만남 · Meeting the family ─────────────────────────
S("inlaws", "안녕하세요, 어머님. 처음 뵙겠습니다.", "Hello, (Mother). It's an honor to meet you.", "formal honor", "어머님=what you call your partner's mom|뵙다=humble 'to see'");
S("inlaws", "저는 지민 씨랑 사귀고 있는 {name}{이에요}.", "I'm {name}. I'm dating Jimin.", "hago ing mod", "사귀다=to date|사귀고 있는=who is dating");
S("inlaws", "이거 작은 선물이에요.", "This is a small gift for you.", "this ieyo", "hand it over with both hands");
S("inlaws", "별거 아니에요.", "It's nothing special.", "anieyo", "the humble reply when they protest your gift");
S("inlaws", "초대해 주셔서 감사합니다.", "Thank you for inviting me.", "juseyo honor aseo", "초대하다=to invite|-셔서=honorific 'because'");
H("inlaws", "편하게 앉아요.", "Sit down, make yourself comfortable.", "ayo", "편하게=comfortably");
H("inlaws", "부모님은 뭐 하세요?", "What do your parents do?", "topic si qw", "부모님=parents");
S("inlaws", "아버지는 회사에 다니시고 어머니는 선생님이세요.", "My dad works at a company, and my mom is a teacher.", "topic go si", "회사에 다니다=to work at a company|선생님=teacher");
S("inlaws", "저는 외동이에요.", "I'm an only child.", "topic ieyo", "외동=only child");
H("inlaws", "둘이 어떻게 만났어요?", "How did you two meet?", "qw past", "둘이=the two of you");
S("inlaws", "지민 씨를 2년 전에 학교에서 만났어요.", "I met Jimin two years ago at school.", "obj eseo past", "전에=ago|학교=school");
S("inlaws", "만난 지 2년 됐어요.", "It's been two years since we met.", "ji", "만나다=to meet");
D("inlaws-arrive", "inlaws", "Arriving at the family home", [
  N("어서 와요! 오느라 고생했어요.", "Welcome! You must be tired from the trip.", "어서 와! 오느라 고생했어."),
  M(["안녕하세요, 어머님. 처음 뵙겠습니다. {name}{이에요}.", "Hello, Mother. It's an honor to meet you. I'm {name}."],
    ["안녕, 어머님! 반가워.", "Hey, Mom! Nice to meet ya.", "반말 to your partner's mother at a first meeting is a disaster."],
    ["어서 오세요!", "Welcome!", "That's how hosts greet guests, and you're the guest."]),
  N("들어와요, 들어와요. 편하게 앉아요.", "Come in, come in. Make yourself comfortable.", "들어와, 들어와. 편하게 앉아."),
  M(["감사합니다. 이거 작은 선물이에요.", "Thank you. This is a small gift for you."],
    ["감사합니다. 이거 작은 선물 주세요.", "Thank you. Please give me this small gift.", "주세요 asks HER to give it to you."],
    ["편하게 앉아요.", "Sit comfortably.", "Telling your host to sit, in her own house."]),
  N("아이고, 뭘 이런 걸 다 사 왔어요. 고마워요.", "Oh my, you didn't have to bring anything. Thank you.", "아이고, 뭘 이런 걸 다 사 왔어. 고마워."),
  M(["별거 아니에요. 초대해 주셔서 감사합니다.", "It's nothing special. Thank you for inviting me."],
    ["네, 비싼 거예요.", "Yes, it's expensive.", "Never brag about a gift's price. Play it down: 별거 아니에요."],
    ["고마워요.", "Thanks.", "She's thanking YOU. Echoing it back is odd."]),
]);
H("inlaws", "한국 음식 입에 맞아요?", "Is Korean food to your taste?", "ayo", "입에 맞다=to suit your taste");
S("inlaws", "네, 정말 맛있어요. 어머님 음식 최고예요!", "Yes, it's delicious. Your cooking is the best!", "ieyo", "최고=the best");
S("inlaws", "많이 드세요.", "Please, eat lots.", "honor seyo", "say it to elders at the table");
S("inlaws", "아버님, 한 잔 받으세요.", "Father, let me pour you a drink.", "count seyo", "pour with both hands");
S("inlaws", "젊어 보이세요!", "You look so young!", "boyeo si", "젊다=young|a compliment elders love");
S("inlaws", "아직 배우는 중이라서 한국어를 잘 못해요.", "I'm still learning, so my Korean isn't great.", "aseo mot obj", "중=in the middle of|-이라서=because it's");
S("inlaws", "천천히 말씀해 주시면 알아들을 수 있어요.", "If you speak slowly, I can understand.", "myeon lsu honor", "말씀하다=honorific 'to speak'|알아듣다=to understand (by ear)");
S("inlaws", "지민 씨가 저한테 정말 잘해 줘요.", "Jimin is really good to me.", "subj juseyo", "잘해 주다=to treat well");
S("inlaws", "제가 설거지할게요.", "I'll do the dishes.", "subj lge", "설거지=washing dishes|offer even if they say no");
D("inlaws-dinner", "inlaws", "Questions at dinner", [
  N("{name} 씨는 무슨 일 해요?", "What do you do, {name}?", "무슨 일 해?"),
  M(["지금은 대학생이에요. 졸업하고 회사에서 일하고 싶어요.", "I'm a college student right now. After graduating, I want to work at a company."],
    ["지금은 대학생이세요.", "(Someone honorable) is a college student now.", "-세요 is honorific: never about yourself."],
    ["무슨 일 하세요?", "What do you do?", "That's her question."]),
  N("둘이 어떻게 만났어요?", "How did you two meet?", "둘이 어떻게 만났어?"),
  M(["2년 전에 학교에서 만났어요.", "We met at school two years ago."],
    ["2년 후에 학교에서 만났어요.", "We met at school two years later.", "후에 = after/later. 'Ago' is 전에."],
    ["학교에서 만날 거예요.", "We'll meet at school.", "Future tense: you've already met!"]),
  N("그렇구나. 한국 음식은 입에 맞아요? 많이 먹어요.", "I see. Is Korean food to your taste? Eat lots.", "그렇구나. 한국 음식은 입에 맞아? 많이 먹어."),
  M(["네, 정말 맛있어요. 어머님 음식 최고예요!", "Yes, it's delicious. Your cooking is the best!"],
    ["네, 많이 드세요.", "Yes, please eat lots.", "Nice to say later, but she asked if YOU like it. Answer first."],
    ["아니요, 맛있어요.", "No, it's delicious.", "아니요 + 맛있어요 contradicts itself."]),
]);
S("inlaws", "앞으로 잘 부탁드립니다.", "I look forward to getting to know you. (lit. please take care of me from now on)", "formal", "앞으로=from now on|THE phrase for starting a relationship with family");
H("inlaws", "다음에 또 와요.", "Come again next time.", "ayo", "또=again");
S("inlaws", "오늘 정말 감사했습니다.", "Thank you so much for today.", "formal past", "past tense: thanks for what just happened");
S("inlaws", "다음에 또 인사드리러 올게요.", "I'll come by to see you again.", "reo lge honor", "인사드리다=to pay one's respects (humble)");
S("inlaws", "아버님, 어머님, 건강하세요.", "Father, Mother, stay healthy.", "seyo", "건강하다=to be healthy|a warm goodbye to elders");
D("inlaws-leave", "inlaws", "Saying goodbye", [
  N("벌써 가요? 더 있다 가요.", "Leaving already? Stay a little longer.", "벌써 가? 더 있다 가."),
  M(["오늘 정말 감사했습니다. 다음에 또 인사드리러 올게요.", "Thank you so much for today. I'll come see you again."],
    ["오늘 정말 감사해요. 또 와요.", "Thanks a lot today. Come again.", "또 와요 (come again) is the host's line."],
    ["벌써 가요.", "Leaving already.", "Just echoing her."]),
  N("그래요, 조심히 가요. 우리 지민이 잘 부탁해요.", "All right, get home safe. Please take good care of our Jimin.", "그래, 조심히 가. 우리 지민이 잘 부탁해."),
  M(["네, 걱정하지 마세요. 아버님, 어머님, 건강하세요!", "Of course, don't worry. Father, Mother, stay healthy!"],
    ["네, 잘 부탁드려요.", "Yes, please take care of me.", "She asked YOU to look after Jimin. Reassure her instead."],
    ["조심히 가세요.", "Get home safe.", "You're the one leaving."]),
]);

// ───────────────────────── 눈치 · culture notes ─────────────────────────
const CULTURE = [
  { id: "c1", scene: "basics", title: "해요 is your home base",
    body: "Korean has speech levels. With strangers, staff, and new acquaintances, use the -아요/어요 style (해요체). It's polite but friendly. Formal -습니다 is mostly for set phrases and announcements; casual 반말 is for close friends." },
  { id: "c2", scene: "basics", title: "네 doesn't always mean yes",
    body: "네 also means 'I'm listening' or 'go on.' People say 네, 네… while you talk. And to a negative question (안 가요?), 네 means 'right, I'm not going.'" },
  { id: "c3", scene: "basics", title: "수고하세요 isn't for everyone",
    body: "Saying 수고하세요 to staff as you leave is friendly. But it literally means 'keep working hard,' so don't say it to your boss or someone much older: it can sound like you're ranking above them." },
  { id: "c4", scene: "meet", title: "Why everyone asks your age",
    body: "Age decides who's 형/언니/오빠/누나, who uses 반말, and who pours drinks. It isn't nosy; it's how people figure out how to talk to you. Many use birth year (몇 년생이에요?)." },
  { id: "c5", scene: "meet", title: "씨 is for others only",
    body: "지수 씨 is a polite way to address a peer. Never put 씨 on your own name, and don't use it for someone clearly older or a superior; use titles like 선생님, 사장님, or 선배님." },
  { id: "c6", scene: "meet", title: "우리 = my",
    body: "Koreans say 우리 엄마 (our mom), 우리 집 (our house), 우리 나라 (our country) where English says 'my.' It reflects a group mindset, which is why even an only child says 우리 엄마, and a wife can say 우리 남편 (our husband)." },
  { id: "c7", scene: "meet", title: "Take compliments humbly",
    body: "When someone says 한국어 잘하시네요!, the expected move is to deflect: 아니에요, 아직 멀었어요 (no, I've got a long way to go). Saying 'yes, I'm good' sounds boastful." },
  { id: "c8", scene: "cafe", title: "Everyone is 사장님",
    body: "Calling a shop or restaurant owner 사장님 (boss) is normal and flattering, even if you're not sure they own it. Staff are 저기요 or, in restaurants, 이모/삼촌." },
  { id: "c9", scene: "cafe", title: "Café bathroom codes",
    body: "Café restrooms are often in the building hallway with a door code. It's usually printed on the receipt or posted at the counter. Ask: 화장실 비밀번호가 뭐예요?" },
  { id: "c10", scene: "restaurant", title: "Call bells and 저기요",
    body: "Many tables have a call button. No button? Raise your hand and say 저기요! or 이모! It's not rude; waiting silently for a server to notice you can take forever." },
  { id: "c11", scene: "restaurant", title: "Free refills, no tips",
    body: "반찬 (side dishes) refill free: just ask 반찬 좀 더 주세요. Water is often self-serve. You pay at the counter on the way out, and tipping isn't a thing." },
  { id: "c12", scene: "restaurant", title: "Before & after eating",
    body: "잘 먹겠습니다 before a meal (especially if someone's treating) and 잘 먹었습니다 when leaving. It's like a thank-you to the cook and the payer at once." },
  { id: "c13", scene: "transit", title: "Priority seats stay empty",
    body: "The pink seats on the subway are for pregnant women; the end seats (노약자석) are for elderly and disabled riders. Even when the train is packed, most people leave them empty." },
  { id: "c14", scene: "transit", title: "Taxi drivers are 기사님",
    body: "Address bus and taxi drivers as 기사님. Taxis take cards and T-money, and many drivers love chatting with foreigners. 한국말 잘하시네! is coming." },
  { id: "c15", scene: "shopping", title: "Market charm",
    body: "At traditional markets, light haggling (좀 깎아 주세요) and getting 덤 (a freebie) are part of the fun. As you leave, say 많이 파세요! (sell lots!). Vendors love it." },
  { id: "c16", scene: "smalltalk", title: "'Have you eaten?' = how are you",
    body: "밥 먹었어요? is a greeting, a remnant of harder times when eating well wasn't a given. Answer simply (네, 먹었어요 / 아직이요) and ask back." },
  { id: "c17", scene: "night", title: "Drinking etiquette",
    body: "Don't pour your own glass; pour for others and they'll pour for you. Use two hands (or one hand supporting your arm) when pouring for or receiving from someone older. Turning your head slightly away from elders when you drink is a nice touch." },
  { id: "c18", scene: "night", title: "1차, 2차, 3차",
    body: "Nights out come in rounds: dinner (1차), drinks somewhere else (2차), karaoke (3차)… Leaving early is fine with a reason: 내일 출근해야 돼서 먼저 갈게요." },
  { id: "c19", scene: "friends", title: "말 놓기: dropping the formality",
    body: "Switching to 반말 is a milestone, usually suggested by the older person: 우리 말 놓을까요? Use 형/오빠 (older male) and 누나/언니 (older female) depending on your own gender." },
  { id: "c20", scene: "plans", title: "Texting shorthand",
    body: "ㅋㅋㅋ = lol, ㅎㅎ = gentle laugh, ㅇㅇ = yeah, ㄱㄱ = let's go, ㅠㅠ = crying. A single ㅋ can read as dry, so more ㅋ = more friendly." },
  { id: "c21", scene: "trouble", title: "Emergency numbers",
    body: "119 is fire and ambulance, 112 is police. 1330 is the tourist hotline, with English and interpreters 24/7. Pharmacies (약국) can handle most minor illnesses." },
  { id: "c22", scene: "daily", title: "'Where are you going?' is hello",
    body: "Neighbors asking 어디 가요? aren't prying. It's a greeting, like 'off somewhere?' A vague answer like 잠깐 나가요 (just popping out) is totally fine." },
  { id: "c23", scene: "daily", title: "Never refuse grandma's food",
    body: "When an elder offers food, accept with both hands and a warm 감사합니다, 잘 먹을게요! Refusing outright can feel like rejecting their care." },
  { id: "c24", scene: "aboutme", title: "Describe yourself modestly",
    body: "Saying 'I'm really smart and funny' sounds boastful in Korean. Soften it with -는 편이에요 (I tend to…) and balance a strong point with a small weak one. People find that charming." },
  { id: "c25", scene: "clothes", title: "Korean sizes",
    body: "Tops are often sized 90 / 95 / 100 / 105 (chest in cm), or S/M/L, or 프리 사이즈 (one size). Shoes are in millimeters: about 230–250 for women and 260–285 for men. Korean cuts run small, so try things on!" },
  { id: "c26", scene: "clothes", title: "Tax Free shopping",
    body: "Look for the Tax Free sign. Spend over about 15,000 won, show your passport, and many stores take the tax off on the spot. Others give you a receipt to claim at the airport." },
  { id: "c27", scene: "hotel", title: "Hotel words",
    body: "조식 = hotel breakfast, 프런트 = front desk, 체크인/체크아웃 work as-is. Check-in is usually 3 PM. No tipping, ever, and staff may politely refuse if you try." },
  { id: "c28", scene: "sights", title: "Hanbok = free palace entry",
    body: "Wear hanbok and entry to Seoul's royal palaces is free. Rental shops nearby charge by the hour. Locals love seeing visitors in hanbok, so expect compliments." },
  { id: "c29", scene: "sights", title: "Asking for photos",
    body: "Asking a stranger 사진 좀 찍어 주실 수 있어요? is totally normal, and many will take several shots without being asked. Koreans count 하나, 둘, 셋 and say 김치~ to make you smile." },
  { id: "c30", scene: "inlaws", title: "어머님 · 아버님",
    body: "Never use your partner's parents' names. Call them 어머님 and 아버님. After marriage, you'd refer to them as 장인어른/장모님 (wife's parents) or 시아버님/시어머님 (husband's parents)." },
  { id: "c31", scene: "inlaws", title: "The gift ritual",
    body: "Bring something like a fruit box, red ginseng (홍삼), or a nice item from home, and hand it over with both hands. They'll protest (뭘 이런 걸 다…). That's politeness, not refusal. Answer 별거 아니에요." },
  { id: "c32", scene: "inlaws", title: "Expect personal questions",
    body: "Job, school, your parents' jobs, siblings, marriage plans, even salary can come up. It's how parents get to know you, not rudeness. Answer warmly and modestly." },
  { id: "c33", scene: "inlaws", title: "At the family table",
    body: "Wait for the eldest to pick up their spoon first. Don't leave the table before the elders, pour drinks with two hands, and offer to help clean up (제가 설거지할게요). They'll probably say no, but the offer counts." },
];

// ───────────────────────── real-world missions ─────────────────────────
const MISSIONS = [
  { id: "m1", ko: "인사하기", en: "Greet a Korean speaker with 안녕하세요 and thank them with 감사합니다.", lvl: 1 },
  { id: "m2", ko: "주문하기", en: "Order food or a drink entirely in Korean (a Korean café, restaurant, or H Mart counter counts).", lvl: 1 },
  { id: "m3", ko: "잘 먹었습니다", en: "Say 잘 먹었습니다 to the staff when leaving a Korean restaurant.", lvl: 1 },
  { id: "m4", ko: "질문하기", en: "Ask someone a real question in Korean: a price, directions, or a recommendation.", lvl: 1 },
  { id: "m5", ko: "다시 말해 주세요", en: "When you don't catch something, say 다시 한 번 말해 주세요 instead of switching to English.", lvl: 1 },
  { id: "m6", ko: "자기소개", en: "Introduce yourself in Korean: name, where you're from, why you're learning.", lvl: 2 },
  { id: "m7", ko: "카톡 보내기", en: "Send a KakaoTalk or text message in Korean to a Korean speaker.", lvl: 2 },
  { id: "m8", ko: "칭찬하기", en: "Give someone a compliment in Korean with -네요 (e.g., 진짜 맛있네요!).", lvl: 2 },
  { id: "m9", ko: "쉐도잉 3분", en: "Shadow 3 minutes of a Korean YouTube vlog or drama scene, speaking along out loud.", lvl: 1 },
  { id: "m10", ko: "자막 없이 5분", en: "Watch 5 minutes of a Korean show without subtitles and write down one phrase you caught.", lvl: 2 },
  { id: "m11", ko: "새 문법 쓰기", en: "Use a grammar pattern you learned this week in a real conversation.", lvl: 2 },
  { id: "m12", ko: "2분 대화", en: "Hold a 2-minute conversation in Korean without switching to English.", lvl: 3 },
  { id: "m13", ko: "언어 교환", en: "Join a language exchange: a meetup, a campus Korean club, or an app like HelloTalk or Tandem.", lvl: 2 },
  { id: "m14", ko: "많이 파세요", en: "Say 많이 파세요! or 수고하세요 to a vendor or cashier as you leave.", lvl: 1 },
  { id: "m15", ko: "통화하기", en: "Make a short phone call in Korean (e.g., ask a Korean restaurant if they're open).", lvl: 3 },
  { id: "m16", ko: "자기소개 녹음", en: "Record a 1-minute self-introduction in Korean (personality, hobbies, family, why Korean), then listen back.", lvl: 2 },
  { id: "m17", ko: "옷 사이즈 묻기", en: "Ask about a size or color in Korean at a store, or role-play it with a Korean speaker.", lvl: 2 },
  { id: "m18", ko: "사진 부탁하기", en: "Ask someone in Korean to take a photo for you (사진 좀 찍어 주실 수 있어요?).", lvl: 1 },
  { id: "m19", ko: "가족 인사 연습", en: "Rehearse meeting a partner's parents with a Korean speaker: greeting, gift line, and 앞으로 잘 부탁드립니다.", lvl: 3 },
];

// Dongne vocabulary: intermediate everyday words, each with an example sentence.
//
//   W(topic, block)  one word per line:  word | meaning | example with [the word's form] | example in English
//
// The [bracketed] part of the example is the word as it appears in that sentence; it's
// highlighted on the intro card and blanked out in fill-in exercises. Ids come from the
// word itself, so fixing a meaning or example keeps progress.

const TOPICS = [
  { id: "feel", ko: "감정", en: "Feelings", icon: "💗" },
  { id: "persona", ko: "성격", en: "Personality", icon: "🧠" },
  { id: "chores", ko: "일상", en: "Daily life", icon: "🧺" },
  { id: "people", ko: "관계", en: "Relationships", icon: "💞" },
  { id: "job", ko: "직장", en: "Work", icon: "💼" },
  { id: "taste", ko: "요리·맛", en: "Cooking & taste", icon: "🍳" },
  { id: "health", ko: "건강", en: "Health", icon: "🩺" },
  { id: "weather", ko: "날씨", en: "Weather", icon: "🌦️" },
  { id: "money", ko: "돈·쇼핑", en: "Money & shopping", icon: "💳" },
  { id: "home", ko: "집", en: "Home", icon: "🏠" },
  { id: "travel", ko: "여행·교통", en: "Travel & transport", icon: "✈️" },
  { id: "time", ko: "시간", en: "Time words", icon: "⏰" },
  { id: "glue", ko: "말 연결", en: "Conversation glue", icon: "🔗" },
  { id: "views", ko: "의견", en: "Opinions & talk", icon: "🗨️" },
  { id: "hobby", ko: "취미", en: "Hobbies", icon: "🎨" },
  { id: "news", ko: "사회", en: "Society & news", icon: "📰" },
  { id: "study", ko: "공부", en: "Study", icon: "📚" },
  { id: "phone", ko: "폰·인터넷", en: "Phone & internet", icon: "📱" },
  { id: "looks", ko: "묘사", en: "Describing things", icon: "✨" },
  { id: "hands", ko: "동작", en: "Actions", icon: "🤲" },
  { id: "change", ko: "변화", en: "Changes", icon: "🔄" },
  { id: "family", ko: "가족", en: "Family & people", icon: "👪" },
];

const WORDS = [];
function W(topic, block) {
  for (const line of block.trim().split("\n")) {
    const [ko, en, ex, exEn] = line.split("|").map((s) => s.trim());
    if (!ex) continue;
    WORDS.push({ id: "w:" + _hash(ko), kind: "w", topic, ko, en, ex, exEn });
  }
}

W("feel", `
설레다|to be excited, have butterflies|여행 가기 전날은 항상 [설레요].|I always get excited the day before a trip.
속상하다|to be upset, hurt|시험을 망쳐서 너무 [속상해요].|I bombed the test, so I'm really upset.
답답하다|to feel frustrated, stifled|말이 안 통해서 [답답했어요].|We couldn't understand each other, so it was frustrating.
아쉽다|to be a shame, wish there were more|벌써 끝나서 [아쉬워요].|It's a shame it's over already.
부럽다|to be jealous, envious|한국어 잘하는 친구가 [부러워요].|I'm jealous of my friend who speaks Korean well.
창피하다|to be embarrassed|사람들 앞에서 넘어져서 [창피했어요].|I fell in front of people, so I was embarrassed.
뿌듯하다|to feel proud, fulfilled|혼자 주문해서 정말 [뿌듯했어요].|I ordered by myself, so I felt really proud.
서운하다|to feel hurt, let down (by someone)|친구가 제 생일을 잊어버려서 좀 [서운했어요].|My friend forgot my birthday, so I felt a bit hurt.
짜증 나다|to be annoyed|버스가 안 와서 [짜증 났어요].|The bus didn't come, so I got annoyed.
긴장되다|to be nervous|면접 때문에 너무 [긴장돼요].|I'm so nervous about the interview.
신기하다|to be fascinating, amazing|한국 편의점은 정말 [신기해요].|Korean convenience stores are really fascinating.
귀찮다|to be a hassle, can't be bothered|오늘은 요리하기 [귀찮아요].|I can't be bothered to cook today.
지루하다|to be boring|그 영화는 좀 [지루했어요].|That movie was a bit boring.
외롭다|to be lonely|혼자 살아서 가끔 [외로워요].|I live alone, so I get lonely sometimes.
그립다|to miss, long for|고향 음식이 [그리워요].|I miss the food from home.
걱정되다|to be worried|내일 날씨가 [걱정돼요].|I'm worried about tomorrow's weather.
다행이다|to be a relief|안 다쳐서 [다행이에요].|What a relief that you didn't get hurt.
실망하다|to be disappointed|결과를 보고 [실망했어요].|I was disappointed when I saw the result.
후회하다|to regret|그 말을 한 걸 [후회해요].|I regret saying that.
감동받다|to be moved, touched|편지를 받고 [감동받았어요].|I was touched when I got the letter.
억울하다|to feel wronged, it's unfair|제 잘못이 아닌데 혼나서 [억울해요].|It wasn't my fault but I got scolded, so it feels unfair.
편하다|to be comfortable, at ease|이 신발은 정말 [편해요].|These shoes are really comfortable.
`);

W("persona", `
꼼꼼하다|to be meticulous, detail-oriented|제 동생은 정말 [꼼꼼해요].|My younger sibling is really meticulous.
털털하다|to be easygoing, unfussy|그 친구는 성격이 [털털해서] 편해요.|That friend is easygoing, so I'm comfortable around them.
소심하다|to be timid|저는 좀 [소심한] 편이에요.|I'm a bit on the timid side.
적극적이다|to be proactive, outgoing|수업 시간에 [적극적으로] 말해요.|I speak up actively in class.
솔직하다|to be honest, frank|[솔직한] 사람이 좋아요.|I like honest people.
성실하다|to be diligent, hardworking|그 사람은 정말 [성실해요].|That person is really diligent.
게으르다|to be lazy|주말에는 좀 [게을러요].|I'm a bit lazy on weekends.
고집이 세다|to be stubborn|아버지는 [고집이 세세요].|My father is stubborn.
눈치가 빠르다|to be quick to read the room|그 친구는 [눈치가 빨라요].|That friend picks up on things fast.
차분하다|to be calm|언니는 성격이 [차분해요].|My older sister is calm by nature.
다정하다|to be affectionate, sweet|남자친구가 정말 [다정해요].|My boyfriend is really sweet.
예민하다|to be sensitive, on edge|요즘 스트레스 때문에 좀 [예민해요].|I'm a bit on edge lately because of stress.
활발하다|to be lively, outgoing|어렸을 때는 정말 [활발했어요].|I was really lively as a kid.
겸손하다|to be humble|칭찬을 받으면 [겸손하게] 말해요.|When I get a compliment, I answer humbly.
이기적이다|to be selfish|그건 너무 [이기적인] 것 같아요.|I think that's too selfish.
엄격하다|to be strict|우리 부모님은 좀 [엄격하셨어요].|My parents were a bit strict.
느긋하다|to be relaxed, unhurried|저는 성격이 [느긋한] 편이에요.|I tend to be pretty relaxed.
성격이 급하다|to be impatient|저는 [성격이 급해서] 기다리는 걸 못 해요.|I'm impatient, so I can't stand waiting.
낯을 가리다|to be shy with strangers|처음에는 [낯을 가리는데] 금방 친해져요.|I'm shy at first, but I warm up quickly.
철이 없다|to be immature|어렸을 때는 [철이 없었어요].|I was immature when I was young.
`);

W("chores", `
정리하다|to tidy up, organize|주말에 방을 [정리했어요].|I tidied my room over the weekend.
치우다|to clear away, clean up|먹고 나서 바로 [치울게요].|I'll clean up right after we eat.
빨래하다|to do laundry|오늘 [빨래해야] 돼요.|I have to do laundry today.
설거지하다|to do the dishes|제가 [설거지할게요].|I'll do the dishes.
장을 보다|to go grocery shopping|퇴근하고 [장 보러] 가요.|I go grocery shopping after work.
챙기다|to remember to bring, look after|우산 [챙겼어요]?|Did you remember your umbrella?
들르다|to stop by|집에 가는 길에 편의점에 [들렀어요].|I stopped by a convenience store on the way home.
깨다|to wake up|밤에 자꾸 [깨요].|I keep waking up at night.
충전하다|to charge|휴대폰 좀 [충전해도] 돼요?|Could I charge my phone?
버리다|to throw away|이거 [버려도] 돼요?|Can I throw this out?
고치다|to fix|자전거를 [고쳤어요].|I fixed my bike.
꺼내다|to take out|냉장고에서 물 좀 [꺼내] 주세요.|Please take some water out of the fridge.
넣다|to put in|가방에 책을 [넣었어요].|I put the book in my bag.
맡기다|to leave in someone's care|세탁소에 코트를 [맡겼어요].|I left my coat at the dry cleaner's.
미루다|to put off|숙제를 자꾸 [미뤄요].|I keep putting off my homework.
갈아입다|to change clothes|집에 오자마자 옷을 [갈아입어요].|I change clothes as soon as I get home.
늦잠을 자다|to oversleep, sleep in|주말에는 [늦잠을 자요].|I sleep in on weekends.
켜다|to turn on|불 좀 [켜] 줄래요?|Could you turn on the light?
끄다|to turn off|나갈 때 에어컨 [끄세요].|Turn off the AC when you leave.
씻다|to wash (up)|밥 먹기 전에 손 [씻으세요].|Wash your hands before eating.
`);

W("people", `
사귀다|to date, go out with|두 사람 [사귄] 지 얼마나 됐어요?|How long have you two been dating?
헤어지다|to break up, part ways|여자친구랑 [헤어졌어요].|I broke up with my girlfriend.
소개팅|blind date|친구가 [소개팅]을 시켜 줬어요.|My friend set me up on a blind date.
연락하다|to get in touch|도착하면 [연락할게요].|I'll get in touch when I arrive.
친해지다|to become close|동료들이랑 많이 [친해졌어요].|I've gotten really close to my coworkers.
다투다|to argue, quarrel|어제 친구랑 좀 [다퉜어요].|I had a bit of an argument with a friend yesterday.
화해하다|to make up|벌써 [화해했어요].|We already made up.
선배|senior (at school or work)|[선배]가 많이 도와줬어요.|My senior helped me a lot.
후배|junior (at school or work)|[후배]한테 밥을 샀어요.|I bought my junior a meal.
동료|coworker|[동료]들이랑 점심 먹어요.|I eat lunch with my coworkers.
짝사랑|one-sided love, crush|고등학교 때 [짝사랑]을 했어요.|I had a crush on someone in high school.
고백하다|to confess (your feelings)|용기를 내서 [고백했어요].|I worked up the courage and confessed.
사이|relationship, terms (between people)|형이랑 [사이]가 좋아요.|I'm on good terms with my older brother.
약속을 지키다|to keep a promise|꼭 [약속을 지킬게요].|I'll definitely keep my promise.
오해하다|to misunderstand|제 말을 [오해하신] 것 같아요.|I think you misunderstood me.
배려하다|to be considerate|다른 사람을 [배려하는] 게 중요해요.|Being considerate of others is important.
연애하다|to be in a relationship|요즘 [연애하고] 있어요?|Are you seeing anyone these days?
결혼식|wedding|다음 주에 친구 [결혼식]에 가요.|I'm going to a friend's wedding next week.
위로하다|to comfort|친구를 [위로해] 줬어요.|I comforted my friend.
연락이 끊기다|to lose touch|그 친구랑은 [연락이 끊겼어요].|I lost touch with that friend.
`);

W("job", `
회의|meeting|오후에 [회의]가 있어요.|I have a meeting this afternoon.
출장|business trip|다음 주에 [출장] 가요.|I'm going on a business trip next week.
야근|working late, overtime|오늘도 [야근]이에요.|Another late night at work today.
출근하다|to go to work|몇 시에 [출근해요]?|What time do you go to work?
퇴근하다|to leave work|보통 6시에 [퇴근해요].|I usually leave work at six.
월급|monthly salary|[월급]날이 기다려져요.|I can't wait for payday.
휴가를 내다|to take time off|다음 달에 [휴가를 낼] 거예요.|I'm going to take time off next month.
면접|(job) interview|내일 [면접] 보러 가요.|I'm going to an interview tomorrow.
지원하다|to apply|그 회사에 [지원했어요].|I applied to that company.
업무|work, duties|새로운 [업무]를 맡았어요.|I've taken on new duties.
마감|deadline|[마감]이 언제예요?|When's the deadline?
승진하다|to get promoted|올해 [승진했어요].|I got promoted this year.
그만두다|to quit|회사를 [그만뒀어요].|I quit my job.
상사|boss, superior|제 [상사]는 좀 엄격해요.|My boss is a bit strict.
경력|work experience|[경력]이 3년 있어요.|I have three years of experience.
회식|team dinner and drinks|오늘 저녁에 [회식] 있어요.|There's a team dinner tonight.
재택근무|working from home|일주일에 두 번 [재택근무]해요.|I work from home twice a week.
처리하다|to handle, deal with|이 일은 오늘 [처리할게요].|I'll handle this today.
월요병|Monday blues|[월요병] 때문에 너무 피곤해요.|I'm so tired from the Monday blues.
취직하다|to get a job|졸업하고 바로 [취직했어요].|I got a job right after graduating.
이직하다|to change jobs|내년에 [이직하려고] 해요.|I'm planning to change jobs next year.
`);

W("taste", `
재료|ingredients|[재료]가 다 있어요?|Do you have all the ingredients?
볶다|to stir-fry|양파를 먼저 [볶으세요].|Stir-fry the onion first.
굽다|to grill, bake|고기를 [구워] 드릴게요.|I'll grill the meat for you.
끓이다|to boil, make (soup, ramyeon)|라면 [끓여] 줄까요?|Shall I make you some ramyeon?
썰다|to slice, chop|파를 [썰어] 주세요.|Please chop the green onion.
섞다|to mix|잘 [섞어서] 드세요.|Mix it well before you eat.
싱겁다|to be bland (not salty enough)|국이 좀 [싱거워요].|The soup is a little bland.
짜다|to be salty|이건 너무 [짜요].|This is too salty.
느끼하다|to be greasy, too rich|피자가 좀 [느끼해요].|The pizza is a bit greasy.
담백하다|to be light, clean-tasting|이 국은 [담백해서] 좋아요.|I like this soup because it's light.
고소하다|to be nutty, toasty|참기름 냄새가 [고소해요].|The sesame oil smells nutty.
쫄깃하다|to be chewy|떡이 정말 [쫄깃해요].|The rice cake is really chewy.
바삭하다|to be crispy|치킨이 [바삭해요].|The chicken is crispy.
얼큰하다|to be spicy and hearty|[얼큰한] 국물이 먹고 싶어요.|I'm craving a spicy, hearty broth.
배달시키다|to order delivery|치킨 [배달시킬까요]?|Shall we order chicken delivery?
반찬|side dishes|[반찬]은 셀프예요.|The side dishes are self-serve.
양념|seasoning, sauce|[양념] 치킨 좋아해요?|Do you like sauced chicken?
남기다|to leave (food) over|음식을 [남기면] 안 돼요.|You shouldn't leave food uneaten.
입맛|appetite, taste|요즘 [입맛]이 없어요.|I have no appetite these days.
간을 보다|to taste for seasoning|[간 좀 봐] 주세요.|Could you taste this for seasoning?
`);

W("health", `
증상|symptom|어떤 [증상]이 있어요?|What symptoms do you have?
열이 나다|to have a fever|어제부터 [열이 나요].|I've had a fever since yesterday.
기침|cough|[기침]이 계속 나요.|I keep coughing.
콧물|runny nose|[콧물]이 나요.|I have a runny nose.
체하다|to have indigestion|급하게 먹어서 [체했어요].|I ate too fast and got indigestion.
어지럽다|to be dizzy|갑자기 [어지러워요].|I suddenly feel dizzy.
붓다|to swell|발목이 [부었어요].|My ankle is swollen.
다치다|to get hurt|운동하다가 [다쳤어요].|I got hurt while working out.
삐다|to sprain|발목을 [삐었어요].|I sprained my ankle.
낫다|to get better, recover|감기가 다 [나았어요].|My cold is all better.
처방전|prescription|[처방전] 가지고 약국에 가세요.|Take the prescription to the pharmacy.
몸살|aches and chills (from flu or fatigue)|[몸살]이 났어요.|I've come down with aches and chills.
스트레스를 받다|to be stressed|요즘 일 때문에 [스트레스를 받아요].|I'm stressed from work lately.
알레르기|allergy|땅콩 [알레르기]가 있어요.|I have a peanut allergy.
소화가 안 되다|to have trouble digesting|밀가루를 먹으면 [소화가 안 돼요].|I can't digest flour well.
푹 쉬다|to get a good rest|오늘은 [푹 쉬세요].|Get plenty of rest today.
건강검진|health checkup|1년에 한 번 [건강검진]을 받아요.|I get a checkup once a year.
두통|headache|[두통]이 심해요.|My headache is bad.
상처|wound, cut; emotional hurt|손에 [상처]가 났어요.|I got a cut on my hand.
진찰|medical examination|[진찰] 받으러 왔어요.|I'm here to see the doctor.
`);

W("weather", `
맑다|to be clear, sunny|오늘은 하늘이 [맑아요].|The sky is clear today.
흐리다|to be cloudy|날씨가 좀 [흐려요].|It's a bit cloudy.
습하다|to be humid|여름에는 너무 [습해요].|It's so humid in summer.
건조하다|to be dry|겨울에는 공기가 [건조해요].|The air is dry in winter.
쌀쌀하다|to be chilly|아침저녁으로 [쌀쌀해요].|It's chilly in the mornings and evenings.
선선하다|to be pleasantly cool|가을 바람이 [선선해요].|The autumn breeze is nice and cool.
무덥다|to be sweltering|오늘 정말 [무더워요].|It's really sweltering today.
장마|rainy season|7월은 [장마]예요.|July is rainy season.
소나기|sudden shower|갑자기 [소나기]가 왔어요.|There was a sudden shower.
미세먼지|fine dust (air pollution)|오늘 [미세먼지]가 심해요.|The fine dust is bad today.
일기예보|weather forecast|[일기예보] 봤어요?|Did you see the forecast?
기온|temperature (air)|[기온]이 많이 떨어졌어요.|The temperature dropped a lot.
영하|below zero|내일은 [영하] 10도래요.|They say it'll be minus ten tomorrow.
태풍|typhoon|[태풍]이 온대요.|They say a typhoon is coming.
단풍|autumn leaves|[단풍] 구경 가요.|Let's go see the autumn leaves.
그치다|to stop (rain, snow)|비가 [그쳤어요].|The rain stopped.
쌓이다|to pile up|눈이 많이 [쌓였어요].|A lot of snow has piled up.
햇빛|sunlight|[햇빛]이 너무 강해요.|The sunlight is too strong.
꽃샘추위|early-spring cold snap|[꽃샘추위] 때문에 다시 추워요.|It's cold again because of the spring cold snap.
날씨가 풀리다|to warm up (weather eases)|[날씨가 많이 풀렸어요].|The weather has really warmed up.
`);

W("money", `
할인|discount|학생 [할인] 돼요?|Is there a student discount?
환불|refund|[환불]하고 싶어요.|I'd like a refund.
교환|exchange|다른 사이즈로 [교환]돼요?|Can I exchange it for another size?
영수증|receipt|[영수증]은 버려 주세요.|You can throw the receipt away.
아끼다|to save, use sparingly|요즘 돈을 [아끼고] 있어요.|I'm saving money these days.
낭비하다|to waste|시간을 [낭비했어요].|I wasted time.
저축하다|to save (money in the bank)|매달 조금씩 [저축해요].|I save a little every month.
할부|installments|3개월 [할부]로 해 주세요.|Please split it into three monthly installments.
일시불|paying in full at once|[일시불]로 할게요.|I'll pay it all at once.
품절|sold out|그 색깔은 [품절]이에요.|That color is sold out.
가성비|value for money|여기는 [가성비]가 좋아요.|This place is good value for money.
비교하다|to compare|가격을 [비교해] 봤어요.|I compared the prices.
충동구매|impulse buying|또 [충동구매]했어요.|I impulse-bought again.
적립|(loyalty) points earned|포인트 [적립]해 드릴까요?|Shall I add points to your card?
결제하다|to pay (card, app)|카드로 [결제할게요].|I'll pay by card.
현금|cash|[현금]만 받아요?|Do you only take cash?
용돈|pocket money, spending money|부모님께 [용돈]을 드렸어요.|I gave my parents some spending money.
물가|cost of living, prices|서울은 [물가]가 높아요.|Prices are high in Seoul.
세일|sale|지금 [세일] 중이에요.|There's a sale on right now.
지갑|wallet|[지갑]을 집에 두고 왔어요.|I left my wallet at home.
`);

W("home", `
이사하다|to move (house)|다음 달에 [이사해요].|I'm moving next month.
집주인|landlord|[집주인]한테 전화했어요.|I called the landlord.
관리비|maintenance fee|[관리비]가 얼마예요?|How much is the maintenance fee?
월세|monthly rent|[월세]가 너무 비싸요.|The rent is too expensive.
층간소음|noise between floors|[층간소음] 때문에 힘들어요.|The noise from upstairs is wearing me out.
고장 나다|to break down|냉장고가 [고장 났어요].|The fridge broke down.
수리하다|to repair|내일 [수리하러] 오신대요.|They say someone's coming to repair it tomorrow.
분리수거|recycling (sorting)|[분리수거]는 수요일이에요.|Recycling is on Wednesday.
쓰레기봉투|(official) trash bag|[쓰레기봉투]는 어디서 사요?|Where do I buy trash bags?
택배|parcel delivery|[택배] 왔어요.|A package arrived.
경비실|security office|[경비실]에 맡겨 주세요.|Please leave it at the security office.
세탁기|washing machine|[세탁기]가 너무 시끄러워요.|The washing machine is really noisy.
난방|heating|[난방] 좀 켜 주세요.|Please turn on the heat.
계약하다|to sign a contract|어제 집을 [계약했어요].|I signed the lease yesterday.
보증금|security deposit|[보증금]이 얼마예요?|How much is the deposit?
원룸|studio apartment|저는 [원룸]에 살아요.|I live in a studio.
전세|lump-sum lease (Korean jeonse)|요즘 [전세] 구하기가 힘들어요.|It's hard to find a jeonse place these days.
이웃|neighbor|[이웃]들이 친절해요.|The neighbors are kind.
창문|window|[창문] 좀 열어도 돼요?|May I open the window?
베란다|balcony|빨래를 [베란다]에 널었어요.|I hung the laundry on the balcony.
`);

W("travel", `
환승하다|to transfer|다음 역에서 [환승하세요].|Transfer at the next station.
막히다|to be jammed (traffic)|길이 많이 [막혀요].|The roads are really jammed.
출발하다|to depart|몇 시에 [출발해요]?|What time do we leave?
도착하다|to arrive|거의 다 [도착했어요].|We're almost there.
왕복|round trip|[왕복]으로 주세요.|A round trip, please.
편도|one way|[편도]만 샀어요.|I only bought one way.
예약하다|to book, reserve|호텔을 [예약했어요].|I booked a hotel.
취소하다|to cancel|예약을 [취소하고] 싶어요.|I'd like to cancel my reservation.
연착되다|to be delayed (train, plane)|비행기가 [연착됐어요].|The flight was delayed.
놓치다|to miss (a bus, train)|막차를 [놓쳤어요].|I missed the last train.
짐을 싸다|to pack|아직 [짐을 안 쌌어요].|I haven't packed yet.
숙소|accommodation, lodging|[숙소]가 역에서 가까워요.|Our place is close to the station.
관광지|tourist spot|여기는 유명한 [관광지]예요.|This is a famous tourist spot.
일정|schedule, itinerary|내일 [일정]이 어떻게 돼요?|What's the plan for tomorrow?
경치|scenery, view|[경치]가 정말 좋아요.|The view is amazing.
기념품|souvenir|[기념품] 가게가 어디예요?|Where's the souvenir shop?
길을 잃다|to get lost|어제 [길을 잃었어요].|I got lost yesterday.
정류장|(bus) stop|다음 [정류장]에서 내려요.|I get off at the next stop.
성수기|peak season|[성수기]라서 비싸요.|It's expensive because it's peak season.
막차|last train or bus|[막차]가 몇 시예요?|What time is the last train?
`);

W("time", `
가끔|sometimes|[가끔] 한국 드라마를 봐요.|I watch Korean dramas sometimes.
자주|often|여기 [자주] 와요?|Do you come here often?
아까|a little while ago|[아까] 전화했어요.|I called a little while ago.
이따가|in a bit, later today|[이따가] 봐요!|See you in a bit!
방금|just now|[방금] 도착했어요.|I just got here.
예전에|in the past, before|[예전에] 여기 살았어요.|I used to live here.
드디어|finally|[드디어] 끝났어요!|It's finally over!
벌써|already|[벌써] 12시예요?|It's already 12?
아직|still, (not) yet|[아직] 안 먹었어요.|I haven't eaten yet.
금방|soon, in a moment|[금방] 갈게요.|I'll be right there.
원래|originally, normally|[원래] 이렇게 매워요?|Is it normally this spicy?
갑자기|suddenly|[갑자기] 비가 와요.|It's suddenly raining.
점점|more and more, gradually|한국어가 [점점] 재미있어요.|Korean is getting more and more fun.
계속|continuously, keep (doing)|[계속] 연습하세요.|Keep practicing.
마침|just in time, as it happens|[마침] 버스가 왔어요.|The bus came just in time.
미리|in advance|[미리] 예약하세요.|Book in advance.
나중에|later|[나중에] 연락할게요.|I'll get in touch later.
당분간|for the time being|[당분간] 바쁠 것 같아요.|I'll probably be busy for a while.
평소에|usually, normally|[평소에] 뭐 하고 지내요?|What do you usually do with your time?
앞으로|from now on|[앞으로] 잘 부탁드려요.|I look forward to working with you from now on.
`);

W("glue", `
사실|actually, in fact|[사실] 저도 잘 몰라요.|Actually, I don't really know either.
아무튼|anyway|[아무튼] 내일 봐요.|Anyway, see you tomorrow.
게다가|on top of that|싸고 [게다가] 맛있어요.|It's cheap, and on top of that, tasty.
오히려|if anything, rather|[오히려] 더 좋아요.|If anything, it's even better.
차라리|would rather, might as well|[차라리] 걸어갈래요.|I'd rather walk.
어차피|anyway, in any case|[어차피] 늦었어요.|We're late anyway.
혹시|by any chance|[혹시] 한국 사람이에요?|Are you Korean, by any chance?
설마|no way, surely not|[설마] 벌써 갔어요?|No way, they already left?
역시|as expected|[역시] 맛있네요!|Delicious, just as I expected!
완전|totally (casual)|[완전] 좋아요!|Totally great!
굉장히|extremely|[굉장히] 친절했어요.|They were extremely kind.
별로|not really, not particularly|[별로] 안 비싸요.|It's not that expensive.
전혀|not at all|[전혀] 몰랐어요.|I had no idea at all.
거의|almost|[거의] 다 했어요.|I'm almost done.
대충|roughly, half-heartedly|[대충] 알겠어요.|I roughly get it.
일단|first of all, for now|[일단] 앉으세요.|Have a seat for now.
그냥|just, for no reason|[그냥] 궁금해서요.|I was just curious.
아마|probably|[아마] 내일 올 거예요.|They'll probably come tomorrow.
어쩐지|no wonder|[어쩐지] 조용하더라고요.|No wonder it was so quiet.
제발|please (begging)|[제발] 조용히 해 주세요.|Please, be quiet.
`);

W("views", `
동의하다|to agree|저도 그 말에 [동의해요].|I agree with that too.
반대하다|to be against, oppose|부모님이 [반대하셨어요].|My parents were against it.
설명하다|to explain|다시 [설명해] 주시겠어요?|Could you explain it again?
추천하다|to recommend|맛집 좀 [추천해] 주세요.|Please recommend a good place to eat.
부탁하다|to ask a favor|하나만 [부탁해도] 돼요?|Can I ask you one favor?
거절하다|to turn down|제안을 [거절했어요].|I turned down the offer.
제안하다|to propose, suggest|새로운 방법을 [제안했어요].|I suggested a new approach.
상담하다|to consult, talk it over|선생님이랑 [상담했어요].|I talked it over with my teacher.
고민하다|to agonize, think hard about|뭘 살지 [고민하고] 있어요.|I'm agonizing over what to buy.
결정하다|to decide|아직 [결정] 못 했어요.|I haven't decided yet.
포기하다|to give up|절대 [포기하지] 마세요.|Never give up.
믿다|to believe, trust|저를 [믿어] 주세요.|Please trust me.
칭찬하다|to praise|선생님이 저를 [칭찬해] 주셨어요.|My teacher praised me.
혼나다|to get scolded|늦어서 [혼났어요].|I got scolded for being late.
불평하다|to complain|매일 날씨에 대해 [불평해요].|They complain about the weather every day.
자랑하다|to show off, brag|친구가 새 차를 [자랑했어요].|My friend showed off their new car.
핑계를 대다|to make excuses|자꾸 [핑계 대지] 마세요.|Stop making excuses.
잔소리하다|to nag|엄마가 매일 [잔소리해요].|My mom nags me every day.
대답하다|to answer|질문에 [대답해] 주세요.|Please answer the question.
의견|opinion|다른 [의견] 있으세요?|Does anyone have a different opinion?
`);

W("hobby", `
산책하다|to take a walk|저녁에 공원에서 [산책해요].|I take walks in the park in the evening.
등산|hiking|주말마다 [등산]을 가요.|I go hiking every weekend.
캠핑|camping|[캠핑] 가 본 적 있어요?|Have you ever been camping?
헬스장|gym|퇴근하고 [헬스장]에 가요.|I go to the gym after work.
맛집|great restaurant, famous food spot|이 근처에 [맛집] 있어요?|Is there a great place to eat around here?
전시회|exhibition|[전시회] 보러 갈래요?|Want to go see an exhibition?
공연|performance, show|[공연]이 몇 시에 시작해요?|What time does the show start?
정주행하다|to binge-watch|주말에 드라마를 [정주행했어요].|I binge-watched a drama over the weekend.
악기|musical instrument|[악기]를 하나 배우고 싶어요.|I want to learn an instrument.
그림을 그리다|to draw, paint|어렸을 때 [그림 그리는] 걸 좋아했어요.|I loved drawing as a kid.
구경하다|to look around|시장 [구경하러] 가요.|Let's go look around the market.
낚시|fishing|아버지는 [낚시]를 좋아하세요.|My dad loves fishing.
독서|reading|제 취미는 [독서]예요.|My hobby is reading.
요리하다|to cook|저는 [요리하는] 걸 좋아해요.|I like cooking.
여행을 다니다|to travel around|[여행 다니는] 걸 좋아해요.|I love traveling around.
덕질|fan activities, stanning|요즘 [덕질]하는 가수 있어요?|Is there a singer you're stanning these days?
연습하다|to practice|매일 발음을 [연습해요].|I practice pronunciation every day.
취미|hobby|[취미]가 뭐예요?|What are your hobbies?
동호회|hobby club|축구 [동호회]에 들어갔어요.|I joined a soccer club.
즐기다|to enjoy|여행 [즐기세요]!|Enjoy your trip!
`);

W("news", `
뉴스|news|오늘 [뉴스] 봤어요?|Did you see today's news?
기사|(news) article|그 [기사] 읽어 봤어요?|Have you read that article?
정부|government|[정부]가 새 정책을 발표했어요.|The government announced a new policy.
선거|election|다음 달에 [선거]가 있어요.|There's an election next month.
경제|economy|요즘 [경제]가 안 좋아요.|The economy isn't good these days.
오르다|to rise, go up|물가가 또 [올랐어요].|Prices went up again.
내리다|to go down; to get off|기름값이 좀 [내렸어요].|Gas prices went down a bit.
환경|environment|[환경]을 위해서 텀블러를 써요.|I use a tumbler for the environment.
사고|accident|길에서 [사고]가 났어요.|There was an accident on the road.
문제|problem|큰 [문제]는 없어요.|There's no big problem.
해결하다|to solve|그 문제는 [해결했어요].|We solved that problem.
발표하다|to announce, present|내일 회의에서 [발표해요].|I'm presenting at tomorrow's meeting.
인구|population|서울 [인구]가 얼마나 돼요?|What's the population of Seoul?
세대|generation|MZ[세대]라는 말 들어 봤어요?|Have you heard the term "MZ generation"?
유행하다|to be trendy|요즘 이 노래가 [유행해요].|This song is trending these days.
인기가 많다|to be popular|그 배우는 [인기가 많아요].|That actor is really popular.
화제|hot topic|요즘 [화제]가 된 드라마예요.|It's the drama everyone's talking about.
논란|controversy|그 일로 [논란]이 됐어요.|That caused a controversy.
외국인|foreigner|요즘 [외국인] 관광객이 많아요.|There are lots of foreign tourists these days.
문화|culture|한국 [문화]에 관심이 많아요.|I'm really interested in Korean culture.
`);

W("study", `
전공|major (at university)|[전공]이 뭐예요?|What's your major?
과제|assignment|[과제]가 너무 많아요.|I have way too many assignments.
시험을 보다|to take a test|내일 [시험을 봐요].|I'm taking a test tomorrow.
합격하다|to pass (an exam)|토픽 시험에 [합격했어요]!|I passed the TOPIK!
떨어지다|to fail (an exam); to fall|시험에 [떨어졌어요].|I failed the test.
복습하다|to review|배운 걸 매일 [복습해요].|I review what I learned every day.
외우다|to memorize|단어를 [외우는] 게 어려워요.|Memorizing words is hard.
발음|pronunciation|[발음]이 정말 좋네요!|Your pronunciation is really good!
실력|skill, ability|한국어 [실력]이 많이 늘었어요.|Your Korean has really improved.
늘다|to improve, increase|운동하니까 체력이 [늘었어요].|My stamina improved since I started working out.
졸업하다|to graduate|작년에 대학교를 [졸업했어요].|I graduated from college last year.
학기|semester|이번 [학기]는 너무 바빠요.|This semester is so busy.
동아리|(student) club|대학교 때 댄스 [동아리]였어요.|I was in a dance club in college.
학원|private academy, cram school|저녁에 영어 [학원]에 다녀요.|I go to an English academy in the evenings.
성적|grades|이번 학기 [성적]이 잘 나왔어요.|My grades came out well this semester.
장학금|scholarship|[장학금]을 받았어요.|I got a scholarship.
수업|class|[수업]이 몇 시에 끝나요?|What time does class end?
틀리다|to be wrong, make a mistake|제가 [틀렸어요].|I was wrong.
질문하다|to ask a question|[질문해도] 돼요?|May I ask a question?
뜻|meaning|이 단어 [뜻]이 뭐예요?|What does this word mean?
`);

W("phone", `
검색하다|to search (online)|인터넷에서 [검색해] 보세요.|Try searching online.
저장하다|to save|제 번호 [저장해] 주세요.|Please save my number.
다운받다|to download|이 앱 [다운받았어요]?|Did you download this app?
올리다|to post, upload|인스타에 사진을 [올렸어요].|I posted a photo on Instagram.
댓글|comment|[댓글] 달아 주세요.|Please leave a comment.
구독하다|to subscribe|이 채널 [구독했어요].|I subscribed to this channel.
알림|notification|[알림]이 계속 와요.|I keep getting notifications.
배터리|battery|[배터리]가 다 됐어요.|My battery is dead.
비밀번호|password|와이파이 [비밀번호]가 뭐예요?|What's the wifi password?
단톡방|group chat|[단톡방]에 초대할게요.|I'll invite you to the group chat.
이모티콘|emoji sticker|귀여운 [이모티콘]을 샀어요.|I bought some cute stickers.
차단하다|to block|그 사람 [차단했어요].|I blocked that person.
업데이트하다|to update|앱을 [업데이트해야] 돼요.|I need to update the app.
영상|video|재미있는 [영상] 보내 줄게요.|I'll send you a funny video.
캡처하다|to screenshot|화면을 [캡처했어요].|I took a screenshot.
읽씹|leaving someone on read|제 메시지 [읽씹]했어요?|Did you leave my message on read?
답장|reply (to a message)|[답장]이 아직 안 왔어요.|I haven't gotten a reply yet.
로그인하다|to log in|다시 [로그인해] 보세요.|Try logging in again.
전화를 걸다|to make a call|제가 다시 [전화를 걸게요].|I'll call you back.
충전기|charger|[충전기] 있어요?|Do you have a charger?
`);

W("looks", `
복잡하다|to be complicated; crowded|지하철 노선이 [복잡해요].|The subway lines are complicated.
단순하다|to be simple|[단순한] 디자인이 좋아요.|I like simple designs.
독특하다|to be unique, unusual|스타일이 정말 [독특하네요].|Your style is really unique.
평범하다|to be ordinary|저는 [평범한] 회사원이에요.|I'm an ordinary office worker.
화려하다|to be flashy, showy|옷이 너무 [화려해요].|The outfit is too flashy.
깔끔하다|to be neat, clean|방이 정말 [깔끔하네요].|Your room is so neat.
지저분하다|to be messy|책상이 좀 [지저분해요].|My desk is a bit messy.
조용하다|to be quiet|이 카페는 [조용해서] 좋아요.|I like this café because it's quiet.
넓다|to be spacious, wide|거실이 [넓어요].|The living room is spacious.
낡다|to be old, worn out|이 신발은 너무 [낡았어요].|These shoes are too worn out.
익숙하다|to be familiar, used to|이제 한국 생활에 [익숙해요].|I'm used to life in Korea now.
낯설다|to be unfamiliar, strange|처음에는 모든 게 [낯설었어요].|Everything felt unfamiliar at first.
유명하다|to be famous|이 집은 떡볶이로 [유명해요].|This place is famous for its tteokbokki.
흔하다|to be common|그 이름은 한국에서 [흔해요].|That name is common in Korea.
심하다|to be severe, too much|교통 체증이 [심해요].|The traffic is terrible.
적당하다|to be just right, reasonable|가격이 [적당해요].|The price is reasonable.
어색하다|to be awkward|처음 만나서 좀 [어색했어요].|It was a bit awkward meeting for the first time.
똑같다|to be exactly the same|저랑 [똑같은] 옷이네요!|That's the exact same outfit as mine!
특별하다|to be special|오늘은 [특별한] 날이에요.|Today is a special day.
분위기|atmosphere, vibe|이 식당 [분위기]가 좋아요.|This restaurant has a nice vibe.
`);

W("hands", `
빌리다|to borrow|펜 좀 [빌려도] 돼요?|Can I borrow a pen?
빌려주다|to lend|우산 [빌려줄게요].|I'll lend you an umbrella.
갚다|to pay back|다음 주에 [갚을게요].|I'll pay you back next week.
잃어버리다|to lose|핸드폰을 [잃어버렸어요].|I lost my phone.
줍다|to pick up (off the ground)|길에서 지갑을 [주웠어요].|I picked up a wallet on the street.
떨어뜨리다|to drop|휴대폰을 [떨어뜨렸어요].|I dropped my phone.
깨뜨리다|to break (glass, dishes)|컵을 [깨뜨렸어요].|I broke a cup.
흘리다|to spill (a little); to shed|커피를 [흘렸어요].|I spilled some coffee.
쏟다|to spill (all of it), pour out|물을 다 [쏟았어요].|I spilled all the water.
밀다|to push|문을 [미세요].|Push the door.
당기다|to pull|이 문은 [당기세요].|Pull this door.
누르다|to press|버튼을 [누르세요].|Press the button.
들다|to lift, carry, hold|가방 좀 [들어] 드릴까요?|Shall I carry your bag?
옮기다|to move (something)|이 상자 좀 같이 [옮겨] 줄래요?|Could you help me move this box?
붙이다|to stick, attach|여기에 스티커를 [붙이세요].|Put the sticker here.
떼다|to peel off, remove|가격표를 [뗐어요].|I took off the price tag.
펴다|to open up, unfold|우산을 [펴세요].|Open your umbrella.
접다|to fold|종이를 반으로 [접으세요].|Fold the paper in half.
던지다|to throw|공을 [던져] 주세요.|Throw me the ball.
잡다|to catch, grab; to get (a taxi)|택시를 [잡았어요].|I caught a taxi.
`);

W("change", `
줄다|to decrease, shrink|몸무게가 좀 [줄었어요].|My weight has gone down a bit.
바뀌다|to be changed|전화번호가 [바뀌었어요].|My phone number changed.
변하다|to change, transform|서울이 많이 [변했어요].|Seoul has changed a lot.
생기다|to come up, appear; to get|일이 [생겨서] 못 가요.|Something came up, so I can't go.
없어지다|to disappear, be gone|제 우산이 [없어졌어요].|My umbrella is gone.
망가지다|to get wrecked, ruined|우산이 바람에 [망가졌어요].|My umbrella got wrecked by the wind.
익다|to be cooked, ripe|고기가 다 [익었어요].|The meat is cooked through.
녹다|to melt|아이스크림이 다 [녹았어요].|The ice cream melted.
얼다|to freeze|길이 [얼어서] 미끄러워요.|The road froze, so it's slippery.
마르다|to dry; to be thin|빨래가 다 [말랐어요].|The laundry is all dry.
젖다|to get wet|신발이 다 [젖었어요].|My shoes got soaked.
식다|to cool down, go cold|커피가 다 [식었어요].|The coffee went cold.
상하다|to go bad, spoil|우유가 [상했어요].|The milk went bad.
자라다|to grow (up)|저는 시골에서 [자랐어요].|I grew up in the countryside.
늙다|to grow old|부모님이 많이 [늙으셨어요].|My parents have gotten a lot older.
살이 찌다|to gain weight|한국에 와서 [살이 쪘어요].|I gained weight after coming to Korea.
살이 빠지다|to lose weight|요즘 [살이 빠졌어요].|I've lost weight lately.
늘어나다|to grow, increase in number|관광객이 많이 [늘어났어요].|The number of tourists has really grown.
끝나다|to end|영화가 언제 [끝나요]?|When does the movie end?
다 되다|to be done, ready|밥 [다 됐어요]!|Food's ready!
`);

W("family", `
조카|niece, nephew|[조카]가 정말 귀여워요.|My niece is so cute.
사촌|cousin|[사촌]이 서울에 살아요.|My cousin lives in Seoul.
형제|siblings|[형제]가 어떻게 되세요?|Do you have any brothers or sisters?
외동|only child|저는 [외동]이에요.|I'm an only child.
막내|youngest (in the family)|저는 집에서 [막내]예요.|I'm the youngest in my family.
장남|eldest son|남편은 [장남]이에요.|My husband is the eldest son.
시부모님|a husband's parents|주말에 [시부모님] 댁에 가요.|I'm going to my in-laws' place this weekend.
장인어른|a wife's father|[장인어른]은 낚시를 좋아하세요.|My father-in-law loves fishing.
며느리|daughter-in-law|그 집 [며느리]는 정말 착해요.|That family's daughter-in-law is really kind.
사위|son-in-law|우리 [사위]는 요리를 잘해요.|Our son-in-law is a good cook.
친척|relatives|명절에 [친척]들이 다 모여요.|All the relatives gather for the holidays.
손주|grandchild|할머니가 [손주]들을 보고 싶어 하세요.|Grandma misses her grandkids.
쌍둥이|twins|저 두 사람 [쌍둥이]예요?|Are those two twins?
남편|husband|제 [남편]은 회사원이에요.|My husband is an office worker.
아내|wife|[아내]랑 같이 왔어요.|I came with my wife.
어른|adult, elder|[어른]들 앞에서는 존댓말을 써요.|Use polite speech in front of elders.
또래|people your age|여기는 [또래] 친구들이 많아요.|There are lots of people my age here.
동갑|the same age|우리 [동갑]이네요!|We're the same age!
명절|traditional holiday|[명절]에는 고향에 가요.|I go to my hometown for the holidays.
돌아가시다|to pass away (honorific)|할아버지는 작년에 [돌아가셨어요].|My grandfather passed away last year.
`);

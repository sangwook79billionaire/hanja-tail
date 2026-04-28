const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const data = [
  // 8급 기초
  { word: "학교", hanja: "學校", meaning: "선생님과 친구들이 모여 공부하는 곳이에요.", analysis: [{char:"學",meaning:"배울",sound:"학",level:"8급"},{char:"校",meaning:"학교",sound:"교",level:"8급"}] },
  { word: "부모", hanja: "父母", meaning: "나를 사랑으로 길러주시는 아버지와 어머니예요.", analysis: [{char:"父",meaning:"아버지",sound:"부",level:"8급"},{char:"母",meaning:"어머니",sound:"모",level:"8급"}] },
  { word: "동서남북", hanja: "東西南北", meaning: "해 뜨는 곳, 지는 곳 등 네 가지 방향을 말해요.", analysis: [{char:"東",meaning:"동녘",sound:"동",level:"8급"},{char:"西",meaning:"서녘",sound:"서",level:"8급"},{char:"南",meaning:"남녘",sound:"남",level:"8급"},{char:"北",meaning:"북녘",sound:"북",level:"8급"}] },
  { word: "대한민국", hanja: "大韓民國", meaning: "우리가 살고 있는 자랑스러운 우리나라 이름이에요.", analysis: [{char:"大",meaning:"큰",sound:"대",level:"7급"},{char:"韓",meaning:"나라",sound:"한",level:"4급"},{char:"民",meaning:"백성",sound:"민",level:"6급"},{char:"國",meaning:"나라",sound:"국",level:"8급"}] },
  { word: "학생", hanja: "學生", meaning: "학교에서 새로운 것을 배우는 어린이나 청소년이에요.", analysis: [{char:"學",meaning:"배울",sound:"학",level:"8급"},{char:"生",meaning:"날",sound:"생",level:"8급"}] },
  { word: "남녀", hanja: "男女", meaning: "남자와 여자를 함께 부르는 말이에요.", analysis: [{char:"男",meaning:"사내",sound:"남",level:"8급"},{char:"女",meaning:"여자",sound:"녀",level:"8급"}] },
  { word: "산천", hanja: "山川", meaning: "높은 산과 흐르는 시내, 즉 자연을 말해요.", analysis: [{char:"山",meaning:"메",sound:"산",level:"7급"},{char:"川",meaning:"내",sound:"천",level:"7급"}] },
  { word: "수화토", hanja: "水火土", meaning: "물과 불, 그리고 흙을 말해요.", analysis: [{char:"水",meaning:"물",sound:"수",level:"8급"},{char:"火",meaning:"불",sound:"화",level:"8급"},{char:"土",meaning:"흙",sound:"토",level:"8급"}] },
  { word: "일월", hanja: "日月", meaning: "해와 달, 또는 날짜와 달을 뜻해요.", analysis: [{char:"日",meaning:"날",sound:"일",level:"8급"},{char:"月",meaning:"달",sound:"월",level:"8급"}] },
  { word: "형제", hanja: "兄弟", meaning: "남자들끼리의 형과 아우를 말해요.", analysis: [{char:"兄",meaning:"맏",sound:"형",level:"8급"},{char:"弟",meaning:"아우",sound:"제",level:"8급"}] },
  
  // 7급 및 생활 단어
  { word: "교실", hanja: "敎室", meaning: "학교에서 수업을 듣는 방이에요.", analysis: [{char:"敎",meaning:"가르칠",sound:"교",level:"7급"},{char:"室",meaning:"집",sound:"실",level:"7급"}] },
  { word: "입구", hanja: "入口", meaning: "안으로 들어가는 문이나 길이에요.", analysis: [{char:"入",meaning:"들",sound:"입",level:"8급"},{char:"口",meaning:"입",sound:"구",level:"7급"}] },
  { word: "출구", hanja: "出口", meaning: "밖으로 나가는 문이나 길이에요.", analysis: [{char:"出",meaning:"날",sound:"출",level:"7급"},{char:"口",meaning:"입",sound:"구",level:"7급"}] },
  { word: "대소", hanja: "大小", meaning: "큰 것과 작은 것을 아울러 이르는 말이에요.", analysis: [{char:"大",meaning:"큰",sound:"대",level:"7급"},{char:"小",meaning:"작을",sound:"소",level:"7급"}] },
  { word: "상하", hanja: "上下", meaning: "위쪽과 아래쪽을 말해요.", analysis: [{char:"上",meaning:"위",sound:"상",level:"7급"},{char:"下",meaning:"아래",sound:"하",level:"7급"}] },
  { word: "좌우", hanja: "左右", meaning: "왼쪽과 오른쪽을 말해요.", analysis: [{char:"左",meaning:"왼",sound:"좌",level:"7급"},{char:"右",meaning:"오른",sound:"우",level:"7급"}] },
  { word: "지구", hanja: "地球", meaning: "우리가 살고 있는 푸른 행성이에요.", analysis: [{char:"地",meaning:"땅",sound:"지",level:"7급"},{char:"球",meaning:"공",sound:"구",level:"5급"}] },
  { word: "태양", hanja: "太陽", meaning: "낮에 하늘에서 밝게 빛나는 해예요.", analysis: [{char:"太",meaning:"클",sound:"태",level:"6급"},{char:"陽",meaning:"볕",sound:"양",level:"6급"}] },
  { word: "인물", hanja: "人物", meaning: "사람이나 뛰어난 사람을 뜻해요.", analysis: [{char:"人",meaning:"사람",sound:"인",level:"8급"},{char:"物",meaning:"물건",sound:"물",level:"7급"}] },
  { word: "식물", hanja: "植物", meaning: "나무나 꽃처럼 땅에 뿌리를 박고 자라는 생물이에요.", analysis: [{char:"植",meaning:"심을",sound:"식",level:"5급"},{char:"物",meaning:"물건",sound:"물",level:"7급"}] },
  { word: "동물", hanja: "動物", meaning: "강아지나 고양이처럼 움직이는 생물이에요.", analysis: [{char:"動",meaning:"움직일",sound:"동",level:"6급"},{char:"物",meaning:"물건",sound:"물",level:"7급"}] },
  
  // 가족 및 관계
  { word: "조부모", hanja: "祖父母", meaning: "할아버지와 할머니를 말해요.", analysis: [{char:"祖",meaning:"할아비",sound:"조",level:"6급"},{char:"父",meaning:"아버지",sound:"부",level:"8급"},{char:"母",meaning:"어머니",sound:"모",level:"8급"}] },
  { word: "자매", hanja: "姊妹", meaning: "언니와 여동생을 말해요.", analysis: [{char:"姊",meaning:"언니",sound:"자",level:"3급"},{char:"妹",meaning:"손아래누이",sound:"매",level:"4급"}] },
  { word: "남매", hanja: "男妹", meaning: "오빠와 여동생 또는 누나와 남동생을 말해요.", analysis: [{char:"男",meaning:"사내",sound:"남",level:"8급"},{char:"妹",meaning:"손아래누이",sound:"매",level:"4급"}] },
  { word: "친구", hanja: "親舊", meaning: "가깝게 지내는 또래 동무예요.", analysis: [{char:"親",meaning:"친할",sound:"친",level:"6급"},{char:"舊",meaning:"옛",sound:"구",level:"4급"}] },
  
  // 시간과 요일
  { word: "오전", hanja: "午前", meaning: "아침부터 낮 12시까지의 시간이에요.", analysis: [{char:"午",meaning:"낮",sound:"오",level:"7급"},{char:"前",meaning:"앞",sound:"전",level:"7급"}] },
  { word: "오후", hanja: "午後", meaning: "낮 12시부터 밤까지의 시간이에요.", analysis: [{char:"午",meaning:"낮",sound:"오",level:"7급"},{char:"後",meaning:"뒤",sound:"후",level:"7급"}] },
  { word: "일요일", hanja: "日曜日", meaning: "한 주가 시작되는 쉬는 날이에요.", analysis: [{char:"日",meaning:"날",sound:"일",level:"8급"},{char:"曜",meaning:"빛날",sound:"요",level:"4급"},{char:"日",meaning:"날",sound:"일",level:"8급"}] },
  { word: "시각", hanja: "時刻", meaning: "시간의 어느 한 점을 말해요.", analysis: [{char:"時",meaning:"때",sound:"시",level:"7급"},{char:"刻",meaning:"새길",sound:"각",level:"5급"}] },

  // 학교 공부
  { word: "공부", hanja: "工夫", meaning: "새로운 지식을 배우고 익히는 일이에요.", analysis: [{char:"工",meaning:"장공",sound:"공",level:"8급"},{char:"夫",meaning:"사내",sound:"부",level:"7급"}] },
  { word: "국어", hanja: "國語", meaning: "우리나라의 말과 글이에요.", analysis: [{char:"國",meaning:"나라",sound:"국",level:"8급"},{char:"語",meaning:"말씀",sound:"어",level:"7급"}] },
  { word: "수학", hanja: "數學", meaning: "수와 계산을 배우는 공부예요.", analysis: [{char:"數",meaning:"셈",sound:"수",level:"6급"},{char:"學",meaning:"배울",sound:"학",level:"8급"}] },
  { word: "입학", hanja: "入學", meaning: "학교에 처음 들어가는 것이에요.", analysis: [{char:"入",meaning:"들",sound:"입",level:"8급"},{char:"學",meaning:"배울",sound:"학",level:"8급"}] },
  { word: "졸업", hanja: "卒業", meaning: "학교의 모든 과정을 마치는 것이에요.", analysis: [{char:"卒",meaning:"마칠",sound:"졸",level:"4급"},{char:"業",meaning:"업",sound:"업",level:"6급"}] }
];

async function seed() {
  console.log("🚀 필수 한자어 100선(선별 데이터) 주입 시작...");
  let count = 0;
  for (const item of data) {
    try {
      // 1. 단어 분석 정보 저장
      const { error: e1 } = await supabase.from("word_analysis_cache").upsert({
        word: item.word,
        analysis_json: { hanjaList: item.analysis, correctedWord: null, isLoanword: false }
      });
      if (e1) throw e1;

      // 2. 퀴즈 정보 저장
      const { error: e2 } = await supabase.from("quiz_bank").upsert({
        word: item.word,
        hanja_combination: item.hanja,
        description: item.meaning,
        is_verified: true
      });
      if (e2) throw e2;

      process.stdout.write("●");
      count++;
    } catch (e) {
      console.error(`\n❌ ${item.word} 저장 실패:`, e.message);
    }
  }
  console.log(`\n\n✅ 주입 완료! 총 ${count}개의 단어와 퀴즈가 등록되었습니다.`);
}

seed();

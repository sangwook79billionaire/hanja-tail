/**
 * Nori 디자인 시스템 미리보기용 가짜 데이터 (Figma 프로토타입의 예시 그대로)
 */

export const MOCK_STATS = { subject: "漢", streak: 12, coins: 350, hearts: 5 };

export const MOCK_RECENT_SEARCHES = ["소방차", "도서관"];

export const MOCK_RECOMMENDED_WORDS = [
  { hanja: "雨", word: "우산 (雨傘)", meaning: "비를 막는 도구" },
  { hanja: "圖", word: "도서관 (圖書館)", meaning: "책을 모아 둔 곳" },
  { hanja: "生", word: "생일 (生日)", meaning: "태어난 날" },
];

export const MOCK_LEARN_QUESTION = {
  word: "원리",
  hanja: "原理",
  phase: "익히기 문제 · 들어갈 곳 찾기",
  prompt: ["‘원리’가 들어갈 알맞은", "문장을 골라 보세요"],
  sentences: [
    "비행기가 나는 ＿＿＿를 배웠어요.",
    "오늘 ＿＿＿에서 친구를 만났어요.",
    "동생이 ＿＿＿를 타고 신나게 놀아요.",
    "할머니께 ＿＿＿ 편지를 썼어요.",
  ],
  answerIndex: 0,
};

export const MOCK_REVIEW_CHOICES = ["원리 (原理)", "관찰 (觀察)", "협동 (協同)"];

export const MOCK_DAILY_WORDS = [
  { word: "원리", hanja: "原理" },
  { word: "관찰", hanja: "觀察" },
  { word: "협동", hanja: "協同" },
];

export const MOCK_SIGNUP_SOURCES = ["네이버", "뉴스/블로그/기사", "YouTube", "인스타그램", "가족/친구"];

/** 단어 학습 흐름 미리보기(/design-system/flow)용 */
export const MOCK_FLOW_WORDS: Record<
  string,
  { hanjaList: { char: string; meaning: string; sound: string }[]; meaning: string; sentences: string[] }
> = {
  원리: {
    hanjaList: [
      { char: "原", meaning: "근원", sound: "원" },
      { char: "理", meaning: "이치", sound: "리" },
    ],
    meaning: "사물의 근본이 되는 이치",
    sentences: MOCK_LEARN_QUESTION.sentences,
  },
  관찰: {
    hanjaList: [
      { char: "觀", meaning: "볼", sound: "관" },
      { char: "察", meaning: "살필", sound: "찰" },
    ],
    meaning: "자세히 살펴봄",
    sentences: [
      "개미를 돋보기로 ＿＿＿했어요.",
      "엄마와 ＿＿＿에 가서 빵을 샀어요.",
      "친구에게 ＿＿＿ 선물을 줬어요.",
      "비가 와서 ＿＿＿을 썼어요.",
    ],
  },
  협동: {
    hanjaList: [
      { char: "協", meaning: "화할", sound: "협" },
      { char: "同", meaning: "한가지", sound: "동" },
    ],
    meaning: "서로 마음과 힘을 합함",
    sentences: [
      "친구들과 ＿＿＿해서 탑을 쌓았어요.",
      "아침에 ＿＿＿을 먹고 학교에 갔어요.",
      "강아지가 ＿＿＿을 흔들어요.",
      "겨울에는 ＿＿＿가 내려요.",
    ],
  },
};

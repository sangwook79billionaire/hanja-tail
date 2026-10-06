/**
 * 디자이너 및 프론트엔드 작업용 목(Mock) 데이터 모음
 * 백엔드나 Supabase 연결 없이도 화면을 완벽하게 디자인하고 테스트할 수 있습니다.
 */

export interface MockHanja {
  char: string;
  sound: string;
  meaning: string;
  level: string;
  strokes?: number;
  radical?: string;
}

export interface MockQuiz {
  id: string;
  targetHanja: string;
  word: string;
  hanja_combination: string;
  description: string;
  difficulty_level: number;
  options: string[];
  correctAnswer: string;
  hanja_list: MockHanja[];
}

export interface MockUserStats {
  solvedCount: number;
  accuracy: number;
  streakDays: number;
  level: string;
  recentWords: string[];
}

export const MOCK_HANJA_CARD: MockHanja = {
  char: "學",
  sound: "학",
  meaning: "배울",
  level: "8급",
  strokes: 16,
  radical: "子",
};

export const MOCK_QUIZ_LIST: MockQuiz[] = [
  {
    id: "quiz-1",
    targetHanja: "學",
    word: "학교",
    hanja_combination: "學校",
    description: "선생님과 친구들이 함께 모여 배움을 쌓는 곳이에요.",
    difficulty_level: 1,
    options: ["학교", "학생", "학원", "방학"],
    correctAnswer: "학교",
    hanja_list: [
      { char: "學", sound: "학", meaning: "배울", level: "8급" },
      { char: "校", sound: "교", meaning: "학교", level: "8급" },
    ],
  },
  {
    id: "quiz-2",
    targetHanja: "生",
    word: "학생",
    hanja_combination: "學生",
    description: "학교에서 열심히 공부하고 배우는 사람을 뜻해요.",
    difficulty_level: 1,
    options: ["학생", "선생", "생활", "생일"],
    correctAnswer: "학생",
    hanja_list: [
      { char: "學", sound: "학", meaning: "배울", level: "8급" },
      { char: "生", sound: "생", meaning: "날", level: "8급" },
    ],
  },
  {
    id: "quiz-3",
    targetHanja: "水",
    word: "생수",
    hanja_combination: "生水",
    description: "목이 마를 때 시원하게 마시는 맑고 깨끗한 물이에요.",
    difficulty_level: 2,
    options: ["생수", "음료", "약수", "빙수"],
    correctAnswer: "생수",
    hanja_list: [
      { char: "生", sound: "생", meaning: "날", level: "8급" },
      { char: "水", sound: "수", meaning: "물", level: "8급" },
    ],
  },
];

export const MOCK_USER_STATS: MockUserStats = {
  solvedCount: 42,
  accuracy: 92.5,
  streakDays: 5,
  level: "초급 한자 탐험가",
  recentWords: ["학교 (學校)", "학생 (學生)", "선생 (先生)", "태양 (太陽)", "생수 (生水)"],
};

export const MOCK_FAMILY_ROOM = {
  code: "FAM789",
  roomName: "우리 가족 한자 생각 놀이터 🏡",
  parentNickname: "아빠 🦁",
  childNickname: "민준이 🚀",
  todayWord: "화목 (和睦)",
  todayMission: "가족과 함께 '화목'이 들어간 문장을 만들어 보세요!",
};

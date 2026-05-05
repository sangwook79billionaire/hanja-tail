"use client";

import { motion } from "framer-motion";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface LearningLog {
  word: string;
  hanja?: string;
  is_correct: boolean;
  learned_at: string;
  practiced_writing?: boolean;
  parent_word?: string;
}

export default function LearningMindMap({ 
  logs, 
  onReview 
}: { 
  logs: LearningLog[]; 
  onReview: (word: string) => void 
}) {
  // 1. 단어들을 가로세로 그리드에 배치하는 알고리즘
  const generateCrossword = () => {
    const grid: Record<string, { char: string; words: string[]; type: 'hanja' | 'hangul' }> = {};
    const placedWords: { word: string; start: { x: number; y: number }; horizontal: boolean }[] = [];
    
    // 편의상 15x15 가상 그리드 중심에서 시작
    const centerX = 7, centerY = 7;
    
    const tryPlace = (wordIdx: number, wordObj: LearningLog) => {
      const chars = wordObj.hanja ? wordObj.hanja.split('') : wordObj.word.split('');
      const type = wordObj.hanja ? 'hanja' : 'hangul';

      if (placedWords.length === 0) {
        // 첫 단어는 가로로 중심에 배치
        chars.forEach((char, i) => {
          grid[`${centerX + i},${centerY}`] = { char, words: [wordObj.word], type };
        });
        placedWords.push({ word: wordObj.word, start: { x: centerX, y: centerY }, horizontal: true });
        return true;
      }

      // 기존 배치된 단어들과 교차점 찾기
      for (const placed of placedWords) {
        const placedChars = logs.find(l => l.word === placed.word)?.hanja?.split('') || placed.word.split('');
        
        for (let i = 0; i < chars.length; i++) {
          for (let j = 0; j < placedChars.length; j++) {
            if (chars[i] === placedChars[j]) {
              // 교차점 발견! 수직 방향으로 배치 시도
              const isHorizontal = !placed.horizontal;
              const startX = isHorizontal ? (placed.horizontal ? placed.start.x + j : placed.start.x) - i : (placed.horizontal ? placed.start.x + j : placed.start.x);
              const startY = isHorizontal ? (placed.horizontal ? placed.start.y : placed.start.y + j) : (placed.horizontal ? placed.start.y : placed.start.y + j) - i;

              // 충돌 검사 (단순화: 다른 단어와 겹치거나 인접하는지 확인)
              let canPlace = true;
              for (let k = 0; k < chars.length; k++) {
                const curX = isHorizontal ? startX + k : startX;
                const curY = isHorizontal ? startY : startY + k;
                const existing = grid[`${curX},${curY}`];
                if (existing && existing.char !== chars[k]) {
                  canPlace = false;
                  break;
                }
              }

              if (canPlace) {
                chars.forEach((char, k) => {
                  const curX = isHorizontal ? startX + k : startX;
                  const curY = isHorizontal ? startY : startY + k;
                  if (!grid[`${curX},${curY}`]) {
                    grid[`${curX},${curY}`] = { char, words: [wordObj.word], type };
                  } else {
                    grid[`${curX},${curY}`].words.push(wordObj.word);
                  }
                });
                placedWords.push({ word: wordObj.word, start: { x: startX, y: startY }, horizontal: isHorizontal });
                return true;
              }
            }
          }
        }
      }

      // 교차점을 못 찾으면 적당히 떨어진 곳에 배치 (새로운 클러스터)
      const last = placedWords[placedWords.length - 1];
      const nextX = last.start.x;
      const nextY = last.start.y + 3;
      chars.forEach((char, i) => {
        grid[`${nextX + i},${nextY}`] = { char, words: [wordObj.word], type };
      });
      placedWords.push({ word: wordObj.word, start: { x: nextX, y: nextY }, horizontal: true });
      return true;
    };

    logs.forEach((log, idx) => tryPlace(idx, log));

    // 그리드 범위 계산
    const coords = Object.keys(grid).map(k => k.split(',').map(Number));
    const minX = Math.min(...coords.map(c => c[0]));
    const maxX = Math.max(...coords.map(c => c[0]));
    const minY = Math.min(...coords.map(c => c[1]));
    const maxY = Math.max(...coords.map(c => c[1]));

    return { grid, minX, maxX, minY, maxY };
  };

  const { grid, minX, maxX, minY, maxY } = generateCrossword();
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  if (Object.keys(grid).length === 0) {
    return (
      <div className="py-20 text-center bg-duo-snow/20 rounded-[40px] border-4 border-dashed border-duo-snow">
        <div className="text-6xl mb-4 opacity-50">🧩</div>
        <p className="text-duo-wolf font-black text-xl">오늘 탐험한 단어가 아직 없어요!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div 
        className="relative bg-duo-snow/30 p-6 rounded-[32px] border-4 border-duo-snow shadow-inner overflow-auto max-w-full"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(${width}, 50px)`,
          gridTemplateRows: `repeat(${height}, 50px)`,
          gap: '4px'
        }}
      >
        {Array.from({ length: height }).map((_, yIdx) => (
          Array.from({ length: width }).map((_, xIdx) => {
            const x = xIdx + minX;
            const y = yIdx + minY;
            const item = grid[`${x},${y}`];

            if (!item) return <div key={`${x}-${y}`} className="w-[50px] h-[50px]" />;

            const isIntersection = item.words.length > 1;
            const practiced = item.words.some(w => logs.find(l => l.word === w)?.practiced_writing);

            return (
              <motion.button
                key={`${x}-${y}`}
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: (xIdx + yIdx) * 0.05 }}
                onClick={() => onReview(item.words[0])}
                className={cn(
                  "w-[50px] h-[50px] rounded-xl flex items-center justify-center text-xl font-black transition-all shadow-sm border-2 relative font-myeongjo",
                  isIntersection 
                    ? "bg-amber-400 border-amber-500 text-white shadow-[0_4px_0_0_#d97706] z-10 scale-110" 
                    : "bg-white border-duo-snow text-duo-eel",
                  practiced && !isIntersection && "border-duo-green bg-green-50"
                )}
              >
                <span className="relative z-10">{item.char}</span>
                {practiced && (
                  <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-xs border border-duo-green">
                    <CheckCircle2 className="w-3 h-3 text-duo-green" />
                  </div>
                )}
                {isIntersection && (
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-white/20 rounded-xl"
                  />
                )}
              </motion.button>
            );
          })
        ))}
      </div>

      {/* Legend & Hint */}
      <div className="mt-8 w-full flex flex-wrap justify-between items-center bg-white p-4 rounded-2xl border-2 border-duo-snow gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-amber-400 rounded-md border-2 border-amber-500" />
            <span className="text-xs font-black text-duo-wolf">교차 한자 (여의주)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-white rounded-md border-2 border-duo-snow" />
            <span className="text-xs font-black text-duo-wolf">일반 글자</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-duo-macaw font-black text-xs">
          <RotateCcw className="w-4 h-4" />
          <span>단어를 눌러서 복습해보세요!</span>
        </div>
      </div>
    </div>
  );
}

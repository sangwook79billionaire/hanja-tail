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
    const processedLogs = logs.map(l => ({
      ...l,
      chars: l.hanja ? l.hanja.split('') : l.word.split(''),
      type: (l.hanja ? 'hanja' : 'hangul') as 'hanja' | 'hangul'
    }));

    // 1. 연결된 단어들끼리 클러스터링
    const clusters: (typeof processedLogs)[] = [];
    const usedIndices = new Set<number>();

    processedLogs.forEach((log, i) => {
      if (usedIndices.has(i)) return;

      const cluster: (typeof processedLogs) = [log];
      usedIndices.add(i);

      let foundNew = true;
      while (foundNew) {
        foundNew = false;
        processedLogs.forEach((otherLog, j) => {
          if (usedIndices.has(j)) return;
          
          const sharesChar = cluster.some(cLog => 
            cLog.chars.some(c => otherLog.chars.includes(c))
          );

          if (sharesChar) {
            cluster.push(otherLog);
            usedIndices.add(j);
            foundNew = true;
          }
        });
      }
      clusters.push(cluster);
    });

    // 2. 각 클러스터 내에서 단어 배치
    let globalMinX = 0, globalMaxX = 0, globalMinY = 0, globalMaxY = 0;
    let currentYOffset = 0;

    clusters.forEach((cluster) => {
      const clusterGrid: Record<string, { char: string; words: string[]; type: 'hanja' | 'hangul' }> = {};
      const placedWords: { word: string; start: { x: number; y: number }; horizontal: boolean }[] = [];

      const tryPlaceInCluster = (wordObj: typeof processedLogs[0]) => {
        if (placedWords.length === 0) {
          wordObj.chars.forEach((char, i) => {
            clusterGrid[`${i},0`] = { char, words: [wordObj.word], type: wordObj.type };
          });
          placedWords.push({ word: wordObj.word, start: { x: 0, y: 0 }, horizontal: true });
          return;
        }

        // 연결 가능한 지점 찾기
        for (const placed of placedWords) {
          const placedLog = cluster.find(l => l.word === placed.word)!;
          const placedChars = placedLog.chars;

          for (let i = 0; i < wordObj.chars.length; i++) {
            for (let j = 0; j < placedChars.length; j++) {
              if (wordObj.chars[i] === placedChars[j]) {
                const isHorizontal = !placed.horizontal;
                const startX = isHorizontal ? (placed.horizontal ? placed.start.x + j : placed.start.x) - i : (placed.horizontal ? placed.start.x + j : placed.start.x);
                const startY = isHorizontal ? (placed.horizontal ? placed.start.y : placed.start.y + j) : (placed.horizontal ? placed.start.y : placed.start.y + j) - i;

                // 충돌 검사
                let canPlace = true;
                for (let k = 0; k < wordObj.chars.length; k++) {
                  const curX = isHorizontal ? startX + k : startX;
                  const curY = isHorizontal ? startY : startY + k;
                  const existing = clusterGrid[`${curX},${curY}`];
                  if (existing && existing.char !== wordObj.chars[k]) {
                    canPlace = false;
                    break;
                  }
                }

                if (canPlace) {
                  wordObj.chars.forEach((char, k) => {
                    const curX = isHorizontal ? startX + k : startX;
                    const curY = isHorizontal ? startY : startY + k;
                    if (!clusterGrid[`${curX},${curY}`]) {
                      clusterGrid[`${curX},${curY}`] = { char, words: [wordObj.word], type: wordObj.type };
                    } else {
                      clusterGrid[`${curX},${curY}`].words.push(wordObj.word);
                    }
                  });
                  placedWords.push({ word: wordObj.word, start: { x: startX, y: startY }, horizontal: isHorizontal });
                  return;
                }
              }
            }
          }
        }
      };

      // 클러스터 내 단어들 배치 시도 (연결된 단어가 먼저 오도록 정렬 가능하지만 여기선 순서대로)
      cluster.forEach(log => tryPlaceInCluster(log));

      // 3. 배치된 클러스터를 글로벌 그리드에 합치기 (Y 오프셋 적용)
      const coords = Object.keys(clusterGrid).map(k => k.split(',').map(Number));
      const clusterMinY = Math.min(...coords.map(c => c[1]));
      const clusterMinX = Math.min(...coords.map(c => c[0]));
      
      const yAdjustment = currentYOffset - clusterMinY;
      const xAdjustment = -clusterMinX; // 각 클러스터를 왼쪽 정렬

      Object.entries(clusterGrid).forEach(([key, val]) => {
        const [x, y] = key.split(',').map(Number);
        const newX = x + xAdjustment;
        const newY = y + yAdjustment;
        grid[`${newX},${newY}`] = val;
        
        globalMinX = Math.min(globalMinX, newX);
        globalMaxX = Math.max(globalMaxX, newX);
        globalMinY = Math.min(globalMinY, newY);
        globalMaxY = Math.max(globalMaxY, newY);
      });

      currentYOffset = globalMaxY + 3; // 클러스터 간 간격 (3칸 패딩)
    });

    return { grid, minX: globalMinX, maxX: globalMaxX, minY: globalMinY, maxY: globalMaxY };
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

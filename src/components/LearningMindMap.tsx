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
  // 1. 단어들을 문자 단위로 분해하고 관계 매핑
  const buildGraph = () => {
    const nodes: Record<string, { char: string; words: string[]; type: 'hanja' | 'hangul' }> = {};
    const edges: { from: string; to: string; word: string }[] = [];
    const wordStatus: Record<string, boolean> = {};

    logs.forEach(log => {
      wordStatus[log.word] = !!log.practiced_writing;
      const chars = log.hanja ? log.hanja.split('') : log.word.split('');
      const type = log.hanja ? 'hanja' : 'hangul';

      chars.forEach((char, i) => {
        if (!nodes[char]) {
          nodes[char] = { char, words: [log.word], type };
        } else if (!nodes[char].words.includes(log.word)) {
          nodes[char].words.push(log.word);
        }

        if (i > 0) {
          edges.push({ from: chars[i - 1], to: char, word: log.word });
        }
      });
    });

    return { 
      nodes: Object.values(nodes), 
      edges,
      wordStatus
    };
  };

  const { nodes, edges, wordStatus } = buildGraph();

  if (nodes.length === 0) {
    return (
      <div className="py-20 text-center bg-duo-snow/20 rounded-[40px] border-4 border-dashed border-duo-snow">
        <div className="text-6xl mb-4 opacity-50">🐉</div>
        <p className="text-duo-wolf font-black text-xl">오늘 탐험한 여의주가 아직 없어요!</p>
      </div>
    );
  }

  // 간단한 원형 배치 로직
  const getPosition = (index: number, total: number) => {
    if (total === 1) return { x: 0, y: 0 };
    const angle = (index / total) * 2 * Math.PI;
    const radius = Math.min(120, total * 20);
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    };
  };

  return (
    <div className="relative w-full aspect-square max-h-[400px] flex items-center justify-center p-8">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-amber-50/30 rounded-full blur-3xl" />

      {/* Lines Layer */}
      <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-0">
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1cb0f6" />
            <stop offset="100%" stopColor="#58cc02" />
          </linearGradient>
        </defs>
        {edges.map((edge, i) => {
          const fromIdx = nodes.findIndex(n => n.char === edge.from);
          const toIdx = nodes.findIndex(n => n.char === edge.to);
          const fromPos = getPosition(fromIdx, nodes.length);
          const toPos = getPosition(toIdx, nodes.length);
          
          return (
            <motion.line
              key={i}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
              x1={`calc(50% + ${fromPos.x}px)`}
              y1={`calc(50% + ${fromPos.y}px)`}
              x2={`calc(50% + ${toPos.x}px)`}
              y2={`calc(50% + ${toPos.y}px)`}
              stroke="url(#lineGrad)"
              strokeWidth="6"
              strokeLinecap="round"
              className="drop-shadow-sm opacity-40"
            />
          );
        })}
      </svg>

      {/* Nodes Layer */}
      <div className="relative w-full h-full flex items-center justify-center">
        {nodes.map((node, i) => {
          const pos = getPosition(i, nodes.length);
          const isShared = node.words.length > 1;
          const allPracticed = node.words.every(w => wordStatus[w]);

          return (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 260, 
                damping: 20, 
                delay: i * 0.1 
              }}
              style={{ 
                left: `calc(50% + ${pos.x}px)`,
                top: `calc(50% + ${pos.y}px)`,
                transform: 'translate(-50%, -50%)'
              }}
              className="absolute z-10"
            >
              <div className="relative group">
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onReview(node.words[0])} // 첫 번째 단어로 리뷰 연결
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center font-black text-2xl transition-all shadow-lg border-4 relative",
                    node.type === 'hanja' 
                      ? "bg-white border-amber-300 text-duo-eel" 
                      : "bg-duo-snow border-white text-duo-wolf",
                    isShared && "ring-4 ring-amber-400 ring-offset-2 animate-pulse",
                    allPracticed && "border-duo-green"
                  )}
                >
                  <div className={cn(
                    "absolute inset-0 rounded-full opacity-10",
                    node.type === 'hanja' ? "bg-amber-400" : "bg-blue-400"
                  )} />
                  <span className="relative z-10">{node.char}</span>
                  
                  {allPracticed && (
                    <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border-2 border-duo-green">
                      <CheckCircle2 className="w-4 h-4 text-duo-green" />
                    </div>
                  )}
                </motion.button>

                {/* Tooltip on hover */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 hidden group-hover:block bg-duo-eel text-white text-[10px] py-1 px-2 rounded-lg whitespace-nowrap z-50">
                  {node.words.join(', ')}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend / Info */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center bg-white/60 backdrop-blur-md px-4 py-2 rounded-2xl border-2 border-duo-snow">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-white border-2 border-amber-300 rounded-full" />
            <span className="text-[10px] font-black text-duo-wolf">한자 여의주</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-white border-4 border-amber-400 rounded-full" />
            <span className="text-[10px] font-black text-duo-wolf">공유 글자</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <RotateCcw className="w-3 h-3 text-duo-macaw" />
          <span className="text-[10px] font-black text-duo-macaw">복습 +0.5</span>
        </div>
      </div>
    </div>
  );
}

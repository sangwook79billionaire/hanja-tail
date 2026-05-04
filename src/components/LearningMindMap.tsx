"use client";

import { motion } from "framer-motion";
import { CheckCircle2, RotateCcw } from "lucide-react";

interface LearningLog {
  word: string;
  hanja?: string;
  is_correct: boolean;
  learned_at: string;
  practiced_writing?: boolean;
  parent_word?: string;
}

interface MindMapNode {
  word: string;
  isSeed: boolean;
  practiced: boolean;
  children: MindMapNode[];
}

export default function LearningMindMap({ 
  logs, 
  onReview 
}: { 
  logs: LearningLog[]; 
  onReview: (word: string) => void 
}) {
  // 1. 데이터 트리 구조로 변환
  const buildTree = () => {
    const nodes: Record<string, MindMapNode> = {};
    const seeds: string[] = [];

    logs.forEach(log => {
      if (!nodes[log.word]) {
        nodes[log.word] = {
          word: log.word,
          isSeed: !log.parent_word,
          practiced: !!log.practiced_writing,
          children: []
        };
      } else {
        // 이미 존재하면 연습 여부 업데이트
        nodes[log.word].practiced = nodes[log.word].practiced || !!log.practiced_writing;
      }

      if (!log.parent_word) {
        if (!seeds.includes(log.word)) seeds.push(log.word);
      }
    });

    logs.forEach(log => {
      if (log.parent_word && nodes[log.parent_word] && nodes[log.word]) {
        if (!nodes[log.parent_word].children.find(c => c.word === log.word)) {
          nodes[log.parent_word].children.push(nodes[log.word]);
        }
      }
    });

    return seeds.map(s => nodes[s]);
  };

  const tree = buildTree();

  if (tree.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-duo-wolf font-bold">오늘 탐험한 단어가 아직 없어요!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12 py-6 overflow-x-auto pb-12">
      {tree.map((seed, idx) => (
        <div key={idx} className="flex flex-col items-center min-w-max px-8">
          {/* Seed Node */}
          <div className="relative mb-12">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onReview(seed.word)}
              className="px-8 py-4 bg-duo-macaw text-white rounded-3xl font-black text-xl shadow-[0_6px_0_0_#1899d6] z-10 relative"
            >
              {seed.word}
              {seed.practiced && (
                <div className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 shadow-md">
                  <CheckCircle2 className="w-6 h-6 text-duo-green fill-white" />
                </div>
              )}
            </motion.button>
            
            {/* Review Badge */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-duo-snow px-2 py-1 rounded-full border border-duo-swan whitespace-nowrap">
              <RotateCcw className="w-3 h-3 text-duo-wolf" />
              <span className="text-[10px] font-black text-duo-wolf uppercase">복습 +0.5점</span>
            </div>

            {/* Connecting Lines */}
            {seed.children.length > 0 && (
              <svg className="absolute top-full left-1/2 -translate-x-1/2 w-full h-12 overflow-visible z-0 pointer-events-none">
                {seed.children.map((_, cIdx) => {
                  const total = seed.children.length;
                  const xEnd = (cIdx - (total - 1) / 2) * 160;
                  return (
                    <path
                      key={cIdx}
                      d={`M 0 0 C 0 20, ${xEnd} 20, ${xEnd} 48`}
                      stroke="#e5e5e5"
                      strokeWidth="3"
                      fill="none"
                    />
                  );
                })}
              </svg>
            )}
          </div>

          {/* Tail Nodes */}
          <div className="flex gap-12 justify-center">
            {seed.children.map((child, cIdx) => (
              <motion.div
                key={cIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: cIdx * 0.1 }}
                className="relative"
              >
                <button
                  onClick={() => onReview(child.word)}
                  className="px-6 py-3 bg-white border-3 border-duo-snow rounded-2xl font-black text-duo-eel hover:border-duo-macaw hover:text-duo-macaw transition-all shadow-sm flex flex-col items-center gap-1 min-w-[120px]"
                >
                  <span>{child.word}</span>
                  {child.practiced && (
                    <CheckCircle2 className="w-5 h-5 text-duo-green" />
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

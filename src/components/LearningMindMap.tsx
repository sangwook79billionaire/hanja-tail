"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import Image from "next/image";

interface LearningLog {
  word: string;
  hanja?: string;
  is_correct: boolean;
  learned_at: string;
  practiced_writing?: boolean;
  parent_word?: string;
  difficulty?: number;
  hanjaDetails?: {
    char: string;
    meaning: string;
    sound: string;
  }[];
}

interface Node {
  id: string;
  char: string;
  meaning: string;
  sound: string;
  x: number;
  y: number;
  isHub: boolean;
  practiced: boolean;
  words: string[];
  difficulty: number;
}

interface Link {
  source: string;
  target: string;
}

export default function LearningMindMap({ 
  logs, 
  onReview,
  disabled = false
}: { 
  logs: LearningLog[]; 
  onReview: (word: string) => void;
  disabled?: boolean;
}) {
  // 그래프 생성 로직
  const { nodes, links, viewbox } = useMemo(() => {
    const nodesMap = new Map<string, Node>();
    const linksList: Link[] = [];
    
    // 1. 단어들 클러스터링 (연결된 단어들끼리 묶기)
    const processedWords = logs.map(l => ({
      ...l,
      chars: l.hanja ? l.hanja.split('') : l.word.split(''),
    }));

    const wordClusters: (typeof processedWords)[] = [];
    const usedWordIndices = new Set<number>();

    processedWords.forEach((word, i) => {
      if (usedWordIndices.has(i)) return;
      const cluster = [word];
      usedWordIndices.add(i);

      let foundNew = true;
      while (foundNew) {
        foundNew = false;
        processedWords.forEach((other, j) => {
          if (usedWordIndices.has(j)) return;
          const sharesChar = cluster.some(cw => 
            cw.chars.some(c => other.chars.includes(c))
          );
          if (sharesChar) {
            cluster.push(other);
            usedWordIndices.add(j);
            foundNew = true;
          }
        });
      }
      wordClusters.push(cluster);
    });

    // 2. 각 클러스터별로 노드 및 링크 생성 (클러스터 간 간격 확보)
    wordClusters.forEach((cluster, clusterIdx) => {
      const clusterXOffset = (clusterIdx % 2) * 600;
      const clusterYOffset = Math.floor(clusterIdx / 2) * 600;

      cluster.forEach((wordObj, wordInClusterIdx) => {
        const charNodes: string[] = [];
        
        wordObj.chars.forEach((char, charIdx) => {
          // 노드 ID를 한자로 유니크하게 (단순 한글만 있을 땐 한글로)
          const nodeId = char; 
          let existing = nodesMap.get(nodeId);
          
          const detail = wordObj.hanjaDetails?.find(d => d.char === char);

          if (!existing) {
            const node: Node = {
              id: nodeId,
              char,
              meaning: detail?.meaning || "",
              sound: detail?.sound || "",
              x: clusterXOffset + charIdx * 120 + (wordInClusterIdx * 40),
              y: clusterYOffset + (wordInClusterIdx % 2 === 0 ? 60 : -60),
              isHub: false,
              practiced: !!wordObj.practiced_writing,
              words: [wordObj.word],
              difficulty: wordObj.difficulty || 1
            };
            nodesMap.set(nodeId, node);
            existing = node;
          } else {
            existing.isHub = true;
            if (!existing.words.includes(wordObj.word)) {
              existing.words.push(wordObj.word);
            }
            if (wordObj.practiced_writing) existing.practiced = true;
            if (detail) {
              existing.meaning = detail.meaning;
              existing.sound = detail.sound;
            }
            // 허브 노드의 난이도는 포함된 단어 중 최고 난이도로 설정
            existing.difficulty = Math.max(existing.difficulty, wordObj.difficulty || 1);
          }
          charNodes.push(nodeId);
        });

        for (let i = 0; i < charNodes.length - 1; i++) {
          // 중복 링크 방지
          const linkId = [charNodes[i], charNodes[i+1]].sort().join('-');
          if (!linksList.find(l => [l.source, l.target].sort().join('-') === linkId)) {
            linksList.push({
              source: charNodes[i],
              target: charNodes[i+1]
            });
          }
        }
      });
    });

    // 노드 위치 최적화 (반발력)
    const nodesArr = Array.from(nodesMap.values());
    for (let iter = 0; iter < 60; iter++) {
      nodesArr.forEach(n1 => {
        nodesArr.forEach(n2 => {
          if (n1.id === n2.id) return;
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          // 같은 클러스터 노드끼리만 강한 반발력
          if (dist < 200) {
            const force = (200 - dist) / 8;
            n1.x += (dx / dist) * force;
            n1.y += (dy / dist) * force;
            n2.x -= (dx / dist) * force;
            n2.y -= (dy / dist) * force;
          }
        });
      });
    }

    // 뷰박스 계산
    const padding = 100;
    const minX = Math.min(...nodesArr.map(n => n.x)) - padding;
    const maxX = Math.max(...nodesArr.map(n => n.x)) + padding;
    const minY = Math.min(...nodesArr.map(n => n.y)) - padding;
    const maxY = Math.max(...nodesArr.map(n => n.y)) + padding;

    return { 
      nodes: nodesArr, 
      links: linksList, 
      viewbox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}` 
    };
  }, [logs]);

  if (logs.length === 0) {
    return (
      <div className="py-20 text-center bg-duo-snow/20 rounded-[40px] border-4 border-dashed border-duo-snow flex flex-col items-center">
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="relative w-32 h-32 mb-6"
        >
          <Image src="/images/yongchi_premium.png" alt="용치" fill className="object-contain opacity-50" />
        </motion.div>
        <p className="text-duo-wolf font-black text-xl">오늘 탐험한 단어가 아직 없어요!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full aspect-square md:aspect-video bg-duo-snow/30 rounded-[40px] border-4 border-duo-snow shadow-inner overflow-hidden">
        <svg 
          viewBox={viewbox} 
          className="w-full h-full cursor-grab active:cursor-grabbing"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Links */}
          {links.map((link, idx) => {
            const s = nodes.find(n => n.id === link.source)!;
            const t = nodes.find(n => n.id === link.target)!;
            return (
              <motion.line
                key={`link-${idx}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke="#d1d5db"
                strokeWidth="8"
                strokeLinecap="round"
                className="drop-shadow-sm"
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => (
            <motion.g
              key={node.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.1 }}
              className="cursor-pointer"
              onClick={() => !disabled && onReview(node.words[0])}
            >
              {/* Difficulty Halo Ring */}
              <circle
                cx={node.x} cy={node.y} r="60"
                className={cn(
                  "fill-none stroke-[4] opacity-40",
                  node.difficulty === 1 ? "stroke-duo-green" :
                  node.difficulty === 2 ? "stroke-duo-macaw" : "stroke-purple-500"
                )}
              />

              {/* Glow Effect for Hubs */}
              {node.isHub && (
                <motion.circle
                  cx={node.x} cy={node.y} r="68"
                  animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className={cn(
                    "blur-md",
                    node.difficulty === 1 ? "fill-duo-green" :
                    node.difficulty === 2 ? "fill-duo-macaw" : "fill-purple-500"
                  )}
                />
              )}

              {/* Node Circle (Bead) */}
              <circle
                cx={node.x} cy={node.y} r="50"
                className={cn(
                  "stroke-[6] transition-colors drop-shadow-md",
                  node.isHub 
                    ? (node.difficulty === 1 ? "fill-duo-green stroke-white" : 
                       node.difficulty === 2 ? "fill-duo-macaw stroke-white" : "fill-purple-500 stroke-white")
                    : node.practiced 
                      ? "fill-duo-green stroke-[#46a302]" 
                      : "fill-white stroke-duo-snow"
                )}
              />

              {/* Character Text */}
              <text
                x={node.x} y={node.y}
                dy="-0.05em"
                textAnchor="middle"
                className={cn(
                  "text-5xl font-black font-myeongjo select-none",
                  node.isHub || node.practiced ? "fill-white" : "fill-duo-eel"
                )}
              >
                {node.char}
              </text>

              {/* Meaning & Sound Text */}
              <text
                x={node.x} y={node.y}
                dy="2.2em"
                textAnchor="middle"
                className={cn(
                  "text-[14px] font-black select-none opacity-100",
                  node.isHub || node.practiced ? "fill-white" : "fill-duo-macaw"
                )}
              >
                {node.meaning}{node.sound}
              </text>

              {/* Status Icon */}
              {node.practiced && !node.isHub && (
                <g transform={`translate(${node.x + 35}, ${node.y - 35})`}>
                  <circle r="14" fill="white" className="stroke-duo-green stroke-2" />
                  <path 
                    d="M-5 0 L-1 4 L6 -4" 
                    fill="none" 
                    stroke="#58cc02" 
                    strokeWidth="3.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                  />
                </g>
              )}
            </motion.g>
          ))}
        </svg>

        {/* Floating Instruction */}
        <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border-2 border-duo-snow shadow-sm pointer-events-none">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-[10px] font-black text-duo-wolf">드래그해서 둘러보세요!</span>
        </div>
      </div>

      {/* Legend & Hint */}
      <div className="mt-8 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[32px] border-2 border-duo-snow flex flex-col gap-4">
          <p className="text-xs font-black text-duo-swan uppercase tracking-widest">탐험 등급 (난이도)</p>
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-duo-green rounded-full border-[3px] border-white shadow-sm" />
              <span className="text-xs font-black text-duo-eel">초급 (1-2학년)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-duo-macaw rounded-full border-[3px] border-white shadow-sm" />
              <span className="text-xs font-black text-duo-eel">중급 (3-4학년)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-purple-500 rounded-full border-[3px] border-white shadow-sm" />
              <span className="text-xs font-black text-duo-eel">고급 (5학년 이상)</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[32px] border-2 border-duo-snow flex flex-col gap-4">
          <p className="text-xs font-black text-duo-swan uppercase tracking-widest">마인드맵 길잡이</p>
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-white border-4 border-amber-400 rounded-full animate-pulse" />
              <span className="text-xs font-black text-duo-eel">공통 한자 (허브)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-duo-snow rounded-full" />
              <span className="text-xs font-black text-duo-eel">일반 글자</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

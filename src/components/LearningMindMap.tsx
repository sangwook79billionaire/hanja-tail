"use client";

import { motion } from "framer-motion";
import { RotateCcw, Sparkles } from "lucide-react";
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
}

interface Node {
  id: string;
  char: string;
  x: number;
  y: number;
  isHub: boolean;
  practiced: boolean;
  words: string[];
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
          
          if (!existing) {
            const node: Node = {
              id: nodeId,
              char,
              x: clusterXOffset + charIdx * 120 + (wordInClusterIdx * 40),
              y: clusterYOffset + (wordInClusterIdx % 2 === 0 ? 60 : -60),
              isHub: false,
              practiced: !!wordObj.practiced_writing,
              words: [wordObj.word]
            };
            nodesMap.set(nodeId, node);
            existing = node;
          } else {
            existing.isHub = true;
            if (!existing.words.includes(wordObj.word)) {
              existing.words.push(wordObj.word);
            }
            if (wordObj.practiced_writing) existing.practiced = true;
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
          if (dist < 150) {
            const force = (150 - dist) / 8;
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
              {/* Glow Effect for Hubs */}
              {node.isHub && (
                <motion.circle
                  cx={node.x} cy={node.y} r="45"
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="fill-amber-300 blur-md"
                />
              )}

              {/* Node Circle (Bead) */}
              <circle
                cx={node.x} cy={node.y} r="35"
                className={cn(
                  "stroke-[6] transition-colors drop-shadow-md",
                  node.isHub 
                    ? "fill-amber-400 stroke-amber-500" 
                    : node.practiced 
                      ? "fill-duo-green stroke-[#46a302]" 
                      : "fill-white stroke-duo-snow"
                )}
              />

              {/* Character Text */}
              <text
                x={node.x} y={node.y}
                dy="0.35em"
                textAnchor="middle"
                className={cn(
                  "text-2xl font-black font-myeongjo select-none",
                  node.isHub || node.practiced ? "fill-white" : "fill-duo-eel"
                )}
              >
                {node.char}
              </text>

              {/* Status Icon */}
              {node.practiced && !node.isHub && (
                <g transform={`translate(${node.x + 22}, ${node.y - 22})`}>
                  <circle r="10" fill="white" className="stroke-duo-green stroke-2" />
                  <path 
                    d="M-4 0 L-1 3 L4 -3" 
                    fill="none" 
                    stroke="#58cc02" 
                    strokeWidth="2.5" 
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
        <div className="bg-white p-6 rounded-[32px] border-2 border-duo-snow flex flex-wrap gap-6 items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-400 rounded-full border-[3px] border-amber-500 shadow-sm" />
            <span className="text-sm font-black text-duo-eel">교차 한자 (허브)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-duo-green rounded-full border-[3px] border-[#46a302] shadow-sm" />
            <span className="text-sm font-black text-duo-eel">복습 완료</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-full border-[3px] border-duo-snow shadow-sm" />
            <span className="text-sm font-black text-duo-eel">일반 글자</span>
          </div>
        </div>
        
        <div className="bg-duo-macaw/5 p-6 rounded-[32px] border-2 border-duo-macaw/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-duo-macaw p-2 rounded-xl text-white">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-duo-eel">다시 써볼까요?</p>
              <p className="text-[10px] font-bold text-duo-wolf">단어를 눌러서 복습하면 포인트 획득!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

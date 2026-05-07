"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Lock, Star, Sparkles, ChevronRight, Gift, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

interface QuestNode {
  hanja: string;
  meaning: string;
  sound: string;
  level: string;
  quest_index: number;
}

interface Unit {
  id: number;
  title: string;
  description: string;
  color: string;
  nodes: QuestNode[];
}

export default function QuestMap({ onNodeClick }: { onNodeClick?: (hanja: string) => void }) {
  const [nodes, setNodes] = useState<QuestNode[]>([]);
  const [currentProgress, setCurrentProgress] = useState({ stage: 8, node: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchQuestData() {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_stage, current_node')
          .eq('id', user.id)
          .maybeSingle();
        if (profile) {
          setCurrentProgress({
            stage: profile.current_stage || 8,
            node: profile.current_node || 1
          });
        }
      }

      const { data: hanjas } = await supabase
        .from('hanja_master')
        .select('hanja, meaning, sound, level, quest_index')
        .order('quest_index', { ascending: true })
        .limit(50); // 처음 50개만 로드

      if (hanjas) setNodes(hanjas);
      setIsLoading(false);
    }
    fetchQuestData();
  }, [supabase]);

  // 노드들을 유닛 단위(8개씩)로 그룹화
  const units = useMemo(() => {
    const unitList: Unit[] = [];
    const colors = ["bg-duo-green", "bg-duo-macaw", "bg-duo-bee", "bg-purple-500", "bg-amber-500"];
    
    for (let i = 0; i < nodes.length; i += 8) {
      const unitNodes = nodes.slice(i, i + 8);
      const unitIdx = Math.floor(i / 8) + 1;
      unitList.push({
        id: unitIdx,
        title: `유닛 ${unitIdx}`,
        description: unitIdx === 1 ? "한자 탐험의 시작" : "점점 깊어지는 지혜",
        color: colors[(unitIdx - 1) % colors.length],
        nodes: unitNodes
      });
    }
    return unitList;
  }, [nodes]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
          <Sparkles className="w-16 h-16 text-duo-macaw opacity-50" />
        </motion.div>
        <p className="mt-4 text-duo-wolf font-black text-xl animate-pulse">모험 지도를 그리는 중...</p>
      </div>
    );
  }

  const currentNodeHanja = nodes[currentProgress.node - 1]?.hanja;

  return (
    <div className="relative w-full max-w-2xl mx-auto pb-40 px-4">
      {/* Background Elements (Clouds/Trees) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-20 left-10 w-24 h-24 bg-duo-snow rounded-full blur-xl" />
        <div className="absolute top-1/2 right-10 w-32 h-32 bg-duo-macaw rounded-full blur-2xl" />
        <div className="absolute bottom-40 left-20 w-40 h-40 bg-duo-green rounded-full blur-3xl" />
      </div>

      {/* Header Info */}
      <div className="sticky top-4 z-50 flex items-center justify-between bg-white/90 backdrop-blur-xl p-5 rounded-[32px] border-3 border-duo-snow shadow-xl mb-12">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 bg-duo-macaw rounded-2xl flex items-center justify-center shadow-[0_5px_0_0_#1899d6]">
            <Trophy className="w-8 h-8 text-white" />
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }} 
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -top-2 -right-2 bg-duo-green text-white text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-white"
            >
              LEVEL UP
            </motion.div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-duo-eel tracking-tight">모험의 여정</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-duo-macaw">{currentProgress.stage}급 챌린지 중</span>
              <div className="w-20 h-2 bg-duo-snow rounded-full overflow-hidden border border-duo-swan">
                <div className="h-full bg-duo-macaw" style={{ width: `${(currentProgress.node % 8 || 8) * 12.5}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quest Units */}
      <div className="flex flex-col gap-24 relative z-10">
        {units.map((unit, uIdx) => (
          <section key={unit.id} className="relative">
            {/* Unit Header */}
            <div className={cn("w-full p-8 rounded-[40px] mb-12 shadow-lg relative overflow-hidden", unit.color)}>
              <div className="relative z-10 text-white">
                <p className="text-sm font-black opacity-80 uppercase tracking-widest mb-1">{unit.title}</p>
                <h3 className="text-3xl font-black mb-2">{unit.description}</h3>
                <div className="flex items-center gap-2 bg-black/10 w-fit px-3 py-1.5 rounded-2xl">
                  <Star className="w-4 h-4 fill-current text-duo-bee" />
                  <span className="text-xs font-black">한자 8개 정복하기</span>
                </div>
              </div>
              {/* Background Shapes for Unit Header */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-10 -translate-y-10" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-black/5 rounded-full -translate-x-5 translate-y-5" />
            </div>

            {/* Nodes within Unit */}
            <div className="flex flex-col items-center gap-12 relative">
              {/* SVG Path - Winding Road */}
              <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none z-0" style={{ minHeight: unit.nodes.length * 120 }}>
                <path
                  d={`M 0 0 ${unit.nodes.map((_, i) => {
                    const x = Math.sin((uIdx * 8 + i) * 1.5) * 60;
                    const y = i * 120 + 60;
                    return `L ${x} ${y}`;
                  }).join(' ')}`}
                  fill="none"
                  stroke="#E5E5E5"
                  strokeWidth="12"
                  strokeLinecap="round"
                  className="translate-x-[50%]"
                />
              </svg>

              {unit.nodes.map((node, nIdx) => {
                const globalIdx = uIdx * 8 + nIdx;
                const xOffset = Math.sin(globalIdx * 1.5) * 60;
                const isUnlocked = globalIdx + 1 <= currentProgress.node;
                const isCurrent = globalIdx + 1 === currentProgress.node;
                const isCompleted = globalIdx + 1 < currentProgress.node;

                return (
                  <div key={node.hanja} className="relative z-10" style={{ transform: `translateX(${xOffset}px)` }}>
                    {/* The Node Button */}
                    <motion.button
                      whileHover={isUnlocked ? { scale: 1.1 } : {}}
                      whileTap={isUnlocked ? { scale: 0.95 } : {}}
                      onClick={() => isUnlocked && onNodeClick?.(node.hanja)}
                      className={cn(
                        "relative w-24 h-24 rounded-[32px] flex items-center justify-center transition-all",
                        isCurrent 
                          ? "bg-white border-4 border-duo-macaw shadow-[0_8px_0_0_#1899d6] ring-8 ring-duo-macaw/20"
                          : isCompleted
                            ? "bg-duo-green border-4 border-[#46a302] shadow-[0_8px_0_0_#3b8a02]"
                            : isUnlocked
                              ? "bg-white border-4 border-duo-macaw shadow-[0_8px_0_0_#1899d6]"
                              : "bg-duo-snow border-4 border-duo-swan shadow-[0_8px_0_0_#d1d1d1] opacity-60"
                      )}
                    >
                      {isUnlocked ? (
                        <div className="flex flex-col items-center">
                          <span className={cn("text-4xl font-black font-myeongjo", isCompleted ? "text-white" : "text-duo-eel")}>
                            {node.hanja}
                          </span>
                        </div>
                      ) : (
                        <Lock className="w-10 h-10 text-duo-swan" />
                      )}

                      {/* Yongchi Character on Current Node */}
                      {isCurrent && (
                        <motion.div 
                          initial={{ y: -20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          className="absolute -top-16 z-20 pointer-events-none"
                        >
                          <div className="relative w-16 h-16 drop-shadow-lg">
                            <Image src="/images/yongchi_premium.png" alt="용치" fill className="object-contain" />
                            {/* Floating "Here!" tag */}
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-duo-macaw text-white text-[8px] font-black px-2 py-1 rounded-full whitespace-nowrap animate-bounce">
                              여기야! 🐉
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Progress Stars */}
                      <div className="absolute -bottom-4 flex gap-1 bg-white px-2 py-1 rounded-full border-2 border-duo-snow shadow-sm">
                        {[1, 2, 3].map(s => (
                          <Star key={s} className={cn("w-3 h-3 fill-current", isCompleted ? "text-duo-bee" : "text-duo-snow")} />
                        ))}
                      </div>
                    </motion.button>

                    {/* Node Info Label */}
                    {isCurrent && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="absolute left-full ml-8 top-1/2 -translate-y-1/2 bg-white p-4 rounded-3xl border-3 border-duo-snow shadow-xl w-40"
                      >
                        <p className="text-[10px] font-black text-duo-macaw mb-1 uppercase tracking-widest">다음 모험</p>
                        <p className="text-lg font-black text-duo-eel leading-tight">{node.meaning} {node.sound}</p>
                        <div className="mt-2 flex items-center gap-1 text-[8px] font-bold text-duo-wolf">
                          <Edit3 className="w-3 h-3" /> 써보기 대기 중
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}

              {/* Milestone Gift at the end of unit */}
              <motion.div 
                whileHover={{ scale: 1.1 }}
                className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center border-4 shadow-lg mt-8 mb-12 cursor-pointer transition-all",
                  unit.id < (currentProgress.node / 8) + 1
                    ? "bg-duo-green border-[#46a302] text-white"
                    : "bg-duo-snow border-duo-swan text-duo-swan opacity-50"
                )}
              >
                <Gift className="w-10 h-10" />
              </motion.div>
            </div>
          </section>
        ))}
      </div>

      {/* Floating Continue Button */}
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm px-6">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => currentNodeHanja && onNodeClick?.(currentNodeHanja)}
          className="w-full py-6 bg-duo-macaw text-white rounded-[32px] font-black text-2xl shadow-[0_8px_0_0_#1899d6] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3"
        >
          모험 계속하기 <ChevronRight className="w-8 h-8" />
        </motion.button>
      </div>

      {/* Decorative Trees/Clouds */}
      <div className="absolute top-1/2 left-0 -translate-x-10 opacity-20 pointer-events-none">
        <div className="w-20 h-20 bg-duo-green rounded-full blur-xl" />
      </div>
    </div>
  );
}

// Helper icons missing from imports
function Edit3({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  );
}

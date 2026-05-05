"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Star, Sparkles, Map as MapIcon, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface QuestNode {
  hanja: string;
  meaning: string;
  sound: string;
  level: string;
  quest_index: number;
}

export default function QuestMap({ onNodeClick }: { onNodeClick?: (hanja: string) => void }) {
  const [nodes, setNodes] = useState<QuestNode[]>([]);
  const [currentProgress, setCurrentProgress] = useState({ stage: 8, node: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchQuestData() {
      // 1. 프로필에서 현재 진행도 가져오기
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

      // 2. 한자 퀘스트 노드 가져오기 (10개씩 묶어서 보여줌)
      const { data: hanjas } = await supabase
        .from('hanja_master')
        .select('hanja, meaning, sound, level, quest_index')
        .order('quest_index', { ascending: true })
        .limit(100); // 우선 처음 100개

      if (hanjas) {
        setNodes(hanjas);
      }
      setIsLoading(false);
    }

    fetchQuestData();
  }, [supabase]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Sparkles className="w-12 h-12 text-duo-macaw animate-bounce mb-4" />
        <p className="text-duo-wolf font-black">한자 지도를 펼치는 중...</p>
      </div>
    );
  }

  const currentNodeHanja = nodes[currentProgress.node - 1]?.hanja;

  return (
    <div className="relative w-full max-w-md mx-auto py-10 px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-12 bg-white/90 backdrop-blur-md p-6 rounded-[32px] border-3 border-duo-snow shadow-sm sticky top-4 z-20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-duo-macaw rounded-2xl flex items-center justify-center shadow-[0_4px_0_0_#1899d6]">
            <MapIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-duo-eel">한자 탐험 지도</h2>
            <p className="text-xs font-bold text-duo-wolf">현재 스테이지: {currentProgress.stage}급</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-duo-macaw uppercase tracking-wider">Progress</span>
          <div className="w-24 h-3 bg-duo-snow rounded-full mt-1 overflow-hidden border border-duo-swan">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((currentProgress.node / nodes.length) * 100, 100)}%` }}
              className="h-full bg-duo-macaw"
            />
          </div>
        </div>
      </div>

      {/* The Winding Path */}
      <div className="relative flex flex-col items-center gap-8 pb-32">
        {nodes.map((node, idx) => {
          // 지그재그 오프셋 계산
          const xOffset = Math.sin(idx * 1.5) * 60;
          const isUnlocked = idx + 1 <= currentProgress.node;
          const isCurrent = idx + 1 === currentProgress.node;

          return (
            <div key={node.hanja} className="relative">
              {/* Path Line Connector */}
              {idx < nodes.length - 1 && (
                <div 
                  className="absolute left-1/2 top-full w-2 bg-duo-snow -translate-x-1/2 z-0"
                  style={{ 
                    height: "40px",
                    transform: `translateX(${xOffset}px) rotate(${Math.sin(idx * 1.5) * 10}deg)`
                  }}
                />
              )}

              <motion.button
                whileHover={isUnlocked ? { scale: 1.1 } : {}}
                whileTap={isUnlocked ? { scale: 0.9 } : {}}
                onClick={() => isUnlocked && onNodeClick?.(node.hanja)}
                className={cn(
                  "relative w-20 h-20 rounded-[28px] flex flex-col items-center justify-center transition-all z-10",
                  isUnlocked 
                    ? "bg-white border-4 border-duo-macaw shadow-[0_6px_0_0_#1899d6] cursor-pointer" 
                    : "bg-duo-snow border-4 border-duo-swan cursor-not-allowed opacity-80"
                )}
                style={{ transform: `translateX(${xOffset}px)` }}
              >
                {isUnlocked ? (
                  <>
                    <span className="text-3xl font-black text-duo-eel">{node.hanja}</span>
                    {isCurrent && (
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-duo-macaw text-white px-3 py-1.5 rounded-xl text-[10px] font-black shadow-lg animate-bounce whitespace-nowrap">
                        현재 탐험 중!
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-duo-macaw rotate-45" />
                      </div>
                    )}
                  </>
                ) : (
                  <Lock className="w-8 h-8 text-duo-swan" />
                )}

                {/* Progress Indicators (Stars) */}
                <div className="absolute -bottom-3 flex gap-0.5">
                  {[1, 2, 3].map(s => (
                    <Star key={s} className={cn("w-3 h-3 fill-current", isUnlocked ? "text-duo-bee" : "text-duo-swan")} />
                  ))}
                </div>
              </motion.button>

              {/* Node Info Badge (Only for current) */}
              {isCurrent && (
                <div 
                  className="absolute left-full ml-6 top-1/2 -translate-y-1/2 bg-white p-3 rounded-2xl border-2 border-duo-snow shadow-sm w-32 animate-fade-in"
                  style={{ transform: `translateX(${xOffset}px)` }}
                >
                  <p className="text-[10px] font-black text-duo-macaw mb-1 uppercase tracking-tighter">다음 목표</p>
                  <p className="text-sm font-black text-duo-eel">{node.meaning} {node.sound}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Floating Action */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 w-full max-w-xs px-4">
        <button 
          onClick={() => currentNodeHanja && onNodeClick?.(currentNodeHanja)}
          className="w-full py-5 bg-duo-macaw text-white rounded-[32px] font-black text-xl shadow-[0_6px_0_0_#1899d6] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
        >
          계속 탐험하기 <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

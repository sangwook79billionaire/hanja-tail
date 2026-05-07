"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { School, GraduationCap, Sparkles, Send } from "lucide-react";
import { updateProfile } from "@/app/actions";

interface RequiredInfoModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export default function RequiredInfoModal({ isOpen, onComplete }: RequiredInfoModalProps) {
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("1");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) {
      alert("학교 이름을 입력해주세요!");
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateProfile({
        school,
        grade: parseInt(grade)
      });

      if (result.error) throw new Error(result.error);
      
      alert("정보가 저장되었습니다! 이제 본격적으로 탐험을 시작해볼까요? 🐉");
      onComplete();
    } catch (error: unknown) {
      const err = error as Error;
      alert(err.message || "정보 저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-duo-eel/60 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[40px] p-8 shadow-2xl border-4 border-duo-snow"
          >
            <div className="text-center mb-8">
              <div className="inline-flex p-4 bg-duo-snow rounded-2xl mb-4">
                <Sparkles className="w-8 h-8 text-duo-green" />
              </div>
              <h2 className="text-2xl font-black text-duo-eel tracking-tight">잠깐! 추가 정보가 필요해요</h2>
              <p className="text-duo-wolf font-bold mt-2">
                학교와 학년을 입력하면 친구들과 랭킹을 대결할 수 있어요!
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <School className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-duo-wolf" />
                <input
                  type="text"
                  placeholder="학교 이름"
                  className="w-full pl-12 pr-4 py-4 bg-duo-snow border-2 border-duo-swan rounded-2xl font-bold focus:border-duo-green outline-none transition-colors"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  required
                />
              </div>

              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-duo-wolf" />
                <select
                  className="w-full pl-12 pr-4 py-4 bg-duo-snow border-2 border-duo-swan rounded-2xl font-bold focus:border-duo-green outline-none transition-colors appearance-none"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  required
                >
                  {[1, 2, 3, 4, 5, 6].map(g => (
                    <option key={g} value={g}>{g}학년</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-5 bg-duo-green text-white font-black text-xl rounded-2xl border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2 mt-6 shadow-sm disabled:opacity-50"
              >
                {isLoading ? "저장 중..." : <><Send className="w-6 h-6" /> 정보 저장하고 시작하기</>}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

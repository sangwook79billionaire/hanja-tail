"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, School, GraduationCap, Trophy, Save, Loader2, Search, MapPin, Sparkles } from "lucide-react";
import { updateProfile, searchSchools, getRankings } from "@/app/actions";
import { cn } from "@/lib/utils";

interface MyPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    nickname: string | null;
    school: string | null;
    grade: number | null;
  };
  onUpdate: () => void;
}

interface SchoolItem {
  name: string;
  address: string;
  code: string;
  region: string;
}

interface RankingData {
  peerRank: number;
  peerTotal: number;
  schoolRank: number;
  schoolTotal: number;
}

export default function MyPageModal({ isOpen, onClose, initialData, onUpdate }: MyPageModalProps) {
  const [nickname, setNickname] = useState(initialData.nickname || "");
  const [school, setSchool] = useState(initialData.school || "");
  const [grade, setGrade] = useState(initialData.grade?.toString() || "1");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SchoolItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [rankData, setRankData] = useState<RankingData | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNickname(initialData.nickname || "");
      setSchool(initialData.school || "");
      setGrade(initialData.grade?.toString() || "1");
      fetchRankings();
    }
  }, [isOpen, initialData]);

  const fetchRankings = async () => {
    const result = await getRankings();
    if (!result.error) {
      setRankData(result as RankingData);
    }
  };

  // 학교 검색 핸들러
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (school.trim().length >= 2 && school !== initialData.school) {
        setIsSearching(true);
        const results = await searchSchools(school);
        setSearchResults(results);
        setShowDropdown(results.length > 0);
        setIsSearching(false);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [school, initialData.school]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      alert("닉네임을 입력해주세요!");
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateProfile({
        nickname: nickname.trim(),
        school: school.trim(),
        grade: parseInt(grade)
      });

      if (result.error) throw new Error(result.error);
      
      alert("프로필이 업데이트되었습니다! ✨");
      onUpdate();
      onClose();
    } catch (error: unknown) {
      const err = error as Error;
      alert(err.message || "오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectSchool = (selected: SchoolItem) => {
    setSchool(selected.name);
    setShowDropdown(false);
    setSearchResults([]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-duo-eel/60 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl border-4 border-duo-snow my-8"
          >
            {/* Header */}
            <div className="p-8 border-b-2 border-duo-snow flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 rounded-2xl">
                  <User className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-duo-eel">나의 정보</h2>
                  <p className="text-xs font-bold text-duo-wolf">프로필과 랭킹을 확인하세요</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-duo-snow rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-duo-wolf" />
              </button>
            </div>

            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
              {/* Ranking Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-amber-50 rounded-[30px] p-5 border-2 border-amber-100 flex flex-col items-center text-center">
                  <Trophy className="w-8 h-8 text-amber-500 mb-2" />
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">또래 랭킹</p>
                  {rankData ? (
                    <>
                      <p className="text-2xl font-black text-duo-eel">{rankData.peerRank}위</p>
                      <p className="text-xs font-bold text-amber-600/60 mt-1">전체 {rankData.peerTotal}명 중</p>
                    </>
                  ) : (
                    <div className="animate-pulse h-8 w-16 bg-amber-200 rounded-lg mt-1" />
                  )}
                </div>
                <div className="bg-blue-50 rounded-[30px] p-5 border-2 border-blue-100 flex flex-col items-center text-center">
                  <School className="w-8 h-8 text-blue-500 mb-2" />
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">교내 랭킹</p>
                  {rankData ? (
                    <>
                      <p className="text-2xl font-black text-duo-eel">{rankData.schoolRank}위</p>
                      <p className="text-xs font-bold text-blue-600/60 mt-1">학교 {rankData.schoolTotal}명 중</p>
                    </>
                  ) : (
                    <div className="animate-pulse h-8 w-16 bg-blue-200 rounded-lg mt-1" />
                  )}
                </div>
              </div>

              {/* Edit Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nickname */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-duo-eel flex items-center gap-1.5 ml-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    멋진 닉네임
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="별명을 입력하세요"
                    className="w-full px-5 py-4 bg-duo-snow rounded-2xl border-2 border-duo-swan focus:border-indigo-400 focus:outline-none font-bold text-duo-eel transition-all"
                  />
                </div>

                {/* School */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-duo-eel flex items-center gap-1.5 ml-1">
                    <School className="w-3 h-3 text-blue-500" />
                    우리 학교
                  </label>
                  <div className="relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-duo-wolf group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      type="text"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      placeholder="초등학교 이름을 입력하세요"
                      className="w-full pl-12 pr-5 py-4 bg-duo-snow rounded-2xl border-2 border-duo-swan focus:border-indigo-400 focus:outline-none font-bold text-duo-eel transition-all"
                    />
                    
                    {/* School Dropdown */}
                    <AnimatePresence>
                      {showDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border-2 border-duo-snow shadow-xl overflow-hidden z-20"
                        >
                          {searchResults.map((item) => (
                            <button
                              key={item.code}
                              type="button"
                              onClick={() => selectSchool(item)}
                              className="w-full p-4 flex items-start gap-3 hover:bg-duo-snow transition-colors text-left border-b border-duo-snow last:border-none"
                            >
                              <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                                <MapPin className="w-4 h-4 text-blue-500" />
                              </div>
                              <div>
                                <p className="font-bold text-duo-eel text-sm">{item.name}</p>
                                <p className="text-xs text-duo-wolf">{item.address}</p>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {isSearching && (
                      <div className="absolute right-5 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Grade */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-duo-eel flex items-center gap-1.5 ml-1">
                    <GraduationCap className="w-3 h-3 text-purple-500" />
                    몇 학년인가요?
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGrade(g.toString())}
                        className={cn(
                          "py-4 rounded-2xl font-black text-sm transition-all border-b-4",
                          grade === g.toString()
                            ? "bg-purple-600 text-white border-purple-800 scale-95"
                            : "bg-duo-snow text-duo-eel border-duo-swan hover:bg-duo-swan/50"
                        )}
                      >
                        {g}학년
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[25px] font-black text-lg shadow-[0_5px_0_0_#4338ca] active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                  정보 업데이트하기
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

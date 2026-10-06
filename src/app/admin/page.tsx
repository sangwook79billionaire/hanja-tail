"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  getAdminStats, 
  getUnverifiedWords, 
  verifyWord, 
  deleteWord, 
  getMonitoringLogs, 
  bulkVerifyWords, 
  bulkDeleteWords,
  updateWord,
  runBatchGeneration,
  screenWords,
  getAdminUserLearningStats
} from "../actions";
import { 
  Users, 
  Database, 
  FileText, 
  Sparkles, 
  CheckCircle, 
  Trash2, 
  ArrowLeft,
  Loader2,
  AlertCircle,
  Eye,
  Edit2,
  Check,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Calendar,
  Activity,
  Clock,
  BookOpen
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AdminStats {
  userCount: number;
  logCount: number;
  bankCount: number;
  cacheCount: number;
  rankings: {
    nickname: string | null;
    total_score: number;
    current_stage: number;
  }[];
  recentLogs: {
    word: string;
    is_correct: boolean;
    learned_at: string;
    profiles: { nickname: string | null } | null;
  }[];
  recentUsers: {
    nickname: string | null;
    school: string | null;
    grade: number | null;
    created_at: string;
  }[];
  painPoints: {
    topFailedWords: { word: string; count: number }[];
    topUncompletedWords: { word: string; count: number }[];
  };
}

interface HanjaItem {
  char: string;
  meaning: string;
  sound: string;
}

interface AnalysisJson {
  hanjaList: HanjaItem[];
  description: string;
}

interface UnverifiedWord {
  word: string;
  analysis_json: AnalysisJson;
  created_at: string;
}

interface MonitoringLog {
  id: number;
  word: string;
  reason: string;
  created_at: string;
  details: Record<string, unknown>;
}

interface UserStatItem {
  id: string;
  email?: string | null;
  nickname: string | null;
  school: string | null;
  grade: number | null;
  created_at: string;
  total_score?: number | null;
  current_stage?: number | null;
  current_node?: number | null;
  streak_count?: number | null;
  last_streak_at?: string | null;
  coupons?: number | null;
  totalLogs: number;
  correctLogs: number;
  activeDaysCount: number;
  lastActiveAt: string | null;
  weeklyTrends: number[];
  status: 'active' | 'inactive' | 'churned';
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [unverifiedWords, setUnverifiedWords] = useState<UnverifiedWord[]>([]);
  const [monitoringLogs, setMonitoringLogs] = useState<MonitoringLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [editingWord, setEditingWord] = useState<UnverifiedWord | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'queue' | 'logs' | 'users'>('dashboard');
  const [batchResults, setBatchResults] = useState<string[]>([]);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  // User Stats Tab States
  const [userStats, setUserStats] = useState<UserStatItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'churned'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'totalLogs' | 'activeDaysCount' | 'lastActiveAt'>('created_at');
  const [sortDesc, setSortDesc] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // AI Screening states
  const [screeningResults, setScreeningResults] = useState<Record<string, { status: 'VALID' | 'SUSPICIOUS' | 'INVALID', type: string, reason: string }>>({});
  const [isScreening, setIsScreening] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'invalid'>('all');

  useEffect(() => {
    async function loadData() {
      try {
        const [s, w, l, u] = await Promise.all([
          getAdminStats(), 
          getUnverifiedWords(),
          getMonitoringLogs(),
          getAdminUserLearningStats()
        ]);
        setStats(s as AdminStats);
        setUnverifiedWords(w as unknown as UnverifiedWord[]);
        if (l && 'data' in l) {
          setMonitoringLogs(l.data as MonitoringLog[]);
        }
        if (u && 'data' in u) {
          setUserStats(u.data as unknown as UserStatItem[]);
        }
      } catch (err: unknown) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : "권한이 없거나 오류가 발생했습니다.";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const toggleSelect = (word: string) => {
    const next = new Set(selectedWords);
    if (next.has(word)) next.delete(word);
    else next.add(word);
    setSelectedWords(next);
  };

  const getFilteredWords = () => {
    return unverifiedWords.filter(w => {
      if (filterMode === 'all') return true;
      const res = screeningResults[w.word];
      if (!res) return true; // Show un-screened words in all modes
      if (filterMode === 'valid') return res.status === 'VALID';
      if (filterMode === 'invalid') return res.status === 'SUSPICIOUS' || res.status === 'INVALID';
      return true;
    });
  };

  const toggleSelectAll = () => {
    const currentList = getFilteredWords();
    if (selectedWords.size === currentList.length && currentList.length > 0) {
      setSelectedWords(new Set());
    } else {
      setSelectedWords(new Set(currentList.map(w => w.word)));
    }
  };

  const handleScreening = async () => {
    if (unverifiedWords.length === 0) return;
    setIsScreening(true);
    try {
      const wordsToScreen = unverifiedWords.map(w => w.word);
      const res = await screenWords(wordsToScreen);
      if (res.success && res.results) {
        const resultsMap: Record<string, { status: 'VALID' | 'SUSPICIOUS' | 'INVALID', type: string, reason: string }> = {};
        res.results.forEach((item: { word: string, status: 'VALID' | 'SUSPICIOUS' | 'INVALID', type: string, reason: string }) => {
          resultsMap[item.word] = {
            status: item.status,
            type: item.type,
            reason: item.reason
          };
        });
        setScreeningResults(resultsMap);
        alert("모든 단어 스크리닝이 완료되었습니다!");
      } else {
        alert("스크리닝 오류: " + res.error);
      }
    } catch (err) {
      console.error(err);
      alert("스크리닝 실행 중 오류가 발생했습니다.");
    } finally {
      setIsScreening(false);
    }
  };

  const selectValidWords = () => {
    const valid = unverifiedWords
      .filter(w => screeningResults[w.word]?.status === 'VALID')
      .map(w => w.word);
    setSelectedWords(new Set(valid));
  };

  const selectSuspiciousWords = () => {
    const suspicious = unverifiedWords
      .filter(w => screeningResults[w.word]?.status === 'SUSPICIOUS' || screeningResults[w.word]?.status === 'INVALID')
      .map(w => w.word);
    setSelectedWords(new Set(suspicious));
  };

  const handleVerify = async (word: string) => {
    setActionLoading(word);
    const res = await verifyWord(word);
    if (res.success) {
      setUnverifiedWords(prev => prev.filter(w => w.word !== word));
      setSelectedWords(prev => {
        const next = new Set(prev);
        next.delete(word);
        return next;
      });
    } else {
      alert("오류: " + res.error);
    }
    setActionLoading(null);
  };

  const handleDelete = async (word: string) => {
    if (!confirm(`'${word}' 분석 결과를 정말 삭제할까요?`)) return;
    setActionLoading(word);
    const res = await deleteWord(word);
    if (res.success) {
      setUnverifiedWords(prev => prev.filter(w => w.word !== word));
    } else {
      alert("오류: " + res.error);
    }
    setActionLoading(null);
  };

  const handleBulkVerify = async () => {
    const words = Array.from(selectedWords);
    if (!confirm(`${words.length}개의 단어를 일괄 승인하시겠습니까?`)) return;
    setIsLoading(true);
    const res = await bulkVerifyWords(words);
    if (res.success) {
      setUnverifiedWords(prev => prev.filter(w => !selectedWords.has(w.word)));
      setSelectedWords(new Set());
      alert("일괄 승인되었습니다.");
    } else {
      alert("오류: " + res.error);
    }
    setIsLoading(false);
  };

  const handleBulkDelete = async () => {
    const words = Array.from(selectedWords);
    if (!confirm(`${words.length}개의 단어를 일괄 삭제하시겠습니까?`)) return;
    setIsLoading(true);
    const res = await bulkDeleteWords(words);
    if (res.success) {
      setUnverifiedWords(prev => prev.filter(w => !selectedWords.has(w.word)));
      setSelectedWords(new Set());
      alert("일괄 삭제되었습니다.");
    } else {
      alert("오류: " + res.error);
    }
    setIsLoading(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWord) return;
    setActionLoading(editingWord.word);
    const res = await updateWord(editingWord.word, editingWord);
    if (res.success) {
      setUnverifiedWords(prev => prev.map(w => w.word === editingWord.word ? editingWord : w));
      setEditingWord(null);
      alert("수정되었습니다.");
    } else {
      alert("오류: " + res.error);
    }
    setActionLoading(null);
  };

  const handleBatchGenerate = async () => {
    if (!confirm("AI가 지식 창고를 확장하도록 하시겠습니까?\n(약 10~20초 소요, 한자 5개 분량)")) return;
    setIsBatchGenerating(true);
    setBatchResults([]);
    
    const res = await runBatchGeneration(5);
    if (res.success) {
      setBatchResults(res.details || []);
      const s = await getAdminStats();
      setStats(s as AdminStats);
      alert(res.message);
    } else {
      alert("오류: " + res.error);
    }
    setIsBatchGenerating(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <Loader2 className="w-12 h-12 text-duo-macaw animate-spin mb-4" />
        <p className="text-duo-wolf font-black">데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-duo-eel mb-2">접근 거부</h1>
        <p className="text-duo-wolf font-bold mb-8">{error}</p>
        <Link href="/" className="px-8 py-4 bg-duo-macaw text-white rounded-2xl font-black shadow-[0_4px_0_0_#1899d6]">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-duo-snow/30 pb-20 font-sans">
      <header className="bg-white border-b-2 border-duo-snow sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-duo-snow rounded-xl transition-colors">
              <ArrowLeft className="w-6 h-6 text-duo-eel" />
            </Link>
            <h1 className="text-xl font-black text-duo-eel">관리자 대시보드</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-duo-snow p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={cn("px-4 py-1.5 rounded-lg text-xs font-black transition-all", activeTab === 'dashboard' ? "bg-white text-duo-macaw shadow-sm" : "text-duo-wolf")}
              >
                모니터링 대시보드
              </button>
              <button 
                onClick={() => setActiveTab('users')}
                className={cn("px-4 py-1.5 rounded-lg text-xs font-black transition-all", activeTab === 'users' ? "bg-white text-duo-macaw shadow-sm" : "text-duo-wolf")}
              >
                사용자 통계
              </button>
              <button 
                onClick={() => setActiveTab('queue')}
                className={cn("px-4 py-1.5 rounded-lg text-xs font-black transition-all", activeTab === 'queue' ? "bg-white text-duo-macaw shadow-sm" : "text-duo-wolf")}
              >
                검수 대기
              </button>
              <button 
                onClick={() => setActiveTab('logs')}
                className={cn("px-4 py-1.5 rounded-lg text-xs font-black transition-all", activeTab === 'logs' ? "bg-white text-duo-macaw shadow-sm" : "text-duo-wolf")}
              >
                모니터링 로그
              </button>
            </div>
            <div className="bg-duo-macaw/10 text-duo-macaw px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
              Admin Access
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <StatCard icon={<Users className="text-blue-500" />} label="전체 유저" value={stats.userCount} color="blue" />
            <StatCard icon={<FileText className="text-green-500" />} label="학습 로그" value={stats.logCount} color="green" />
            <StatCard icon={<Database className="text-purple-500" />} label="퀴즈 뱅크" value={stats.bankCount} color="purple" />
            <StatCard icon={<Sparkles className="text-orange-500" />} label="AI 캐시" value={stats.cacheCount} color="orange" />
          </div>
        )}

        {/* Database Growth Control */}
        {activeTab === 'queue' && (
          <div className="mb-12 bg-gradient-to-br from-duo-macaw to-blue-600 rounded-[40px] p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 animate-in fade-in duration-500">
            <div className="flex-1">
              <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-yellow-300 fill-yellow-300" /> 
                지식 창고 자가 증식
              </h2>
              <p className="text-white/80 font-bold max-w-xl">
                AI가 아직 단어가 부족한 한자들을 찾아내어 스스로 새로운 학습 콘텐츠를 생성합니다. 
                지속적인 실행을 통해 한자 꼬리의 세계를 무한히 확장할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <button 
                disabled={isBatchGenerating}
                onClick={handleBatchGenerate}
                className={cn(
                  "px-8 py-5 bg-white text-duo-macaw rounded-[24px] font-black text-xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-3",
                  isBatchGenerating && "opacity-50 cursor-not-allowed"
                )}
              >
                {isBatchGenerating ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Database className="w-6 h-6" />
                    자가 증식 실행 (+5개 한자)
                  </>
                )}
              </button>
              {batchResults.length > 0 && (
                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest animate-pulse">
                  최근 완료: {batchResults.length}개 단어 추가됨
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'queue' && batchResults.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 bg-white border-3 border-duo-green/30 rounded-[32px] p-6 shadow-sm"
          >
            <h3 className="text-sm font-black text-duo-green mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> 방금 추가된 단어들:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {batchResults.map((r, i) => (
                <div key={i} className="px-4 py-2 bg-duo-green/5 rounded-xl text-xs font-bold text-duo-green-dark border border-duo-green/10">
                  {r}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'dashboard' && stats && (
          <div className="space-y-8 animate-in fade-in duration-500 mb-12">
            {/* New Users and Recent Logs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 신규 유입 사용자 */}
              <div className="bg-white border-3 border-duo-snow rounded-[40px] p-8 shadow-sm">
                <h3 className="text-xl font-black text-duo-eel mb-6 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" /> 신규 유입 사용자
                </h3>
                <div className="space-y-4">
                  {stats.recentUsers && stats.recentUsers.length > 0 ? (
                    stats.recentUsers.map((u, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-duo-snow/20 rounded-2xl border border-duo-snow">
                        <div>
                          <p className="text-base font-black text-duo-eel">{u.nickname || '익명 사용자'}</p>
                          <p className="text-xs font-bold text-duo-wolf mt-0.5">
                            {u.school ? `${u.school} ${u.grade ? `${u.grade}학년` : ''}` : '학교 정보 없음'}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-duo-swan">
                          {new Date(u.created_at).toLocaleDateString()} 가입
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-8 text-duo-wolf font-bold">가입한 사용자가 없습니다.</p>
                  )}
                </div>
              </div>

              {/* 최근 학습 이력 */}
              <div className="bg-white border-3 border-duo-snow rounded-[40px] p-8 shadow-sm">
                <h3 className="text-xl font-black text-duo-eel mb-6 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-500" /> 최근 학습 이력
                </h3>
                <div className="space-y-4">
                  {stats.recentLogs && stats.recentLogs.length > 0 ? (
                    stats.recentLogs.map((l, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-duo-snow/20 rounded-2xl border border-duo-snow">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-duo-eel">{l.word}</span>
                            <span className={cn(
                              "text-[10px] font-black px-2 py-0.5 rounded-lg border",
                              l.is_correct ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                            )}>
                              {l.is_correct ? "정답" : "오답"}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-duo-wolf mt-1">
                            학습자: {l.profiles?.nickname || '익명'}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-duo-swan">
                          {new Date(l.learned_at).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-8 text-duo-wolf font-bold">학습한 기록이 없습니다.</p>
                  )}
                </div>
              </div>
            </div>

            {/* UX Pain Points Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 학습 장애물 단어 (주요 오답 발생) */}
              <div className="bg-rose-50/30 border-3 border-rose-100 rounded-[40px] p-8 shadow-sm">
                <h3 className="text-xl font-black text-rose-800 mb-6 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" /> 주요 오답 발생 단어 (UX Pain Points)
                </h3>
                <p className="text-xs font-bold text-rose-700/80 mb-6">최근 200건의 학습 로그 중 어린이들이 가장 많이 틀린 단어들입니다. 이 단어들의 설명이나 퀴즈 난이도 조정을 고려해 보세요.</p>
                <div className="space-y-3">
                  {stats.painPoints?.topFailedWords && stats.painPoints.topFailedWords.length > 0 ? (
                    stats.painPoints.topFailedWords.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-rose-100 shadow-sm">
                        <span className="text-lg font-black text-rose-900">{item.word}</span>
                        <div className="bg-rose-100 text-rose-700 px-3 py-1 rounded-xl text-xs font-black">
                          오답 {item.count}회
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-8 text-rose-700/60 font-bold">최근 오답이 기록된 단어가 없습니다. 👍</p>
                  )}
                </div>
              </div>

              <div className="bg-amber-50/30 border-3 border-amber-100 rounded-[40px] p-8 shadow-sm">
                <h3 className="text-xl font-black text-amber-800 mb-6 flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-amber-600" /> 따라쓰기 미완료 단어 (학습 이탈)
                </h3>
                <p className="text-xs font-bold text-amber-700/80 mb-6">검색을 통한 단어 분석은 하였으나 따라쓰기 완료 배지를 얻지 못하고 이탈한 단어들입니다. 획순이 너무 복잡하여 포기했을 가능성이 큽니다.</p>
                <div className="space-y-3">
                  {stats.painPoints?.topUncompletedWords && stats.painPoints.topUncompletedWords.length > 0 ? (
                    stats.painPoints.topUncompletedWords.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-amber-100 shadow-sm">
                        <span className="text-lg font-black text-amber-900">{item.word}</span>
                        <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-xl text-xs font-black">
                          미완료 {item.count}회
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-8 text-amber-700/60 font-bold">최근 따라쓰기 미완료 단어가 없습니다. 👏</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'queue' && (
          <div className="bg-white border-3 border-duo-snow rounded-[40px] shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="p-8 border-b-2 border-duo-snow flex flex-col sm:flex-row sm:items-center justify-between bg-white gap-4">
              <div>
                <h2 className="text-2xl font-black text-duo-eel">AI 신규 발견 단어</h2>
                <p className="text-sm font-bold text-duo-wolf mt-1">
                  {selectedWords.size > 0 ? `${selectedWords.size}개 선택됨` : `검수 대기 중인 ${unverifiedWords.length}개의 단어입니다.`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleScreening}
                  disabled={isScreening || unverifiedWords.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-black text-xs shadow-md disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                >
                  {isScreening ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      AI 스크리닝 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-yellow-300 fill-yellow-300 animate-pulse" />
                      AI 단어 스크리닝 실행
                    </>
                  )}
                </button>

                {selectedWords.size > 0 && (
                  <div className="flex items-center gap-2 animate-in slide-in-from-right">
                    <button 
                      onClick={handleBulkVerify}
                      className="flex items-center gap-2 px-4 py-2.5 bg-duo-green text-white rounded-xl font-black text-xs shadow-[0_4px_0_0_#46a302]"
                    >
                      <Check className="w-4 h-4" /> 선택 승인
                    </button>
                    <button 
                      onClick={handleBulkDelete}
                      className="flex items-center gap-2 px-4 py-2.5 bg-duo-cardinal text-white rounded-xl font-black text-xs shadow-[0_4px_0_0_#c02e3b]"
                    >
                      <Trash2 className="w-4 h-4" /> 선택 삭제
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 border-b-2 border-duo-snow bg-duo-snow/10 flex flex-wrap gap-3">
              <span className="text-xs font-black text-duo-wolf flex items-center gap-1.5">필터:</span>
              <button 
                onClick={() => setFilterMode('all')}
                className={cn("px-4 py-1.5 rounded-xl text-xs font-black border-2 transition-all active:scale-95", filterMode === 'all' ? "bg-white border-duo-macaw text-duo-macaw shadow-sm" : "bg-white border-duo-snow text-duo-wolf")}
              >
                전체 대기 단어 ({unverifiedWords.length})
              </button>
              <button 
                onClick={() => setFilterMode('valid')}
                className={cn("px-4 py-1.5 rounded-xl text-xs font-black border-2 transition-all active:scale-95", filterMode === 'valid' ? "bg-white border-emerald-400 text-emerald-600 shadow-sm" : "bg-white border-duo-snow text-duo-wolf")}
              >
                AI 추천 단어 ({unverifiedWords.filter(w => screeningResults[w.word]?.status === 'VALID').length})
              </button>
              <button 
                onClick={() => setFilterMode('invalid')}
                className={cn("px-4 py-1.5 rounded-xl text-xs font-black border-2 transition-all active:scale-95", filterMode === 'invalid' ? "bg-white border-rose-400 text-rose-600 shadow-sm" : "bg-white border-duo-snow text-duo-wolf")}
              >
                AI 비추천/보류 단어 ({unverifiedWords.filter(w => screeningResults[w.word]?.status === 'SUSPICIOUS' || screeningResults[w.word]?.status === 'INVALID').length})
              </button>

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={selectValidWords}
                  className="text-xs font-bold text-emerald-600 hover:underline px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-200"
                >
                  추천단어 일괄선택
                </button>
                <button
                  onClick={selectSuspiciousWords}
                  className="text-xs font-bold text-rose-600 hover:underline px-2 py-1 bg-rose-50 rounded-lg border border-rose-200"
                >
                  비추천단어 일괄선택
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-duo-snow/50 text-[10px] font-black text-duo-swan uppercase tracking-widest border-b-2 border-duo-snow">
                    <th className="px-6 py-4 w-12 text-center">
                      <input 
                        type="checkbox"
                        checked={unverifiedWords.length > 0 && selectedWords.size === unverifiedWords.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 accent-duo-macaw rounded"
                      />
                    </th>
                    <th className="px-6 py-4">단어 (한자)</th>
                    <th className="px-6 py-4">뜻 / 풀이 (어린이용)</th>
                    <th className="px-6 py-4">AI 자동 진단</th>
                    <th className="px-6 py-4">발견일</th>
                    <th className="px-6 py-4 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-duo-snow">
                  {unverifiedWords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center text-duo-wolf font-bold">
                        검수 대기 중인 단어가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    unverifiedWords
                      .filter(w => {
                        if (filterMode === 'all') return true;
                        const status = screeningResults[w.word]?.status;
                        if (filterMode === 'valid') return status === 'VALID';
                        if (filterMode === 'invalid') return status === 'SUSPICIOUS' || status === 'INVALID';
                        return true;
                      })
                      .map((w) => (
                      <tr key={w.word} className="hover:bg-duo-snow/20 transition-colors group">
                        <td className="px-6 py-6 text-center">
                          <input 
                            type="checkbox"
                            checked={selectedWords.has(w.word)}
                            onChange={() => toggleSelect(w.word)}
                            className="w-4 h-4 accent-duo-macaw rounded"
                          />
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex flex-col">
                            <span className="text-lg font-black text-duo-eel">{w.word}</span>
                            <span className="text-xs font-bold text-duo-wolf mt-0.5">
                              {w.analysis_json?.hanjaList ? w.analysis_json.hanjaList.map(h => h.char).join('') : ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-6 max-w-xs">
                          <p className="text-sm font-bold text-duo-eel line-clamp-2">{w.analysis_json.description || '풀이 데이터 없음'}</p>
                        </td>
                        <td className="px-6 py-6">
                          {screeningResults[w.word] ? (
                            <div className="flex flex-col gap-1.5 max-w-xs">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-lg text-[10px] font-black border uppercase tracking-wider",
                                  screeningResults[w.word].status === 'VALID' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                                  screeningResults[w.word].status === 'SUSPICIOUS' && "bg-amber-50 text-amber-700 border-amber-200",
                                  screeningResults[w.word].status === 'INVALID' && "bg-rose-50 text-rose-700 border-rose-200"
                                )}>
                                  {screeningResults[w.word].type}
                                </span>
                              </div>
                              <span className="text-[11px] text-duo-wolf leading-relaxed">
                                {screeningResults[w.word].reason}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-duo-swan italic">스크리닝 미실행</span>
                          )}
                        </td>
                        <td className="px-6 py-6">
                          <span className="text-sm font-bold text-duo-swan">{new Date(w.created_at).toLocaleDateString()}</span>
                        </td>
                        <td className="px-6 py-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setEditingWord(w)}
                              className="p-2.5 bg-duo-snow text-duo-wolf rounded-xl hover:bg-duo-macaw hover:text-white transition-all shadow-sm"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              disabled={actionLoading === w.word}
                              onClick={() => handleVerify(w.word)}
                              className="p-2.5 bg-green-100 text-duo-green rounded-xl hover:bg-duo-green hover:text-white transition-all shadow-sm"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button 
                              disabled={actionLoading === w.word}
                              onClick={() => handleDelete(w.word)}
                              className="p-2.5 bg-red-100 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-white border-3 border-duo-snow rounded-[40px] shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="p-8 border-b-2 border-duo-snow bg-white">
              <h2 className="text-2xl font-black text-duo-eel">모니터링 로그</h2>
              <p className="text-sm font-bold text-duo-wolf mt-1">AI가 비정상(단순 조어 등)으로 판단하여 차단한 단어 기록입니다.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-duo-snow/50 text-[10px] font-black text-duo-swan uppercase tracking-widest">
                    <th className="px-8 py-4">단어</th>
                    <th className="px-8 py-4">사유</th>
                    <th className="px-8 py-4">시간</th>
                    <th className="px-8 py-4 text-right">상세</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-duo-snow">
                  {monitoringLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center text-duo-wolf font-bold">
                        기록된 로그가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    monitoringLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-duo-snow/20 transition-colors">
                        <td className="px-8 py-6">
                          <span className="font-black text-duo-cardinal">{log.word}</span>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-sm font-bold text-duo-wolf">{log.reason}</span>
                        </td>
                        <td className="px-8 py-6 text-sm text-duo-swan">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button className="p-2 text-duo-swan hover:text-duo-macaw">
                            <Eye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (() => {
          const getCohortName = (dateString: string) => {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = date.getDate();
            const week = Math.ceil(day / 7);
            return `${year}-${month} W${week}`;
          };

          const cohorts: Record<string, { total: number; active: number; inactive: number; churned: number }> = {};
          userStats.forEach(u => {
            const c = getCohortName(u.created_at);
            if (!cohorts[c]) {
              cohorts[c] = { total: 0, active: 0, inactive: 0, churned: 0 };
            }
            cohorts[c].total++;
            if (u.status === 'active') cohorts[c].active++;
            else if (u.status === 'inactive') cohorts[c].inactive++;
            else cohorts[c].churned++;
          });

          const cohortList = Object.entries(cohorts)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => a.name.localeCompare(b.name));

          const totalUsersCount = userStats.length;
          const activeUsersCount = userStats.filter(u => u.status === 'active').length;
          const inactiveUsersCount = userStats.filter(u => u.status === 'inactive').length;
          const churnedUsersCount = userStats.filter(u => u.status === 'churned').length;
          
          const averageLogs = totalUsersCount > 0 
            ? (userStats.reduce((sum, u) => sum + (u.totalLogs || 0), 0) / totalUsersCount).toFixed(1)
            : '0';

          const averageActiveDays = totalUsersCount > 0
            ? (userStats.reduce((sum, u) => sum + (u.activeDaysCount || 0), 0) / totalUsersCount).toFixed(1)
            : '0';

          const retentionRate = totalUsersCount > 0 
            ? ((activeUsersCount / totalUsersCount) * 100).toFixed(0) 
            : '0';

          const filteredUsers = userStats
            .filter(u => {
              const nameMatch = (u.nickname || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (u.school || "").toLowerCase().includes(searchTerm.toLowerCase());
              if (statusFilter === 'all') return nameMatch;
              return nameMatch && u.status === statusFilter;
            })
            .sort((a, b) => {
              const valA = a[sortBy];
              const valB = b[sortBy];
              
              if (valA === null || valA === undefined) return sortDesc ? 1 : -1;
              if (valB === null || valB === undefined) return sortDesc ? -1 : 1;
              
              if (typeof valA === 'number' && typeof valB === 'number') {
                return sortDesc ? valB - valA : valA - valB;
              }
              return sortDesc 
                ? String(valB).localeCompare(String(valA)) 
                : String(valA).localeCompare(String(valB));
            });

          return (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border-2 border-duo-snow rounded-3xl p-6 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-duo-swan uppercase tracking-widest">전체 유입 가입자</p>
                    <p className="text-xl font-black text-duo-eel">{totalUsersCount}명</p>
                  </div>
                </div>

                <div className="bg-white border-2 border-duo-snow rounded-3xl p-6 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center">
                    <Activity className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-duo-swan uppercase tracking-widest">7일 내 활동 사용자</p>
                    <p className="text-xl font-black text-duo-eel">
                      {activeUsersCount}명 <span className="text-xs text-emerald-600 font-bold">({retentionRate}%)</span>
                    </p>
                  </div>
                </div>

                <div className="bg-white border-2 border-duo-snow rounded-3xl p-6 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 border border-purple-100 rounded-2xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-duo-swan uppercase tracking-widest">1인당 평균 학습량</p>
                    <p className="text-xl font-black text-duo-eel">{averageLogs}회</p>
                  </div>
                </div>

                <div className="bg-white border-2 border-duo-snow rounded-3xl p-6 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-duo-swan uppercase tracking-widest">1인당 평균 학습일</p>
                    <p className="text-xl font-black text-duo-eel">{averageActiveDays}일</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border-3 border-duo-snow rounded-[40px] p-8 shadow-sm">
                <h3 className="text-lg font-black text-duo-eel mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-500" /> 주차별 가입 코호트 잔존율 분석
                </h3>
                <p className="text-xs font-bold text-duo-wolf mb-6">
                  서비스 초기 가입자부터 최근 가입자까지, 가입한 시기별로 유저들이 지속적으로 잔존하여 학습하고 있는지 확인합니다.
                </p>
                {cohortList.length === 0 ? (
                  <p className="text-center py-6 text-duo-wolf font-bold">코호트 분석 데이터가 없습니다.</p>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-duo-snow">
                    {cohortList.map((cohort, cIdx) => {
                      const cohortRetention = cohort.total > 0 ? ((cohort.active / cohort.total) * 100).toFixed(0) : '0';
                      const activePercent = (cohort.active / cohort.total) * 100;
                      const inactivePercent = (cohort.inactive / cohort.total) * 100;
                      const churnedPercent = (cohort.churned / cohort.total) * 100;

                      return (
                        <div key={cIdx} className="bg-duo-snow/10 border-2 border-duo-snow rounded-3xl p-5 min-w-[210px] flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                              {cohort.name}
                            </span>
                            <div className="flex justify-between items-baseline mt-3">
                              <span className="text-sm font-black text-duo-eel">가입자 수:</span>
                              <span className="text-base font-black text-duo-eel">{cohort.total}명</span>
                            </div>
                            <div className="flex justify-between items-baseline mt-1.5">
                              <span className="text-xs font-bold text-duo-wolf">7D 유지율:</span>
                              <span className="text-sm font-black text-emerald-600">{cohortRetention}%</span>
                            </div>
                          </div>
                          
                          <div className="mt-5 space-y-3">
                            <div className="h-2 w-full bg-duo-snow rounded-full overflow-hidden flex">
                              <div style={{ width: `${activePercent}%` }} className="bg-emerald-500 h-full" title={`활동 중: ${cohort.active}명`} />
                              <div style={{ width: `${inactivePercent}%` }} className="bg-amber-400 h-full" title={`미활동: ${cohort.inactive}명`} />
                              <div style={{ width: `${churnedPercent}%` }} className="bg-rose-500 h-full" title={`이탈: ${cohort.churned}명`} />
                            </div>
                            
                            <div className="flex justify-between text-[10px] font-black text-duo-swan uppercase">
                              <span className="text-emerald-600">활동: {cohort.active}</span>
                              <span className="text-amber-500">휴면: {cohort.inactive}</span>
                              <span className="text-rose-500">이탈: {cohort.churned}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white border-3 border-duo-snow rounded-[40px] shadow-sm overflow-hidden">
                <div className="p-8 border-b-2 border-duo-snow bg-white space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black text-duo-eel">사용자별 학습 통계</h2>
                      <p className="text-sm font-bold text-duo-wolf mt-1">
                        전체 사용자의 세부 가입 정보, 누적 학습량, 방문 주기 및 상태를 모니터링합니다.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-5 h-5 text-duo-wolf absolute left-4 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text"
                        placeholder="닉네임 또는 학교 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-12 pl-12 pr-4 bg-duo-snow border-2 border-duo-snow focus:border-duo-macaw rounded-2xl font-bold outline-none text-sm transition-all"
                      />
                    </div>
                    
                    <div className="flex bg-duo-snow p-1 rounded-xl self-start md:self-auto overflow-x-auto max-w-full">
                      <button 
                        onClick={() => setStatusFilter('all')}
                        className={cn("px-4 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap", statusFilter === 'all' ? "bg-white text-duo-eel shadow-sm" : "text-duo-wolf")}
                      >
                        전체 ({totalUsersCount})
                      </button>
                      <button 
                        onClick={() => setStatusFilter('active')}
                        className={cn("px-4 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap", statusFilter === 'active' ? "bg-white text-emerald-600 shadow-sm" : "text-duo-wolf")}
                      >
                        활동 중 ({activeUsersCount})
                      </button>
                      <button 
                        onClick={() => setStatusFilter('inactive')}
                        className={cn("px-4 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap", statusFilter === 'inactive' ? "bg-white text-amber-600 shadow-sm" : "text-duo-wolf")}
                      >
                        미활동 ({inactiveUsersCount})
                      </button>
                      <button 
                        onClick={() => setStatusFilter('churned')}
                        className={cn("px-4 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap", statusFilter === 'churned' ? "bg-white text-rose-600 shadow-sm" : "text-duo-wolf")}
                      >
                        이탈 ({churnedUsersCount})
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-duo-snow/50 text-[10px] font-black text-duo-swan uppercase tracking-widest border-b-2 border-duo-snow">
                        <th className="px-8 py-4 cursor-pointer hover:bg-duo-snow/30" onClick={() => { setSortBy('created_at'); setSortDesc(!sortDesc); }}>
                          사용자 {sortBy === 'created_at' && (sortDesc ? '▼' : '▲')}
                        </th>
                        <th className="px-8 py-4 cursor-pointer hover:bg-duo-snow/30" onClick={() => { setSortBy('created_at'); setSortDesc(!sortDesc); }}>
                          가입일 {sortBy === 'created_at' && (sortDesc ? '▼' : '▲')}
                        </th>
                        <th className="px-8 py-4 cursor-pointer hover:bg-duo-snow/30" onClick={() => { setSortBy('totalLogs'); setSortDesc(!sortDesc); }}>
                          총 학습량 {sortBy === 'totalLogs' && (sortDesc ? '▼' : '▲')}
                        </th>
                        <th className="px-8 py-4 cursor-pointer hover:bg-duo-snow/30" onClick={() => { setSortBy('activeDaysCount'); setSortDesc(!sortDesc); }}>
                          학습 일수 {sortBy === 'activeDaysCount' && (sortDesc ? '▼' : '▲')}
                        </th>
                        <th className="px-8 py-4 cursor-pointer hover:bg-duo-snow/30" onClick={() => { setSortBy('lastActiveAt'); setSortDesc(!sortDesc); }}>
                          최근 학습일 {sortBy === 'lastActiveAt' && (sortDesc ? '▼' : '▲')}
                        </th>
                        <th className="px-8 py-4">상태</th>
                        <th className="px-8 py-4 text-right">상세</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-duo-snow">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-8 py-20 text-center text-duo-wolf font-bold">
                            해당하는 사용자가 없습니다.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => {
                          const isExpanded = expandedUser === user.id;
                          const accuracy = user.totalLogs > 0 ? ((user.correctLogs / user.totalLogs) * 100).toFixed(0) : '0';
                          
                          return (
                            <>
                              <tr 
                                key={user.id} 
                                onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                                className={cn("hover:bg-duo-snow/20 transition-colors cursor-pointer", isExpanded && "bg-duo-snow/10")}
                              >
                                <td className="px-8 py-5">
                                  <div className="flex flex-col">
                                    <span className="font-black text-duo-eel text-base">{user.nickname || '익명'}</span>
                                    <span className="text-xs font-bold text-duo-wolf mt-0.5">
                                      {user.school ? `${user.school} ${user.grade ? `${user.grade}학년` : ''}` : '학교 정보 없음'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-8 py-5 text-sm text-duo-wolf font-bold">
                                  {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-8 py-5">
                                  <div className="flex flex-col">
                                    <span className="text-base font-black text-duo-eel">{user.totalLogs}회</span>
                                    {user.totalLogs > 0 && (
                                      <span className="text-xs font-bold text-emerald-600">정답률 {accuracy}%</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-8 py-5 text-base font-black text-duo-eel">
                                  {user.activeDaysCount}일
                                </td>
                                <td className="px-8 py-5 text-sm text-duo-swan font-bold">
                                  {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString() : '학습 이력 없음'}
                                </td>
                                <td className="px-8 py-5">
                                  <span className={cn(
                                    "px-3 py-1 rounded-full text-xs font-black border tracking-wider",
                                    user.status === 'active' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                                    user.status === 'inactive' && "bg-amber-50 text-amber-700 border-amber-200",
                                    user.status === 'churned' && "bg-rose-50 text-rose-700 border-rose-200"
                                  )}>
                                    {user.status === 'active' ? '활동 중' : user.status === 'inactive' ? '미활동' : '이탈'}
                                  </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                  <button className="p-2 text-duo-swan hover:text-duo-macaw">
                                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                  </button>
                                </td>
                              </tr>
                              
                              {isExpanded && (
                                <tr key={`expanded-${user.id}`}>
                                  <td colSpan={7} className="px-8 py-6 bg-duo-snow/10 border-t border-b border-duo-snow/50">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                      <div className="space-y-3">
                                        <h4 className="text-xs font-black text-duo-swan uppercase tracking-widest">학습 상세 상태</h4>
                                        <div className="bg-white border-2 border-duo-snow rounded-2xl p-4 space-y-2">
                                          <div className="flex justify-between text-sm">
                                            <span className="font-bold text-duo-wolf">현재 한자 단계:</span>
                                            <span className="font-black text-duo-eel">{user.current_stage || 8}단계 - {user.current_node || 1}번 노드</span>
                                          </div>
                                          <div className="flex justify-between text-sm">
                                            <span className="font-bold text-duo-wolf">누적 점수(XP):</span>
                                            <span className="font-black text-duo-eel">{user.total_score || 0} XP</span>
                                          </div>
                                          <div className="flex justify-between text-sm">
                                            <span className="font-bold text-duo-wolf">학습 스트릭:</span>
                                            <span className="font-black text-orange-500">🔥 {user.streak_count || 0}일 연속</span>
                                          </div>
                                          <div className="flex justify-between text-sm">
                                            <span className="font-bold text-duo-wolf">보유 쿠폰:</span>
                                            <span className="font-black text-duo-macaw">🎟️ {user.coupons || 0}개</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div>
                                        <h4 className="text-xs font-black text-duo-swan uppercase tracking-widest mb-3">최근 4주 주차별 학습량</h4>
                                        <div className="flex items-end gap-3 h-28 bg-white border-2 border-duo-snow p-4 rounded-2xl w-full justify-center">
                                          {user.weeklyTrends.slice().reverse().map((count: number, wIdx: number) => {
                                            const maxVal = Math.max(...user.weeklyTrends, 1);
                                            const heightPercent = Math.min((count / maxVal) * 75 + 10, 85);
                                            const weekLabels = ["3주 전", "2주 전", "1주 전", "이번 주"];
                                            return (
                                              <div key={wIdx} className="flex flex-col items-center flex-1 group relative h-full justify-end">
                                                <span className="text-[10px] font-black text-duo-macaw mb-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-4">
                                                  {count}회
                                                </span>
                                                <div 
                                                  style={{ height: `${count === 0 ? 6 : heightPercent}%` }}
                                                  className={cn(
                                                    "w-full rounded-t-md transition-all duration-500", 
                                                    count === 0 ? "bg-duo-snow" : "bg-gradient-to-t from-duo-macaw to-blue-400"
                                                  )}
                                                />
                                                <span className="text-[9px] font-black text-duo-wolf mt-2 uppercase tracking-wide">
                                                  {weekLabels[wIdx]}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      <div className="flex flex-col justify-center">
                                        <h4 className="text-xs font-black text-duo-swan uppercase tracking-widest mb-2">활동성 진단</h4>
                                        <div className="bg-white border-2 border-duo-snow rounded-2xl p-4 flex-1 flex flex-col justify-center">
                                          {user.status === 'active' ? (
                                            <div className="space-y-1.5">
                                              <p className="text-sm font-black text-emerald-600 flex items-center gap-1.5">
                                                <Activity className="w-4 h-4" /> 건강한 학습 활동 중!
                                              </p>
                                              <p className="text-xs font-bold text-duo-wolf leading-relaxed">
                                                최근 7일 이내에 활동이 감지되었습니다. 일주일에 평균 {(user.totalLogs / Math.max(user.activeDaysCount, 1)).toFixed(1)}회의 학습을 완료하고 있습니다.
                                              </p>
                                            </div>
                                          ) : user.status === 'inactive' ? (
                                            <div className="space-y-1.5">
                                              <p className="text-sm font-black text-amber-600 flex items-center gap-1.5">
                                                <Clock className="w-4 h-4" /> 학습 휴면(비활성) 상태
                                              </p>
                                              <p className="text-xs font-bold text-duo-wolf leading-relaxed">
                                                마지막 학습 이후 7일 이상 경과했습니다. 서비스 흥미 유지 및 재유입 유도가 권장됩니다.
                                              </p>
                                            </div>
                                          ) : (
                                            <div className="space-y-1.5">
                                              <p className="text-sm font-black text-rose-600 flex items-center gap-1.5">
                                                <AlertCircle className="w-4 h-4" /> 학습 이탈(Churn) 상태
                                              </p>
                                              <p className="text-xs font-bold text-duo-wolf leading-relaxed">
                                                최근 30일 이내에 학습 로그가 존재하지 않거나 활동 이력이 전혀 없습니다. 이탈 회원을 위한 특별 미션 또는 알림을 고려하세요.
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}
      </main>

      {editingWord && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg p-8 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-duo-eel">단어 검수 및 수정</h3>
              <button onClick={() => setEditingWord(null)} className="p-2 hover:bg-duo-snow rounded-xl">
                <X className="w-6 h-6 text-duo-wolf" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-duo-swan uppercase mb-2 tracking-widest">단어명</label>
                <input 
                  type="text" 
                  value={editingWord.word}
                  onChange={(e) => setEditingWord({...editingWord, word: e.target.value})}
                  className="w-full h-14 px-5 bg-duo-snow border-2 border-duo-swan rounded-2xl font-bold focus:border-duo-macaw outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-duo-swan uppercase mb-2 tracking-widest">설명 (어린이용)</label>
                <textarea 
                  rows={3}
                  value={editingWord.analysis_json.description || ""}
                  onChange={(e) => setEditingWord({
                    ...editingWord, 
                    analysis_json: { ...editingWord.analysis_json, description: e.target.value }
                  })}
                  className="w-full p-5 bg-duo-snow border-2 border-duo-swan rounded-2xl font-bold focus:border-duo-macaw outline-none resize-none"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setEditingWord(null)}
                  className="flex-1 h-14 bg-duo-snow text-duo-eel rounded-2xl font-black border-b-4 border-duo-swan active:border-b-0 active:translate-y-1 transition-all"
                >
                  취소
                </button>
                <button 
                  type="submit"
                  disabled={actionLoading === editingWord.word}
                  className="flex-1 h-14 bg-duo-macaw text-white rounded-2xl font-black shadow-[0_6px_0_0_#1899d6] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center"
                >
                  {actionLoading === editingWord.word ? <Loader2 className="w-6 h-6 animate-spin" /> : "수정 완료"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: "blue" | "green" | "purple" | "orange" }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 border-blue-100",
    green: "bg-green-50 border-green-100",
    purple: "bg-purple-50 border-purple-100",
    orange: "bg-orange-50 border-orange-100",
  };

  return (
    <div className={`p-6 rounded-[32px] border-2 bg-white shadow-sm flex items-center gap-4`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-duo-swan uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-duo-eel">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}


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
  screenWords
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
  Check
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

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [unverifiedWords, setUnverifiedWords] = useState<UnverifiedWord[]>([]);
  const [monitoringLogs, setMonitoringLogs] = useState<MonitoringLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [editingWord, setEditingWord] = useState<UnverifiedWord | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'queue' | 'logs'>('dashboard');
  const [batchResults, setBatchResults] = useState<string[]>([]);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  // AI Screening states
  const [screeningResults, setScreeningResults] = useState<Record<string, { status: 'VALID' | 'SUSPICIOUS' | 'INVALID', type: string, reason: string }>>({});
  const [isScreening, setIsScreening] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'invalid'>('all');

  useEffect(() => {
    async function loadData() {
      try {
        const [s, w, l] = await Promise.all([
          getAdminStats(), 
          getUnverifiedWords(),
          getMonitoringLogs()
        ]);
        setStats(s as AdminStats);
        setUnverifiedWords(w as unknown as UnverifiedWord[]);
        if ('logs' in l) {
          setMonitoringLogs(l.logs as MonitoringLog[]);
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

              {/* 쓰기 미완료 단어 (따라쓰기 이탈율) */}
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

        {activeTab === 'queue' ? (
          <div className="bg-white border-3 border-duo-snow rounded-[40px] shadow-sm overflow-hidden">
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

            {/* Screening Filters */}
            {unverifiedWords.length > 0 && Object.keys(screeningResults).length > 0 && (
              <div className="px-8 py-4 bg-duo-snow/20 border-b-2 border-duo-snow flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterMode('all')}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-black transition-all",
                      filterMode === 'all' 
                        ? "bg-duo-eel text-white shadow-sm" 
                        : "bg-white text-duo-wolf border-2 border-duo-snow hover:bg-duo-snow/50"
                    )}
                  >
                    전체 ({unverifiedWords.length}개)
                  </button>
                  <button
                    onClick={() => setFilterMode('valid')}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-black transition-all",
                      filterMode === 'valid' 
                        ? "bg-emerald-600 text-white shadow-sm" 
                        : "bg-white text-duo-wolf border-2 border-duo-snow hover:bg-duo-snow/50"
                    )}
                  >
                    일반 명사 ({unverifiedWords.filter(w => screeningResults[w.word]?.status === 'VALID').length}개)
                  </button>
                  <button
                    onClick={() => setFilterMode('invalid')}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-black transition-all",
                      filterMode === 'invalid' 
                        ? "bg-rose-600 text-white shadow-sm" 
                        : "bg-white text-duo-wolf border-2 border-duo-snow hover:bg-duo-snow/50"
                    )}
                  >
                    어색한 조어/의심 ({unverifiedWords.filter(w => screeningResults[w.word]?.status === 'SUSPICIOUS' || screeningResults[w.word]?.status === 'INVALID').length}개)
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={selectValidWords}
                    className="text-xs font-black text-emerald-700 bg-emerald-50 border-2 border-emerald-200/50 px-3.5 py-1.5 rounded-xl hover:bg-emerald-100/50 transition-colors"
                  >
                    일반 명사 모두 선택
                  </button>
                  <button
                    onClick={selectSuspiciousWords}
                    className="text-xs font-black text-rose-700 bg-rose-50 border-2 border-rose-200/50 px-3.5 py-1.5 rounded-xl hover:bg-rose-100/50 transition-colors"
                  >
                    의심/조어 모두 선택
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-duo-snow/50 text-[10px] font-black text-duo-swan uppercase tracking-widest">
                    <th className="px-6 py-4 w-12">
                      <input 
                        type="checkbox" 
                        checked={selectedWords.size === getFilteredWords().length && getFilteredWords().length > 0}
                        onChange={toggleSelectAll}
                        className="w-5 h-5 rounded border-2 border-duo-snow text-duo-macaw focus:ring-duo-macaw"
                      />
                    </th>
                    <th className="px-6 py-4">단어</th>
                    <th className="px-6 py-4">한자 구성</th>
                    <th className="px-6 py-4">AI 판별 결과</th>
                    <th className="px-6 py-4">발견일</th>
                    <th className="px-6 py-4 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-duo-snow">
                  {getFilteredWords().length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center text-duo-wolf font-bold">
                        조건에 맞는 신규 단어가 없습니다. 🎉
                      </td>
                    </tr>
                  ) : (
                    getFilteredWords().map((w, idx) => (
                      <tr key={idx} className={cn("hover:bg-duo-snow/20 transition-colors group", selectedWords.has(w.word) && "bg-duo-macaw/5")}>
                        <td className="px-6 py-6">
                          <input 
                            type="checkbox" 
                            checked={selectedWords.has(w.word)}
                            onChange={() => toggleSelect(w.word)}
                            className="w-5 h-5 rounded border-2 border-duo-snow text-duo-macaw focus:ring-duo-macaw"
                          />
                        </td>
                        <td className="px-6 py-6">
                          <span className="text-lg font-black text-duo-eel">{w.word}</span>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex flex-wrap gap-1">
                            {w.analysis_json?.hanjaList?.map((h, i) => (
                              <span key={i} className="bg-white border border-duo-snow px-2 py-0.5 rounded-lg text-xs font-bold text-duo-wolf">
                                {h.char}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          {screeningResults[w.word] ? (
                            <div className="flex flex-col gap-1 max-w-sm">
                              <div className="flex items-center gap-1.5">
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
        ) : (
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

function X(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

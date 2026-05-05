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
  updateWord
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
  const [activeTab, setActiveTab] = useState<'queue' | 'logs'>('queue');

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

  const toggleSelectAll = () => {
    if (selectedWords.size === unverifiedWords.length) {
      setSelectedWords(new Set());
    } else {
      setSelectedWords(new Set(unverifiedWords.map(w => w.word)));
    }
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

        {activeTab === 'queue' ? (
          <div className="bg-white border-3 border-duo-snow rounded-[40px] shadow-sm overflow-hidden">
            <div className="p-8 border-b-2 border-duo-snow flex items-center justify-between bg-white">
              <div>
                <h2 className="text-2xl font-black text-duo-eel">AI 신규 발견 단어</h2>
                <p className="text-sm font-bold text-duo-wolf mt-1">
                  {selectedWords.size > 0 ? `${selectedWords.size}개 선택됨` : `검수 대기 중인 ${unverifiedWords.length}개의 단어입니다.`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedWords.size > 0 ? (
                  <div className="flex items-center gap-2 animate-in slide-in-from-right">
                    <button 
                      onClick={handleBulkVerify}
                      className="flex items-center gap-2 px-4 py-2 bg-duo-green text-white rounded-xl font-black text-xs shadow-[0_4px_0_0_#46a302]"
                    >
                      <Check className="w-4 h-4" /> 선택 승인
                    </button>
                    <button 
                      onClick={handleBulkDelete}
                      className="flex items-center gap-2 px-4 py-2 bg-duo-cardinal text-white rounded-xl font-black text-xs shadow-[0_4px_0_0_#c02e3b]"
                    >
                      <Trash2 className="w-4 h-4" /> 선택 삭제
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-black text-duo-macaw uppercase tracking-tighter bg-duo-macaw/10 px-3 py-1.5 rounded-lg">
                    Validation Queue
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-duo-snow/50 text-[10px] font-black text-duo-swan uppercase tracking-widest">
                    <th className="px-6 py-4 w-12">
                      <input 
                        type="checkbox" 
                        checked={selectedWords.size === unverifiedWords.length && unverifiedWords.length > 0}
                        onChange={toggleSelectAll}
                        className="w-5 h-5 rounded border-2 border-duo-snow text-duo-macaw focus:ring-duo-macaw"
                      />
                    </th>
                    <th className="px-6 py-4">단어</th>
                    <th className="px-6 py-4">한자 구성</th>
                    <th className="px-6 py-4">발견일</th>
                    <th className="px-6 py-4 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-duo-snow">
                  {unverifiedWords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-duo-wolf font-bold">
                        검토할 신규 단어가 없습니다. 🎉
                      </td>
                    </tr>
                  ) : (
                    unverifiedWords.map((w, idx) => (
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

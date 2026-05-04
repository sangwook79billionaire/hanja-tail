"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, UserPlus, LogIn, Sparkles, School, GraduationCap, MapPin, User, CheckCircle2 } from "lucide-react";
import { updateProfile } from "@/app/actions";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const IS_BETA_MODE = true; // 베타 기간 동안은 이메일 가입만 활성화

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("1");
  const [city, setCity] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [agreedParent, setAgreedParent] = useState(false);
  const [agreedMarketing, setAgreedMarketing] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp && (!agreedTerms || !agreedPrivacy || !agreedParent)) {
      alert("필수 약관 및 보호자 동의가 필요합니다.");
      return;
    }
    
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${location.origin}/auth/callback`,
            data: {
              nickname,
              school,
              grade: parseInt(grade),
              city,
            }
          },
        });
        
        if (signUpError) throw signUpError;
        
        // 가입 성공 시 프로필 정보 업데이트 (DB)
        if (signUpData.user) {
          await updateProfile({
            nickname,
            school,
            grade: parseInt(grade),
            city,
            marketing_agree: agreedMarketing
          });
        }
        
        alert("가입 확인 이메일을 보냈어요! 메일함을 확인해 주세요. (미성년자의 경우 보호자 승인이 필요할 수 있습니다)");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onClose();
      }
    } catch (error: unknown) {
      const err = error as Error;
      alert(err.message || "오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto py-10 bg-duo-eel/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[40px] p-8 shadow-2xl border-4 border-duo-snow my-auto"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-duo-snow rounded-full transition-colors z-10"
            >
              <X className="w-6 h-6 text-duo-wolf" />
            </button>

            <div className="text-center mb-8">
              <div className="inline-flex p-4 bg-duo-snow rounded-2xl mb-4">
                <Sparkles className="w-8 h-8 text-duo-green" />
              </div>
              <h2 className="text-3xl font-black text-duo-eel tracking-tight">
                {isSignUp ? "한자 탐험대 가입하기" : "다시 만나서 반가워요!"}
              </h2>
              <p className="text-duo-wolf font-bold mt-2">
                {isSignUp ? "학교 친구들과 랭킹 대결을 해보세요!" : "오늘도 한자 비밀을 풀어볼까요?"}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative col-span-1 sm:col-span-2">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-duo-wolf" />
                  <input
                    type="email"
                    placeholder="이메일 주소"
                    className="w-full pl-12 pr-4 py-4 bg-duo-snow border-2 border-duo-swan rounded-2xl font-bold focus:border-duo-green outline-none transition-colors"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="relative col-span-1 sm:col-span-2">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-duo-wolf" />
                  <input
                    type="password"
                    placeholder="비밀번호"
                    className="w-full pl-12 pr-4 py-4 bg-duo-snow border-2 border-duo-swan rounded-2xl font-bold focus:border-duo-green outline-none transition-colors"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {isSignUp && !IS_BETA_MODE && (
                  <>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-duo-wolf" />
                      <input
                        type="text"
                        placeholder="탐험가 이름 (닉네임)"
                        className="w-full pl-12 pr-4 py-4 bg-duo-snow border-2 border-duo-swan rounded-2xl font-bold focus:border-duo-green outline-none transition-colors"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        required
                      />
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-duo-wolf" />
                      <input
                        type="text"
                        placeholder="거주 지역 (예: 서울시)"
                        className="w-full pl-12 pr-4 py-4 bg-duo-snow border-2 border-duo-swan rounded-2xl font-bold focus:border-duo-green outline-none transition-colors"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                      />
                    </div>
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
                  </>
                )}
              </div>

              {isSignUp && (
                <div className="bg-duo-snow p-4 rounded-3xl space-y-3 mt-4 border-2 border-duo-swan">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" className="mt-1" checked={agreedTerms && agreedPrivacy && agreedParent} onChange={e => {
                      setAgreedTerms(e.target.checked);
                      setAgreedPrivacy(e.target.checked);
                      setAgreedParent(e.target.checked);
                    }} />
                    <span className="text-xs font-bold text-duo-wolf group-hover:text-duo-eel transition-colors">
                      [필수] 이용약관 및 개인정보 수집 이용 동의
                    </span>
                  </label>
                  {!IS_BETA_MODE && (
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="mt-1" checked={agreedMarketing} onChange={e => setAgreedMarketing(e.target.checked)} />
                      <span className="text-xs font-bold text-duo-wolf group-hover:text-duo-eel transition-colors">
                        [선택] 마케팅 정보 수신 및 맞춤형 광고 제공 동의
                      </span>
                    </label>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-5 bg-duo-green text-white font-black text-xl rounded-2xl border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2 mt-6 shadow-sm"
              >
                {isLoading ? (
                  "처리 중..."
                ) : isSignUp ? (
                  <><UserPlus className="w-6 h-6" /> 탐험 시작하기</>
                ) : (
                  <><LogIn className="w-6 h-6" /> 로그인</>
                )}
              </button>

              <button
                type="button"
                onClick={async () => {
                  setIsLoading(true);
                  await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: `${location.origin}/auth/callback`,
                    },
                  });
                }}
                className="w-full py-4 bg-white border-2 border-duo-swan text-duo-eel font-black text-lg rounded-2xl flex items-center justify-center gap-3 hover:bg-duo-snow transition-all shadow-sm"
              >
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                구글로 계속하기
              </button>
            </form>

            <div className="mt-8 pt-6 border-t-2 border-duo-snow text-center">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-duo-wolf font-bold hover:text-duo-green transition-colors"
              >
                {isSignUp ? "이미 계정이 있나요? 로그인하기" : "아직 계정이 없나요? 가입하기"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, UserPlus, LogIn, Sparkles } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        alert("가입 확인 이메일을 보냈어요! 메일함을 확인해 주세요.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onClose();
      }
    } catch (error: any) {
      alert(error.message || "오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-duo-eel/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border-4 border-duo-swan"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-duo-snow rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-duo-wolf" />
            </button>

            <div className="text-center mb-8">
              <div className="inline-flex p-4 bg-duo-snow rounded-2xl mb-4">
                <Sparkles className="w-8 h-8 text-duo-green" />
              </div>
              <h2 className="text-2xl font-black text-duo-eel">
                {isSignUp ? "한자 탐험대 가입하기" : "다시 만나서 반가워요!"}
              </h2>
              <p className="text-duo-wolf font-bold mt-2">
                {isSignUp ? "나만의 한자 지도를 만들어보세요" : "오늘도 한자 비밀을 풀어볼까요?"}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="relative">
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
              <div className="relative">
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-duo-green text-white font-black text-xl rounded-2xl border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  "처리 중..."
                ) : isSignUp ? (
                  <><UserPlus className="w-6 h-6" /> 가입하기</>
                ) : (
                  <><LogIn className="w-6 h-6" /> 로그인</>
                )}
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

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, UserPlus, Copy, CheckCircle2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InviteModal({ isOpen, onClose }: InviteModalProps) {
  const [target, setTarget] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}?ref=explorer`;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) return;

    // TODO: 실제 SMS/이메일 발송 API 연동 (Twilio, Aligo 등)
    console.log(`Inviting ${target}...`);
    
    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      setTarget("");
      onClose();
    }, 2000);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`안녕! 나랑 같이 한자 타일에서 한자 탐험하지 않을래? 🚀\n초대 링크: ${inviteLink}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[40px] p-8 shadow-2xl border-4 border-duo-snow"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-duo-snow rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-duo-wolf" />
            </button>

            <div className="text-center mb-8">
              <div className="inline-flex p-4 bg-amber-100 rounded-3xl mb-4">
                <UserPlus className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-2xl font-black text-duo-eel tracking-tight">친구 초대하기</h2>
              <p className="text-duo-wolf font-bold mt-2 leading-relaxed">
                친구와 함께 공부하면<br/>탐험이 더 즐거워져요! 🦉
              </p>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex gap-2">
                  <MessageSquare className="w-5 h-5 text-duo-wolf" />
                </div>
                <input
                  type="text"
                  placeholder="이메일 또는 전화번호 (010-0000-0000)"
                  className="w-full pl-12 pr-4 py-4 bg-duo-snow border-2 border-duo-swan rounded-2xl font-bold focus:border-duo-macaw outline-none transition-colors"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  disabled={isSent}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSent || !target.trim()}
                className={cn(
                  "w-full py-4 rounded-2xl font-black text-xl border-b-4 transition-all flex items-center justify-center gap-2",
                  isSent 
                    ? "bg-duo-green text-white border-green-700" 
                    : "bg-duo-macaw text-white border-duo-macaw shadow-[0_4px_0_0_#1899d6] active:border-b-0 active:translate-y-1"
                )}
              >
                {isSent ? (
                  <><CheckCircle2 className="w-6 h-6" /> 초대장 발송 완료!</>
                ) : (
                  <><Send className="w-6 h-6" /> 초대장 보내기</>
                )}
              </button>
            </form>

            <div className="relative py-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-duo-snow"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-duo-wolf font-bold uppercase tracking-widest">직접 링크 공유</span>
              </div>
            </div>

            <button
              onClick={copyToClipboard}
              className="w-full py-4 bg-white border-2 border-duo-swan text-duo-eel font-black text-lg rounded-2xl flex items-center justify-center gap-3 hover:bg-duo-snow transition-all shadow-sm"
            >
              {isCopied ? (
                <><CheckCircle2 className="w-5 h-5 text-duo-green" /> 복사 완료!</>
              ) : (
                <><Copy className="w-5 h-5 text-duo-wolf" /> 초대 링크 복사하기</>
              )}
            </button>

            <p className="mt-6 text-[11px] font-bold text-duo-swan text-center leading-relaxed">
              친구가 이 링크로 가입하면<br/>두 사람 모두에게 특별한 배지를 드려요! 🎖️
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, UserPlus, Copy, CheckCircle2 } from "lucide-react";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InviteModal({ isOpen, onClose }: InviteModalProps) {
  const [isCopied, setIsCopied] = useState(false);

  const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}?ref=explorer`;

  const handleShare = async () => {
    const shareData = {
      title: '꼬리에 꼬리를 무는 한자 탐험',
      text: '안녕! 나랑 같이 한자 탐험하지 않을래? 용치와 함께 한자 마스터가 되어보자! 🐉✨',
      url: inviteLink,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        copyToClipboard();
      }
    } catch (err) {
      console.log('Share failed:', err);
    }
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

            <div className="text-center mb-10">
              <div className="inline-flex p-5 bg-amber-100 rounded-[32px] mb-6 shadow-[0_6px_0_0_#ffeb3b44]">
                <UserPlus className="w-10 h-10 text-amber-600" />
              </div>
              <h2 className="text-3xl font-black text-duo-eel tracking-tight">친구 초대하기</h2>
              <p className="text-duo-wolf font-bold mt-3 leading-relaxed text-lg">
                친구와 함께 공부하면<br/>용치의 여의주가 더 빛나요! 🐉✨
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleShare}
                className="w-full py-6 bg-duo-macaw text-white rounded-3xl font-black text-xl border-b-6 border-sky-600 shadow-lg hover:brightness-110 active:border-b-0 active:translate-y-1.5 transition-all flex items-center justify-center gap-3 group"
              >
                <Send className="w-7 h-7 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                카톡·문자로 공유하기
              </button>

              <button
                onClick={copyToClipboard}
                className="w-full py-4 bg-white border-3 border-duo-snow text-duo-eel font-black text-lg rounded-2xl flex items-center justify-center gap-3 hover:bg-duo-snow transition-all shadow-sm"
              >
                {isCopied ? (
                  <><CheckCircle2 className="w-5 h-5 text-duo-green" /> 초대 링크 복사 완료!</>
                ) : (
                  <><Copy className="w-5 h-5 text-duo-wolf" /> 링크만 복사할게요</>
                )}
              </button>
            </div>

            <p className="mt-8 text-[11px] font-bold text-duo-swan text-center leading-relaxed">
              친구가 이 링크로 가입하면<br/>두 사람 모두에게 특별한 배지를 드려요! 🎖️
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

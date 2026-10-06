"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  MOCK_HANJA_CARD,
  MOCK_QUIZ_LIST,
  MOCK_USER_STATS,
  MOCK_FAMILY_ROOM,
} from "@/mock/designMockData";
import {
  Sparkles,
  BookOpen,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Heart,
  Palette,
  Layers,
  Code2,
  Users,
} from "lucide-react";

export default function DesignSystemPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState(false);

  const sampleQuiz = MOCK_QUIZ_LIST[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-8 md:p-12">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <header className="bg-gradient-to-r from-duo-macaw via-sky-500 to-indigo-500 rounded-3xl p-6 sm:p-10 text-white shadow-xl shadow-sky-200">
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Palette className="w-6 h-6" />
            </span>
            <span className="text-xs sm:text-sm font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">
              Designer Workspace
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            한자 꼬리 디자인 시스템 & UI 플레이그라운드 🎨
          </h1>
          <p className="mt-2 text-sky-100 text-sm sm:text-base font-semibold max-w-2xl">
            디자이너가 Figma MCP와 Claude를 활용해 UI 컴포넌트를 독립적으로 테스트하고 제작할 수 있는 전용 프리뷰 공간입니다.
          </p>
        </header>

        {/* 1. Color Palette Tokens */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-duo-macaw" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-800">
              1. 컬러 토큰 (Color Tokens)
            </h2>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-500">
            `tailwind.config.ts`에 등록된 공식 컬러 팔레트입니다. 피그마에서 컴포넌트 추출 시 매핑됩니다.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { name: "duo-green", hex: "#58cc02", label: "성공 / 정답 / 완료", bg: "bg-duo-green" },
              { name: "duo-macaw", hex: "#1cb0f6", label: "주요 브랜드 / 버튼", bg: "bg-duo-macaw" },
              { name: "duo-bee", hex: "#ffc800", label: "경고 / 랭킹 / 골드", bg: "bg-duo-bee text-slate-900" },
              { name: "duo-cardinal", hex: "#ff4b4b", label: "오답 / 취소 / 알림", bg: "bg-duo-cardinal" },
              { name: "duo-snow", hex: "#f7f7f7", label: "배경 / 서브 카드", bg: "bg-duo-snow text-slate-800 border-2 border-duo-swan" },
              { name: "duo-swan", hex: "#e5e5e5", label: "테두리 / 구분선", bg: "bg-duo-swan text-slate-800" },
              { name: "duo-eel", hex: "#4b4b4b", label: "본문 텍스트", bg: "bg-duo-eel" },
            ].map((c) => (
              <div
                key={c.name}
                className={`p-4 rounded-2xl shadow-sm text-white flex flex-col justify-between h-28 ${c.bg}`}
              >
                <div className="font-mono text-xs font-black">{c.hex}</div>
                <div>
                  <div className="font-extrabold text-sm">{c.name}</div>
                  <div className="text-[10px] opacity-80 leading-tight mt-0.5">{c.label}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Buttons Showcase */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-duo-bee" />
              <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                2. 버튼 (Buttons)
              </h2>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setButtonLoading(!buttonLoading)}
            >
              {buttonLoading ? "로딩 해제" : "로딩 토글"}
            </Button>
          </div>
          <Card padding="md" className="space-y-6">
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                Variants (종류)
              </h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" isLoading={buttonLoading}>Primary (Green)</Button>
                <Button variant="sky" isLoading={buttonLoading}>Sky (Macaw)</Button>
                <Button variant="yellow" isLoading={buttonLoading}>Yellow (Bee)</Button>
                <Button variant="coral" isLoading={buttonLoading}>Coral (Cardinal)</Button>
                <Button variant="secondary" isLoading={buttonLoading}>Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                Sizes (크기)
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" variant="sky">Small</Button>
                <Button size="md" variant="sky">Medium (기본)</Button>
                <Button size="lg" variant="sky">Large</Button>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                With Icons (아이콘 결합)
              </h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" leftIcon={<Sparkles className="w-5 h-5" />}>
                  시작하기
                </Button>
                <Button variant="sky" rightIcon={<BookOpen className="w-5 h-5" />}>
                  단어장 보기
                </Button>
                <Button variant="coral" leftIcon={<Heart className="w-5 h-5 fill-current" />}>
                  좋아요
                </Button>
              </div>
            </div>
          </Card>
        </section>

        {/* 3. Badges & Inputs */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Badges */}
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-800">
              3. 뱃지 (Badges)
            </h2>
            <Card padding="md" className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="grade">8급 한자</Badge>
                <Badge variant="grade">7급 한자</Badge>
                <Badge variant="green">초급 난이도</Badge>
                <Badge variant="sky">중급 난이도</Badge>
                <Badge variant="yellow">고급 난이도</Badge>
                <Badge variant="coral">오답 복습</Badge>
                <Badge variant="neutral">표준어</Badge>
              </div>
            </Card>
          </div>

          {/* Inputs */}
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-800">
              4. 입력 필드 (Inputs)
            </h2>
            <Card padding="md" className="space-y-3">
              <Input
                placeholder="단어나 한자를 검색해보세요..."
                leftIcon={<Search className="w-5 h-5" />}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                error={inputError ? "올바른 한자 단어를 입력해주세요." : undefined}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setInputError(!inputError)}
                >
                  에러 상태 토글 ({inputError ? "ON" : "OFF"})
                </Button>
              </div>
            </Card>
          </div>
        </section>

        {/* 4. Interactive Quiz Card Mock UI */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-duo-macaw" />
              <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                5. 퀴즈 카드 인터랙션 목업 (Quiz Card Preview)
              </h2>
            </div>
            <Badge variant="green">Mock Interactive</Badge>
          </div>
          <Card padding="lg" className="border-4 border-duo-swan max-w-2xl mx-auto space-y-6">
            {/* Question Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2">
                <Badge variant="grade">{sampleQuiz.hanja_list[0]?.level || "8급"}</Badge>
                <span className="text-xs font-bold text-slate-400">오늘의 한자 퀴즈</span>
              </div>
              <div className="text-4xl sm:text-5xl font-black text-duo-eel font-serif py-2">
                {sampleQuiz.targetHanja}
              </div>
              <p className="text-base sm:text-lg font-bold text-slate-700 bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                💡 {sampleQuiz.description}
              </p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-3">
              {sampleQuiz.options.map((opt) => {
                const isSelected = selectedAnswer === opt;
                const isCorrect = opt === sampleQuiz.correctAnswer;
                return (
                  <button
                    key={opt}
                    onClick={() => setSelectedAnswer(opt)}
                    className={`p-4 rounded-2xl font-black text-lg border-2 transition-all text-center flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? isCorrect
                          ? "bg-emerald-50 border-duo-green text-duo-green shadow-[0_4px_0_0_#46a302]"
                          : "bg-rose-50 border-duo-cardinal text-duo-cardinal shadow-[0_4px_0_0_#d93838]"
                        : "bg-white border-duo-swan hover:border-duo-macaw hover:bg-sky-50/50 shadow-[0_4px_0_0_#e5e5e5]"
                    }`}
                  >
                    <span>{opt}</span>
                    {isSelected && (
                      <span>
                        {isCorrect ? (
                          <CheckCircle2 className="w-6 h-6 text-duo-green" />
                        ) : (
                          <XCircle className="w-6 h-6 text-duo-cardinal" />
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Answer Result Feedback */}
            {selectedAnswer && (
              <div
                className={`p-4 rounded-2xl font-bold flex items-center justify-between text-sm sm:text-base ${
                  selectedAnswer === sampleQuiz.correctAnswer
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                <span>
                  {selectedAnswer === sampleQuiz.correctAnswer
                    ? `🎉 딩동댕! 정답입니다! (${sampleQuiz.word} = ${sampleQuiz.hanja_combination})`
                    : "😢 아쉬워요! 다시 한번 생각해 볼까요?"}
                </span>
                <Button
                  size="sm"
                  variant={selectedAnswer === sampleQuiz.correctAnswer ? "primary" : "coral"}
                  onClick={() => setSelectedAnswer(null)}
                >
                  다시 풀기
                </Button>
              </div>
            )}
          </Card>
        </section>

        {/* 5. Hanja Card & Family Room Previews */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Hanja Card */}
          <div className="space-y-3">
            <h2 className="text-xl font-black text-slate-800">
              6. 한자 상세 카드 (Hanja Card Preview)
            </h2>
            <Card padding="md" variant="interactive" className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="grade">{MOCK_HANJA_CARD.level}</Badge>
                  <h3 className="text-3xl font-black text-slate-900 mt-1">
                    {MOCK_HANJA_CARD.meaning} <span className="text-duo-macaw">{MOCK_HANJA_CARD.sound}</span>
                  </h3>
                </div>
                <div className="text-5xl font-black text-slate-800 font-serif bg-slate-100 p-3 rounded-2xl">
                  {MOCK_HANJA_CARD.char}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-500 bg-slate-50 p-3 rounded-xl">
                <div>획수: {MOCK_HANJA_CARD.strokes}획</div>
                <div>부수: {MOCK_HANJA_CARD.radical}</div>
              </div>
            </Card>
          </div>

          {/* Family Room Card */}
          <div className="space-y-3">
            <h2 className="text-xl font-black text-slate-800">
              7. 가족 생각 놀이터 (Family Room Preview)
            </h2>
            <Card padding="md" className="space-y-3 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-amber-700 bg-amber-200/60 px-2.5 py-1 rounded-xl">
                  방 코드: {MOCK_FAMILY_ROOM.code}
                </span>
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-black text-slate-800">
                {MOCK_FAMILY_ROOM.roomName}
              </h3>
              <div className="p-3 bg-white/80 rounded-2xl border border-amber-100 text-sm font-bold text-amber-900">
                🎯 {MOCK_FAMILY_ROOM.todayMission}
              </div>
            </Card>
          </div>
        </section>

        {/* 6. Modal Preview */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black text-slate-800">
              8. 팝업 모달 (Modal Dialog Preview)
            </h2>
            <Button variant="sky" onClick={() => setIsModalOpen(true)}>
              모달 열기 테스트 🚀
            </Button>
          </div>
        </section>

        {/* Modal Dialog Instance */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="새로운 한자 획득! 🌟"
          description="오늘의 학습 목표를 멋지게 달성했습니다."
        >
          <div className="text-center py-4 space-y-4">
            <div className="text-6xl animate-bounce">🏆</div>
            <p className="text-base font-bold text-slate-700">
              축하합니다! <b>학(學)</b> 한자 카드를 단어장에 보관했어요.
            </p>
            <div className="flex gap-2 pt-4">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setIsModalOpen(false)}
              >
                닫기
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => setIsModalOpen(false)}
              >
                다음 퀴즈로
              </Button>
            </div>
          </div>
        </Modal>

        {/* Designer Figma MCP Guide Card */}
        <Card padding="lg" className="bg-slate-900 text-white border-none space-y-4">
          <div className="flex items-center gap-3">
            <Code2 className="w-6 h-6 text-duo-macaw" />
            <h3 className="text-lg sm:text-xl font-black">
              디자이너 동업자를 위한 Figma MCP 프롬프트 가이드
            </h3>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            Claude에 피그마 노드를 선택한 후 다음과 같이 요청하면 이 디자인 시스템 규칙에 맞춘 코드가 즉시 생성됩니다:
          </p>
          <div className="bg-slate-800/80 p-4 rounded-2xl font-mono text-xs text-sky-300 border border-slate-700">
            &quot;선택한 피그마 요소를 Next.js 14 + Tailwind CSS 기반의 React 컴포넌트로 만들어줘.
            색상은 tailwind.config.ts에 있는 duo-* 토큰을 사용하고, 데이터는 Props로 전달받는
            Presentational 컴포넌트로 `src/components/ui/`에 작성해줘.&quot;
          </div>
        </Card>
      </div>
    </div>
  );
}

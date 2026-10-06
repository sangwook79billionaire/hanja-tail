# 🐉 한자 꼬리 (Hanja Tail)

어린이와 부모가 함께 즐기는 신나는 한자 학습 & 어휘력 생각 놀이터 서비스입니다.

---

## 🚀 빠른 시작 (Getting Started)

```bash
# 1. 패키지 설치
npm install

# 2. 로컬 개발 서버 실행
npm run dev
```

* **메인 서비스**: [http://localhost:3000](http://localhost:3000)
* **🎨 디자이너 UI 플레이그라운드**: [http://localhost:3000/design-system](http://localhost:3000/design-system)

---

## 🎨 디자이너 협업 가이드 (Figma MCP & Claude)

디자이너 동업자가 Figma MCP와 Claude를 사용하여 UI 작업을 독립적으로 진행할 수 있도록 설계되어 있습니다.
자세한 분업 규칙 및 프롬프트 템플릿은 **[DESIGNER_GUIDE.md](./DESIGNER_GUIDE.md)** 문서를 참고해주세요.

### 디자이너 작업 요약
* **UI 컴포넌트 위치**: `src/components/ui/`
* **UI 테스트 페이지**: `src/app/design-system/page.tsx`
* **가짜 데이터(Mock)**: `src/mock/designMockData.ts`
* **디자인 토큰(Tailwind)**: `tailwind.config.ts`

---

## 🛠 기술 스택 (Tech Stack)

* **Framework**: Next.js 14 (App Router), React 18, TypeScript
* **Styling & Motion**: Tailwind CSS, Framer Motion, Lucide Icons
* **AI Engine**: Google Gemini API (`gemini-2.5-flash`)
* **Database & Auth**: Supabase (PostgreSQL, Row Level Security)
* **Hanja Stroke Animation**: Hanzi Writer

# 🎨 한자 꼬리 (Hanja Tail) - 디자이너 협업 가이드

반갑습니다! 이 문서는 **디자이너가 백엔드/데이터베이스를 몰라도 Figma MCP와 Claude를 활용해 UI 컴포넌트를 쉽고 안전하게 제작하고 협업할 수 있도록 구성된 가이드**입니다.

---

## 🚀 1. 로컬 환경 1분 시작하기

### A. 처음 세팅할 때 (터미널에서 1회 실행)
```bash
# 1. 저장소 다운로드
git clone https://github.com/sangwook79billionaire/hanja-tail.git
cd hanja-tail

# 2. 필요한 라이브러리 설치
npm install

# 3. 환경 변수 파일 생성
# 개발자에게 공유받은 .env.local 파일을 프로젝트 루트에 넣어주세요.
# (또는 .env.example을 복사하여 .env.local로 변경)
```

### B. 개발 서버 켜기
```bash
npm run dev
```
브라우저에서 **`http://localhost:3000/design-system`**으로 접속하면, DB 연결 없이도 모든 UI 컴포넌트와 인터랙션을 바로 확인하고 테스트할 수 있는 **디자인 시스템 플레이그라운드**가 열립니다!

---

## 📂 2. 디자이너 작업 영역 (폴더 가이드)

코드 충돌을 방지하기 위해 디자이너가 작업하는 폴더와 백엔드 영역이 엄격히 분리되어 있습니다.

### 🟢 마음껏 수정/생성 가능한 폴더 (Safe Zones)
* **`src/components/ui/`**: 버튼, 카드, 뱃지, 입력창, 모달 등 순수 UI 컴포넌트
* **`src/app/design-system/page.tsx`**: 디자이너 전용 UI 미리보기 페이지 (새로 만든 컴포넌트를 여기에 추가해서 테스트)
* **`src/mock/designMockData.ts`**: UI 테스트용 가짜 데이터 (퀴즈 샘플, 한자 카드 샘플 등)
* **`tailwind.config.ts`**: 피그마에서 정의한 색상, 그림자, 폰트, 애니메이션 토큰

### 🔴 절대 수정하지 말아야 할 파일 (No-Touch Zones)
* `src/app/actions.ts` (Gemini AI 호출 및 DB 서버 액션)
* `src/lib/` (Supabase 데이터베이스 연동 유틸)
* `supabase_schema.sql` 및 `scripts/` (데이터베이스 및 마이그레이션 스크립트)

---

## 🤖 3. Claude + Figma MCP 추천 프롬프트 템플릿

피그마에서 디자인한 프레임이나 컴포넌트를 선택한 후, Claude에게 아래처럼 요청하세요!

### 💡 템플릿 A: 새 UI 컴포넌트 생성할 때
```text
피그마에서 선택한 노드의 디자인을 분석해서 Next.js 14 + Tailwind CSS 기반의 React 컴포넌트로 만들어줘.

[규칙]
1. 위치: `src/components/ui/[컴포넌트이름].tsx`
2. 스타일: tailwind.config.ts에 정의된 nori-* 토큰(색·rounded-nori-*·shadow-nori-*)을 쓰고, src/components/ui/ 의 기존 컴포넌트(Button, ListItem, AnswerTile, Hero 등)를 먼저 재사용해줘.
3. 로직 분리: 백엔드 API나 DB를 직접 호출하지 말고, 필요한 모든 데이터와 이벤트 핸들러(onClick 등)는 TypeScript Props로 전달받는 Presentational 컴포넌트로 작성해줘.
4. 애니메이션: framer-motion 또는 tailwind animate를 적절히 활용해 생동감 있게 만들어줘.
```

### 💡 템플릿 B: `/design-system` 프리뷰에 추가할 때
```text
방금 만든 `[컴포넌트이름]` 컴포넌트를 `src/app/design-system/page.tsx`에 추가해서
디자이너 플레이그라운드에서 실시간으로 클릭하고 테스트해볼 수 있게 해줘.
가짜 데이터는 `src/mock/designMockData.ts`를 사용해줘.
```

---

## 🌿 4. Git 협업 규칙 (충돌 없이 안전하게 전송하기)

작업할 때는 항상 `main` 브랜치가 아닌 **디자인 전용 브랜치**를 만들어서 작업합니다.

```bash
# 1. 작업 시작 전 최신 코드 받기
git checkout main
git pull origin main

# 2. 새 디자인 브랜치 생성 (예: design/quiz-card)
git checkout -b design/새기능이름

# 3. 컴포넌트 제작 및 수정 후 커밋 & 푸시
git add .
git commit -m "design: 피그마 기반 퀴즈 카드 UI 개선"
git push origin design/새기능이름
```

* 푸시한 후 **GitHub 저장소**로 들어가 **[Compare & pull request]** 버튼을 누르면, 개발자가 확인 후 실제 데이터와 연결하여 안전하게 배포합니다.

---

## 🎨 5. Nori 디자인 시스템 토큰 (Tailwind)

Figma **노리 디자인 시스템** 변수 이름 그대로 `src/app/globals.css`의 CSS 변수로 들어가 있고, Tailwind에서는 `nori-*`로 씁니다.

| 클래스명 | 색상 코드 | 용도 |
| :--- | :--- | :--- |
| `bg-nori-brand` / `shadow-nori-brand` | `#f49000` / `#ff5c02` | 메인 오렌지(CTA, 진행 바, 레슨 노드) |
| `text-nori-strong` / `text-nori-primary` | `#3c3c3c` / `#4b4b4b` | 제목 / 본문 |
| `text-nori-secondary` / `text-nori-tertiary` | `#666` / `#959595` | 보조 설명 / 캡션 |
| `border-nori-border` / `shadow-nori-card` | `#ebebeb` | 카드 테두리와 아래 2px 그림자 |
| `bg-nori-selected-bg` / `text-nori-selected` | `#d2effd` / `#1cb0f6` | 선택된 항목, 하단 탭 선택 |
| `bg-nori-success` / `bg-nori-success-subtle` | `#58cc02` / `#d7ffb8` | 정답, 담음, 익힌 단어 |
| `bg-nori-danger` / `bg-nori-danger-subtle` | `#ff4b4b` / `#ffdfe0` | 오답, 하트 |

* 글꼴: 한글은 Pretendard, 라벨·숫자는 `font-nunito`
* 모서리: `rounded-nori-md`(12) · `rounded-nori-lg`(16) · `rounded-nori-xl`(20) · `rounded-nori-sheet`(32), 버튼은 `rounded-full`
* 이미지: 아이콘·캐릭터·물결 배경은 `public/nori/` (Figma에서 내보낸 원본)
* 기존 화면이 아직 쓰는 `duo-*` 토큰은 각 화면을 Nori로 옮긴 뒤 지웁니다.

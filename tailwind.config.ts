import type { Config } from "tailwindcss";

// Nori 디자인 시스템 토큰 (Figma: 노리 디자인 시스템)
// 실제 값은 src/app/globals.css 의 :root CSS 변수에 있고, 여기서는 이름만 연결합니다.
const v = (name: string) => `var(--${name})`;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 기존 화면용 토큰. 화면을 Nori 디자인으로 옮기는 대로 제거합니다.
        duo: {
          green: "#58cc02",
          "green-hover": "#46a302",
          "green-active": "#3d8f02",
          white: "#ffffff",
          snow: "#f7f7f7",
          swan: "#e5e5e5",
          wolf: "#777777",
          eel: "#4b4b4b",
          macaw: "#1cb0f6",
          bee: "#ffc800",
          cardinal: "#ff4b4b",
        },
        nori: {
          brand: v("color-bg-brand"),
          "brand-border": v("color-border-brand"),
          "brand-shadow": v("color-shadow-brand"),
          "on-brand": v("color-text-on-brand"),
          coin: v("color-text-coin"),

          strong: v("color-text-strong"),
          primary: v("color-text-primary"),
          secondary: v("color-text-secondary"),
          tertiary: v("color-text-tertiary"),
          placeholder: v("color-text-placeholder"),

          surface: v("color-bg-surface"),
          subtle: v("color-bg-subtle"),
          neutral: v("color-bg-neutral"),
          border: v("color-border-default"),
          "card-shadow": v("color-shadow-default"),

          "selected-bg": v("color-bg-selected"),
          "selected-border": v("color-border-selected"),
          selected: v("color-text-selected"),

          success: v("color-bg-success"),
          "success-shadow": v("color-shadow-success"),
          "success-subtle": v("color-bg-success-subtle"),
          "success-text": v("color-text-success"),

          danger: v("color-bg-danger"),
          "danger-shadow": v("color-shadow-danger"),
          "danger-subtle": v("color-bg-danger-subtle"),
          "danger-text": v("color-text-danger"),

          info: v("color-bg-info-strong"),
          "info-shadow": v("color-shadow-info"),

          disabled: v("color-bg-disabled"),
          "disabled-shadow": v("color-shadow-disabled"),
          "disabled-text": v("color-text-disabled"),

          "progress-track": v("color-progress-track"),
          "progress-highlight": v("color-progress-highlight"),
          "icon-muted": v("color-icon-muted"),
          scrim: v("color-bg-scrim"),
        },
      },
      fontFamily: {
        sans: ["Pretendard", "sans-serif"],
        nunito: ["var(--font-nunito)", "Pretendard", "sans-serif"],
        myeongjo: ["var(--font-myeongjo)", "serif"],
      },
      borderRadius: {
        "nori-sm": "8px",
        "nori-md": "12px",
        "nori-lg": "16px",
        "nori-xl": "20px",
        "nori-sheet": "32px",
      },
      boxShadow: {
        duo: "0 4px 0 0 rgba(0, 0, 0, 0.1)",
        "duo-green": "0 4px 0 0 #46a302",
        "duo-macaw": "0 4px 0 0 #1899d6",
        "nori-card": `0 2px 0 0 ${v("color-shadow-default")}`,
        "nori-selected": `0 2px 0 0 ${v("color-border-selected")}`,
        "nori-brand": `0 4px 0 0 ${v("color-shadow-brand")}`,
        "nori-success": `0 4px 0 0 ${v("color-shadow-success")}`,
        "nori-danger": `0 4px 0 0 ${v("color-shadow-danger")}`,
        "nori-info": `0 4px 0 0 ${v("color-shadow-info")}`,
        "nori-disabled": `0 4px 0 0 ${v("color-shadow-disabled")}`,
        "nori-node-brand": `0 6px 0 0 ${v("color-shadow-brand")}`,
        "nori-node-locked": `0 6px 0 0 ${v("color-shadow-locked")}`,
        "nori-sheet": "0 -6px 28px 0 rgba(51, 38, 26, 0.12)",
        "nori-dialog": "0 4px 4px 0 rgba(0, 0, 0, 0.25)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "sheet-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        // Figma Blob BG 모션: 26초에 한 바퀴(-12° → -372°) 선형 회전
        "blob-spin": {
          "0%": { transform: "rotate(-12deg)" },
          "100%": { transform: "rotate(-372deg)" },
        },
        // 가로·세로가 번갈아 1.07 / 0.94 로 출렁임 (26초 동안 4회 = 6.5초 주기)
        "blob-wobble": {
          "0%, 50%, 100%": { transform: "scale(1, 1)" },
          "25%": { transform: "scale(1.07, 0.94)" },
          "75%": { transform: "scale(0.94, 1.07)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out forwards",
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "sheet-up": "sheet-up 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
        "blob-spin": "blob-spin 26s linear infinite",
        "blob-wobble": "blob-wobble 6.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;

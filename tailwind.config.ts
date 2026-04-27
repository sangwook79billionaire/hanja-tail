import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        sans: ["var(--font-pretendard)", "sans-serif"],
      },
      boxShadow: {
        'duo': '0 4px 0 0 rgba(0, 0, 0, 0.1)',
        'duo-green': '0 4px 0 0 #46a302',
        'duo-macaw': '0 4px 0 0 #1899d6',
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
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out forwards",
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
      }
    },
  },
  plugins: [],
};
export default config;

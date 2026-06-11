import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}", 
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#111827",
          border:"#374151",
          sidebar: "#0F172A",
          accent: "#4F46E5",
          error: "#EF4444",
          success: "#10B981",
          textLight: "#F9FAFB",
          textMuted: "#9CA3AF",
          button:"#101828"
        },
      },
    },
  },
  plugins: [],
};
export default config;
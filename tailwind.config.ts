import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        plum: "#3D2B3D",
        cream: "#F8F3EC",
        ink: "#2E2430",
        mauve: "#B08296",
        mauveDark: "#8C5D71",
        vipGold: "#C9A24B",
        seatAvailable: "#2F9E6E",
        seatBooked: "#C9C0C4",
        seatHeld: "#D99A5B",
        line: "#E5DBD3",
        muted: "#7A6C71",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        stub: "4px",
      },
    },
  },
  plugins: [],
};
export default config;
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "deep-navy-blue": '#021526',
        "mid-night-blue": '#03346E'
      },
      fontFamily: {
        sans: [
          "'Satoshi'",
          "-apple-system",
          "BlinkMacSystemFont",
          "'SF Pro Display'",
          "'SF Pro Text'",
          "'Inter'",
          "system-ui",
          "sans-serif"
        ],
        mono: [
          "'JetBrains Mono'",
          "'SF Mono'",
          "SFMono-Regular",
          "ui-monospace",
          "monospace"
        ]
      }
    },
  },
  plugins: [],
}


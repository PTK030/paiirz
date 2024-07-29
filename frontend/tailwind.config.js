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
      }
    },
  },
  plugins: [],
}


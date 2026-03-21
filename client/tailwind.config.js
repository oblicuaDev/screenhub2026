/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: {
          base:    '#060C1A',
          surface: '#0B1528',
          card:    '#0F1E38',
          elevated:'#152540',
        },
        accent:  '#2463EB',
        cyan:    '#06B6D4',
        border:  '#1C2E4A',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)'],
        serif: ['var(--font-playfair)'],
      },
      colors: {
        'parchment': '#fcf8f0',
        'sepia': {
          DEFAULT: '#706c61',
          dark: '#5a4b41',
        },
        'ink': '#3a3a3a',
        'papyrus': '#f8f5f0',
      },
    },
  },
  plugins: [],
};
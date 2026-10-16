/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          dark: '#080c16',
          surface: '#0f172a',
          card: '#131e36',
          border: '#1e293b',
          hover: '#1a2744',
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        restock: {
          light: '#ecfdf5',
          DEFAULT: '#10b981',
          dark: '#047857',
          glow: 'rgba(16, 185, 129, 0.25)',
        },
        resale: {
          light: '#eff6ff',
          DEFAULT: '#3b82f6',
          dark: '#1d4ed8',
          glow: 'rgba(59, 130, 246, 0.25)',
        },
        repair: {
          light: '#fff7ed',
          DEFAULT: '#f97316',
          dark: '#c2410c',
          glow: 'rgba(249, 115, 22, 0.25)',
        },
        recycling: {
          light: '#fef2f2',
          DEFAULT: '#ef4444',
          dark: '#b91c1c',
          glow: 'rgba(239, 68, 68, 0.25)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-restock': '0 0 20px -3px rgba(16, 185, 129, 0.3)',
        'glow-resale': '0 0 20px -3px rgba(59, 130, 246, 0.3)',
        'glow-repair': '0 0 20px -3px rgba(249, 115, 22, 0.3)',
        'glow-recycle': '0 0 20px -3px rgba(239, 68, 68, 0.3)',
        'glow-brand': '0 0 25px -4px rgba(99, 102, 241, 0.35)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#04060a',
          900: '#070b14',
          850: '#0a1020',
          800: '#0d1424',
          700: '#131c30',
          600: '#1c2742',
        },
        neon: {
          cyan: '#00e5ff',
          blue: '#3b82f6',
          red: '#ff3358',
          amber: '#ffb547',
          green: '#34d399',
          violet: '#a78bfa',
        },
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(0,229,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.06) 1px, transparent 1px)",
        'radial-glow': 'radial-gradient(circle at center, rgba(0,229,255,0.15), transparent 70%)',
        'scanline': 'repeating-linear-gradient(0deg, rgba(0,229,255,0.03) 0px, rgba(0,229,255,0.03) 1px, transparent 1px, transparent 3px)',
      },
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(0,229,255,0.4), 0 0 40px rgba(0,229,255,0.15)',
        'neon-red': '0 0 20px rgba(255,51,88,0.4), 0 0 40px rgba(255,51,88,0.15)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 4s ease-in-out infinite',
        'flicker': 'flicker 2.5s infinite',
        'float': 'float 6s ease-in-out infinite',
        'gradient-x': 'gradient-x 8s ease infinite',
      },
      keyframes: {
        scan: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(100%)' },
        },
        flicker: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.85 },
          '70%': { opacity: 1 },
          '72%': { opacity: 0.6 },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
      },
    },
  },
  plugins: [],
};

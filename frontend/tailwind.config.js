/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: '#F7F2E6', deep: '#EFE7D3', edge: '#E2D6BB' },
        cork: '#E6D9BC',
        ink: { DEFAULT: '#26302A', soft: '#56635A', faint: '#8A9389' },
        leaf: { 50: '#EEF3EA', 100: '#DCE7D4', 200: '#BFD3B3', 400: '#7FA07A', 600: '#3F6F55', 700: '#2F5D46', 800: '#254A38', 900: '#1B3829' },
        note: { yellow: '#F4E4A1', sage: '#D3E0C8', sky: '#CFDDE2', blush: '#EFD5CB' },
        alert: '#A9483F',
      },
      fontFamily: {
        display: ['"Young Serif"', 'Georgia', 'serif'],
        hand: ['Caveat', '"Segoe Print"', 'cursive'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        frame: '0 1px 1px rgba(74,58,28,.10), 0 10px 22px -8px rgba(74,58,28,.34)',
        lift: '0 2px 2px rgba(74,58,28,.10), 0 22px 36px -12px rgba(74,58,28,.45)',
        soft: '0 1px 2px rgba(74,58,28,.08), 0 6px 16px -6px rgba(74,58,28,.2)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        rise: { from: { opacity: 0, transform: 'translateY(14px) scale(.98)' }, to: { opacity: 1, transform: 'none' } },
        fade: { from: { opacity: 0 }, to: { opacity: 1 } },
        drop: { from: { opacity: 0, transform: 'translateY(-14px) rotate(var(--r, 0deg))' }, to: { opacity: 1, transform: 'rotate(var(--r, 0deg))' } },
        pop: { '0%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.35)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        rise: 'rise .28s ease-out both',
        fade: 'fade .2s ease-out both',
        drop: 'drop .7s cubic-bezier(.2,.8,.3,1) both',
        pop: 'pop .35s ease-out',
      },
    },
  },
  plugins: [],
}

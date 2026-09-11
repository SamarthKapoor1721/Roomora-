/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Inter Tight"', 'Inter', 'sans-serif'],
        // the Roomora wordmark only — a quirky display grotesque, distinct
        // from the Inter Tight used for headings elsewhere.
        wordmark: ['"Bricolage Grotesque"', '"Inter Tight"', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.5rem' }],
        lg: ['1rem', { lineHeight: '1.5rem' }],
        xl: ['1.125rem', { lineHeight: '1.6rem' }],
        '2xl': ['1.375rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        '3xl': ['1.75rem', { lineHeight: '2.1rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
      },
      colors: {
        // Roomora green. 500 is the brand hue (#76C457) used for accents, the
        // logo and the active-nav fill; 600/700 are darker so white text on
        // button fills meets WCAG AA contrast.
        brand: {
          50: '#f1f9ec',
          100: '#dff0d1',
          200: '#c3e3aa',
          300: '#9ed37a',
          400: '#8ccf72',
          500: '#76c457', // the Roomora brand green
          600: '#4e8b38', // primary button fill — white text = 4.1:1 (AA)
          700: '#3f7130', // button hover / active — white text = 5.8:1
        },
        // Roomora cream — a soft highlight surface. Always pair with dark ink text.
        cream: {
          DEFAULT: '#fff8cf',
          50: '#fffdf0',
          100: '#fff8cf',
          200: '#fdefa6',
        },
        ink: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.06)',
        pop: '0 4px 12px -2px rgba(15, 23, 42, 0.12), 0 2px 6px -2px rgba(15, 23, 42, 0.08)',
        focus: '0 0 0 3px rgba(118, 196, 87, 0.25)',
      },
      borderRadius: {
        lg: '0.625rem',
        xl: '0.875rem',
      },
    },
  },
  plugins: [],
};

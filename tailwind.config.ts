import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2C2872',
          50: '#F3F2FC',
          100: '#E8E6FF',
          200: '#DDDCFF',
          300: '#CAC8FF',
          600: '#433E9C',
          700: '#2C2872',
          800: '#26226D',
          900: '#231F61',
        },
        accent: {
          DEFAULT: '#EC642B',
          50: '#FFF3EC',
          100: '#FFD7C5',
          600: '#EC642B',
          700: '#D4541F',
        },
        ok: '#15803D',
        warn: '#B45309',
        bad: '#B91C1C',
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;

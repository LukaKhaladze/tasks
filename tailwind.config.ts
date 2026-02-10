import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        board: {
          950: '#0a0b0f',
          900: '#0f1117',
          850: '#131622',
          800: '#171a27',
          700: '#202535',
          600: '#2a3246',
          500: '#3a4661',
          400: '#56668a',
          300: '#7f8db0'
        },
        accent: {
          500: '#7b5cff',
          400: '#9b86ff'
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(123,92,255,0.2), 0 10px 30px rgba(0,0,0,0.35)'
      }
    }
  },
  plugins: []
};

export default config;

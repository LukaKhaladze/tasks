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
          950: '#090f1c',
          900: '#111827',
          850: '#151d2d',
          800: '#1a2333',
          700: '#263041',
          600: '#354156',
          500: '#4b596f',
          400: '#677791',
          300: '#8b9cb6'
        },
        accent: {
          500: '#ff5233',
          400: '#ff7a5f'
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,82,51,0.16), 0 10px 24px rgba(0,0,0,0.3)'
      }
    }
  },
  plugins: []
};

export default config;

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      borderRadius: {
        '4xl': '2rem'
      },
      boxShadow: {
        soft: '0 20px 50px rgba(15, 23, 42, 0.12)'
      }
    }
  },
  plugins: []
};

export default config;

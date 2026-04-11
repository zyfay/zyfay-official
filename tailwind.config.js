/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#7B2FBE',
        'primary-light': '#9B59D6',
        'primary-dark': '#5A1F8A',
        'primary-glow': '#A855F7',
        bg: '#0A0A12',
        surface: '#12101E',
        card: '#1A1630',
        'card-hover': '#221D3A',
        border: '#2D2650',
        muted: '#6B6490',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 30px rgba(123, 47, 190, 0.35)',
        'glow-sm': '0 0 15px rgba(123, 47, 190, 0.2)',
      },
    },
  },
  plugins: [],
}

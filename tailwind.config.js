export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        amber: {
          50: '#FCF8ED',
          100: '#F8EFD3',
          200: '#EFDBA0',
          300: '#E2C06A',
          400: '#D4A93F',
          500: '#C2941F',
          600: '#A67A16',
          700: '#856013',
          800: '#664912',
          900: '#432F0C',
        },
        cream: '#FAF6EC',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        // Archivo (variable : largeur 62–125 %) — une seule famille, la largeur
        // condensée des titres rappelle le lettrage du logo.
        sans: ['Archivo', ...defaultTheme.fontFamily.sans],
        heading: ['Archivo', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};

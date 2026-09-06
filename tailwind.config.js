/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],

  presets: [require("nativewind/preset")],

  theme: {
    extend: {
      colors: {
        primary: "#3B82F6",

        background: "#090B10",
        surface: "#11141B",
        muted: "#747985",

        brand: {
          // App
          bg: "#090B10",
          body: "#0D1016",

          // Surfaces
          surface: "#141820",
          "surface-light": "#191E28",
          "surface-elevated": "#1D232E",

          // Borders
          border: "#252B36",
          "border-light": "#303744",

          // Typography
          "text-primary": "#F5F7FA",
          "text-secondary": "#A5AAB5",
          "text-muted": "#6F7480",

          // Primary
          blue: "#3B82F6",
          "blue-light": "#60A5FA",
          "blue-dark": "#2563EB",

          // Finance
          green: "#3DDC84",
          "green-dark": "#22C55E",

          // Errors
          coral: "#FF6B4A",

          // Warnings
          yellow: "#F5C451",
        },
      },
    },
  },

  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1976d2", // Matching MUI default
        secondary: "#9c27b0",
      },
    },
  },
  plugins: [],
};

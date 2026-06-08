/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Color corporativo Málaga Startup Network: naranja dorado brillante
        brand: {
          50: "#fff8e6",
          100: "#fdecc4",
          200: "#fcdc90",
          300: "#fbcb5a",
          400: "#fab62b",
          500: "#f9a825",  // corporativo (botones y acentos brillantes)
          600: "#ef9b0e",  // hover
          700: "#cc8005",  // enlaces / texto sobre blanco
          800: "#a4660a",
          900: "#7c4d0c",
          950: "#221506",  // casi negro cálido (texto)
        },
        sun: {
          400: "#fbbf24",
          500: "#f9a825",
          600: "#ef9b0e",
        },
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      borderRadius: { xl: "1rem", "2xl": "1.25rem" },
    },
  },
  plugins: [],
}

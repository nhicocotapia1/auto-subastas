/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Sistema de diseño visual unificado (sección 7.1 del informe)
        navy: {
          50: '#EEF3FA',
          100: '#D9E3F2',
          200: '#B3C6E3',
          300: '#7F9DCB',
          400: '#4A6FA8',
          500: '#264C85',
          600: '#173A6E',
          700: '#0F2C59', // Color interactivo primario
          800: '#0B2146',
          900: '#071630',
        },
        exito: '#16A34A', // Éxito / estado líder / daño leve
        ambar: '#D97706', // Daño medio
        carmesi: '#DC2626', // Pérdida total / piezas críticas
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,44,89,0.06), 0 4px 16px rgba(15,44,89,0.06)',
      },
    },
  },
  plugins: [],
}

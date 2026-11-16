/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        accent: 'hsl(var(--accent))',
        secondary: 'hsl(var(--secondary))',
        border: 'hsl(var(--border))',
        destructive: 'hsl(var(--destructive))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
      },
      fontFamily: {
        heading: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
      },
    },
  },
  plugins: [],
};

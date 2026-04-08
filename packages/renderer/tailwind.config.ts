import type { Config } from 'tailwindcss';
import { tokens } from './src/theme/tokens';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: tokens.colors.background,
        surface: tokens.colors.surface,
        'surface-hover': tokens.colors.surfaceHover,
        border: tokens.colors.border,
        text: tokens.colors.text,
        accent: tokens.colors.accent,
        semantic: tokens.colors.semantic,
      },
      spacing: tokens.spacing,
      borderRadius: tokens.radius,
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;

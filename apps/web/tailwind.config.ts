import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        card: 'var(--card)',
        muted: 'var(--muted)',
        border: 'var(--border)',
        input: 'var(--input)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          light: 'var(--primary-light)',
          dark: 'var(--primary-dark)',
        },
        'text-strong-2': 'var(--text-strong-2)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: 'var(--info)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        btn: 'var(--radius-btn)',
        input: 'var(--radius-input)',
      },
      width: {
        sidebar: 'var(--sidebar-w)',
      },
      height: {
        header: 'var(--header-h)',
      },
    },
  },
  plugins: [],
};

export default config;

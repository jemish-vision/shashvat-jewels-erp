import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        card: 'var(--card)',
        'card-subtle': 'var(--card-subtle)',
        muted: 'var(--muted)',
        border: 'var(--border)',
        input: 'var(--input)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          light: 'var(--primary-light)',
          dark: 'var(--primary-dark)',
          ink: 'var(--primary-ink)',
        },
        'text-strong-2': 'var(--text-strong-2)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        success: 'var(--success)',
        'success-bg': 'var(--success-bg)',
        warning: 'var(--warning)',
        'warning-bg': 'var(--warning-bg)',
        danger: 'var(--danger)',
        'danger-bg': 'var(--danger-bg)',
        info: 'var(--info)',
        'info-bg': 'var(--info-bg)',
        violet: 'var(--violet)',
        'violet-bg': 'var(--violet-bg)',
        orange: 'var(--orange)',
        'orange-bg': 'var(--orange-bg)',
        cyan: 'var(--cyan)',
        'cyan-bg': 'var(--cyan-bg)',
        neutral: 'var(--neutral)',
        'neutral-bg': 'var(--neutral-bg)',
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

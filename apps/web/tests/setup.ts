import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll } from 'vitest';

beforeAll(() => {
  document.documentElement.style.setProperty('--primary', '#3fa393');
  document.documentElement.style.setProperty('--primary-light', '#6fd3c4');
  document.documentElement.style.setProperty('--primary-dark', '#2f7d70');
  document.documentElement.style.setProperty('--background', '#f8fafc');
  document.documentElement.style.setProperty('--foreground', '#0f172a');
  document.documentElement.style.setProperty('--sidebar-w', '272px');
  document.documentElement.style.setProperty('--header-h', '60px');
  document.documentElement.style.setProperty('--radius-card', '14px');
  document.documentElement.style.setProperty('--radius-btn', '8px');
  document.documentElement.style.setProperty('--radius-input', '8px');
});

afterEach(() => cleanup());

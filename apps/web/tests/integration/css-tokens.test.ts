import { describe, it, expect } from 'vitest';

describe('CSS design tokens', () => {
  it('defines primary color variable', () => {
    const style = getComputedStyle(document.documentElement);
    const primary = style.getPropertyValue('--primary').trim();
    expect(primary).toBe('#3fa393');
  });

  it('defines sidebar width variable', () => {
    const style = getComputedStyle(document.documentElement);
    const sidebarW = style.getPropertyValue('--sidebar-w').trim();
    expect(sidebarW).toBe('272px');
  });

  it('defines header height variable', () => {
    const style = getComputedStyle(document.documentElement);
    const headerH = style.getPropertyValue('--header-h').trim();
    expect(headerH).toBe('60px');
  });
});

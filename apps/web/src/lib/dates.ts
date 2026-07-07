export function formatDate(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function toISODate(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

export function daysFromNow(date: Date | string | number): number {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function isExpired(date: Date | string | number): boolean {
  return daysFromNow(date) < 0;
}

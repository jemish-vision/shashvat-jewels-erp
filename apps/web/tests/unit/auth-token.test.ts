import { describe, it, expect, beforeEach } from 'vitest';
import { setAccessToken, getAccessToken } from '@/lib/auth-token';

describe('auth-token', () => {
  beforeEach(() => {
    // Reset token state before each test
    setAccessToken(null);
  });

  it('returns null when no token is set', () => {
    expect(getAccessToken()).toBeNull();
  });

  it('returns the token after setting it', () => {
    setAccessToken('test-token-123');
    expect(getAccessToken()).toBe('test-token-123');
  });

  it('overwrites an existing token', () => {
    setAccessToken('first-token');
    setAccessToken('second-token');
    expect(getAccessToken()).toBe('second-token');
  });

  it('clears the token when set to null', () => {
    setAccessToken('some-token');
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });

  it('handles empty string token', () => {
    setAccessToken('');
    expect(getAccessToken()).toBe('');
  });

  it('handles token with special characters', () => {
    const specialToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    setAccessToken(specialToken);
    expect(getAccessToken()).toBe(specialToken);
  });
});

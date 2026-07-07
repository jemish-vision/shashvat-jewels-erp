// Standalone token manager — breaks circular dependency between auth-context.tsx and api-client.ts
// Both modules import from here instead of from each other.

let currentAccessToken: string | null = null;

export function setAccessToken(token: string | null) {
  currentAccessToken = token;
}

export function getAccessToken(): string | null {
  return currentAccessToken;
}

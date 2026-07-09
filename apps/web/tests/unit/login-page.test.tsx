import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/(auth)/login/page';
import { ApiError } from '@/lib/api-client';

const mockLogin = vi.fn();
const mockPush = vi.fn();
const mockToast = vi.fn();

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/config/site', () => ({ site: { name: 'Shashvat Jewels' } }));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    render(<LoginPage />);
  });

  it('renders brand name and heading', () => {
    expect(screen.getByText('Shashvat Jewels')).toBeDefined();
    expect(screen.getByText(/Welcome back/)).toBeDefined();
  });

  it('renders email and password fields', () => {
    expect(screen.getByLabelText('Email')).toBeDefined();
    expect(screen.getByLabelText('Password')).toBeDefined();
  });

  it('renders sign in button', () => {
    expect(screen.getByRole('button', { name: /Sign in/ })).toBeDefined();
  });

  it('renders forgot password link', () => {
    expect(screen.getByText('Forgot password?')).toBeDefined();
  });

  it('renders password eye toggle', () => {
    expect(screen.getByLabelText('Show password')).toBeDefined();
  });

  it('toggles password visibility', () => {
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
    const toggle = screen.getByLabelText('Show password');

    expect(passwordInput.type).toBe('password');
    fireEvent.click(toggle);
    expect(passwordInput.type).toBe('text');
  });

  it('calls login on form submit', async () => {
    mockLogin.mockResolvedValueOnce(undefined);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in/ }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@test.com', 'password');
    });
  });

  it('shows loading state during submission', async () => {
    let resolvePromise: () => void;
    mockLogin.mockReturnValue(new Promise<void>((resolve) => { resolvePromise = resolve; }));

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in/ }));

    expect(await screen.findByText(/Signing in/)).toBeDefined();
    resolvePromise!();
  });

  it('shows error toast on failed login', async () => {
    mockLogin.mockRejectedValueOnce(new ApiError('INVALID_CREDENTIALS', 'Invalid email or password'));

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bad@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in/ }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('Invalid email or password', 'error');
    });
  });

  it('navigates on success', async () => {
    mockLogin.mockResolvedValueOnce(undefined);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in/ }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});

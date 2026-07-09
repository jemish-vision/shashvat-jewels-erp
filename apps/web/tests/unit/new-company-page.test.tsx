import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewCompanyPage from '@/app/(super-admin)/companies/new/page';

const mockCreateCompany = vi.fn();
const mockPush = vi.fn();
const mockBack = vi.fn();
const mockToast = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock('@/features/super-admin/queries', () => ({
  createCompany: (...args: unknown[]) => mockCreateCompany(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

import { useMutation } from '@tanstack/react-query';

describe('NewCompanyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMutation).mockImplementation(({ mutationFn, onSuccess, onError }: any) => {
      mockCreateCompany.mockImplementation(mutationFn);
      return {
        mutate: async () => {
          try {
            const result = await mutationFn();
            onSuccess?.(result);
          } catch (err) {
            onError?.(err as Error);
          }
        },
        isPending: false,
      } as any;
    });
  });

  it('renders page title', () => {
    render(<NewCompanyPage />);
    expect(screen.getByText('New Company')).toBeDefined();
  });

  it('renders form fields', () => {
    render(<NewCompanyPage />);
    expect(screen.getByDisplayValue('India')).toBeDefined();
    expect(screen.getByDisplayValue('INR')).toBeDefined();
  });

  it('auto-generates slug from company name', () => {
    render(<NewCompanyPage />);
    const inputs = screen.getAllByRole('textbox');
    const nameInput = inputs[0];
    const slugInput = inputs[1] as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: 'My New Company' } });
    expect(slugInput.value).toBe('my-new-company');
  });

  it('renders cancel button that calls router.back', () => {
    render(<NewCompanyPage />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockBack).toHaveBeenCalledOnce();
  });

  it('renders create company button', () => {
    render(<NewCompanyPage />);
    expect(screen.getByRole('button', { name: /Create company/ })).toBeDefined();
  });

  it('calls createCompany and redirects on submit', async () => {
    mockCreateCompany.mockResolvedValueOnce({ id: 'new-1', name: 'Test' });

    render(<NewCompanyPage />);
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Test Corp' } });
    fireEvent.click(screen.getByRole('button', { name: /Create company/ }));

    await waitFor(() => {
      expect(mockCreateCompany).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Company created successfully', 'success');
      expect(mockPush).toHaveBeenCalledWith('/companies');
    });
  });

  it('shows pending state during creation', () => {
    vi.mocked(useMutation).mockImplementation(({ mutationFn, onSuccess }: any) => ({
      mutate: async () => { const r = await mutationFn(); onSuccess?.(r); },
      isPending: true,
    } as any));

    render(<NewCompanyPage />);
    expect(screen.getByText('Creating…')).toBeDefined();
  });

  it('shows error toast on failure', async () => {
    mockCreateCompany.mockRejectedValueOnce(new Error('Slug already taken'));

    render(<NewCompanyPage />);
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Dup' } });
    fireEvent.click(screen.getByRole('button', { name: /Create company/ }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('Slug already taken', 'error');
    });
  });
});

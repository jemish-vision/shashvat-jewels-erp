import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CompaniesPage from '@/app/(super-admin)/companies/page';

vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: vi.fn(),
}));

import { useInfiniteQuery } from '@tanstack/react-query';

const mockBase = {
  fetchNextPage: vi.fn(),
  hasNextPage: false,
  isLoading: false,
  error: null,
};

const mockData = {
  pages: [{
    items: [
      { id: '1', name: 'Alpha Corp', slug: 'alpha', status: 'ACTIVE', plan: 'premium', createdAt: '2026-06-01T00:00:00Z' },
      { id: '2', name: 'Beta Inc', slug: 'beta', status: 'TRIAL', plan: null, createdAt: '2026-07-01T00:00:00Z' },
      { id: '3', name: 'Gamma LLC', slug: 'gamma', status: 'SUSPENDED', plan: 'basic', createdAt: '2026-05-15T00:00:00Z' },
    ],
    pageInfo: { nextCursor: null, hasNextPage: false },
  }],
};

describe('CompaniesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useInfiniteQuery).mockReturnValue({ data: mockData, ...mockBase } as any);
  });

  it('renders page title', () => {
    render(<CompaniesPage />);
    expect(screen.getByText('Companies')).toBeDefined();
  });

  it('renders new company link', () => {
    render(<CompaniesPage />);
    const link = screen.getByText('+ New Company');
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/companies/new');
  });

  it('renders company rows', () => {
    render(<CompaniesPage />);
    expect(screen.getByText('Alpha Corp')).toBeDefined();
    expect(screen.getByText('Beta Inc')).toBeDefined();
    expect(screen.getByText('Gamma LLC')).toBeDefined();
  });

  it('renders status badges', () => {
    render(<CompaniesPage />);
    expect(screen.getByText('ACTIVE')).toBeDefined();
    expect(screen.getByText('TRIAL')).toBeDefined();
    expect(screen.getByText('SUSPENDED')).toBeDefined();
  });

  it('renders plan values', () => {
    render(<CompaniesPage />);
    expect(screen.getByText('premium')).toBeDefined();
    expect(screen.getByText('basic')).toBeDefined();
    expect(screen.getByText('-')).toBeDefined();
  });

  it('renders search input', () => {
    render(<CompaniesPage />);
    expect(screen.getByPlaceholderText(/Search name/)).toBeDefined();
  });

  it('renders status filter', () => {
    render(<CompaniesPage />);
    expect(screen.getByRole('option', { name: 'All statuses' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Active' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Suspended' })).toBeDefined();
  });

  it('renders view links for each company', () => {
    render(<CompaniesPage />);
    const views = screen.getAllByText('View');
    expect(views.length).toBe(3);
    expect(views[0].getAttribute('href')).toBe('/companies/1');
  });

  it('shows loading state', () => {
    vi.mocked(useInfiniteQuery).mockReturnValue({ data: undefined, ...mockBase, isLoading: true } as any);
    render(<CompaniesPage />);
    expect(screen.getByText('Loading…')).toBeDefined();
  });

  it('shows error state', () => {
    vi.mocked(useInfiniteQuery).mockReturnValue({ data: undefined, ...mockBase, error: new Error('API error') } as any);
    render(<CompaniesPage />);
    expect(screen.getByText('Failed to load companies')).toBeDefined();
  });

  it('calls fetchNextPage when load more clicked', () => {
    const fetchNextPage = vi.fn();
    vi.mocked(useInfiniteQuery).mockReturnValue({ data: mockData, ...mockBase, hasNextPage: true, fetchNextPage } as any);
    render(<CompaniesPage />);
    fireEvent.click(screen.getByText('Load more'));
    expect(fetchNextPage).toHaveBeenCalledOnce();
  });

  it('searches when typing in search box', () => {
    render(<CompaniesPage />);
    const searchInput = screen.getByPlaceholderText(/Search name/);
    fireEvent.change(searchInput, { target: { value: 'Alpha' } });
    expect((searchInput as HTMLInputElement).value).toBe('Alpha');
  });
});

'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MdSettings,
  MdBusiness,
  MdAttachMoney,
  MdNumbers,
  MdCloudUpload,
  MdSave,
  MdAdd,
  MdEdit,
  MdDelete,
  MdClose,
  MdCheck,
} from 'react-icons/md';
import { useToast } from '@/components/ui/toast';
import { usePermissions } from '@/hooks/use-permissions';
import { apiFetch } from '@/lib/api-client';
import { env } from '@/config/env';
import { getAccessToken } from '@/lib/auth-token';

interface CompanyProfile {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  taxId: string | null;
  logoUrl: string | null;
  baseCurrency: string;
}

interface CurrencyItem {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  isBase: boolean;
  isActive: boolean;
  latestRate: number | null;
  latestRateDate: string | null;
}

interface SequenceItem {
  id: string;
  key: string;
  prefix: string;
  year: number;
  lastValue: number;
}

export default function TenantSettingsPage() {
  const { toast } = useToast();
  const { has, isCompanyAdmin } = usePermissions();

  // Module 1: Profile & Branding
  const canViewProfile =
    isCompanyAdmin || has('settings:view') || has('settings:update');
  const canUpdateProfile = isCompanyAdmin || has('settings:update');

  // Module 2: Currencies & Exchange Rates
  const canViewCurrencies =
    isCompanyAdmin ||
    has('currency:list') ||
    has('currency:view') ||
    has('currency:create') ||
    has('currency:update') ||
    has('currency:delete');
  const canCreateCurrency = isCompanyAdmin || has('currency:create');
  const canUpdateCurrency = isCompanyAdmin || has('currency:update');
  const canDeleteCurrency = isCompanyAdmin || has('currency:delete');

  // Module 3: Document Numbering Sequences
  const canViewSequences =
    isCompanyAdmin ||
    has('sequence:view') ||
    has('sequence:update') ||
    has('settings:update');
  const canUpdateSequence = isCompanyAdmin || has('sequence:update') || has('settings:update');

  const [activeTab, setActiveTab] = useState<'profile' | 'currencies' | 'sequences'>('profile');

  // Profile state
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    address: '',
    city: '',
    phone: '',
    taxId: '',
    logoUrl: '',
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Currencies state
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const [newCurrencyModal, setNewCurrencyModal] = useState(false);
  const [rateModalCurrency, setRateModalCurrency] = useState<CurrencyItem | null>(null);
  const [editCurrencyModal, setEditCurrencyModal] = useState<CurrencyItem | null>(null);

  // Sequences state
  const [sequences, setSequences] = useState<SequenceItem[]>([]);
  const [loadingSequences, setLoadingSequences] = useState(false);
  const [editingSeqId, setEditingSeqId] = useState<string | null>(null);
  const [tempPrefix, setTempPrefix] = useState('');

  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const data = await apiFetch<CompanyProfile>('/api/tenant/company');
      setProfile(data);
      setProfileForm({
        name: data.name || '',
        address: data.address || '',
        city: data.city || '',
        phone: data.phone || '',
        taxId: data.taxId || '',
        logoUrl: data.logoUrl || '',
      });
    } catch (err: any) {
      toast(err.message || 'Could not load company profile', 'error');
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchCurrencies = async () => {
    setLoadingCurrencies(true);
    try {
      const data = await apiFetch<CurrencyItem[]>('/api/tenant/currencies');
      setCurrencies(data || []);
    } catch (err: any) {
      toast(err.message || 'Could not load currencies', 'error');
    } finally {
      setLoadingCurrencies(false);
    }
  };

  const fetchSequences = async () => {
    setLoadingSequences(true);
    try {
      const data = await apiFetch<SequenceItem[]>('/api/tenant/settings/sequences');
      setSequences(data || []);
    } catch (err: any) {
      toast(err.message || 'Could not load numbering sequences', 'error');
    } finally {
      setLoadingSequences(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'profile' && !canViewProfile) {
      if (canViewCurrencies) setActiveTab('currencies');
      else if (canViewSequences) setActiveTab('sequences');
    }
  }, [canViewProfile, canViewCurrencies, canViewSequences, activeTab]);

  useEffect(() => {
    if (activeTab === 'profile' && canViewProfile) fetchProfile();
    if (activeTab === 'currencies' && canViewCurrencies) fetchCurrencies();
    if (activeTab === 'sequences' && canViewSequences) fetchSequences();
  }, [activeTab, canViewProfile, canViewCurrencies, canViewSequences]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUpdateProfile) return;
    setSavingProfile(true);
    try {
      const data = await apiFetch<CompanyProfile>('/api/tenant/company', {
        method: 'PATCH',
        body: JSON.stringify(profileForm),
      });
      setProfile(data);
      toast('Company profile updated successfully', 'success');
    } catch (err: any) {
      toast(err.message || 'Could not save profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUpdateProfile) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', 'LOGO');
      formData.append('entityType', 'COMPANY');
      if (profile?.id) formData.append('entityId', profile.id);

      const token = getAccessToken();
      const uploadRes = await fetch(`${env.apiUrl}/api/tenant/uploads`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        credentials: 'include',
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.message || 'Logo upload failed');
      }

      const newUrl = uploadData.data.url;
      setProfileForm((prev) => ({ ...prev, logoUrl: newUrl }));

      // Immediately patch profile logoUrl
      await apiFetch('/api/tenant/company', {
        method: 'PATCH',
        body: JSON.stringify({ logoUrl: newUrl }),
      });

      toast('Company logo uploaded and updated', 'success');
    } catch (err: any) {
      toast(err.message || 'Could not load or upload logo', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSavePrefix = async (seq: SequenceItem) => {
    if (!canUpdateSequence) return;
    try {
      await apiFetch(`/api/tenant/settings/sequences/${seq.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ prefix: tempPrefix }),
      });
      toast(`Updated sequence prefix for ${seq.key}`, 'success');
      setEditingSeqId(null);
      fetchSequences();
    } catch (err: any) {
      toast(err.message || 'Could not update sequence prefix', 'error');
    }
  };

  const getSequenceTitle = (key: string) => {
    switch (key) {
      case 'customer':
        return 'Customer Accounts Code';
      case 'vendor':
        return 'Vendor Accounts Code';
      case 'invoice':
        return 'Sales Invoice Number';
      case 'purchase':
        return 'Purchase Bill Number';
      case 'memo':
        return 'Consignment Memo Number';
      default:
        return key.toUpperCase();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MdSettings size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground">
              Company Settings Hub
            </h1>
            <p className="text-xs font-medium text-text-secondary">
              Manage branding, multi-currency conversion rates, and document numbering sequences
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {canViewProfile && (
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'profile'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <MdBusiness className="h-4 w-4" />
            <span>Profile & Branding</span>
          </button>
        )}

        {canViewCurrencies && (
          <button
            type="button"
            onClick={() => setActiveTab('currencies')}
            className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'currencies'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <MdAttachMoney className="h-4 w-4" />
            <span>Currencies & Exchange Rates</span>
          </button>
        )}

        {canViewSequences && (
          <button
            type="button"
            onClick={() => setActiveTab('sequences')}
            className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'sequences'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <MdNumbers className="h-4 w-4" />
            <span>Document Numbering</span>
          </button>
        )}
      </div>

      {/* TAB 1: Profile & Branding */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <form
              onSubmit={handleSaveProfile}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <h2 className="text-lg font-bold text-foreground">Company Identification</h2>
              <p className="text-xs text-muted-foreground">
                These details appear on invoice headers and official receipts
              </p>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Company Name
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!canUpdateProfile}
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tenant Slug (System Identifier)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={profile?.slug || ''}
                    className="mt-1 h-10 w-full rounded-xl border border-input bg-muted px-3 text-sm font-mono text-muted-foreground cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Phone / Helpline
                  </label>
                  <input
                    type="text"
                    disabled={!canUpdateProfile}
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="+91 261 2345678"
                    className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    GSTIN / Tax ID
                  </label>
                  <input
                    type="text"
                    disabled={!canUpdateProfile}
                    value={profileForm.taxId}
                    onChange={(e) => setProfileForm({ ...profileForm, taxId: e.target.value })}
                    placeholder="24AABCU9603R1ZM"
                    className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    City / Location
                  </label>
                  <input
                    type="text"
                    disabled={!canUpdateProfile}
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    placeholder="Surat, Gujarat"
                    className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Registered Office Address
                  </label>
                  <textarea
                    rows={3}
                    disabled={!canUpdateProfile}
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {canUpdateProfile && (
                <div className="mt-6 flex justify-end border-t border-border pt-4">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:brightness-110 disabled:opacity-50"
                  >
                    <MdSave size={16} />
                    <span>{savingProfile ? 'Saving...' : 'Save Profile Settings'}</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-bold text-foreground">Company Logo</h2>
              <p className="text-xs text-muted-foreground">
                Upload a transparent PNG logo for display in navbar and exports
              </p>

              <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30 p-6 text-center">
                {profileForm.logoUrl ? (
                  <div className="space-y-3">
                    <img
                      src={profileForm.logoUrl}
                      alt="Company Logo Preview"
                      className="mx-auto h-20 max-w-[160px] object-contain"
                    />
                    <p className="text-xs font-mono text-muted-foreground break-all">
                      {profileForm.logoUrl}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <MdCloudUpload className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">No custom logo uploaded</p>
                  </div>
                )}

                {canUpdateProfile && (
                  <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20">
                    <MdCloudUpload size={16} />
                    <span>{uploadingLogo ? 'Uploading...' : 'Upload Logo Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Currencies & Exchange Rates */}
      {activeTab === 'currencies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Supported Currencies</h2>
              <p className="text-xs text-muted-foreground">
                Define functional currencies and set daily conversion rates to your base currency
              </p>
            </div>
            {canCreateCurrency && (
              <button
                type="button"
                onClick={() => setNewCurrencyModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:brightness-110"
              >
                <MdAdd size={16} />
                <span>Add Currency</span>
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">Currency Code</th>
                  <th className="p-4">Name & Symbol</th>
                  <th className="p-4">Role</th>
                  <th className="p-4 text-right">Latest Rate to Base</th>
                  <th className="p-4">Effective Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingCurrencies ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Loading currencies...
                    </td>
                  </tr>
                ) : currencies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No currencies defined yet.
                    </td>
                  </tr>
                ) : (
                  currencies.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30">
                      <td className="p-4 font-bold text-foreground">{c.code}</td>
                      <td className="p-4">
                        <span className="font-medium text-foreground">{c.name}</span>
                        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                          {c.symbol}
                        </span>
                      </td>
                      <td className="p-4">
                        {c.isBase ? (
                          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            BASE CURRENCY
                          </span>
                        ) : (
                          <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                            FOREIGN CURRENCY
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-foreground">
                        {c.isBase ? '1.000000' : c.latestRate ? Number(c.latestRate).toFixed(6) : 'Not Set'}
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {c.isBase
                          ? 'Fixed Base'
                          : c.latestRateDate
                          ? new Date(c.latestRateDate).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!c.isBase && canUpdateCurrency && (
                            <button
                              type="button"
                              onClick={() => setRateModalCurrency(c)}
                              className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                            >
                              Set Daily Rate
                            </button>
                          )}
                          {(canUpdateCurrency || canDeleteCurrency) && (
                            <button
                              type="button"
                              onClick={() => setEditCurrencyModal(c)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                            >
                              <MdEdit size={14} />
                              <span>Edit</span>
                            </button>
                          )}
                          {canDeleteCurrency && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm(`Delete currency "${c.code} - ${c.name}"? This will also remove all exchange rate history.`)) return;
                                try {
                                  await apiFetch(`/api/tenant/currencies/${c.id}`, { method: 'DELETE' });
                                  toast(`${c.code} currency deleted successfully`, 'success');
                                  fetchCurrencies();
                                } catch (err: unknown) {
                                  const msg = err instanceof Error ? err.message : 'Failed to delete currency';
                                  toast(msg, 'error');
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/20"
                            >
                              <MdDelete size={14} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Document Numbering Sequences */}
      {activeTab === 'sequences' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Document Numbering Prefixes</h2>
            <p className="text-xs text-muted-foreground">
              Customize prefixes generated for new master records and transactional vouchers
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">Document / Entity Type</th>
                  <th className="p-4">System Key</th>
                  <th className="p-4">Prefix</th>
                  <th className="p-4">Running Counter</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingSequences ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Loading numbering sequences...
                    </td>
                  </tr>
                ) : sequences.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No sequences found.
                    </td>
                  </tr>
                ) : (
                  sequences.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="p-4 font-semibold text-foreground">
                        {getSequenceTitle(s.key)}
                      </td>
                      <td className="p-4 font-mono text-xs text-muted-foreground">{s.key}</td>
                      <td className="p-4">
                        {editingSeqId === s.id ? (
                          <input
                            type="text"
                            value={tempPrefix}
                            onChange={(e) => setTempPrefix(e.target.value)}
                            className="h-8 w-32 rounded-lg border border-primary bg-background px-2 font-mono text-sm uppercase text-foreground focus:outline-none"
                          />
                        ) : (
                          <span className="rounded bg-muted px-2 py-1 font-mono font-bold text-foreground">
                            {s.prefix}
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-xs text-muted-foreground">
                        Last Generated: #{s.lastValue}
                      </td>
                      <td className="p-4 text-right">
                        {editingSeqId === s.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleSavePrefix(s)}
                              className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-600 hover:bg-emerald-500/20"
                            >
                              <MdCheck size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSeqId(null)}
                              className="rounded-lg bg-muted p-1.5 text-muted-foreground hover:text-foreground"
                            >
                              <MdClose size={16} />
                            </button>
                          </div>
                        ) : canUpdateSequence ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSeqId(s.id);
                              setTempPrefix(s.prefix);
                            }}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Edit Prefix"
                          >
                            <MdEdit size={16} />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New Currency */}
      {newCurrencyModal && (
        <CreateCurrencyModal
          isOpen={newCurrencyModal}
          onClose={() => setNewCurrencyModal(false)}
          onSaved={() => {
            setNewCurrencyModal(false);
            fetchCurrencies();
          }}
        />
      )}

      {/* Modal: Set Exchange Rate */}
      {rateModalCurrency && (
        <SetRateModal
          currency={rateModalCurrency}
          onClose={() => setRateModalCurrency(null)}
          onSaved={() => {
            setRateModalCurrency(null);
            fetchCurrencies();
          }}
        />
      )}

      {/* Modal: Edit Currency */}
      {editCurrencyModal && (
        <EditCurrencyModal
          currency={editCurrencyModal}
          onClose={() => setEditCurrencyModal(null)}
          onSaved={() => {
            setEditCurrencyModal(null);
            fetchCurrencies();
          }}
        />
      )}
    </div>
  );
}

function CreateCurrencyModal({
  isOpen,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    symbol: '',
    decimals: '2',
    initialRate: '1',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      toast('Currency code and name are required', 'error');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/api/tenant/currencies', {
        method: 'POST',
        body: JSON.stringify({
          code: form.code.toUpperCase().trim(),
          name: form.name.trim(),
          symbol: form.symbol.trim() || '$',
          decimals: Number(form.decimals),
          initialRate: Number(form.initialRate),
        }),
      });
      toast('Currency added successfully', 'success');
      onSaved();
    } catch (err: any) {
      toast(err.message || 'Could not add currency', 'error');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-lg font-bold text-foreground">Add New Currency</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
          >
            <MdClose size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground">
                Code (ISO) *
              </label>
              <input
                type="text"
                required
                maxLength={3}
                placeholder="USD / EUR / AED"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 font-mono text-sm uppercase text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground">
                Symbol
              </label>
              <input
                type="text"
                placeholder="$, €, AED"
                value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground">
              Currency Name *
            </label>
            <input
              type="text"
              required
              placeholder="US Dollar / Euro / UAE Dirham"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground">
                Decimals
              </label>
              <input
                type="number"
                min="0"
                max="6"
                value={form.decimals}
                onChange={(e) => setForm({ ...form, decimals: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground">
                Initial Rate to Base
              </label>
              <input
                type="number"
                step="0.000001"
                min="0"
                value={form.initialRate}
                onChange={(e) => setForm({ ...form, initialRate: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-border bg-card px-5 py-2.5 text-xs font-bold text-foreground shadow-sm transition-all hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:brightness-110 disabled:opacity-50"
            >
              <MdAdd size={16} />
              <span>{loading ? 'Adding...' : 'Add Currency'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function SetRateModal({
  currency,
  onClose,
  onSaved,
}: {
  currency: CurrencyItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rate, setRate] = useState(currency.latestRate ? String(currency.latestRate) : '1');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch(`/api/tenant/currencies/${currency.id}/rates`, {
        method: 'POST',
        body: JSON.stringify({
          rateToBase: Number(rate),
          effectiveDate: date,
        }),
      });
      toast(`Updated rate for ${currency.code}`, 'success');
      onSaved();
    } catch (err: any) {
      toast(err.message || 'Could not save exchange rate', 'error');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-lg font-bold text-foreground">
            Set Rate: {currency.code}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
          >
            <MdClose size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground">
              Rate to Base Currency (1 {currency.code} = ? Base)
            </label>
            <input
              type="number"
              step="0.000001"
              required
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 font-mono text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground">
              Effective Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-border bg-card px-5 py-2.5 text-xs font-bold text-foreground shadow-sm transition-all hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:brightness-110 disabled:opacity-50"
            >
              <MdCheck size={16} />
              <span>{loading ? 'Saving...' : 'Save Exchange Rate'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function EditCurrencyModal({
  currency,
  onClose,
  onSaved,
}: {
  currency: CurrencyItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const { has, isCompanyAdmin } = usePermissions();
  const canUpdateCurrency = isCompanyAdmin || has('currency:update');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: currency.name || '',
    symbol: currency.symbol || '',
    decimals: currency.decimals ?? 2,
    isActive: currency.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUpdateCurrency) return;
    setLoading(true);
    try {
      await apiFetch(`/api/tenant/currencies/${currency.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name.trim(),
          symbol: form.symbol.trim(),
          decimals: Number(form.decimals),
          isActive: form.isActive,
        }),
      });
      toast(`Updated currency ${currency.code}`, 'success');
      onSaved();
    } catch (err: any) {
      toast(err.message || 'Could not update currency', 'error');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-lg font-bold text-foreground">
            Edit Currency ({currency.code})
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
          >
            <MdClose size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground">
              Currency Name *
            </label>
            <input
              type="text"
              required
              disabled={!canUpdateCurrency}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground">
                Symbol
              </label>
              <input
                type="text"
                disabled={!canUpdateCurrency}
                value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground">
                Decimals
              </label>
              <input
                type="number"
                min="0"
                max="6"
                disabled={!canUpdateCurrency}
                value={form.decimals}
                onChange={(e) => setForm({ ...form, decimals: Number(e.target.value) })}
                className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>

          <div
            onClick={() => {
              if (canUpdateCurrency) setForm({ ...form, isActive: !form.isActive });
            }}
            className={`flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3.5 transition-colors ${
              canUpdateCurrency ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed opacity-60'
            }`}
          >
            <div>
              <span className="text-sm font-bold text-foreground">Active Currency</span>
              <p className="text-xs text-muted-foreground">
                Enable or disable this currency for new transactions
              </p>
            </div>
            <div
              className={`relative h-6 w-11 rounded-full transition-colors ${
                form.isActive ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            >
              <div
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  form.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-border bg-card px-5 py-2.5 text-xs font-bold text-foreground shadow-sm transition-all hover:bg-muted"
            >
              Close
            </button>
            {canUpdateCurrency && (
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:brightness-110 disabled:opacity-50"
              >
                <MdCheck size={16} />
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

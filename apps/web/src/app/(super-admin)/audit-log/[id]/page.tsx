'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getAuditEntry } from '@/features/super-admin/queries';
import {
  MdHistory,
  MdAdminPanelSettings,
  MdChevronLeft,
  MdPerson,
  MdDevices,
  MdAccessTime,
  MdDataObject,
  MdBusiness,
  MdOpenInNew,
} from 'react-icons/md';

function formatJson(value: unknown): string {
  if (!value) return '—';
  return JSON.stringify(value, null, 2);
}

export default function AuditEntryDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: entry, isLoading, error } = useQuery({
    queryKey: ['super-admin', 'audit-entry', id],
    queryFn: () => getAuditEntry(id),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-[13px] font-medium text-text-secondary">Loading entry&hellip;</div>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="flex flex-col gap-5">
        <Link href="/audit-log" className="flex items-center gap-1.5 text-[12px] font-bold text-primary no-underline hover:underline">
          <MdChevronLeft size={16} />
          Back to Audit Log
        </Link>
        <div className="rounded-[14px] border border-border bg-danger-bg p-4 text-[13px] font-medium text-danger">
          Failed to load audit entry. It may have been removed.
        </div>
      </div>
    );
  }

  const time = new Date(entry.createdAt).toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const actionLabel = entry.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  const detailFields: Array<{ label: string; value: React.ReactNode; icon: React.ReactNode }> = [
    { label: 'Action', value: actionLabel, icon: <MdHistory size={14} /> },
    { label: 'Target Type', value: entry.targetType || '—', icon: <MdBusiness size={14} /> },
    { label: 'Target ID', value: entry.targetId || '—', icon: <MdDataObject size={14} /> },
    { label: 'IP Address', value: entry.ipAddress || '—', icon: <MdDevices size={14} /> },
    { label: 'Timestamp', value: time, icon: <MdAccessTime size={14} /> },
  ];

  const hasChanges = Boolean(entry.before || entry.after);

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <div>
        <Link
          href="/audit-log"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-primary transition-opacity hover:opacity-80"
        >
          <MdChevronLeft size={16} />
          Back to Audit Log
        </Link>
      </div>

      {/* Header section matching Company Admin Roles exactly */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-primary/15 text-xl text-primary">
            <MdHistory size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-foreground">
                #{entry.id.slice(0, 12)}
              </h1>
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {actionLabel}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Logged at {time} • IP: {entry.ipAddress || 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">

        {/* Action Details */}
        <div className="card-lg px-5 py-[18px]">
          <h2 className="m-0 mb-4 text-[14px] font-bold text-foreground flex items-center gap-2">
            <MdHistory size={16} className="text-primary" />
            Action Details
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">
            {detailFields.map((f) => (
              <div key={f.label}>
                <p className="m-0 mb-[2px] flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-text-muted">
                  {f.icon}
                  {f.label}
                </p>
                <p className="m-0 text-[12.5px] font-semibold text-foreground">{String(f.value ?? '—')}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Admin Info */}
        <div className="card-lg px-5 py-[18px]">
          <h2 className="m-0 mb-4 text-[14px] font-bold text-foreground flex items-center gap-2">
            <MdAdminPanelSettings size={16} className="text-primary" />
            Admin
          </h2>
          {entry.superAdmin ? (
            <div className="flex flex-col gap-3.5">
              <div>
                <p className="m-0 mb-[2px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-text-muted">Name</p>
                <p className="m-0 text-[12.5px] font-semibold text-foreground">{entry.superAdmin.name}</p>
              </div>
              <div>
                <p className="m-0 mb-[2px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-text-muted">Admin ID</p>
                <p className="m-0 text-[12.5px] font-semibold text-foreground font-mono">{entry.superAdminId || '—'}</p>
              </div>
              <div>
                <p className="m-0 mb-[2px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-text-muted">Role</p>
                <span className="inline-flex items-center gap-1 rounded-[6px] bg-[rgba(111,211,196,0.14)] px-[8px] py-[2px] text-[10px] font-bold text-primary">
                  <MdAdminPanelSettings size={10} />
                  Super Admin
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 text-text-muted">
              <MdDevices size={22} className="mb-2" />
              <p className="m-0 text-[12px] font-medium">Automated Action</p>
              <p className="m-0 text-[10px]">Performed by the system</p>
            </div>
          )}
        </div>

        {/* Data Changes */}
        {hasChanges && (
          <div className="card-lg px-5 py-[18px] col-span-2">
            <h2 className="m-0 mb-4 text-[14px] font-bold text-foreground flex items-center gap-2">
              <MdDataObject size={16} className="text-primary" />
              Data Changes
            </h2>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <p className="m-0 mb-2 text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">Before</p>
                <pre className="m-0 overflow-auto rounded-[10px] border border-border bg-muted p-3 text-[11px] font-mono text-text-strong-2 leading-relaxed whitespace-pre-wrap">
                  {formatJson(entry.before)}
                </pre>
              </div>
              <div>
                <p className="m-0 mb-2 text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">After</p>
                <pre className="m-0 overflow-auto rounded-[10px] border border-border bg-muted p-3 text-[11px] font-mono text-text-strong-2 leading-relaxed whitespace-pre-wrap">
                  {formatJson(entry.after)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

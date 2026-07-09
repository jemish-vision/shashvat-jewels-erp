import { MdSettings, MdConstruction } from 'react-icons/md';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <div>
        <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-foreground">Platform Settings</h1>
        <p className="m-0 mt-[5px] text-[13px] font-medium text-text-secondary">
          Configure global platform preferences and system options.
        </p>
      </div>

      {/* Coming soon card */}
      <div className="card-lg flex flex-col items-center justify-center py-16">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[12px] bg-[rgba(111,211,196,0.14)] text-primary">
          <MdConstruction size={24} />
        </div>
        <div className="mb-1 text-[14px] font-semibold text-foreground">Settings panel coming soon</div>
        <div className="mb-4 max-w-[320px] text-center text-[12px] text-text-muted">
          This module is under development. You will be able to configure global preferences, security policies, and system integrations here.
        </div>
        <div className="inline-flex items-center gap-2 rounded-[10px] bg-muted px-3 py-[6px] text-[11px] font-bold text-text-secondary">
          <MdSettings size={14} />
          Future Module · v2.0
        </div>
      </div>
    </div>
  );
}

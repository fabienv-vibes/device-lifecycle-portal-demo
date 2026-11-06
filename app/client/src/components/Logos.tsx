import type { Tenant } from '../tenants';

/** Fictional platform wordmark (Contoso). Swap for your own brand. */
export function PlatformLogo({ className = 'text-lg' }: { className?: string }) {
  return <span className={`font-heading font-bold lowercase tracking-tight text-foreground ${className}`}>contoso</span>;
}

function NorthwindMark({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden>
      <rect width="40" height="40" rx="10" fill={color} />
      <path d="M11 29V11l18 18V11" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function BastionMark({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden>
      <path d="M20 3 35 9v10c0 9.5-6.4 16.2-15 18-8.6-1.8-15-8.5-15-18V9l15-6Z" fill={color} />
      <path d="m13.5 20 4.5 4.5 8.5-9" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function TenantLogo({ tenant }: { tenant: Tenant }) {
  if (tenant.id === 'northwind') {
    return (
      <div className="flex items-center gap-3">
        <NorthwindMark color={tenant.accent} />
        <div className="leading-none">
          <div className="font-heading text-2xl font-bold tracking-tight text-foreground">northwind</div>
          <div className="text-[11px] uppercase tracking-[0.32em]" style={{ color: tenant.accent }}>mobile</div>
        </div>
      </div>
    );
  }
  if (tenant.id === 'bastion') {
    return (
      <div className="flex items-center gap-3">
        <BastionMark color={tenant.accent} />
        <div className="leading-none">
          <div className="font-heading text-2xl font-bold uppercase tracking-[0.12em] text-foreground">Bastion</div>
          <div className="text-[11px] uppercase tracking-[0.32em]" style={{ color: tenant.accent }}>protect</div>
        </div>
      </div>
    );
  }
  if (tenant.id === 'regulator') {
    return (
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden>
          <rect width="40" height="40" rx="10" fill={tenant.accent} />
          <path d="M20 8 9 14h22L20 8Zm-8 8v11m5.3-11v11m5.4-11v11M28 16v11M8 30h24" stroke="#14191a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        <div className="leading-none">
          <div className="font-heading text-xl font-bold uppercase tracking-[0.1em] text-foreground">National Telecom</div>
          <div className="text-[11px] uppercase tracking-[0.32em]" style={{ color: tenant.accent }}>regulator</div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <PlatformLogo className="text-3xl" />
      <div className="font-heading text-xl font-bold uppercase tracking-[0.18em]" style={{ color: tenant.accent }}>
        Operations
      </div>
    </div>
  );
}

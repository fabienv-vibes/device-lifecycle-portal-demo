import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TooltipProvider,
} from '@databricks/appkit-ui/react';
import { BarChart3, LayoutDashboard, MessageSquareText, ScanLine, ShieldCheck } from 'lucide-react';
import { PlatformLogo, TenantLogo } from './components/Logos';
import { TENANTS, getTenant, DATA_AS_OF } from './tenants';
import type { Tenant } from './tenants';
import { OverviewPage } from './pages/OverviewPage';
import { CustomerOverviewPage } from './pages/CustomerOverviewPage';
import { DashboardPage } from './pages/DashboardPage';
import { AskPage } from './pages/AskPage';
import { PassportPage } from './pages/PassportPage';
import { RegulatorPage } from './pages/RegulatorPage';

function useWhoAmI() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/whoami')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { email?: string | null } | null) => setEmail(d?.email ?? null))
      .catch(() => setEmail(null));
  }, []);
  return email;
}

function PlatformBar({
  tenant,
  onTenant,
  email,
}: {
  tenant: Tenant;
  onTenant: (id: string) => void;
  email: string | null;
}) {
  return (
    <div className="platform-bar border-b border-border">
      <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-6 py-2.5">
        <PlatformLogo className="text-xl" />
        <span className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground md:inline">
          Device Intelligence Platform
        </span>
        <span className="hidden h-4 w-px bg-border md:inline-block" />
        <span className="hidden items-center gap-2 md:inline-flex">
          <span className="text-xs text-muted-foreground">Powered by</span>
          <img src="/databricks-logo-white.svg" alt="Databricks" className="h-[14px] w-auto" />
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Viewing as</span>
          <Select value={tenant.id} onValueChange={onTenant}>
            <SelectTrigger className="h-8 w-[270px] border-border bg-card text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TENANTS.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: t.accent }} />
                    {t.name}
                    {t.kind === 'internal' && <span className="text-muted-foreground">(internal)</span>}
                    {t.kind === 'regulator' && <span className="text-muted-foreground">(external)</span>}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="hidden font-normal lg:inline-flex">
            {email ?? 'Signed in via Databricks'}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function TenantBand({ tenant }: { tenant: Tenant }) {
  return (
    <div className="tenant-band border-b border-border">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-end justify-between gap-4 px-6 pb-4 pt-6">
        <div className="flex items-center gap-5">
          <TenantLogo tenant={tenant} />
          <div className="hidden h-10 w-px bg-border md:block" />
          <div>
            <h1 className="font-heading text-xl font-bold text-foreground">{tenant.portalName}</h1>
            <p className="text-sm text-muted-foreground">{tenant.tagline}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 brand-text" />
          <span>
            Governed by Unity Catalog · {tenant.kind === 'regulator' ? 'access: ' : ''}
            <span className="font-mono">{tenant.schema}</span> · Data through {DATA_AS_OF}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tenantId, setTenantId] = useState<string>(() => localStorage.getItem('portal-tenant') ?? 'ops');
  const [tab, setTab] = useState<string>('overview');
  const tenant = getTenant(tenantId);
  const email = useWhoAmI();

  useEffect(() => {
    localStorage.setItem('portal-tenant', tenant.id);
  }, [tenant.id]);

  const brandStyle = useMemo(
    () =>
      ({
        '--brand': tenant.accent,
        '--brand-soft': tenant.accentSoft,
        '--primary': tenant.accent,
        '--primary-foreground': '#ffffff',
        '--ring': tenant.accent,
      }) as CSSProperties,
    [tenant.accent, tenant.accentSoft]
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground" style={brandStyle}>
        <PlatformBar tenant={tenant} onTenant={setTenantId} email={email} />
        <TenantBand tenant={tenant} />
        {tenant.kind === 'regulator' ? (
          <main className="mx-auto max-w-[1440px] px-6 py-6">
            <RegulatorPage />
          </main>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <div className="border-b border-border bg-background/80 backdrop-blur">
              <div className="mx-auto max-w-[1440px] px-6">
                <TabsList className="h-12 gap-1 bg-transparent p-0">
                  {[
                    { v: 'overview', label: 'Overview', icon: BarChart3 },
                    { v: 'dashboard', label: 'Executive dashboard', icon: LayoutDashboard },
                    { v: 'ask', label: 'Ask your data', icon: MessageSquareText },
                    { v: 'passport', label: 'Device Record', icon: ScanLine },
                  ].map(({ v, label, icon: Icon }) => (
                    <TabsTrigger
                      key={v}
                      value={v}
                      className="h-12 rounded-none border-b-2 border-transparent px-4 text-sm text-muted-foreground data-[state=active]:border-[var(--brand)] data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </div>
            <main className="mx-auto max-w-[1440px] px-6 py-6">
              <TabsContent value="overview" className="mt-0">
                {tenant.kind === 'internal' ? (
                  <OverviewPage key={tenant.id} tenant={tenant} />
                ) : (
                  <CustomerOverviewPage key={tenant.id} tenant={tenant} />
                )}
              </TabsContent>
              <TabsContent value="dashboard" className="mt-0">
                <DashboardPage key={tenant.id} tenant={tenant} />
              </TabsContent>
              <TabsContent value="ask" className="mt-0">
                <AskPage key={tenant.id} tenant={tenant} email={email} />
              </TabsContent>
              <TabsContent value="passport" className="mt-0">
                <PassportPage key={tenant.id} tenant={tenant} />
              </TabsContent>
            </main>
          </Tabs>
        )}
        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              Powered by <PlatformLogo className="text-sm" /> · Built on Databricks (Apps, AI/BI, Genie, Unity Catalog)
            </span>
            <span>Fictional demo data</span>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}

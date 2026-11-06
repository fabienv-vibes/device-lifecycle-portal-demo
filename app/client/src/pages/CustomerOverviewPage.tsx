import { useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  AlertDescription,
  BarChart,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Skeleton,
  useAnalyticsQuery,
} from '@databricks/appkit-ui/react';
import { sql } from '@databricks/appkit-ui/js';
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, PackageSearch, TriangleAlert, Wrench } from 'lucide-react';
import type { Tenant } from '../tenants';
import { DATA_AS_OF } from '../tenants';
import { num, pct, toNum, usd } from '../lib/format';

function Delta({ cur, prev, goodWhenUp, asPoints = false }: { cur: number; prev: number; goodWhenUp: boolean; asPoints?: boolean }) {
  if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0) return null;
  const change = asPoints ? (cur - prev) * 100 : ((cur - prev) / Math.abs(prev)) * 100;
  const up = change >= 0;
  const good = up === goodWhenUp;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${good ? 'kpi-up' : 'kpi-down'}`}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(change).toFixed(1)}
      {asPoints ? ' pts' : '%'}
    </span>
  );
}

function Kpi({ label, value, delta, hint }: { label: string; value: string; delta?: ReactNode; hint: string }) {
  return (
    <Card className="gap-2 border-border bg-card py-4">
      <CardContent className="px-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1.5 font-heading text-3xl font-bold text-foreground">{value}</div>
        <div className="mt-1 flex items-center gap-2">
          {delta}
          <span className="text-xs text-muted-foreground">{hint}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="font-heading text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function State({ loading, error, empty, children, h = 300 }: { loading: boolean; error: string | null; empty: boolean; children: ReactNode; h?: number }) {
  if (loading) return <Skeleton className="w-full rounded-lg" style={{ height: h }} />;
  if (error)
    return (
      <Alert variant="destructive">
        <TriangleAlert className="h-4 w-4" />
        <AlertDescription>Couldn’t load this view: {error}</AlertDescription>
      </Alert>
    );
  if (empty)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Nothing here yet</EmptyTitle>
          <EmptyDescription>Data appears as soon as devices are graded.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  return <>{children}</>;
}

function Stage({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border p-4">
      <div className="brand-bg-soft brand-text flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-heading text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </div>
  );
}

export function CustomerOverviewPage({ tenant }: { tenant: Tenant }) {
  const params = useMemo(() => ({ tenant_schema: sql.string(tenant.schema) }), [tenant.schema]);
  const kpis = useAnalyticsQuery('cust_kpis', params);
  const pipeline = useAnalyticsQuery('cust_pipeline', params);
  const monthly = useAnalyticsQuery('cust_monthly_value', params);
  const models = useAnalyticsQuery('cust_top_models', params);
  const outcomes = useAnalyticsQuery('cust_outcomes', params);
  const risk = useAnalyticsQuery('cust_risk_monthly', params);
  const damage = useAnalyticsQuery('cust_damage_mix', params);

  const k = kpis.data?.[0];
  const p = pipeline.data?.[0];
  const monthlyData = useMemo(() => (monthly.data ?? []).map((r) => ({ month: r.month, 'Value recovered': toNum(r.value_recovered) })), [monthly.data]);
  const modelData = useMemo(
    () => (models.data ?? []).map((r) => ({ device: r.device.replace(/^(Apple|Samsung|Google|Motorola) /, ''), value: toNum(r.value_recovered) })).reverse(),
    [models.data],
  );
  const outcomeData = useMemo(() => (outcomes.data ?? []).map((r) => ({ outcome: r.outcome, devices: toNum(r.devices) })), [outcomes.data]);
  const secondLife = useMemo(() => {
    const total = outcomeData.reduce((a, r) => a + r.devices, 0);
    const reused = outcomeData.filter((r) => r.outcome.startsWith('Resold') || r.outcome.startsWith('Exported')).reduce((a, r) => a + r.devices, 0);
    return total > 0 ? reused / total : null;
  }, [outcomeData]);
  const riskData = useMemo(
    () => (risk.data ?? []).map((r) => ({ month: r.month, 'Lost/stolen': toNum(r.lost_stolen), 'Unpaid balance': toNum(r.unpaid_balance), Counterfeit: toNum(r.counterfeit) })),
    [risk.data],
  );
  const damageData = useMemo(
    () => (damage.data ?? []).map((r) => ({ finding: r.finding.replace('Cosmetic damage only', 'Cosmetic only'), devices: toNum(r.devices) })).reverse(),
    [damage.data],
  );
  const outcomeTotal = outcomeData.reduce((a, r) => a + r.devices, 0);
  const insurer = tenant.id === 'bastion';

  return (
    <div className="space-y-6">
      {kpis.error && (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertDescription>{kpis.error}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {kpis.loading || !k ? (
          ['a', 'b', 'c', 'd', 'e', 'f'].map((i) => <Skeleton key={i} className="h-[118px] rounded-xl" />)
        ) : (
          <>
            <Kpi label={tenant.copy.intake} value={num(toNum(k.devices_cur))} hint="last 90 days vs prior 90"
              delta={<Delta cur={toNum(k.devices_cur)} prev={toNum(k.devices_prev)} goodWhenUp />} />
            <Kpi label={tenant.copy.value} value={usd(toNum(k.value_cur))} hint="last 90 days"
              delta={<Delta cur={toNum(k.value_cur)} prev={toNum(k.value_prev)} goodWhenUp />} />
            <Kpi label={tenant.copy.avgValue} value={usd(toNum(k.avg_value_cur), false)} hint="resold or salvaged"
              delta={<Delta cur={toNum(k.avg_value_cur)} prev={toNum(k.avg_value_prev)} goodWhenUp />} />
            <Kpi label="Avg days to complete" value={`${toNum(k.days_cur).toFixed(1)} d`} hint="receipt to final disposition"
              delta={<Delta cur={toNum(k.days_cur)} prev={toNum(k.days_prev)} goodWhenUp={false} />} />
            <Kpi label="Fraud & risk caught" value={num(toNum(k.risk_cur), false)} hint={`${usd(toNum(k.risk_value_cur))} exposure stopped`} />
            <Kpi label="Second-life rate" value={pct(toNum(k.reuse_cur))} hint="resold or exported for reuse"
              delta={<Delta cur={toNum(k.reuse_cur)} prev={toNum(k.reuse_prev)} goodWhenUp asPoints />} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard title="Your devices right now" description={`Live status of ${tenant.copy.second} in processing`}>
          <State loading={pipeline.loading} error={pipeline.error} empty={!p} h={300}>
            {p && (
              <div className="grid grid-cols-1 gap-3">
                <Stage icon={<PackageSearch className="h-5 w-5" />} label="Received this week" value={num(toNum(p.received_7d), false)} hint="checked in at a processing center" />
                <Stage icon={<Clock className="h-5 w-5" />} label="Being graded" value={num(toNum(p.grading), false)} hint="diagnostics and cosmetic grading" />
                <Stage icon={<Wrench className="h-5 w-5" />} label="Out for repair" value={num(toNum(p.in_repair), false)} hint="routed by the next-best-action model to restore value" />
                <Stage icon={<CheckCircle2 className="h-5 w-5" />} label="Completed this week" value={num(toNum(p.completed_7d), false)} hint="resold, exported, salvaged or recycled" />
              </div>
            )}
          </State>
        </ChartCard>
        <div className="xl:col-span-2">
          <ChartCard title={`${tenant.copy.value} by month`} description={`Last 12 months · data through ${DATA_AS_OF}`}>
            <State loading={monthly.loading} error={monthly.error} empty={monthlyData.length === 0} h={392}>
              <BarChart data={monthlyData} xKey="month" yKey="Value recovered" orientation="vertical" colors={[tenant.accent]} height={392}
                valueFormatter={(v) => usd(toNum(v))} ariaLabel="Value recovered by month" />
            </State>
          </ChartCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Which devices return the most value" description="Top models by value recovered · last 12 months">
          <State loading={models.loading} error={models.error} empty={modelData.length === 0}>
            <BarChart data={modelData} xKey="device" yKey="value" orientation="horizontal" colors={[tenant.accent]} height={300}
              valueFormatter={(v) => usd(toNum(v))} ariaLabel="Top models by value recovered" />
          </State>
        </ChartCard>
        <ChartCard title={secondLife !== null ? `${pct(secondLife, 0)} of your ${tenant.copy.second} got a second life` : 'Where your devices went'}
          description="Final outcome of completed devices · last 12 months">
          <State loading={outcomes.loading} error={outcomes.error} empty={outcomeData.length === 0}>
            <div className="space-y-4 pt-2">
              {outcomeData.map((r) => {
                const reuse = r.outcome.startsWith('Resold') || r.outcome.startsWith('Exported');
                const share = outcomeTotal > 0 ? r.devices / outcomeTotal : 0;
                return (
                  <div key={r.outcome}>
                    <div className="mb-1.5 flex items-baseline justify-between text-sm">
                      <span className="text-foreground">{r.outcome}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {num(r.devices, false)} · <span className="text-foreground">{pct(share, 0)}</span>
                      </span>
                    </div>
                    <div className="bar-track h-2.5 overflow-hidden rounded-full">
                      <div className={`h-2.5 rounded-full ${reuse ? 'bar-fill' : 'bg-muted-foreground/50'}`} style={{ width: `${share * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </State>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title={insurer ? 'Claim fraud and risk caught before payout' : 'Trade-in fraud and risk caught before credit'}
          description="Devices flagged by blacklist checks and genuine-device verification, by month">
          <State loading={risk.loading} error={risk.error} empty={riskData.length === 0}>
            <BarChart data={riskData} xKey="month" yKey={['Lost/stolen', 'Unpaid balance', 'Counterfeit']} stacked orientation="vertical"
              colors={['#FF6B5E', '#F5A524', '#6B46FF']} height={300} showLegend valueFormatter={(v) => num(toNum(v), false)} ariaLabel="Fraud and risk caught by month" />
          </State>
        </ChartCard>
        <ChartCard title={insurer ? 'What’s damaged in your claims' : 'What we find in your trade-ins'} description="Primary diagnostic finding on arrival · last 12 months">
          <State loading={damage.loading} error={damage.error} empty={damageData.length === 0}>
            <BarChart data={damageData} xKey="finding" yKey="devices" orientation="horizontal" colors={[tenant.accent]} height={300}
              valueFormatter={(v) => num(toNum(v), false)} ariaLabel="Primary diagnostic finding" />
          </State>
        </ChartCard>
      </div>
    </div>
  );
}

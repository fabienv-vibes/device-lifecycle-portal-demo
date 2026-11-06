import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  AlertDescription,
  AreaChart,
  Badge,
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
  LineChart,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  useAnalyticsQuery,
} from '@databricks/appkit-ui/react';
import { sql } from '@databricks/appkit-ui/js';
import { ArrowDownRight, ArrowUpRight, MapPin, TriangleAlert } from 'lucide-react';
import type { Tenant } from '../tenants';
import { DATA_AS_OF } from '../tenants';
import { num, pct, toBool, toNum, usd, weekLabel } from '../lib/format';

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

function Kpi({ label, value, delta, hint }: { label: string; value: string; delta: ReactNode; hint: string }) {
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

function ChartCard({ title, description, children, footnote }: { title: string; description: string; children: ReactNode; footnote?: string }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="font-heading text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {children}
        {footnote && <p className="mt-2 text-xs text-muted-foreground">{footnote}</p>}
      </CardContent>
    </Card>
  );
}

function Loading({ h = 300 }: { h?: number }) {
  return <Skeleton className="w-full rounded-lg" style={{ height: h }} />;
}

function QueryError({ error }: { error: string }) {
  return (
    <Alert variant="destructive">
      <TriangleAlert className="h-4 w-4" />
      <AlertDescription>Couldn’t load this view: {error}</AlertDescription>
    </Alert>
  );
}

function NoData() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>No devices in this view yet</EmptyTitle>
        <EmptyDescription>Data appears here as soon as devices are graded.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function pivot<T extends Record<string, unknown>>(rows: T[], xKey: keyof T, seriesKey: keyof T, valueKey: keyof T, fmtX: (v: string) => string) {
  const series: string[] = [];
  const byX = new Map<string, Record<string, string | number>>();
  for (const r of rows) {
    const x = String(r[xKey]);
    const s = String(r[seriesKey]).replace(' Processing Center', '').replace(' (RSA)', '');
    if (!series.includes(s)) series.push(s);
    const row = byX.get(x) ?? { week: fmtX(x) };
    row[s] = toNum(r[valueKey]);
    byX.set(x, row);
  }
  const data = [...byX.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  return { data, series };
}

export function OverviewPage({ tenant }: { tenant: Tenant }) {
  const [facilityId, setFacilityId] = useState<string>('ALL');
  const tenantParams = useMemo(() => ({ tenant_schema: sql.string(tenant.schema) }), [tenant.schema]);
  const params = useMemo(
    () => ({ tenant_schema: sql.string(tenant.schema), facility_id: sql.string(facilityId) }),
    [tenant.schema, facilityId],
  );
  const facilities = useAnalyticsQuery('facilities', tenantParams);
  const selectedFacility = (facilities.data ?? []).find((f) => f.facility_id === facilityId);
  const kpis = useAnalyticsQuery('kpis', params);
  const weekly = useAnalyticsQuery('weekly_volume', params);
  const dts = useAnalyticsQuery('dts_trend', params);
  const nba = useAnalyticsQuery('nba_value', params);
  const grades = useAnalyticsQuery('grade_uplift', params);
  const partners = useAnalyticsQuery('partner_scorecard', params);

  const k = kpis.data?.[0];
  const weeklyPivot = useMemo(() => pivot(weekly.data ?? [], 'week', 'facility', 'devices', weekLabel), [weekly.data]);
  const dtsPivot = useMemo(() => pivot(dts.data ?? [], 'week', 'automation_level', 'median_hours', weekLabel), [dts.data]);
  const nbaData = useMemo(
    () => (nba.data ?? []).map((r) => ({ action: r.next_best_action, lift: toNum(r.net_value_lift) })).sort((a, b) => b.lift - a.lift),
    [nba.data],
  );
  const gradeData = useMemo(
    () => (grades.data ?? []).map((r) => ({ ' ': `Grade ${r.grade}`, 'On arrival': toNum(r.on_arrival), 'After action': toNum(r.after_action) })),
    [grades.data],
  );
  const gradeAUplift = useMemo(() => {
    const a = (grades.data ?? []).find((r) => r.grade === 'A');
    return a ? toNum(a.after_action) - toNum(a.on_arrival) : null;
  }, [grades.data]);
  const maxTrue = useMemo(() => Math.max(1, ...(partners.data ?? []).map((p) => toNum(p.true_cost))), [partners.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 brand-text" />
          {selectedFacility ? (
            <span>
              <span className="text-foreground">{selectedFacility.facility_name}</span> · {selectedFacility.automation_level}
              {toBool(selectedFacility.has_buff_polish_cell) ? ' · buff & polish cell' : ' · no buff & polish cell'}
            </span>
          ) : (
            <span>All processing sites</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Site</span>
          <Select value={facilityId} onValueChange={setFacilityId}>
            <SelectTrigger className="h-9 w-[240px] border-border bg-card text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All sites</SelectItem>
              {(facilities.data ?? []).map((f) => (
                <SelectItem key={f.facility_id} value={f.facility_id}>
                  {f.facility_name.replace(' Processing Center', '')} · {f.automation_level.replace(' (RSA)', '')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {kpis.error && <QueryError error={kpis.error} />}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {kpis.loading || !k ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[118px] rounded-xl" />)
        ) : (
          <>
            <Kpi label="Devices processed" value={num(toNum(k.devices_cur))} hint="last 90 days vs prior 90"
              delta={<Delta cur={toNum(k.devices_cur)} prev={toNum(k.devices_prev)} goodWhenUp />} />
            <Kpi label="Value recovered" value={usd(toNum(k.value_cur))} hint="last 90 days vs prior 90"
              delta={<Delta cur={toNum(k.value_cur)} prev={toNum(k.value_prev)} goodWhenUp />} />
            <Kpi label="Value from next best action" value={usd(toNum(k.lift_cur))} hint="net lift from next best action"
              delta={<Delta cur={toNum(k.lift_cur)} prev={toNum(k.lift_prev)} goodWhenUp />} />
            <Kpi label="Median dock-to-stock" value={`${toNum(k.dts_cur).toFixed(1)} h`} hint="lower is better"
              delta={<Delta cur={toNum(k.dts_cur)} prev={toNum(k.dts_prev)} goodWhenUp={false} />} />
            <Kpi label="EU resale eligible" value={pct(toNum(k.eu_cur))} hint="battery ≥80%, OEM parts"
              delta={<Delta cur={toNum(k.eu_cur)} prev={toNum(k.eu_prev)} goodWhenUp asPoints />} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard title="Volume nearly doubled in the Sep-Oct flagship-launch surge"
            description="Devices received per week, by processing facility"
            footnote={`Source: device records · data through ${DATA_AS_OF}`}>
            {weekly.loading ? <Loading /> : weekly.error ? <QueryError error={weekly.error} /> : weeklyPivot.data.length === 0 ? <NoData /> : (
              <AreaChart data={weeklyPivot.data} xKey="week" yKey={weeklyPivot.series} stacked smooth colors={tenant.palette} height={300} showLegend
                valueFormatter={(v) => num(toNum(v), false)} ariaLabel="Weekly devices received by facility" />
            )}
          </ChartCard>
        </div>
        <ChartCard title={gradeAUplift === null ? 'Cosmetic grade uplift' : gradeAUplift > 0 ? `+${num(gradeAUplift, false)} devices upgraded to grade A` : 'No grade A uplift at this site'}
          description="Cosmetic grade on arrival vs after routing to buff & polish or repair · last 12 months, resold devices">
          {grades.loading ? <Loading /> : grades.error ? <QueryError error={grades.error} /> : gradeData.length === 0 ? <NoData /> : (
            <BarChart data={gradeData} xKey=" " yKey={['On arrival', 'After action']} orientation="vertical" colors={['#5f6b70', tenant.accent]} height={300} showLegend
              valueFormatter={(v) => num(toNum(v), false)} ariaLabel="Cosmetic grade on arrival vs after action" />
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Automated lines absorbed the surge; manual stations didn't"
          description="Median dock-to-stock hours per week, by facility automation level">
          {dts.loading ? <Loading /> : dts.error ? <QueryError error={dts.error} /> : dtsPivot.data.length === 0 ? <NoData /> : (
            <LineChart data={dtsPivot.data} xKey="week" yKey={dtsPivot.series} colors={[tenant.accent, '#F5A524', '#6B46FF']} height={300} showLegend smooth={false}
              valueFormatter={(v) => `${toNum(v).toFixed(1)} h`} ariaLabel="Median dock-to-stock hours by automation level" />
          )}
        </ChartCard>
        <ChartCard title="Next-best-action decisions create the value"
          description="Net value lift by the action the routing model chose for each device · last 12 months, completed devices (USD)">
          {nba.loading ? <Loading /> : nba.error ? <QueryError error={nba.error} /> : nbaData.length === 0 ? <NoData /> : (
            <BarChart data={nbaData} xKey="action" yKey="lift" orientation="horizontal" colors={[tenant.accent]} height={300}
              valueFormatter={(v) => usd(toNum(v))} ariaLabel="Net value lift by next best action" />
          )}
        </ChartCard>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-heading text-base">The cheapest repair quote isn’t the cheapest repair</CardTitle>
          <CardDescription>
            Repair partner scorecard since Aug 1, 2026. True cost = repair + logistics + rework on bounced QA + value lost while the device is out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {partners.loading ? <Loading h={240} /> : partners.error ? <QueryError error={partners.error} /> : (partners.data ?? []).length === 0 ? <NoData /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Partner</th>
                    <th className="py-2 pr-4 text-right font-medium">Repairs</th>
                    <th className="py-2 pr-4 text-right font-medium">Bounce rate</th>
                    <th className="py-2 pr-4 text-right font-medium">Turnaround</th>
                    <th className="py-2 pr-4 text-right font-medium">Aftermarket parts</th>
                    <th className="py-2 pr-4 text-right font-medium">Quoted / repair</th>
                    <th className="w-[32%] py-2 font-medium">True cost / successful repair</th>
                  </tr>
                </thead>
                <tbody>
                  {(partners.data ?? []).map((p) => {
                    const quoted = toNum(p.quoted_cost);
                    const trueCost = toNum(p.true_cost);
                    const hidden = trueCost / quoted >= 1.6;
                    return (
                      <tr key={p.partner_name} className="border-b border-border/60 last:border-0">
                        <td className="py-3 pr-4">
                          <div className="font-medium text-foreground">{p.partner_name}</div>
                          <div className="text-xs text-muted-foreground">{p.partner_type}</div>
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">{num(toNum(p.repairs), false)}</td>
                        <td className="py-3 pr-4 text-right tabular-nums">
                          <span className={`rounded-md px-2 py-0.5 ${toNum(p.bounce_rate) >= 0.1 ? 'fail-pill' : toNum(p.bounce_rate) >= 0.05 ? 'warn-pill' : 'pass-pill'}`}>
                            {pct(toNum(p.bounce_rate))}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">{toNum(p.avg_turnaround_days).toFixed(1)} d</td>
                        <td className="py-3 pr-4 text-right tabular-nums">{pct(toNum(p.aftermarket_share), 0)}</td>
                        <td className="py-3 pr-4 text-right tabular-nums">{usd(quoted, false)}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="bar-track h-2 flex-1 overflow-hidden rounded-full">
                              <div className={`h-2 rounded-full ${hidden ? 'bar-fill-bad' : 'bar-fill'}`} style={{ width: `${(trueCost / maxTrue) * 100}%` }} />
                            </div>
                            <span className="w-14 text-right font-medium tabular-nums">{usd(trueCost, false)}</span>
                            {hidden && <Badge variant="destructive" className="whitespace-nowrap">Hidden cost</Badge>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Input,
  Skeleton,
  useAnalyticsQuery,
} from '@databricks/appkit-ui/react';
import { sql } from '@databricks/appkit-ui/js';
import { Battery, CircleDollarSign, Factory, Recycle, ScanLine, Search, ShieldAlert, Smartphone, TriangleAlert, Wrench } from 'lucide-react';
import type { Tenant } from '../tenants';
import { shortDate, toBool, toNum, usd } from '../lib/format';

function Pill({ tone, children }: { tone: 'pass' | 'fail' | 'warn' | 'neutral'; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${tone}-pill`}>{children}</span>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-foreground">{children}</div>
    </div>
  );
}

function Step({ icon, title, detail, last = false }: { icon: ReactNode; title: string; detail: string; last?: boolean }) {
  return (
    <div className="relative flex gap-3 pb-5">
      {!last && <div className="absolute left-[15px] top-8 h-[calc(100%-24px)] w-px bg-border" />}
      <div className="brand-bg-soft brand-text flex h-8 w-8 shrink-0 items-center justify-center rounded-full">{icon}</div>
      <div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}

const TESTS: Array<[string, string]> = [
  ['test_display', 'Display'], ['test_touch', 'Touch'], ['test_battery', 'Battery'], ['test_camera', 'Camera'],
  ['test_audio', 'Audio'], ['test_charging', 'Charging'], ['test_biometrics', 'Biometrics'], ['test_connectivity', 'Connectivity'],
];

function PassportCard({ tenant, imei }: { tenant: Tenant; imei: string }) {
  const params = useMemo(() => ({ tenant_schema: sql.string(tenant.schema), imei: sql.string(imei) }), [tenant.schema, imei]);
  const { data, loading, error } = useAnalyticsQuery('passport', params);
  if (loading) return <Skeleton className="h-[560px] rounded-xl" />;
  if (error) return <Alert variant="destructive"><TriangleAlert className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>;
  const d = data?.[0];
  if (!d) {
    return (
      <Card className="border-border bg-card">
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No device record for IMEI {imei}</EmptyTitle>
              <EmptyDescription>This device hasn’t been processed for {tenant.name}. Try one of the sample devices.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }
  const record: Record<string, unknown> = { ...d };
  const fake = d.genuine_status === 'Counterfeit';
  const blocked = d.blacklist_status !== 'Clean';
  const bAfter = toNum(d.battery_health_final);
  const bBefore = toNum(d.battery_health_pct);
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="brand-bg-soft brand-text flex h-12 w-12 items-center justify-center rounded-xl"><Smartphone className="h-6 w-6" /></div>
            <div>
              <CardTitle className="font-heading text-xl">{d.oem} {d.model}</CardTitle>
              <CardDescription>{d.storage_gb} GB · {d.color} · IMEI <span className="font-mono">{d.imei}</span></CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone={fake ? 'fail' : 'pass'}>{fake ? 'Counterfeit' : 'Genuine'}</Pill>
            <Pill tone={blocked ? 'fail' : 'pass'}>{blocked ? d.blacklist_status : 'Not blacklisted'}</Pill>
            <Pill tone={toBool(d.eu_market_eligible) ? 'pass' : 'warn'}>{toBool(d.eu_market_eligible) ? 'EU resale eligible' : 'Not EU eligible'}</Pill>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Field label="Born on">{shortDate(d.born_on_date)}</Field>
            <Field label="Age">{d.device_age_months} months</Field>
            <Field label="Lifecycles">{d.previous_owners} previous owner{toNum(d.previous_owners) === 1 ? '' : 's'}</Field>
            <Field label="Program">{d.program}</Field>
            <Field label="Functional">{d.functional_status}{d.primary_defect ? ` · ${d.primary_defect}` : ''}</Field>
            <Field label="Cosmetic grade">{d.cosmetic_grade}{d.cosmetic_grade_final !== d.cosmetic_grade ? ` → ${d.cosmetic_grade_final}` : ''}</Field>
            <Field label="OEM parts only">{toBool(d.oem_parts_final) ? 'Yes' : 'No (aftermarket)'}</Field>
            <Field label="Battery replaced">{toBool(d.battery_replaced) ? 'Yes' : 'No'}</Field>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground"><Battery className="h-3.5 w-3.5" /> Battery health</div>
            <div className="flex items-center gap-3">
              <div className="bar-track h-2.5 flex-1 overflow-hidden rounded-full">
                <div className={`h-2.5 rounded-full ${bAfter >= 80 ? 'bar-fill' : 'bar-fill-bad'}`} style={{ width: `${bAfter}%` }} />
              </div>
              <span className="w-24 text-right text-sm tabular-nums">{bBefore !== bAfter ? `${bBefore}% → ${bAfter}%` : `${bAfter}%`}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">EU resale threshold: 80%</p>
          </div>
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Automated diagnostics</div>
            <div className="grid grid-cols-2 gap-2 2xl:grid-cols-4">
              {TESTS.map(([key, label]) => {
                const raw = record[key];
                const v = typeof raw === 'string' ? raw : 'NOT RUN';
                return (
                  <div key={key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span className="text-xs">{label}</span>
                    <Pill tone={v === 'PASS' ? 'pass' : v === 'FAIL' ? 'fail' : 'neutral'}>{v}</Pill>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Value as received', usd(toNum(d.value_as_received), false)],
              ['Action cost', usd(toNum(d.action_cost), false)],
              ['Value recovered', usd(toNum(d.value_recovered), false)],
              ['Net value lift', usd(toNum(d.net_value_lift), false)],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg border border-border p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{l}</div>
                <div className="mt-1 font-heading text-lg font-bold">{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-3 text-[11px] uppercase tracking-wider text-muted-foreground">Device history</div>
          <Step icon={<Smartphone className="h-4 w-4" />} title={`Manufactured · ${d.oem}`} detail={shortDate(d.born_on_date)} />
          <Step icon={<Factory className="h-4 w-4" />} title={`Received · ${d.facility_name}`} detail={`${shortDate(d.received_date)} · ${d.automation_level}`} />
          <Step icon={<ScanLine className="h-4 w-4" />} title="Diagnosed and graded" detail={`Dock-to-stock ${toNum(d.dock_to_stock_hours).toFixed(1)} h · ${d.functional_status}, grade ${d.cosmetic_grade}`} />
          <Step
            icon={d.next_best_action === 'Recycle' ? <Recycle className="h-4 w-4" /> : d.next_best_action === 'Quarantine' ? <ShieldAlert className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
            title={`Next best action · ${d.next_best_action}`}
            detail={d.partner_name ? `${d.repair_type} repair by ${d.partner_name} · ${d.parts_type} parts · QA ${d.qa_result ?? 'pending'} · ${d.turnaround_days ?? 'n/a'} days out` : 'Decided automatically by the next-best-action model'}
          />
          <Step icon={<CircleDollarSign className="h-4 w-4" />} title={`Disposition · ${d.disposition_channel}`} detail={d.completed_date ? `Completed ${shortDate(d.completed_date)}` : d.processing_status} last />
        </div>
      </CardContent>
    </Card>
  );
}

const VERDICT_TONE: Record<string, 'pass' | 'fail' | 'warn' | 'neutral'> = {
  'GENUINE - APPROVED': 'pass', 'NOT GENUINE': 'fail', 'GENUINE - NOT APPROVED': 'warn', UNKNOWN: 'neutral',
};

export function VerifyResult({ imei }: { imei: string }) {
  const params = useMemo(() => ({ imei: sql.string(imei) }), [imei]);
  const { data, loading, error } = useAnalyticsQuery('verify_imei', params);
  if (loading) return <Skeleton className="h-24 rounded-xl" />;
  if (error) return <Alert variant="destructive"><TriangleAlert className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>;
  const v = data?.[0];
  const verdict = v?.verdict ?? 'UNKNOWN';
  const tone = VERDICT_TONE[verdict] ?? 'neutral';
  return (
    <div className={`rounded-xl p-5 ${tone}-pill`}>
      <div className="text-[11px] uppercase tracking-wider opacity-80">Answer returned to the regulator</div>
      <div className="mt-1 font-heading text-2xl font-bold">{verdict.replace(' - ', ' · ')}</div>
      <div className="mt-1 text-xs opacity-80">IMEI {imei} · no owner, condition or value data leaves the boundary</div>
    </div>
  );
}

export function PassportPage({ tenant }: { tenant: Tenant }) {
  const params = useMemo(() => ({ tenant_schema: sql.string(tenant.schema) }), [tenant.schema]);
  const samples = useAnalyticsQuery('sample_devices', params);
  const [draft, setDraft] = useState('');
  const [imei, setImei] = useState<string | null>(null);

  const open = (value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length < 14) return;
    setDraft(clean);
    setImei(clean);
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="space-y-4">
        <Card className="border-border bg-card">
          <CardContent className="space-y-4">
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); open(draft); }}>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Look up a device record by IMEI" className="pl-9 font-mono" />
              </div>
              <Button type="submit">Open record</Button>
            </form>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Sample devices:</span>
              {samples.loading && <Skeleton className="h-7 w-80" />}
              {(samples.data ?? []).map((s) => (
                <Button key={s.imei} size="sm" variant="outline" className="h-7 text-xs" onClick={() => open(s.imei)}>
                  {s.story} · {s.model}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        {imei ? (
          <PassportCard key={imei} tenant={tenant} imei={imei} />
        ) : (
          <Card className="border-border bg-card">
            <CardContent>
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Every device has a governed record</EmptyTitle>
                  <EmptyDescription>Identity, diagnostics, grading, repairs, value and disposition in one governed record. Pick a sample device above.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
          </Card>
        )}
      </div>

    </div>
  );
}

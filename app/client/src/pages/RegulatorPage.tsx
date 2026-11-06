import { useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
  Textarea,
  useAnalyticsQuery,
} from '@databricks/appkit-ui/react';
import { sql } from '@databricks/appkit-ui/js';
import { BadgeCheck, EyeOff, PackageOpen, ShieldCheck, TriangleAlert } from 'lucide-react';
import { SAMPLE_SHIPMENT } from '../tenants';
import { VerifyResult } from './PassportPage';

const VERDICT: Record<string, { tone: 'pass' | 'fail' | 'warn' | 'neutral'; label: string; action: string }> = {
  'GENUINE - APPROVED': { tone: 'pass', label: 'Genuine · Approved', action: 'Allow on network' },
  'GENUINE - NOT APPROVED': { tone: 'warn', label: 'Genuine · Not approved', action: 'Block: reported stolen or unpaid' },
  'NOT GENUINE': { tone: 'fail', label: 'Not genuine', action: 'Block and seize: counterfeit' },
  UNKNOWN: { tone: 'neutral', label: 'Unknown', action: 'Hold: no device record' },
};

function extractImeis(text: string): string[] {
  return [...new Set(text.match(/\d{14,16}/g) ?? [])];
}

function BatchResult({ imeis }: { imeis: string }) {
  const params = useMemo(() => ({ imeis: sql.string(imeis) }), [imeis]);
  const { data, loading, error } = useAnalyticsQuery('verify_batch', params);
  const order = imeis.split(',');
  const rows = useMemo(
    () => [...(data ?? [])].sort((a, b) => order.indexOf(a.imei) - order.indexOf(b.imei)),
    [data, order],
  );
  if (loading) return <Skeleton className="h-[420px] rounded-xl" />;
  if (error)
    return (
      <Alert variant="destructive">
        <TriangleAlert className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  const count = (v: string) => rows.filter((r) => r.verdict === v).length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(['GENUINE - APPROVED', 'GENUINE - NOT APPROVED', 'NOT GENUINE', 'UNKNOWN'] as const).map((v) => (
          <div key={v} className={`rounded-xl p-4 ${VERDICT[v].tone}-pill`}>
            <div className="text-[11px] uppercase tracking-wider opacity-80">{VERDICT[v].label}</div>
            <div className="font-heading text-3xl font-bold">{count(v)}</div>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2 font-medium">IMEI</th>
              <th className="px-4 py-2 font-medium">Verdict</th>
              <th className="px-4 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const v = VERDICT[r.verdict] ?? VERDICT.UNKNOWN;
              return (
                <tr key={r.imei} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2.5 font-mono">{r.imei}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${v.tone}-pill`}>{v.label}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{v.action}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RegulatorPage() {
  const [draft, setDraft] = useState('');
  const [batch, setBatch] = useState<string | null>(null);
  const [single, setSingle] = useState('');
  const [singleImei, setSingleImei] = useState<string | null>(null);
  const found = extractImeis(draft);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <PackageOpen className="h-4 w-4 brand-text" /> Verify a shipment
          </CardTitle>
          <CardDescription>
            Paste the IMEIs from an import manifest or a batch of network registrations. Each device gets a verdict. Nothing else comes back.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="One IMEI per line, or comma-separated"
            className="min-h-[120px] font-mono text-xs"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setDraft(SAMPLE_SHIPMENT.join('\n'))}>
              Load sample shipment ({SAMPLE_SHIPMENT.length} used phones)
            </Button>
            <Button onClick={() => found.length > 0 && setBatch(found.join(','))} disabled={found.length === 0}>
              <ShieldCheck className="mr-1.5 h-4 w-4" /> Verify {found.length > 0 ? `${found.length} devices` : 'shipment'}
            </Button>
          </div>
          {batch && <BatchResult key={batch} imeis={batch} />}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base">
              <BadgeCheck className="h-4 w-4 brand-text" /> Single device check
            </CardTitle>
            <CardDescription>For a device being registered on a network right now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const c = single.replace(/\D/g, '');
                if (c.length >= 14) setSingleImei(c);
              }}
            >
              <Input value={single} onChange={(e) => setSingle(e.target.value)} placeholder="IMEI" className="font-mono" />
              <Button type="submit" variant="secondary">Verify</Button>
            </form>
            {singleImei && <VerifyResult key={singleImei} imei={singleImei} />}
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base">
              <EyeOff className="h-4 w-4 brand-text" /> What the regulator sees
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Sees</div>
              <div>IMEI and verdict</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Never sees</div>
              <div>Owner, carrier or insurer, condition, repair history, value</div>
            </div>
            <p className="text-xs text-muted-foreground">
              The regulator is granted one governed Unity Catalog function, <span className="font-mono text-foreground">verify_devices()</span>, never the device record tables. The OEM’s and carrier’s raw data stays where it is. In production the verdicts are delivered into the regulator’s own environment through OpenSharing.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

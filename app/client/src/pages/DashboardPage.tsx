import { useState } from 'react';
import { Button, Skeleton } from '@databricks/appkit-ui/react';
import { ExternalLink, LayoutDashboard } from 'lucide-react';
import type { Tenant } from '../tenants';
import { WORKSPACE_HOST, WORKSPACE_ID } from '../tenants';

export function DashboardPage({ tenant }: { tenant: Tenant }) {
  const [loaded, setLoaded] = useState(false);
  const embedUrl = `${WORKSPACE_HOST}/embed/dashboardsv3/${tenant.dashboardId}?o=${WORKSPACE_ID}`;
  const openUrl = `${WORKSPACE_HOST}/dashboardsv3/${tenant.dashboardId}/published?o=${WORKSPACE_ID}`;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LayoutDashboard className="h-4 w-4 brand-text" />
          <span>
            Databricks AI/BI dashboard, embedded. Built in the Databricks UI with no code, on the same governed{' '}
            <span className="font-mono text-foreground">{tenant.schema}</span> views.
          </span>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={openUrl} target="_blank" rel="noreferrer">
            Open in Databricks <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
      <div className="relative overflow-hidden rounded-xl border border-border bg-card" style={{ height: 'calc(100vh - 260px)', minHeight: 720 }}>
        {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
        <iframe
          title={`${tenant.name} executive dashboard`}
          src={embedUrl}
          className="h-full w-full border-0"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}

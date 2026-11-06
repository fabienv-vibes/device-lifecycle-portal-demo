import { useMemo } from 'react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  GenieChatInput,
  GenieChatMessageList,
  useGenieChat,
} from '@databricks/appkit-ui/react';
import { Lock, RotateCcw, Sparkles, TriangleAlert } from 'lucide-react';
import type { Tenant } from '../tenants';

export function AskPage({ tenant, email }: { tenant: Tenant; email: string | null }) {
  const { messages, status, error, sendMessage, reset } = useGenieChat({ alias: tenant.genieAlias, persistInUrl: false });
  const busy = status === 'streaming' || status === 'loading-history';

  const lastSql = useMemo(() => {
    for (const m of [...messages].reverse()) {
      for (const a of m.attachments ?? []) if (a.query?.query) return a.query;
    }
    return null;
  }, [messages]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
      <Card className="flex h-[calc(100vh-250px)] min-h-[640px] flex-col border-border bg-card py-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 brand-text" />
            <span className="font-heading font-bold">Ask {tenant.kind === 'customer' ? `about your ${tenant.name} devices` : 'across all customers'}</span>
          </div>
          <div className="flex items-center gap-3">
            {status === 'streaming' && <span className="text-xs text-muted-foreground">Genie is analyzing your data…</span>}
            <Button variant="ghost" size="sm" onClick={reset} disabled={messages.length === 0}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> New conversation
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 px-8 text-center">
              <div>
                <div className="font-heading text-2xl font-bold">What do you want to know?</div>
                <p className="mt-1 text-sm text-muted-foreground">Plain-English questions, answered from your device data in seconds.</p>
              </div>
              <div className="grid w-full max-w-3xl grid-cols-1 gap-3 md:grid-cols-2">
                {tenant.suggested.map((q) => (
                  <button key={q} type="button" onClick={() => sendMessage(q)}
                    className="rounded-xl border border-border bg-background/40 p-4 text-left text-sm transition-colors hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <GenieChatMessageList messages={messages} status={status} className="h-full" />
          )}
        </div>
        {status === 'error' && (
          <div className="px-5 pb-2">
            <Alert variant="destructive">
              <TriangleAlert className="h-4 w-4" />
              <AlertDescription>{error ?? 'Genie could not answer that. Try rephrasing.'}</AlertDescription>
            </Alert>
          </div>
        )}
        <div className="border-t border-border p-4">
          <GenieChatInput onSend={sendMessage} disabled={busy} placeholder={`Ask a question about ${tenant.kind === 'customer' ? 'your devices' : 'the platform'}…`} />
          <p className="mt-2 text-xs text-muted-foreground">AI-generated from your data by Databricks Genie. Review the generated SQL before relying on a number.</p>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4">
            <div className="shrink-0">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Powered by</div>
              <img src="/genie-lockup-white.svg" alt="Databricks Genie" className="mt-1.5 h-10 w-auto" />
            </div>
            <p className="text-xs text-muted-foreground">
              Plain-English questions turned into governed SQL over your data, with the query shown for every answer.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base"><Lock className="h-4 w-4 brand-text" /> Governed by design</CardTitle>
            <CardDescription>Every answer runs with the signed-in user’s own Databricks permissions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Signed in as</span>
              <Badge variant="secondary" className="font-normal">{email ?? 'Databricks user'}</Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Data scope</span>
              <span className="font-mono text-xs">{tenant.schema}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {tenant.kind === 'customer'
                ? `This Genie space can only see ${tenant.name}'s governed views. Other customers' devices aren't reachable, whatever the question.`
                : 'Internal operations space across all customers, facilities and repair partners.'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-heading text-base">Generated SQL</CardTitle>
            <CardDescription>{lastSql?.title ?? 'How the latest answer was computed'}</CardDescription>
          </CardHeader>
          <CardContent>
            {lastSql?.query ? (
              <pre className="max-h-[320px] overflow-auto rounded-lg bg-background/60 p-3 text-[11px] leading-relaxed text-muted-foreground">{lastSql.query}</pre>
            ) : (
              <p className="text-sm text-muted-foreground">Ask a question to see the SQL Genie writes and runs.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

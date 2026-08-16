import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Key, Plus, Trash2, Webhook as WebhookIcon } from "lucide-react";
import { apiKeyApi, superOfficeBusinessApi, webhookApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { usePagedQuery } from "../../lib/usePagedQuery";
import { PageHeader } from "../../components/StatCard";
import { Button } from "../../components/Button";
import { DataTable, type Column } from "../../components/DataTable";
import { PageLoader, EmptyState, InfoBanner } from "../../components/Feedback";
import { Badge } from "../../components/Badge";
import { Modal, ConfirmDialog } from "../../components/Modal";
import { Field, Input, Select } from "../../components/Field";
import { SecretRevealModal } from "../../components/SecretRevealModal";
import { useToast } from "../../context/ToastContext";
import { formatDateTime } from "../../lib/format";
import type { ApiKeyResponse, CreateApiKeyRequest, CreateWebhookRequest, WebhookDeliveryResponse, WebhookResponse } from "../../types/api";

export function IntegrationsPage() {
  const [tab, setTab] = useState<"webhooks" | "keys">("webhooks");
  return (
    <div className="section-stack">
      <PageHeader title="Integrations" subtitle="Webhooks and API keys span every Business under your Tenant." />
      <div className="tabs">
        <div className={clsx("tab", tab === "webhooks" && "active")} onClick={() => setTab("webhooks")}>Webhooks</div>
        <div className={clsx("tab", tab === "keys" && "active")} onClick={() => setTab("keys")}>API Keys</div>
      </div>
      {tab === "webhooks" ? <WebhooksTab /> : <ApiKeysTab />}
    </div>
  );
}

function WebhooksTab() {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [revealSecret, setRevealSecret] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<WebhookResponse | null>(null);
  const [viewingDeliveries, setViewingDeliveries] = useState<WebhookResponse | null>(null);

  const { items: webhooks, isLoading, paginationProps } = usePagedQuery(["webhooks"], (page, pageSize) => webhookApi.list(page, pageSize));
  const { data: events } = useQuery({ queryKey: ["webhook-events"], queryFn: () => webhookApi.events() });
  const { data: businesses } = useQuery({ queryKey: ["so-businesses"], queryFn: () => superOfficeBusinessApi.list() });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["webhooks"] });

  const createMutation = useMutation({
    mutationFn: (data: CreateWebhookRequest) => webhookApi.create(data),
    onSuccess: (webhook) => {
      invalidate();
      setCreating(false);
      if (webhook.secret) setRevealSecret(webhook.secret);
      notify("Webhook created.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not create webhook.", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => webhookApi.remove(id),
    onSuccess: () => { invalidate(); notify("Webhook deleted.", "success"); setDeleting(null); },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not delete webhook.", "error"),
  });

  const businessName = (id: string) => (id ? businesses?.find((b) => b.id === id)?.name ?? id : "Every Business");

  const columns: Column<WebhookResponse>[] = [
    { key: "url", header: "URL", render: (w) => <span className="cell-mono" style={{ fontSize: 12 }}>{w.url}</span> },
    { key: "scope", header: "Scope", render: (w) => businessName(w.businessId) },
    { key: "events", header: "Events", render: (w) => <span style={{ fontSize: 12 }}>{w.events.join(", ")}</span> },
    {
      key: "health",
      header: "Health",
      render: (w) =>
        w.disabledAt ? (
          <Badge tone="danger">Disabled</Badge>
        ) : w.consecutiveFailures > 0 ? (
          <Badge tone="warning">{w.consecutiveFailures} failing</Badge>
        ) : (
          <Badge tone="success">Healthy</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (w) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <Button size="sm" variant="ghost" onClick={() => setViewingDeliveries(w)}>Deliveries</Button>
          <Button size="sm" variant="ghost" onClick={() => setDeleting(w)} style={{ color: "var(--danger)" }}><Trash2 size={13} /></Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <PageLoader />;

  return (
    <div className="section-stack">
      <div className="page-actions" style={{ justifyContent: "flex-end" }}>
        <Button variant="primary" onClick={() => setCreating(true)}><Plus size={14} /> New webhook</Button>
      </div>
      {webhooks.length === 0 ? (
        <EmptyState icon={WebhookIcon} title="No Webhooks" description="Subscribe an endpoint to order, product or review events." />
      ) : (
        <DataTable columns={columns} rows={webhooks} rowKey={(w) => w.id} pagination={paginationProps} />
      )}

      {creating && (
        <CreateWebhookModal
          events={events ?? []}
          businesses={businesses ?? []}
          onClose={() => setCreating(false)}
          onCreate={(data) => createMutation.mutate(data)}
          loading={createMutation.isPending}
        />
      )}
      {revealSecret && (
        <SecretRevealModal title="Webhook Created" label="The signing secret" secret={revealSecret} onClose={() => setRevealSecret(null)} />
      )}
      {viewingDeliveries && <DeliveriesModal webhook={viewingDeliveries} onClose={() => setViewingDeliveries(null)} />}

      <ConfirmDialog
        open={!!deleting}
        title="Delete Webhook"
        description="This subscription will stop receiving events immediately. This can't be undone."
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function CreateWebhookModal({
  events,
  businesses,
  onClose,
  onCreate,
  loading,
}: {
  events: string[];
  businesses: { id: string; name: string }[];
  onClose: () => void;
  onCreate: (data: CreateWebhookRequest) => void;
  loading: boolean;
}) {
  const { register, handleSubmit, watch, setValue } = useForm<{ url: string; description: string; businessId: string; events: string[] }>({
    defaultValues: { url: "", description: "", businessId: "", events: [] },
  });
  const selected = watch("events");

  return (
    <Modal
      open
      onClose={onClose}
      title="New Webhook"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={loading} onClick={handleSubmit((v) => onCreate(v))}>Create</Button>
        </>
      }
    >
      <form className="section-stack" onSubmit={handleSubmit((v) => onCreate(v))}>
        <Field label="URL" hint="Must be absolute HTTPS">
          <Input {...register("url", { required: true })} placeholder="https://example.com/webhooks/vastora" />
        </Field>
        <Field label="Description" optional><Input {...register("description")} /></Field>
        <Field label="Scope">
          <Select {...register("businessId")}>
            <option value="">Every Business (tenant-wide)</option>
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </Field>
        <div>
          <div className="form-label" style={{ marginBottom: 8 }}>Events</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {events.map((e) => (
              <label key={e} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={selected.includes(e)}
                  onChange={() => setValue("events", selected.includes(e) ? selected.filter((x) => x !== e) : [...selected, e])}
                />
                <span className="cell-mono" style={{ fontSize: 12.5 }}>{e}</span>
              </label>
            ))}
          </div>
        </div>
        <InfoBanner>Payloads are signed with HMAC-SHA256 in an X-Vastora-Signature header — verify it on your endpoint.</InfoBanner>
      </form>
    </Modal>
  );
}

function DeliveriesModal({ webhook, onClose }: { webhook: WebhookResponse; onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ["webhook-deliveries", webhook.id], queryFn: () => webhookApi.deliveries(webhook.id, 1, 50) });
  return (
    <Modal open onClose={onClose} wide title="Delivery Log" footer={<Button variant="primary" onClick={onClose}>Close</Button>}>
      {isLoading ? (
        <PageLoader />
      ) : !data?.items.length ? (
        <p className="text-muted" style={{ fontSize: 13 }}>No deliveries recorded yet.</p>
      ) : (
        <table className="data-table">
          <thead><tr><th>Event</th><th>Status</th><th>Attempts</th><th>When</th></tr></thead>
          <tbody>
            {data.items.map((d: WebhookDeliveryResponse) => (
              <tr key={d.id}>
                <td className="cell-mono" style={{ fontSize: 12 }}>{d.eventName}</td>
                <td><Badge tone={d.succeeded ? "success" : "danger"}>{d.responseStatusCode ?? d.error ?? "Failed"}</Badge></td>
                <td>{d.attemptCount}</td>
                <td className="cell-muted">{formatDateTime(d.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}

function ApiKeysTab() {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [revealSecret, setRevealSecret] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<ApiKeyResponse | null>(null);

  const { items: keys, isLoading, paginationProps } = usePagedQuery(["api-keys"], (page, pageSize) => apiKeyApi.list(page, pageSize));
  const { data: businesses } = useQuery({ queryKey: ["so-businesses"], queryFn: () => superOfficeBusinessApi.list() });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["api-keys"] });

  const createMutation = useMutation({
    mutationFn: (data: CreateApiKeyRequest) => apiKeyApi.create(data),
    onSuccess: (key) => {
      invalidate();
      setCreating(false);
      if (key.secret) setRevealSecret(key.secret);
      notify("API key created.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not create API key.", "error"),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiKeyApi.remove(id),
    onSuccess: () => { invalidate(); notify("API key revoked.", "success"); setRevoking(null); },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not revoke API key.", "error"),
  });

  const businessName = (id: string) => (id ? businesses?.find((b) => b.id === id)?.name ?? id : "Every Business");

  const columns: Column<ApiKeyResponse>[] = [
    { key: "name", header: "Name", render: (k) => <span style={{ fontWeight: 600 }}>{k.name}</span> },
    { key: "keyId", header: "Key ID", render: (k) => <span className="cell-mono">{k.keyId}</span> },
    { key: "scope", header: "Scope", render: (k) => businessName(k.businessId) },
    { key: "scopes", header: "Permissions", render: (k) => k.scopes.join(", ") },
    { key: "status", header: "Status", render: (k) => (k.revokedAt ? <Badge tone="danger">Revoked</Badge> : <Badge tone="success">Active</Badge>) },
    {
      key: "actions",
      header: "",
      render: (k) => (!k.revokedAt ? <Button size="sm" variant="ghost" onClick={() => setRevoking(k)} style={{ color: "var(--danger)" }}><Trash2 size={13} /></Button> : null),
    },
  ];

  if (isLoading) return <PageLoader />;

  return (
    <div className="section-stack">
      <InfoBanner>API keys are issued and validated but not yet accepted as request authentication — build against this, but don't promise it authenticates a live call today.</InfoBanner>
      <div className="page-actions" style={{ justifyContent: "flex-end" }}>
        <Button variant="primary" onClick={() => setCreating(true)}><Plus size={14} /> New API key</Button>
      </div>
      {keys.length === 0 ? (
        <EmptyState icon={Key} title="No API Keys" description="Issue a key scoped to one Business or your whole Tenant." />
      ) : (
        <DataTable columns={columns} rows={keys} rowKey={(k) => k.id} pagination={paginationProps} />
      )}

      {creating && (
        <CreateApiKeyModal businesses={businesses ?? []} onClose={() => setCreating(false)} onCreate={(data) => createMutation.mutate(data)} loading={createMutation.isPending} />
      )}
      {revealSecret && <SecretRevealModal title="API Key Created" label="The full credential" secret={revealSecret} onClose={() => setRevealSecret(null)} />}

      <ConfirmDialog
        open={!!revoking}
        title="Revoke API Key"
        description={<>Revoke <strong>{revoking?.name}</strong>? Any integration using it will stop working immediately.</>}
        confirmLabel="Revoke"
        danger
        loading={revokeMutation.isPending}
        onConfirm={() => revoking && revokeMutation.mutate(revoking.id)}
        onCancel={() => setRevoking(null)}
      />
    </div>
  );
}

function CreateApiKeyModal({
  businesses,
  onClose,
  onCreate,
  loading,
}: {
  businesses: { id: string; name: string }[];
  onClose: () => void;
  onCreate: (data: CreateApiKeyRequest) => void;
  loading: boolean;
}) {
  const { register, handleSubmit } = useForm<{ name: string; businessId: string; readScope: boolean; writeScope: boolean; expiresAt: string }>({
    defaultValues: { name: "", businessId: "", readScope: true, writeScope: false, expiresAt: "" },
  });
  const submit = handleSubmit((v) => {
    const scopes: ("read" | "write")[] = [...(v.readScope ? (["read"] as const) : []), ...(v.writeScope ? (["write"] as const) : [])];
    onCreate({ name: v.name, businessId: v.businessId || null, scopes: scopes.length ? scopes : ["read"], expiresAt: v.expiresAt ? new Date(v.expiresAt).toISOString() : null });
  });
  return (
    <Modal
      open
      onClose={onClose}
      title="New API Key"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={loading} onClick={submit}>Create</Button>
        </>
      }
    >
      <form className="section-stack" onSubmit={submit}>
        <Field label="Name"><Input {...register("name", { required: true })} placeholder="Order sync integration" /></Field>
        <Field label="Scope">
          <Select {...register("businessId")}>
            <option value="">Every Business (tenant-wide)</option>
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </Field>
        <div style={{ display: "flex", gap: 20 }}>
          <label className="checkbox-row"><input type="checkbox" {...register("readScope")} /> Read</label>
          <label className="checkbox-row"><input type="checkbox" {...register("writeScope")} /> Write</label>
        </div>
        <Field label="Expires At" optional><Input type="datetime-local" {...register("expiresAt")} /></Field>
      </form>
    </Modal>
  );
}

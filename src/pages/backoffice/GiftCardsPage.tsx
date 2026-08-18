import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Gift, Plus, Wallet, XCircle } from "lucide-react";
import { customerApi, giftCardApi, storeCreditApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { useBusinessId } from "../../context/useBusinessId";
import { useBusiness } from "../../context/BusinessContext";
import { PageHeader } from "../../components/StatCard";
import { Button } from "../../components/Button";
import { DataTable, type Column } from "../../components/DataTable";
import { PageLoader, EmptyState } from "../../components/Feedback";
import { Badge } from "../../components/Badge";
import { Modal, ConfirmDialog } from "../../components/Modal";
import { Field, Input, Select } from "../../components/Field";
import { SecretRevealModal } from "../../components/SecretRevealModal";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatDateTime, formatMoney } from "../../lib/format";
import type { GiftCardResponse, GrantStoreCreditRequest, IssueGiftCardRequest } from "../../types/api";

export function GiftCardsPage() {
  const [tab, setTab] = useState<"cards" | "credit">("cards");
  return (
    <div className="section-stack">
      <PageHeader title="Gift Cards &amp; Store Credit" subtitle="Issue codes and manage per-customer credit balances." />
      <div className="tabs">
        <div className={clsx("tab", tab === "cards" && "active")} onClick={() => setTab("cards")}>Gift Cards</div>
        <div className={clsx("tab", tab === "credit" && "active")} onClick={() => setTab("credit")}>Store Credit</div>
      </div>
      {tab === "cards" ? <GiftCardsTab /> : <StoreCreditTab />}
    </div>
  );
}

function GiftCardsTab() {
  const businessId = useBusinessId();
  const { business } = useBusiness();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const currency = business?.currency ?? "USD";
  const [issuing, setIssuing] = useState(false);
  const [revealCode, setRevealCode] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<GiftCardResponse | null>(null);

  const { data: cards, isLoading } = useQuery({
    queryKey: ["gift-cards", businessId],
    queryFn: () => giftCardApi.list(businessId, 1, 100).then((r) => r.items),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["gift-cards", businessId] });

  const issueMutation = useMutation({
    mutationFn: (data: IssueGiftCardRequest) => giftCardApi.issue(businessId, data),
    onSuccess: (card) => {
      invalidate();
      setIssuing(false);
      if (card.code) setRevealCode(card.code);
      notify("Gift card issued.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not issue gift card.", "error"),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => giftCardApi.deactivate(businessId, id),
    onSuccess: () => {
      invalidate();
      notify("Gift card deactivated.", "success");
      setDeactivating(null);
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not deactivate gift card.", "error"),
  });

  const columns: Column<GiftCardResponse>[] = [
    { key: "code", header: "Code", render: (c) => <span className="cell-mono">•••• {c.codeSuffix}</span> },
    { key: "balance", header: "Balance", render: (c) => `${formatMoney(c.remainingBalance, currency)} / ${formatMoney(c.initialBalance, currency)}` },
    { key: "issued", header: "Issued To", render: (c) => c.issuedToEmail ?? "—" },
    { key: "expires", header: "Expires", render: (c) => (c.expiresAt ? formatDate(c.expiresAt) : "Never") },
    { key: "status", header: "Status", render: (c) => <Badge tone={c.isActive ? "success" : "neutral"}>{c.isActive ? "Active" : "Deactivated"}</Badge> },
    {
      key: "actions",
      header: "",
      render: (c) =>
        c.isActive ? (
          <Button size="sm" variant="ghost" onClick={() => setDeactivating(c)} style={{ color: "var(--danger)" }}>
            <XCircle size={13} />
          </Button>
        ) : null,
    },
  ];

  if (isLoading) return <PageLoader />;

  return (
    <div className="section-stack">
      <div className="page-actions" style={{ justifyContent: "flex-end" }}>
        <Button variant="primary" onClick={() => setIssuing(true)}><Plus size={14} /> Issue gift card</Button>
      </div>
      {!cards?.length ? (
        <EmptyState icon={Gift} title="No Gift Cards" description="Issue a gift card for a customer or promotion." />
      ) : (
        <DataTable columns={columns} rows={cards} rowKey={(c) => c.id} />
      )}

      {issuing && (
        <IssueModal onClose={() => setIssuing(false)} loading={issueMutation.isPending} onIssue={(data) => issueMutation.mutate(data)} />
      )}
      {revealCode && <SecretRevealModal title="Gift Card Issued" label="This gift card's code" secret={revealCode} onClose={() => setRevealCode(null)} />}

      <ConfirmDialog
        open={!!deactivating}
        title="Deactivate Gift Card"
        description={<>Deactivate the card ending in <strong>{deactivating?.codeSuffix}</strong>? It can no longer be redeemed.</>}
        confirmLabel="Deactivate"
        danger
        loading={deactivateMutation.isPending}
        onConfirm={() => deactivating && deactivateMutation.mutate(deactivating.id)}
        onCancel={() => setDeactivating(null)}
      />
    </div>
  );
}

function IssueModal({ onClose, onIssue, loading }: { onClose: () => void; onIssue: (data: IssueGiftCardRequest) => void; loading: boolean }) {
  const { register, handleSubmit } = useForm<{ amount: number; issuedToEmail: string; expiresAt: string }>({
    defaultValues: { amount: 25, issuedToEmail: "", expiresAt: "" },
  });
  const submit = handleSubmit((v) =>
    onIssue({ amount: v.amount, issuedToEmail: v.issuedToEmail.trim() || null, expiresAt: v.expiresAt ? new Date(v.expiresAt).toISOString() : null }),
  );
  return (
    <Modal
      open
      onClose={onClose}
      title="Issue Gift Card"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={loading} onClick={submit}>Issue</Button>
        </>
      }
    >
      <form className="section-stack" onSubmit={submit}>
        <Field label="Amount"><Input type="number" step="0.01" min="1" {...register("amount", { required: true, valueAsNumber: true })} /></Field>
        <Field label="Issued To (email)" optional><Input type="email" {...register("issuedToEmail")} /></Field>
        <Field label="Expires At" optional><Input type="datetime-local" {...register("expiresAt")} /></Field>
      </form>
    </Modal>
  );
}

function StoreCreditTab() {
  const businessId = useBusinessId();
  const { business } = useBusiness();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const currency = business?.currency ?? "USD";
  const [customerId, setCustomerId] = useState("");
  const [granting, setGranting] = useState(false);

  const { data: customers } = useQuery({ queryKey: ["customers", businessId], queryFn: () => customerApi.list(businessId) });
  const { data: statement, isLoading } = useQuery({
    queryKey: ["store-credit", businessId, customerId],
    queryFn: () => storeCreditApi.statement(businessId, customerId),
    enabled: !!customerId,
  });

  const balance = statement?.balance ?? 0;
  const entries = statement?.recentEntries ?? [];

  const grantMutation = useMutation({
    mutationFn: (data: GrantStoreCreditRequest) => storeCreditApi.grant(businessId, customerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-credit", businessId, customerId] });
      notify("Store credit recorded.", "success");
      setGranting(false);
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not record store credit.", "error"),
  });

  return (
    <div className="section-stack">
      <Field label="Customer">
        <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">Choose a customer…</option>
          {(customers ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.fullName} ({c.email})</option>
          ))}
        </Select>
      </Field>

      {!customerId ? (
        <EmptyState icon={Wallet} title="Select a customer" description="Choose a customer above to see their store credit statement." />
      ) : isLoading ? (
        <PageLoader />
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Current Balance</div>
              <div className="stat-value">{formatMoney(balance, currency)}</div>
            </div>
          </div>
          <div className="page-actions" style={{ justifyContent: "flex-end" }}>
            <Button variant="primary" onClick={() => setGranting(true)}><Plus size={14} /> Grant / deduct credit</Button>
          </div>
          {!entries.length ? (
            <p className="text-muted" style={{ fontSize: 13 }}>No store credit history for this customer yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Amount</th><th>Note</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600, color: e.amount < 0 ? "var(--danger)" : "var(--success)" }}>
                        {e.amount > 0 ? "+" : ""}{formatMoney(e.amount, currency)}
                      </td>
                      <td>{e.note || "—"}</td>
                      <td className="cell-muted">{formatDateTime(e.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {granting && (
        <Modal
          open
          onClose={() => setGranting(false)}
          title="Grant / Deduct Store Credit"
          footer={null}
        >
          <GrantForm loading={grantMutation.isPending} onSubmit={(data) => grantMutation.mutate(data)} onCancel={() => setGranting(false)} />
        </Modal>
      )}
    </div>
  );
}

function GrantForm({ onSubmit, onCancel, loading }: { onSubmit: (data: GrantStoreCreditRequest) => void; onCancel: () => void; loading: boolean }) {
  const { register, handleSubmit } = useForm<{ amount: number; note: string; expiresAt: string }>({
    defaultValues: { amount: 10, note: "", expiresAt: "" },
  });
  return (
    <form
      className="section-stack"
      onSubmit={handleSubmit((v) =>
        onSubmit({ amount: v.amount, note: v.note, expiresAt: v.expiresAt ? new Date(v.expiresAt).toISOString() : null }),
      )}
    >
      <Field label="Amount" hint="Negative amounts deduct"><Input type="number" step="0.01" {...register("amount", { required: true, valueAsNumber: true })} /></Field>
      <Field label="Note"><Input {...register("note", { required: true })} placeholder="Reason for this credit" /></Field>
      <Field label="Expires At" optional hint="Leave blank for a permanent grant"><Input type="datetime-local" {...register("expiresAt")} /></Field>
      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" loading={loading}>Save</Button>
      </div>
    </form>
  );
}

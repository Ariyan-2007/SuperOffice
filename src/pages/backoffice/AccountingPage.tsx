import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { accountingApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { useBusinessId } from "../../context/useBusinessId";
import { useBusiness } from "../../context/BusinessContext";
import { PageHeader, StatCard } from "../../components/StatCard";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { DataTable, type Column } from "../../components/DataTable";
import { PageLoader, EmptyState } from "../../components/Feedback";
import { Modal, ConfirmDialog } from "../../components/Modal";
import { Field, Input, Textarea } from "../../components/Field";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatMoney, toDatetimeLocalValue } from "../../lib/format";
import type { CreateExpenseRequest, ExpenseResponse, UpdateExpenseRequest } from "../../types/api";

interface ExpenseForm {
  category: string;
  amount: number;
  note: string;
  incurredAt: string;
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

// Admin-tier only (BACKOFFICE_FRONTEND_BLUEPRINT.md §7.10, added 2026-08-15) — financial
// records are treated at least as sensitively as coupons. This is single-entry, cash-basis
// bookkeeping for the business owner, not a GAAP system of record.
export function AccountingPage() {
  const businessId = useBusinessId();
  const { business } = useBusiness();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const currency = business?.currency ?? "USD";

  const [editing, setEditing] = useState<ExpenseResponse | "new" | null>(null);
  const [deleting, setDeleting] = useState<ExpenseResponse | null>(null);
  const [from, setFrom] = useState(() => toDatetimeLocalValue(isoDaysAgo(30)));
  const [to, setTo] = useState(() => toDatetimeLocalValue(new Date().toISOString()));

  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses", businessId],
    queryFn: () => accountingApi.listExpenses(businessId),
  });
  const { data: balanceSheet, isLoading: balanceLoading } = useQuery({
    queryKey: ["balance-sheet", businessId],
    queryFn: () => accountingApi.balanceSheet(businessId),
  });
  const {
    data: pnl,
    isLoading: pnlLoading,
    refetch: refetchPnl,
  } = useQuery({
    queryKey: ["pnl", businessId, from, to],
    queryFn: () => accountingApi.profitAndLoss(businessId, new Date(from).toISOString(), new Date(to).toISOString()),
  });

  const invalidateExpenses = () => queryClient.invalidateQueries({ queryKey: ["expenses", businessId] });

  const createMutation = useMutation({
    mutationFn: (data: CreateExpenseRequest) => accountingApi.createExpense(businessId, data),
    onSuccess: () => {
      invalidateExpenses();
      notify("Expense recorded.", "success");
      setEditing(null);
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not record expense.", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExpenseRequest }) => accountingApi.updateExpense(businessId, id, data),
    onSuccess: () => {
      invalidateExpenses();
      notify("Expense updated.", "success");
      setEditing(null);
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not update expense.", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountingApi.removeExpense(businessId, id),
    onSuccess: () => {
      invalidateExpenses();
      notify("Expense deleted.", "success");
      setDeleting(null);
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not delete expense.", "error"),
  });

  const columns: Column<ExpenseResponse>[] = [
    { key: "category", header: "Category", render: (e) => <span style={{ fontWeight: 600 }}>{e.category}</span> },
    { key: "amount", header: "Amount", render: (e) => formatMoney(e.amount, currency) },
    { key: "note", header: "Note", render: (e) => e.note || "—" },
    { key: "incurred", header: "Incurred", render: (e) => formatDate(e.incurredAt) },
    {
      key: "actions",
      header: "",
      render: (e) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <Button size="sm" variant="ghost" onClick={() => setEditing(e)}>
            <Pencil size={13} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDeleting(e)} style={{ color: "var(--danger)" }}>
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="section-stack">
      <PageHeader title="Accounting" subtitle="Operational cash-basis bookkeeping for this Business — not a GAAP system of record." />

      <Card>
        <CardHeader title="Profit &amp; Loss" />
        <CardBody>
          <div className="filter-bar">
            <Field label="From">
              <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To">
              <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
            <Button variant="secondary" onClick={() => refetchPnl()} style={{ marginTop: 20 }}>
              Refresh
            </Button>
          </div>
          {pnlLoading || !pnl ? (
            <PageLoader />
          ) : (
            <div className="stat-grid">
              <StatCard label="Revenue" value={formatMoney(pnl.revenue, currency)} meta="Delivered orders only" />
              <StatCard label="Refunds" value={formatMoney(pnl.refunds, currency)} />
              <StatCard label="Expenses" value={formatMoney(pnl.expenses, currency)} />
              <StatCard label="Delivery Payouts" value={formatMoney(pnl.deliveryPayouts, currency)} />
              <StatCard label="Net Profit" value={formatMoney(pnl.netProfit, currency)} />
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Balance Sheet" actions={<Landmark size={15} color="var(--text-faint)" />} />
        <CardBody>
          {balanceLoading || !balanceSheet ? (
            <PageLoader />
          ) : (
            <dl className="kv-grid">
              <dt>Cash Position</dt>
              <dd>{formatMoney(balanceSheet.cashPosition, currency)}</dd>
              <dt>Inventory Value</dt>
              <dd>{formatMoney(balanceSheet.inventoryValue, currency)}</dd>
              <dt style={{ fontWeight: 650, color: "var(--text)" }}>Total Assets</dt>
              <dd style={{ fontWeight: 650 }}>{formatMoney(balanceSheet.totalAssets, currency)}</dd>
            </dl>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Expenses"
          actions={
            <Button variant="primary" size="sm" onClick={() => setEditing("new")}>
              <Plus size={13} /> New expense
            </Button>
          }
        />
        <CardBody style={{ padding: expensesLoading || expenses?.length ? 0 : undefined }}>
          {expensesLoading ? (
            <PageLoader />
          ) : !expenses?.length ? (
            <EmptyState icon={Receipt} title="No Expenses Recorded" description="Track rent, supplies, and other costs here." />
          ) : (
            <DataTable columns={columns} rows={expenses} rowKey={(e) => e.id} />
          )}
        </CardBody>
      </Card>

      {editing && (
        <ExpenseModal
          expense={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onCreate={(data) => createMutation.mutate(data)}
          onUpdate={(id, data) => updateMutation.mutate({ id, data })}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete Expense"
        description={<>Delete this <strong>{deleting?.category}</strong> expense? This can't be undone.</>}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function ExpenseModal({
  expense,
  onClose,
  onCreate,
  onUpdate,
  loading,
}: {
  expense: ExpenseResponse | null;
  onClose: () => void;
  onCreate: (data: CreateExpenseRequest) => void;
  onUpdate: (id: string, data: UpdateExpenseRequest) => void;
  loading: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExpenseForm>({
    defaultValues: expense
      ? { category: expense.category, amount: expense.amount, note: expense.note, incurredAt: toDatetimeLocalValue(expense.incurredAt) }
      : { category: "", amount: 0, note: "", incurredAt: toDatetimeLocalValue(new Date().toISOString()) },
  });

  const submit = handleSubmit((values) => {
    const data = { category: values.category, amount: values.amount, note: values.note, incurredAt: new Date(values.incurredAt).toISOString() };
    if (expense) onUpdate(expense.id, data);
    else onCreate(data);
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={expense ? "Edit Expense" : "New Expense"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={loading} onClick={submit}>{expense ? "Save changes" : "Record expense"}</Button>
        </>
      }
    >
      <form className="section-stack" onSubmit={submit}>
        <Field label="Category" error={errors.category?.message}>
          <Input hasError={!!errors.category} {...register("category", { required: "Category is required" })} placeholder="Rent, Supplies, …" />
        </Field>
        <Field label="Amount" error={errors.amount?.message}>
          <Input type="number" step="0.01" min="0" hasError={!!errors.amount} {...register("amount", { required: true, valueAsNumber: true, min: 0 })} />
        </Field>
        <Field label="Incurred At">
          <Input type="datetime-local" {...register("incurredAt", { required: true })} />
        </Field>
        <Field label="Note" optional>
          <Textarea rows={3} {...register("note")} />
        </Field>
      </form>
    </Modal>
  );
}

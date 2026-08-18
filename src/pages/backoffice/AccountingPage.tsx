import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Pencil, Plus, Receipt, Search, Trash2 } from "lucide-react";
import { accountingApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { useBusinessId } from "../../context/useBusinessId";
import { useBusiness } from "../../context/BusinessContext";
import { PageHeader, StatCard } from "../../components/StatCard";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { DataTable, type Column } from "../../components/DataTable";
import { PageLoader, EmptyState, WarningBanner } from "../../components/Feedback";
import { Modal, ConfirmDialog } from "../../components/Modal";
import { Field, Input, Textarea } from "../../components/Field";
import { DateRangePicker, type DateRangeValue } from "../../components/DateRangePicker";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatMoney, toDatetimeLocalValue } from "../../lib/format";
import type { CreateExpenseRequest, ExpenseResponse, UpdateExpenseRequest } from "../../types/api";

interface ExpenseForm {
  category: string;
  amount: number;
  note: string;
  incurredAt: string;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

// Matches the DateRangePicker's own "Last 30 days" preset exactly (same day-granularity
// calculation) so the trigger reads "Last 30 days" on first load instead of a raw date span.
function defaultRange(): DateRangeValue {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 29);
  return { from: startOfDay(from).toISOString(), to: endOfDay(today).toISOString() };
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
  const [range, setRange] = useState<DateRangeValue>(defaultRange);
  const [expenseSearch, setExpenseSearch] = useState("");

  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses", businessId],
    queryFn: () => accountingApi.listExpenses(businessId),
  });
  const { data: balanceSheet, isLoading: balanceLoading } = useQuery({
    queryKey: ["balance-sheet", businessId],
    queryFn: () => accountingApi.balanceSheet(businessId),
  });
  const { data: pnl, isLoading: pnlLoading } = useQuery({
    queryKey: ["pnl", businessId, range.from, range.to],
    queryFn: () => accountingApi.profitAndLoss(businessId, range.from, range.to),
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

  const visibleExpenses = useMemo(() => {
    const sorted = [...(expenses ?? [])].sort((a, b) => +new Date(b.incurredAt) - +new Date(a.incurredAt));
    const q = expenseSearch.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((e) => e.category.toLowerCase().includes(q) || e.note.toLowerCase().includes(q));
  }, [expenses, expenseSearch]);

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
        <CardHeader title="Profit &amp; Loss" actions={<DateRangePicker value={range} onChange={setRange} minDate={business?.createdAt} />} />
        <CardBody>
          {pnlLoading || !pnl ? (
            <PageLoader />
          ) : (
            <>
              {pnl.uncostedOrderCount > 0 && (
                <WarningBanner>
                  {pnl.uncostedOrderCount} delivered or picked-up order{pnl.uncostedOrderCount === 1 ? "" : "s"} in this window contributed no
                  cost — gross margin is overstated by an unknown amount. Add cost prices on the Products page to fix this.
                </WarningBanner>
              )}

              <div className="stat-grid" style={{ marginTop: pnl.uncostedOrderCount > 0 ? 16 : 0, marginBottom: 22 }}>
                <StatCard label="Revenue" value={formatMoney(pnl.revenue, currency)} meta="Net of tax, delivered/picked-up orders only" />
                <StatCard
                  label="Gross Profit"
                  value={formatMoney(pnl.grossProfit, currency)}
                  meta={`${pnl.grossMarginPercent}% margin`}
                  tone={pnl.grossProfit >= 0 ? "positive" : "negative"}
                />
                <StatCard
                  label="Net Profit"
                  value={formatMoney(pnl.netProfit, currency)}
                  meta="After expenses & delivery payouts"
                  tone={pnl.netProfit >= 0 ? "positive" : "negative"}
                />
              </div>

              <div className="kv-grid-section" style={{ marginBottom: 10 }}>Breakdown</div>
              <dl className="kv-grid kv-grid-financial">
                <dt>Revenue</dt>
                <dd>{formatMoney(pnl.revenue, currency)}</dd>
                <dt>Refunds</dt>
                <dd>−{formatMoney(pnl.refunds, currency)}</dd>
                <dt>Cost of Goods Sold</dt>
                <dd>−{formatMoney(pnl.costOfGoodsSold, currency)}</dd>
                <dt className="kv-subtotal">Gross Profit</dt>
                <dd className="kv-subtotal">{formatMoney(pnl.grossProfit, currency)}</dd>
                <dt>Expenses</dt>
                <dd>−{formatMoney(pnl.expenses, currency)}</dd>
                <dt>Delivery Payouts</dt>
                <dd>−{formatMoney(pnl.deliveryPayouts, currency)}</dd>
                <dt className="kv-final">Net Profit</dt>
                <dd className={`kv-final ${pnl.netProfit >= 0 ? "positive" : "negative"}`}>{formatMoney(pnl.netProfit, currency)}</dd>
              </dl>
              <p className="text-muted" style={{ fontSize: 12, marginTop: 14, marginBottom: 0 }}>
                Tax collected in this window: <strong>{formatMoney(pnl.taxCollected, currency)}</strong> — held on behalf of the tax authority,
                not part of profit.
              </p>
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Balance Sheet" actions={<Landmark size={15} color="var(--text-faint)" />} />
        <CardBody>
          {balanceLoading || !balanceSheet ? (
            <PageLoader />
          ) : (
            <dl className="kv-grid kv-grid-financial">
              <div className="kv-grid-section">Assets</div>
              <dt>Cash Position</dt>
              <dd>{formatMoney(balanceSheet.cashPosition, currency)}</dd>
              <dt>Inventory Value (Cost)</dt>
              <dd>{formatMoney(balanceSheet.inventoryValueAtCost, currency)}</dd>
              <dt className="kv-subtotal">Total Assets</dt>
              <dd className="kv-subtotal">{formatMoney(balanceSheet.totalAssets, currency)}</dd>

              <div className="kv-grid-section">Liabilities</div>
              <dt>Tax Payable</dt>
              <dd>{formatMoney(balanceSheet.taxPayable, currency)}</dd>
              <dt>Gift Card Liability</dt>
              <dd>{formatMoney(balanceSheet.giftCardLiability, currency)}</dd>
              <dt className="kv-subtotal">Total Liabilities</dt>
              <dd className="kv-subtotal">{formatMoney(balanceSheet.totalLiabilities, currency)}</dd>

              <dt className="kv-final">Net Position</dt>
              <dd className={`kv-final ${balanceSheet.netPosition >= 0 ? "positive" : "negative"}`}>
                {formatMoney(balanceSheet.netPosition, currency)}
              </dd>
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
        <CardBody style={{ padding: 0 }}>
          {expensesLoading ? (
            <div style={{ padding: 20 }}>
              <PageLoader />
            </div>
          ) : !expenses?.length ? (
            <div style={{ padding: 20 }}>
              <EmptyState icon={Receipt} title="No Expenses Recorded" description="Track rent, supplies, and other costs here." />
            </div>
          ) : (
            <>
              <div className="filter-bar" style={{ padding: "16px 20px 0", marginBottom: 4 }}>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: 11, top: 12, color: "var(--text-faint)" }} />
                  <Input
                    style={{ paddingLeft: 32, minWidth: 220 }}
                    placeholder="Search category or note…"
                    value={expenseSearch}
                    onChange={(e) => setExpenseSearch(e.target.value)}
                  />
                </div>
              </div>
              {!visibleExpenses.length ? (
                <div style={{ padding: 20 }}>
                  <EmptyState icon={Search} title="No Matching Expenses" description="Try a different search term." />
                </div>
              ) : (
                <DataTable columns={columns} rows={visibleExpenses} rowKey={(e) => e.id} />
              )}
            </>
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

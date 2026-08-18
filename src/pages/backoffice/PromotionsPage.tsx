import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Mail, Megaphone, Pencil, Plus, Trash2, Users } from "lucide-react";
import { categoryApi, customerGroupApi, productApi, promotionApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { useBusinessId } from "../../context/useBusinessId";
import { PageHeader } from "../../components/StatCard";
import { Button } from "../../components/Button";
import { DataTable, type Column } from "../../components/DataTable";
import { PageLoader, EmptyState } from "../../components/Feedback";
import { Badge } from "../../components/Badge";
import { Modal, ConfirmDialog } from "../../components/Modal";
import { Field, Input, Select } from "../../components/Field";
import { SendDiscountEmailModal } from "../../components/SendDiscountEmailModal";
import { useToast } from "../../context/ToastContext";
import type {
  CreatePromotionRequest,
  CustomerGroupRequest,
  CustomerGroupResponse,
  OfferVisibility,
  PromotionEffect,
  PromotionResponse,
  PromotionScope,
} from "../../types/api";

interface PromotionForm {
  name: string;
  code: string;
  effect: PromotionEffect;
  scope: PromotionScope;
  value: number;
  buyQuantity: number;
  getQuantity: number;
  minOrderAmount: string;
  firstOrderOnly: boolean;
  maxUses: string;
  maxUsesPerCustomer: string;
  priority: number;
  stackable: boolean;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  visibility: OfferVisibility;
  productIds: string[];
  categoryIds: string[];
  customerGroupIds: string[];
}

export function PromotionsPage() {
  const [tab, setTab] = useState<"promotions" | "groups">("promotions");
  return (
    <div className="section-stack">
      <PageHeader title="Promotions &amp; Customer Groups" subtitle="Campaigns sit alongside Coupons — a different, richer mental model, not a replacement." />
      <div className="tabs">
        <div className={clsx("tab", tab === "promotions" && "active")} onClick={() => setTab("promotions")}>Promotions</div>
        <div className={clsx("tab", tab === "groups" && "active")} onClick={() => setTab("groups")}>Customer Groups</div>
      </div>
      {tab === "promotions" ? <PromotionsTab /> : <CustomerGroupsTab />}
    </div>
  );
}

function PromotionsTab() {
  const businessId = useBusinessId();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PromotionResponse | "new" | null>(null);
  const [deleting, setDeleting] = useState<PromotionResponse | null>(null);
  const [sendingCode, setSendingCode] = useState<string | null>(null);

  const { data: promotions, isLoading } = useQuery({
    queryKey: ["promotions", businessId],
    queryFn: () => promotionApi.list(businessId, 1, 200).then((r) => r.items),
  });
  const { data: categories } = useQuery({ queryKey: ["categories", businessId], queryFn: () => categoryApi.list(businessId) });
  const { data: products } = useQuery({ queryKey: ["products-all", businessId], queryFn: () => productApi.list(businessId, { pageSize: 200 }).then((r) => r.items) });
  const { data: groups } = useQuery({
    queryKey: ["customer-groups", businessId],
    queryFn: () => customerGroupApi.list(businessId, 1, 200).then((r) => r.items),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["promotions", businessId] });

  const createMutation = useMutation({
    mutationFn: (data: CreatePromotionRequest) => promotionApi.create(businessId, data),
    onSuccess: () => {
      invalidate();
      notify("Promotion created.", "success");
      setEditing(null);
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not create promotion.", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreatePromotionRequest }) => promotionApi.update(businessId, id, data),
    onSuccess: () => {
      invalidate();
      notify("Promotion updated.", "success");
      setEditing(null);
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not update promotion.", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => promotionApi.remove(businessId, id),
    onSuccess: () => {
      invalidate();
      notify("Promotion deleted.", "success");
      setDeleting(null);
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not delete promotion.", "error"),
  });

  const columns: Column<PromotionResponse>[] = [
    { key: "name", header: "Name", render: (p) => <span style={{ fontWeight: 600 }}>{p.name}</span> },
    { key: "code", header: "Code", render: (p) => (p.code ? <span className="cell-mono">{p.code}</span> : <Badge tone="brand">Automatic</Badge>) },
    { key: "effect", header: "Effect", render: (p) => p.effect },
    { key: "uses", header: "Uses", render: (p) => `${p.usedCount}${p.maxUses ? ` / ${p.maxUses}` : ""}` },
    { key: "priority", header: "Priority", render: (p) => p.priority },
    { key: "status", header: "Status", render: (p) => <Badge tone={p.isActive ? "success" : "neutral"}>{p.isActive ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          {p.code && (
            <Button size="sm" variant="ghost" onClick={() => setSendingCode(p.code!)} title="Send to customers">
              <Mail size={13} />
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Pencil size={13} /></Button>
          <Button size="sm" variant="ghost" onClick={() => setDeleting(p)} style={{ color: "var(--danger)" }}><Trash2 size={13} /></Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <PageLoader />;

  return (
    <div className="section-stack">
      <div className="page-actions" style={{ justifyContent: "flex-end" }}>
        <Button variant="primary" onClick={() => setEditing("new")}>
          <Plus size={14} /> New promotion
        </Button>
      </div>

      {!promotions?.length ? (
        <EmptyState icon={Megaphone} title="No Promotions" description="Create an automatic or coded campaign." />
      ) : (
        <DataTable columns={columns} rows={promotions} rowKey={(p) => p.id} />
      )}

      {editing && (
        <PromotionModal
          promotion={editing === "new" ? null : editing}
          categories={categories ?? []}
          products={products ?? []}
          groups={groups ?? []}
          onClose={() => setEditing(null)}
          onCreate={(data) => createMutation.mutate(data)}
          onUpdate={(id, data) => updateMutation.mutate({ id, data })}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete Promotion"
        description={<>Delete <strong>{deleting?.name}</strong>? This can't be undone.</>}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />

      {sendingCode && <SendDiscountEmailModal code={sendingCode} onClose={() => setSendingCode(null)} />}
    </div>
  );
}

function PromotionModal({
  promotion,
  categories,
  products,
  groups,
  onClose,
  onCreate,
  onUpdate,
  loading,
}: {
  promotion: PromotionResponse | null;
  categories: { id: string; name: string }[];
  products: { id: string; name: string }[];
  groups: CustomerGroupResponse[];
  onClose: () => void;
  onCreate: (data: CreatePromotionRequest) => void;
  onUpdate: (id: string, data: CreatePromotionRequest) => void;
  loading: boolean;
}) {
  const { register, handleSubmit, watch, setValue } = useForm<PromotionForm>({
    defaultValues: promotion
      ? {
          name: promotion.name,
          code: promotion.code ?? "",
          effect: promotion.effect,
          scope: promotion.scope,
          value: promotion.value,
          buyQuantity: promotion.buyQuantity,
          getQuantity: promotion.getQuantity,
          minOrderAmount: promotion.minOrderAmount != null ? String(promotion.minOrderAmount) : "",
          firstOrderOnly: promotion.firstOrderOnly,
          maxUses: promotion.maxUses != null ? String(promotion.maxUses) : "",
          maxUsesPerCustomer: promotion.maxUsesPerCustomer != null ? String(promotion.maxUsesPerCustomer) : "",
          priority: promotion.priority,
          stackable: promotion.stackable,
          startsAt: promotion.startsAt.slice(0, 16),
          endsAt: promotion.endsAt ? promotion.endsAt.slice(0, 16) : "",
          isActive: promotion.isActive,
          visibility: promotion.visibility,
          productIds: promotion.productIds,
          categoryIds: promotion.categoryIds,
          customerGroupIds: promotion.customerGroupIds,
        }
      : {
          name: "",
          code: "",
          effect: "PercentageOff",
          scope: "Order",
          value: 10,
          buyQuantity: 1,
          getQuantity: 1,
          minOrderAmount: "",
          firstOrderOnly: false,
          maxUses: "",
          maxUsesPerCustomer: "",
          priority: 1,
          stackable: false,
          startsAt: new Date().toISOString().slice(0, 16),
          endsAt: "",
          isActive: true,
          visibility: "Public",
          productIds: [],
          categoryIds: [],
          customerGroupIds: [],
        },
  });

  const effect = watch("effect");
  const scope = watch("scope");
  const code = watch("code");
  const productIds = watch("productIds");
  const categoryIds = watch("categoryIds");
  const customerGroupIds = watch("customerGroupIds");

  const toggle = (field: "productIds" | "categoryIds" | "customerGroupIds", id: string, current: string[]) => {
    setValue(field, current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };

  const submit = handleSubmit((v) => {
    const data: CreatePromotionRequest = {
      name: v.name,
      code: v.code.trim() ? v.code.trim().toUpperCase() : null,
      effect: v.effect,
      scope: v.scope,
      value: v.value,
      productIds: v.scope === "Products" ? v.productIds : [],
      categoryIds: v.scope === "Categories" ? v.categoryIds : [],
      buyQuantity: v.buyQuantity,
      getQuantity: v.getQuantity,
      minOrderAmount: v.minOrderAmount.trim() === "" ? null : Number(v.minOrderAmount),
      customerGroupIds: v.customerGroupIds,
      firstOrderOnly: v.firstOrderOnly,
      maxUses: v.maxUses.trim() === "" ? null : Number(v.maxUses),
      maxUsesPerCustomer: v.maxUsesPerCustomer.trim() === "" ? null : Number(v.maxUsesPerCustomer),
      priority: v.priority,
      stackable: v.stackable,
      startsAt: new Date(v.startsAt).toISOString(),
      endsAt: v.endsAt ? new Date(v.endsAt).toISOString() : null,
      isActive: v.isActive,
      visibility: v.visibility,
    };
    if (promotion) onUpdate(promotion.id, data);
    else onCreate(data);
  });

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={promotion ? "Edit Promotion" : "New Promotion"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={loading} onClick={submit}>{promotion ? "Save changes" : "Create promotion"}</Button>
        </>
      }
    >
      <form className="section-stack" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Name" className="span-2"><Input {...register("name", { required: true })} /></Field>
          <Field label="Code" optional hint="Blank = automatic, applies with no code typed">
            <Input {...register("code")} placeholder="SUMMER25" />
          </Field>
          <Field label="Priority" hint="Lower runs first">
            <Input type="number" {...register("priority", { valueAsNumber: true })} />
          </Field>
          <Field label="Effect">
            <Select {...register("effect")}>
              <option value="PercentageOff">Percentage off</option>
              <option value="FixedAmountOff">Fixed amount off</option>
              <option value="FreeShipping">Free shipping</option>
              <option value="BuyXGetY">Buy X get Y</option>
            </Select>
          </Field>
          <Field label="Scope">
            <Select {...register("scope")}>
              <option value="Order">Whole order</option>
              <option value="Products">Specific products</option>
              <option value="Categories">Specific categories</option>
            </Select>
          </Field>
          {(effect === "PercentageOff" || effect === "FixedAmountOff") && (
            <Field label={effect === "PercentageOff" ? "Percent Off" : "Amount Off"}>
              <Input type="number" step="0.01" min="0" {...register("value", { valueAsNumber: true })} />
            </Field>
          )}
          {effect === "BuyXGetY" && (
            <>
              <Field label="Buy Quantity"><Input type="number" min="1" {...register("buyQuantity", { valueAsNumber: true })} /></Field>
              <Field label="Get Quantity"><Input type="number" min="1" {...register("getQuantity", { valueAsNumber: true })} /></Field>
            </>
          )}
          <Field label="Min Order Amount" optional><Input type="number" step="0.01" min="0" {...register("minOrderAmount")} /></Field>
          <Field label="Max Uses (total)" optional><Input type="number" min="0" {...register("maxUses")} /></Field>
          <Field label="Max Uses Per Customer" optional><Input type="number" min="0" {...register("maxUsesPerCustomer")} /></Field>
          <Field label="Starts At"><Input type="datetime-local" {...register("startsAt", { required: true })} /></Field>
          <Field label="Ends At" optional><Input type="datetime-local" {...register("endsAt")} /></Field>
        </div>

        <div style={{ display: "flex", gap: 20 }}>
          <label className="checkbox-row"><input type="checkbox" {...register("firstOrderOnly")} /> First order only</label>
          <label className="checkbox-row"><input type="checkbox" {...register("stackable")} /> Stackable with other promotions</label>
          <label className="checkbox-row"><input type="checkbox" {...register("isActive")} /> Active</label>
        </div>

        {code.trim() && (
          <Field label="Availability" hint="Meaningless for automatic promotions (no code) — only shown here when a code is set">
            <Select {...register("visibility")}>
              <option value="Public">Show as an available offer</option>
              <option value="Hidden">Only by direct code entry</option>
            </Select>
          </Field>
        )}

        {scope === "Products" && (
          <MultiSelectList label="Applies to products" items={products} selected={productIds} onToggle={(id) => toggle("productIds", id, productIds)} />
        )}
        {scope === "Categories" && (
          <MultiSelectList label="Applies to categories" items={categories} selected={categoryIds} onToggle={(id) => toggle("categoryIds", id, categoryIds)} />
        )}
        <MultiSelectList
          label="Restrict to customer groups"
          hint="Empty = everyone"
          items={groups.map((g) => ({ id: g.id, name: g.name }))}
          selected={customerGroupIds}
          onToggle={(id) => toggle("customerGroupIds", id, customerGroupIds)}
        />
      </form>
    </Modal>
  );
}

function MultiSelectList({
  label,
  hint,
  items,
  selected,
  onToggle,
}: {
  label: string;
  hint?: string;
  items: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <div className="form-label" style={{ marginBottom: 8 }}>
        {label} {hint && <span className="optional">({hint})</span>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 140, overflowY: "auto", padding: 10, border: "1px solid var(--border)", borderRadius: 8 }}>
        {items.length === 0 && <span className="text-muted" style={{ fontSize: 12.5 }}>Nothing available.</span>}
        {items.map((item) => (
          <label key={item.id} className="checkbox-row" style={{ fontSize: 12.5 }}>
            <input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} /> {item.name}
          </label>
        ))}
      </div>
    </div>
  );
}

function CustomerGroupsTab() {
  const businessId = useBusinessId();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CustomerGroupResponse | "new" | null>(null);
  const [deleting, setDeleting] = useState<CustomerGroupResponse | null>(null);

  const { data: groups, isLoading } = useQuery({
    queryKey: ["customer-groups", businessId],
    queryFn: () => customerGroupApi.list(businessId, 1, 200).then((r) => r.items),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["customer-groups", businessId] });

  const createMutation = useMutation({
    mutationFn: (data: CustomerGroupRequest) => customerGroupApi.create(businessId, data),
    onSuccess: () => { invalidate(); notify("Customer group created.", "success"); setEditing(null); },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not create group.", "error"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CustomerGroupRequest }) => customerGroupApi.update(businessId, id, data),
    onSuccess: () => { invalidate(); notify("Customer group updated.", "success"); setEditing(null); },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not update group.", "error"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => customerGroupApi.remove(businessId, id),
    onSuccess: () => { invalidate(); notify("Customer group deleted.", "success"); setDeleting(null); },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not delete group.", "error"),
  });

  const columns: Column<CustomerGroupResponse>[] = [
    { key: "name", header: "Name", render: (g) => <span style={{ fontWeight: 600 }}>{g.name}</span> },
    { key: "discount", header: "Discount", render: (g) => (g.discountPercent != null ? `${g.discountPercent}%` : "—") },
    { key: "members", header: "Members", render: (g) => g.memberCount },
    { key: "status", header: "Status", render: (g) => <Badge tone={g.isActive ? "success" : "neutral"}>{g.isActive ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions",
      header: "",
      render: (g) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <Button size="sm" variant="ghost" onClick={() => setEditing(g)}><Pencil size={13} /></Button>
          <Button size="sm" variant="ghost" onClick={() => setDeleting(g)} style={{ color: "var(--danger)" }}><Trash2 size={13} /></Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <PageLoader />;

  return (
    <div className="section-stack">
      <div className="page-actions" style={{ justifyContent: "flex-end" }}>
        <Button variant="primary" onClick={() => setEditing("new")}><Plus size={14} /> New group</Button>
      </div>
      {!groups?.length ? (
        <EmptyState icon={Users} title="No Customer Groups" description="Group customers to target promotions or apply a standing discount." />
      ) : (
        <DataTable columns={columns} rows={groups} rowKey={(g) => g.id} />
      )}
      {editing && (
        <Modal
          open
          onClose={() => setEditing(null)}
          title={editing === "new" ? "New Customer Group" : "Edit Customer Group"}
          footer={<GroupFormFooter editing={editing} onClose={() => setEditing(null)} createMutation={createMutation} updateMutation={updateMutation} />}
        >
          <GroupForm
            group={editing === "new" ? null : editing}
            formId="group-form"
            onSubmit={(data) => {
              if (editing === "new") createMutation.mutate(data);
              else updateMutation.mutate({ id: editing.id, data });
            }}
          />
        </Modal>
      )}
      <ConfirmDialog
        open={!!deleting}
        title="Delete Customer Group"
        description={<>Delete <strong>{deleting?.name}</strong>? This can't be undone.</>}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function GroupForm({ group, formId, onSubmit }: { group: CustomerGroupResponse | null; formId: string; onSubmit: (data: CustomerGroupRequest) => void }) {
  const { register, handleSubmit } = useForm<{ name: string; description: string; discountPercent: string; isActive: boolean }>({
    defaultValues: group
      ? { name: group.name, description: group.description, discountPercent: group.discountPercent != null ? String(group.discountPercent) : "", isActive: group.isActive }
      : { name: "", description: "", discountPercent: "", isActive: true },
  });
  return (
    <form
      id={formId}
      className="section-stack"
      onSubmit={handleSubmit((v) =>
        onSubmit({ name: v.name, description: v.description, discountPercent: v.discountPercent.trim() === "" ? null : Number(v.discountPercent), isActive: v.isActive }),
      )}
    >
      <Field label="Name"><Input {...register("name", { required: true })} /></Field>
      <Field label="Description" optional><Input {...register("description")} /></Field>
      <Field label="Discount %" optional hint="Standing discount for members"><Input type="number" step="0.01" min="0" {...register("discountPercent")} /></Field>
      <label className="checkbox-row"><input type="checkbox" {...register("isActive")} /> Active</label>
    </form>
  );
}

function GroupFormFooter({
  editing,
  onClose,
  createMutation,
  updateMutation,
}: {
  editing: CustomerGroupResponse | "new";
  onClose: () => void;
  createMutation: { isPending: boolean };
  updateMutation: { isPending: boolean };
}) {
  return (
    <>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button type="submit" form="group-form" variant="primary" loading={createMutation.isPending || updateMutation.isPending}>
        {editing === "new" ? "Create group" : "Save changes"}
      </Button>
    </>
  );
}

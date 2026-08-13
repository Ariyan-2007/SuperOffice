import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Pencil, Plus, Rocket, Trash2 } from "lucide-react";
import { productApi, categoryApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { useBusinessId } from "../../context/useBusinessId";
import { useBusiness } from "../../context/BusinessContext";
import { PageHeader } from "../../components/StatCard";
import { Button } from "../../components/Button";
import { DataTable, type Column } from "../../components/DataTable";
import { PageLoader, EmptyState } from "../../components/Feedback";
import { Modal, ConfirmDialog } from "../../components/Modal";
import { Field, Input, Textarea, Select } from "../../components/Field";
import { useToast } from "../../context/ToastContext";
import { formatMoney } from "../../lib/format";
import type { CreateProductRequest, ProductResponse, ProductStatus, UpdateProductRequest } from "../../types/api";

interface ProductForm {
  categoryId: string;
  name: string;
  sku: string;
  description: string;
  price: number;
  compareAtPrice: string;
  stockQuantity: number;
  trackInventory: boolean;
  images: string;
  tags: string;
}

const STATUS_OPTIONS: ProductStatus[] = ["Draft", "Active", "OutOfStock", "Archived"];

export function ProductsPage() {
  const businessId = useBusinessId();
  const { business } = useBusiness();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "All">("All");
  const [editing, setEditing] = useState<ProductResponse | "new" | null>(null);
  const [deleting, setDeleting] = useState<ProductResponse | null>(null);

  const { data: products, isLoading } = useQuery({ queryKey: ["products", businessId], queryFn: () => productApi.list(businessId) });
  const { data: categories } = useQuery({ queryKey: ["categories", businessId], queryFn: () => categoryApi.list(businessId) });

  const categoryName = useMemo(() => {
    const map = new Map((categories ?? []).map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? "—";
  }, [categories]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["products", businessId] });

  const createMutation = useMutation({
    mutationFn: (data: CreateProductRequest) => productApi.create(businessId, data),
    onSuccess: () => {
      invalidate();
      notify("Product created as Draft. Publish it when it's ready.", "success");
      setEditing(null);
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not create product.", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductRequest }) => productApi.update(businessId, id, data),
    onSuccess: () => {
      invalidate();
      notify("Product updated.", "success");
      setEditing(null);
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not update product.", "error"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProductStatus }) => productApi.setStatus(businessId, id, status),
    onSuccess: (_data, vars) => {
      invalidate();
      notify(vars.status === "Active" ? "Product published." : `Status changed to ${vars.status}.`, "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not change status.", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productApi.remove(businessId, id),
    onSuccess: () => {
      invalidate();
      notify("Product deleted.", "success");
      setDeleting(null);
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not delete product.", "error"),
  });

  const filtered = (products ?? []).filter((p) => statusFilter === "All" || p.status === statusFilter);

  const columns: Column<ProductResponse>[] = [
    {
      key: "name",
      header: "Product",
      render: (p) => (
        <div>
          <div style={{ fontWeight: 600 }}>{p.name}</div>
          <div className="cell-mono cell-muted" style={{ fontSize: 11.5 }}>{p.sku}</div>
        </div>
      ),
    },
    { key: "category", header: "Category", render: (p) => categoryName(p.categoryId) },
    {
      key: "price",
      header: "Price",
      render: (p) => (
        <div>
          <span style={{ fontWeight: 600 }}>{formatMoney(p.effectivePrice, business?.currency ?? "USD")}</span>
          {p.effectivePrice !== p.price && (
            <span className="cell-muted" style={{ marginLeft: 6, textDecoration: "line-through", fontSize: 12 }}>
              {formatMoney(p.price, business?.currency ?? "USD")}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      render: (p) => (p.trackInventory ? <span className={p.stockQuantity <= 5 ? "" : "cell-muted"} style={p.stockQuantity <= 5 ? { color: "var(--warning)", fontWeight: 600 } : undefined}>{p.stockQuantity}</span> : <span className="cell-muted">Untracked</span>),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <select
          className="select"
          style={{ height: 30, fontSize: 12, width: "auto", paddingRight: 26 }}
          value={p.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => statusMutation.mutate({ id: p.id, status: e.target.value as ProductStatus })}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          {p.status === "Draft" && (
            <Button size="sm" variant="primary" onClick={() => statusMutation.mutate({ id: p.id, status: "Active" })}>
              <Rocket size={12} /> Publish
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
            <Pencil size={13} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDeleting(p)} style={{ color: "var(--danger)" }}>
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <PageLoader />;

  return (
    <div className="section-stack">
      <PageHeader
        title="Products"
        subtitle="New products start as Draft and stay hidden from the Shop until you publish them."
        actions={
          <Button variant="primary" onClick={() => setEditing("new")} disabled={!categories?.length}>
            <Plus size={14} /> New product
          </Button>
        }
      />

      <div className="filter-bar">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ProductStatus | "All")}>
          <option value="All">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>

      {!categories?.length ? (
        <EmptyState icon={Package} title="Create a category first" description="Products need a category to belong to." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Package} title="No products" description="Try a different status filter, or create a new product." />
      ) : (
        <DataTable columns={columns} rows={filtered} rowKey={(p) => p.id} />
      )}

      {editing && categories && (
        <ProductModal
          product={editing === "new" ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onCreate={(data) => createMutation.mutate(data)}
          onUpdate={(id, data) => updateMutation.mutate({ id, data })}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete product"
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

function ProductModal({
  product,
  categories,
  onClose,
  onCreate,
  onUpdate,
  loading,
}: {
  product: ProductResponse | null;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onCreate: (data: CreateProductRequest) => void;
  onUpdate: (id: string, data: UpdateProductRequest) => void;
  loading: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductForm>({
    defaultValues: product
      ? {
          categoryId: product.categoryId,
          name: product.name,
          sku: product.sku,
          description: product.description,
          price: product.price,
          compareAtPrice: product.compareAtPrice != null ? String(product.compareAtPrice) : "",
          stockQuantity: product.stockQuantity,
          trackInventory: product.trackInventory,
          images: product.images.join(", "),
          tags: product.tags.join(", "),
        }
      : {
          categoryId: categories[0]?.id ?? "",
          name: "",
          sku: "",
          description: "",
          price: 0,
          compareAtPrice: "",
          stockQuantity: 0,
          trackInventory: true,
          images: "",
          tags: "",
        },
  });

  const submit = handleSubmit((values) => {
    const images = values.images.split(",").map((s) => s.trim()).filter(Boolean);
    const tags = values.tags.split(",").map((s) => s.trim()).filter(Boolean);
    const compareAtPrice = values.compareAtPrice.trim() === "" ? null : Number(values.compareAtPrice);

    if (product) {
      onUpdate(product.id, {
        categoryId: values.categoryId,
        name: values.name,
        description: values.description,
        price: values.price,
        compareAtPrice,
        discountPercent: product.discountPercent,
        discountExpiresAt: product.discountExpiresAt,
        stockQuantity: values.stockQuantity,
        trackInventory: values.trackInventory,
        images,
        tags,
      });
    } else {
      onCreate({
        categoryId: values.categoryId,
        name: values.name,
        sku: values.sku,
        description: values.description,
        price: values.price,
        compareAtPrice,
        stockQuantity: values.stockQuantity,
        trackInventory: values.trackInventory,
        images,
        tags,
      });
    }
  });

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={product ? "Edit product" : "New product"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={loading} onClick={submit}>{product ? "Save changes" : "Create product"}</Button>
        </>
      }
    >
      <form className="section-stack" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Name" error={errors.name?.message} className="span-2">
            <Input hasError={!!errors.name} {...register("name", { required: "Name is required" })} />
          </Field>
          <Field label="Category" error={errors.categoryId?.message}>
            <Select hasError={!!errors.categoryId} {...register("categoryId", { required: true })}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="SKU" error={errors.sku?.message}>
            <Input disabled={!!product} hasError={!!errors.sku} {...register("sku", { required: "SKU is required" })} />
          </Field>
          <Field label="Price" error={errors.price?.message}>
            <Input type="number" step="0.01" min="0" hasError={!!errors.price} {...register("price", { required: true, valueAsNumber: true, min: 0 })} />
          </Field>
          <Field label="Compare-at price" optional>
            <Input type="number" step="0.01" min="0" {...register("compareAtPrice")} />
          </Field>
          <Field label="Stock quantity">
            <Input type="number" min="0" {...register("stockQuantity", { valueAsNumber: true, min: 0 })} />
          </Field>
          <Field label="Track inventory">
            <label className="checkbox-row" style={{ height: 38 }}>
              <input type="checkbox" {...register("trackInventory")} /> Reduce stock automatically on sale
            </label>
          </Field>
          <Field label="Description" className="span-2">
            <Textarea rows={3} {...register("description")} />
          </Field>
          <Field label="Image URLs" hint="Comma-separated. No upload endpoint yet — host images elsewhere and paste URLs." className="span-2">
            <Input {...register("images")} placeholder="https://…, https://…" />
          </Field>
          <Field label="Tags" hint="Comma-separated" className="span-2">
            <Input {...register("tags")} placeholder="summer, featured" />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

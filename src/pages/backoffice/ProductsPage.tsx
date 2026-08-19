import { useMemo, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Download, ImagePlus, Package, Pencil, Plus, Rocket, Search, Trash2, Upload, X } from "lucide-react";
import { productApi, categoryApi, inventoryApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { useBusinessId } from "../../context/useBusinessId";
import { useBusiness } from "../../context/BusinessContext";
import { useAuth } from "../../auth/AuthContext";
import { ADMIN_LEVEL } from "../../routes/backofficeRoles";
import { usePagedQuery } from "../../lib/usePagedQuery";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { RemoteImage } from "../../components/RemoteImage";
import { PageHeader } from "../../components/StatCard";
import { Button } from "../../components/Button";
import { DataTable, type Column } from "../../components/DataTable";
import { PageLoader, EmptyState } from "../../components/Feedback";
import { Modal, ConfirmDialog } from "../../components/Modal";
import { Field, Input, Textarea, Select } from "../../components/Field";
import { useToast } from "../../context/ToastContext";
import { formatDateTime, formatMoney } from "../../lib/format";
import type {
  AdjustStockRequest,
  CreateProductRequest,
  ProductImportResult,
  ProductResponse,
  ProductStatus,
  ProductVariantRequest,
  UpdateProductRequest,
} from "../../types/api";

interface ProductForm {
  categoryId: string;
  name: string;
  sku: string;
  description: string;
  price: number;
  compareAtPrice: string;
  stockQuantity: number;
  trackInventory: boolean;
  reorderThreshold: string;
  reorderQuantity: string;
  images: string;
  tags: string;
  variants: ProductVariantRequest[];
  costPrice: string;
  brand: string;
  barcode: string;
  weightKg: string;
  metaTitle: string;
  metaDescription: string;
  isFeatured: boolean;
  sortWeight: number;
  taxClass: string;
}

const STATUS_OPTIONS: ProductStatus[] = ["Draft", "Active", "OutOfStock", "Archived"];

export function ProductsPage() {
  const businessId = useBusinessId();
  const { business } = useBusiness();
  const { user } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const canDelete = ADMIN_LEVEL.includes(user!.role);
  const canImportExport = ADMIN_LEVEL.includes(user!.role);
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "All">("All");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [editing, setEditing] = useState<ProductResponse | "new" | null>(null);
  const [deleting, setDeleting] = useState<ProductResponse | null>(null);
  const [adjusting, setAdjusting] = useState<ProductResponse | null>(null);
  const [importResult, setImportResult] = useState<ProductImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { items: products, isLoading, paginationProps } = usePagedQuery(
    ["products", businessId, search],
    (page, pageSize) => productApi.list(businessId, { search: search || undefined, page, pageSize }),
  );
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

  const importMutation = useMutation({
    mutationFn: (file: File) => productApi.importCsv(businessId, file),
    onSuccess: (result) => {
      invalidate();
      setImportResult(result);
      notify(`Import finished — ${result.created} created, ${result.updated} updated.`, "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not import products.", "error"),
  });

  const exportCsv = async () => {
    try {
      const csv = await productApi.exportCsv(businessId);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${business?.slug ?? "products"}-products.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Could not export products.", "error");
    }
  };

  // Products only take a server-side `search` param per the blueprint — status is filtered
  // within whatever page came back, same as before pagination existed.
  const filtered = products.filter((p) => statusFilter === "All" || p.status === statusFilter);

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
      key: "margin",
      header: "Margin",
      render: (p) => (p.unitMargin != null ? formatMoney(p.unitMargin, business?.currency ?? "USD") : <span className="cell-muted">No cost set</span>),
    },
    {
      key: "stock",
      header: "Stock",
      render: (p) =>
        p.trackInventory ? (
          <span
            className={p.reorderThreshold != null && p.stockQuantity <= p.reorderThreshold ? "" : "cell-muted"}
            style={p.reorderThreshold != null && p.stockQuantity <= p.reorderThreshold ? { color: "var(--warning)", fontWeight: 600 } : undefined}
          >
            {p.stockQuantity}
          </span>
        ) : (
          <span className="cell-muted">Untracked</span>
        ),
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
          <Button size="sm" variant="ghost" onClick={() => setAdjusting(p)} title="Adjust stock">
            <Boxes size={13} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
            <Pencil size={13} />
          </Button>
          {canDelete && (
            <Button size="sm" variant="ghost" onClick={() => setDeleting(p)} style={{ color: "var(--danger)" }}>
              <Trash2 size={13} />
            </Button>
          )}
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
          <>
            {canImportExport && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) importMutation.mutate(file);
                  }}
                />
                <Button variant="secondary" loading={importMutation.isPending} onClick={() => fileInputRef.current?.click()}>
                  <Upload size={14} /> Import CSV
                </Button>
                <Button variant="secondary" onClick={exportCsv}>
                  <Download size={14} /> Export CSV
                </Button>
              </>
            )}
            <Button variant="primary" onClick={() => setEditing("new")} disabled={!categories?.length}>
              <Plus size={14} /> New product
            </Button>
          </>
        }
      />

      <div className="filter-bar">
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: 12, color: "var(--text-faint)" }} />
          <Input
            style={{ paddingLeft: 32, minWidth: 220 }}
            placeholder="Search name or SKU…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ProductStatus | "All")}>
          <option value="All">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>

      {!categories?.length ? (
        <EmptyState icon={Package} title="Create A Category First" description="Products need a category to belong to." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Package} title="No Products" description="Try a different search or status filter, or create a new product." />
      ) : (
        <DataTable columns={columns} rows={filtered} rowKey={(p) => p.id} pagination={paginationProps} />
      )}

      {editing && categories && (
        <ProductModal
          product={editing === "new" ? null : editing}
          categories={categories}
          businessId={businessId}
          onClose={() => setEditing(null)}
          onCreate={(data) => createMutation.mutate(data)}
          onUpdate={(id, data) => updateMutation.mutate({ id, data })}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {adjusting && (
        <StockModal
          product={adjusting}
          businessId={businessId}
          onClose={() => setAdjusting(null)}
          onAdjusted={() => invalidate()}
        />
      )}

      {importResult && (
        <Modal open onClose={() => setImportResult(null)} title="Import Results" footer={<Button variant="primary" onClick={() => setImportResult(null)}>Done</Button>}>
          <div className="section-stack">
            <div className="stat-grid">
              <div className="stat-card"><div className="stat-label">Created</div><div className="stat-value">{importResult.created}</div></div>
              <div className="stat-card"><div className="stat-label">Updated</div><div className="stat-value">{importResult.updated}</div></div>
              <div className="stat-card"><div className="stat-label">Skipped</div><div className="stat-value">{importResult.skipped}</div></div>
            </div>
            {importResult.errors.length > 0 && (
              <div>
                <div className="form-label" style={{ marginBottom: 8 }}>Errors</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--danger)", display: "flex", flexDirection: "column", gap: 4 }}>
                  {importResult.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete Product"
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
  businessId,
  onClose,
  onCreate,
  onUpdate,
  loading,
}: {
  product: ProductResponse | null;
  categories: { id: string; name: string }[];
  businessId: string;
  onClose: () => void;
  onCreate: (data: CreateProductRequest) => void;
  onUpdate: (id: string, data: UpdateProductRequest) => void;
  loading: boolean;
}) {
  const { notify } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
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
          reorderThreshold: product.reorderThreshold != null ? String(product.reorderThreshold) : "",
          reorderQuantity: product.reorderQuantity != null ? String(product.reorderQuantity) : "",
          images: product.images.join(", "),
          tags: product.tags.join(", "),
          variants: product.variants,
          costPrice: product.costPrice != null ? String(product.costPrice) : "",
          brand: product.brand,
          barcode: product.barcode,
          weightKg: product.weightKg != null ? String(product.weightKg) : "",
          metaTitle: product.metaTitle,
          metaDescription: product.metaDescription,
          isFeatured: product.isFeatured,
          sortWeight: product.sortWeight,
          taxClass: product.taxClass,
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
          reorderThreshold: "",
          reorderQuantity: "",
          images: "",
          tags: "",
          variants: [],
          costPrice: "",
          brand: "",
          barcode: "",
          weightKg: "",
          metaTitle: "",
          metaDescription: "",
          isFeatured: false,
          sortWeight: 0,
          taxClass: "",
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });
  const imagesValue = watch("images");
  const images = imagesValue.split(",").map((s) => s.trim()).filter(Boolean);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => productApi.uploadImage(businessId, product!.id, file),
    onSuccess: (updated) => {
      setValue("images", updated.images.join(", "), { shouldDirty: true });
      notify("Image uploaded.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not upload image.", "error"),
    onSettled: () => setUploading(false),
  });

  const submit = handleSubmit((values) => {
    const tags = values.tags.split(",").map((s) => s.trim()).filter(Boolean);
    const compareAtPrice = values.compareAtPrice.trim() === "" ? null : Number(values.compareAtPrice);
    const reorderThreshold = values.reorderThreshold.trim() === "" ? null : Number(values.reorderThreshold);
    const reorderQuantity = values.reorderQuantity.trim() === "" ? null : Number(values.reorderQuantity);
    const variants = values.variants.length ? values.variants : null;
    const costPrice = values.costPrice.trim() === "" ? null : Number(values.costPrice);
    const weightKg = values.weightKg.trim() === "" ? null : Number(values.weightKg);

    if (product) {
      onUpdate(product.id, {
        categoryId: values.categoryId,
        name: values.name,
        description: values.description,
        price: values.price,
        compareAtPrice,
        discountPercent: product.discountPercent,
        discountExpiresAt: product.discountExpiresAt,
        trackInventory: values.trackInventory,
        reorderThreshold,
        reorderQuantity,
        images,
        tags,
        variants,
        costPrice,
        brand: values.brand,
        barcode: values.barcode,
        weightKg,
        metaTitle: values.metaTitle,
        metaDescription: values.metaDescription,
        isFeatured: values.isFeatured,
        sortWeight: values.sortWeight,
        taxClass: values.taxClass,
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
        variants,
        costPrice,
        brand: values.brand,
        barcode: values.barcode,
        weightKg,
        metaTitle: values.metaTitle,
        metaDescription: values.metaDescription,
        isFeatured: values.isFeatured,
        sortWeight: values.sortWeight,
        taxClass: values.taxClass,
      });
    }
  });

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={product ? "Edit Product" : "New Product"}
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
          <Field label="Compare-At Price" optional>
            <Input type="number" step="0.01" min="0" {...register("compareAtPrice")} />
          </Field>
          <Field label="Cost Price" optional hint="Drives margin, COGS and the balance sheet — the single highest-value field to keep accurate.">
            <Input type="number" step="0.01" min="0" {...register("costPrice")} />
          </Field>
          {product ? (
            <Field label="Stock Quantity" hint="Use the Adjust Stock action on the product list to change this — every change is logged.">
              <Input type="number" value={product.stockQuantity} disabled />
            </Field>
          ) : (
            <Field label="Stock Quantity">
              <Input type="number" min="0" {...register("stockQuantity", { valueAsNumber: true, min: 0 })} />
            </Field>
          )}
          <Field label="Track Inventory">
            <label className="checkbox-row" style={{ height: 38 }}>
              <input type="checkbox" {...register("trackInventory")} /> Reduce stock automatically on sale
            </label>
          </Field>
          {product && (
            <>
              <Field label="Reorder Threshold" optional hint="Product appears in Inventory → Low Stock at or below this level.">
                <Input type="number" min="0" {...register("reorderThreshold")} />
              </Field>
              <Field label="Reorder Quantity" optional hint="Informational — how much you usually restock at once.">
                <Input type="number" min="0" {...register("reorderQuantity")} />
              </Field>
            </>
          )}
          <Field label="Description" className="span-2">
            <Textarea rows={3} {...register("description")} />
          </Field>
          <Field
            label="Images"
            className="span-2"
            hint={product ? "Comma-separated URLs, or upload a file (JPEG/PNG/WEBP/GIF, 5MB max)." : "Comma-separated. Upload becomes available after creating the product."}
          >
            <Input {...register("images")} placeholder="https://…, https://…" />
          </Field>
          {images.length > 0 && (
            <div className="span-2" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {images.map((url, i) => (
                <div key={url + i} style={{ position: "relative" }}>
                  <RemoteImage src={url} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setValue("images", images.filter((_, idx) => idx !== i).join(", "), { shouldDirty: true })}
                    style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22 }}
                    aria-label="Remove image"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {product && (
            <div className="span-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) {
                    setUploading(true);
                    uploadMutation.mutate(file);
                  }
                }}
              />
              <Button type="button" variant="secondary" size="sm" loading={uploading} onClick={() => fileInputRef.current?.click()}>
                <ImagePlus size={13} /> Upload image
              </Button>
            </div>
          )}
          <Field label="Tags" hint="Comma-separated" className="span-2">
            <Input {...register("tags")} placeholder="summer, featured" />
          </Field>
        </div>

        <div>
          <div className="form-label" style={{ marginBottom: 8 }}>Merchandising &amp; SEO</div>
          <div className="form-grid">
            <Field label="Brand" optional>
              <Input {...register("brand")} />
            </Field>
            <Field label="Barcode" optional>
              <Input {...register("barcode")} />
            </Field>
            <Field label="Weight (kg)" optional>
              <Input type="number" step="0.01" min="0" {...register("weightKg")} />
            </Field>
            <Field label="Tax Class" optional hint="Resolved against Business.tax.classRates">
              <Input {...register("taxClass")} placeholder="standard" />
            </Field>
            <Field label="Sort Weight" optional hint="Drives the storefront's Relevance sort">
              <Input type="number" {...register("sortWeight", { valueAsNumber: true })} />
            </Field>
            <Field label="Featured">
              <label className="checkbox-row" style={{ height: 38 }}>
                <input type="checkbox" {...register("isFeatured")} /> Show in featured placements
              </label>
            </Field>
            <Field label="Meta Title" optional className="span-2">
              <Input {...register("metaTitle")} />
            </Field>
            <Field label="Meta Description" optional className="span-2">
              <Textarea rows={2} {...register("metaDescription")} />
            </Field>
          </div>
        </div>

        <div>
          <div className="form-label" style={{ marginBottom: 8 }}>
            Variants <span className="optional">(optional — catalog-only, checkout still uses the base product)</span>
          </div>
          <div className="section-stack" style={{ gap: 10 }}>
            {fields.map((field, index) => (
              <div key={field.id} className="form-grid" style={{ alignItems: "end", gridTemplateColumns: "1.4fr 1fr 1fr 0.8fr auto" }}>
                <Field label="Attributes" hint={index === 0 ? "e.g. Size: L / Color: Blue" : undefined}>
                  <Input {...register(`variants.${index}.attributeSummary` as const, { required: true })} />
                </Field>
                <Field label="SKU">
                  <Input {...register(`variants.${index}.sku` as const, { required: true })} />
                </Field>
                <Field label="Price Override" optional>
                  <Input type="number" step="0.01" min="0" {...register(`variants.${index}.priceOverride` as const, { valueAsNumber: true })} />
                </Field>
                <Field label="Stock">
                  <Input type="number" min="0" {...register(`variants.${index}.stockQuantity` as const, { valueAsNumber: true, min: 0 })} />
                </Field>
                <Button type="button" variant="ghost" onClick={() => remove(index)} style={{ color: "var(--danger)" }}>
                  <Trash2 size={13} />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => append({ attributeSummary: "", sku: "", priceOverride: null, stockQuantity: 0 })}
              style={{ width: "fit-content" }}
            >
              <Plus size={13} /> Add variant
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function StockModal({
  product,
  businessId,
  onClose,
  onAdjusted,
}: {
  product: ProductResponse;
  businessId: string;
  onClose: () => void;
  onAdjusted: () => void;
}) {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ quantityDelta: number; reason: string; type: AdjustStockRequest["type"] }>({
    defaultValues: { quantityDelta: 0, reason: "", type: "Restock" },
  });

  const { data: movements, isLoading } = useQuery({
    queryKey: ["stock-movements", businessId, product.id],
    queryFn: () => inventoryApi.stockMovements(businessId, product.id, 1, 100).then((r) => r.items),
  });

  const adjustMutation = useMutation({
    mutationFn: (data: AdjustStockRequest) => inventoryApi.adjustStock(businessId, product.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements", businessId, product.id] });
      onAdjusted();
      notify("Stock adjusted.", "success");
      reset({ quantityDelta: 0, reason: "", type: "Restock" });
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not adjust stock.", "error"),
  });

  return (
    <Modal open onClose={onClose} wide title={`Stock — ${product.name}`}>
      <div className="section-stack">
        <div className="text-muted" style={{ fontSize: 13 }}>
          Current stock: <strong style={{ color: "var(--text)" }}>{product.stockQuantity}</strong>
        </div>

        <form
          className="form-grid"
          style={{ alignItems: "end" }}
          onSubmit={handleSubmit((v) =>
            adjustMutation.mutate({ quantityDelta: v.quantityDelta, reason: v.reason, type: v.type }),
          )}
        >
          <Field label="Quantity Delta" hint="Positive adds stock, negative removes it" error={errors.quantityDelta?.message}>
            <Input type="number" hasError={!!errors.quantityDelta} {...register("quantityDelta", { required: true, valueAsNumber: true, validate: (v) => v !== 0 || "Must not be zero" })} />
          </Field>
          <Field label="Type">
            <Select {...register("type")}>
              <option value="Restock">Restock</option>
              <option value="Adjustment">Adjustment</option>
              <option value="DamageWriteOff">Damage / write-off</option>
            </Select>
          </Field>
          <Field label="Reason" error={errors.reason?.message}>
            <Input hasError={!!errors.reason} {...register("reason", { required: "Reason is required" })} />
          </Field>
          <Button type="submit" variant="primary" loading={adjustMutation.isPending}>
            Apply
          </Button>
        </form>

        <div>
          <div className="form-label" style={{ marginBottom: 8 }}>History</div>
          {isLoading ? (
            <PageLoader />
          ) : !movements?.length ? (
            <p className="text-muted" style={{ fontSize: 13 }}>No stock movements recorded yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Change</th>
                    <th>Reason</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {[...movements]
                    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
                    .map((m) => (
                      <tr key={m.id}>
                        <td>{m.type}</td>
                        <td style={{ fontWeight: 600, color: m.quantityDelta < 0 ? "var(--danger)" : "var(--success)" }}>
                          {m.quantityDelta > 0 ? "+" : ""}
                          {m.quantityDelta}
                        </td>
                        <td className="cell-muted">{m.reason || "—"}</td>
                        <td className="cell-muted">{formatDateTime(m.createdAt)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, FolderTree, List, GitBranch, ImagePlus, X } from "lucide-react";
import { categoryApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { RemoteImage } from "../../components/RemoteImage";
import { useBusinessId } from "../../context/useBusinessId";
import { useAuth } from "../../auth/AuthContext";
import { ADMIN_LEVEL } from "../../routes/backofficeRoles";
import { PageHeader } from "../../components/StatCard";
import { Button } from "../../components/Button";
import { DataTable, type Column } from "../../components/DataTable";
import { PageLoader, EmptyState } from "../../components/Feedback";
import { Badge } from "../../components/Badge";
import { Modal, ConfirmDialog } from "../../components/Modal";
import { Field, Input, Textarea, Select } from "../../components/Field";
import { useToast } from "../../context/ToastContext";
import type { CategoryResponse, CategoryTreeNode, CreateCategoryRequest, UpdateCategoryRequest } from "../../types/api";

interface CategoryForm {
  name: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  parentCategoryId: string;
  isActive: "true" | "false";
}

// A category can't become its own descendant's parent — the server rejects it (400,
// `parentCategoryId`) since it'd turn the tree into a cycle the /tree endpoint can't walk.
function getDescendantIds(categoryId: string, categories: CategoryResponse[]): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const c of categories) {
    if (c.parentCategoryId) {
      const siblings = childrenByParent.get(c.parentCategoryId) ?? [];
      siblings.push(c.id);
      childrenByParent.set(c.parentCategoryId, siblings);
    }
  }
  const descendants = new Set<string>();
  const stack = [...(childrenByParent.get(categoryId) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (descendants.has(id)) continue;
    descendants.add(id);
    stack.push(...(childrenByParent.get(id) ?? []));
  }
  return descendants;
}

function categoryDepth(categoryId: string, categories: CategoryResponse[]): number {
  const byId = new Map(categories.map((c) => [c.id, c]));
  let depth = 0;
  let current = byId.get(categoryId);
  const seen = new Set<string>();
  while (current?.parentCategoryId && !seen.has(current.id)) {
    seen.add(current.id);
    depth += 1;
    current = byId.get(current.parentCategoryId);
  }
  return depth;
}

export function CategoriesPage() {
  const businessId = useBusinessId();
  const { user } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const canDelete = ADMIN_LEVEL.includes(user!.role);
  const [editing, setEditing] = useState<CategoryResponse | "new" | null>(null);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CategoryResponse | null>(null);
  const [view, setView] = useState<"flat" | "tree">("flat");

  const { data: categories, isLoading } = useQuery({ queryKey: ["categories", businessId], queryFn: () => categoryApi.list(businessId) });
  const { data: tree, isLoading: treeLoading } = useQuery({
    queryKey: ["categories-tree", businessId],
    queryFn: () => categoryApi.tree(businessId),
    enabled: view === "tree",
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["categories", businessId] });
    queryClient.invalidateQueries({ queryKey: ["categories-tree", businessId] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateCategoryRequest) => categoryApi.create(businessId, data),
    onSuccess: () => {
      invalidate();
      notify("Category created.", "success");
      setEditing(null);
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not create category.", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryRequest }) => categoryApi.update(businessId, id, data),
    onSuccess: () => {
      invalidate();
      notify("Category updated.", "success");
      setEditing(null);
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not update category.", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoryApi.remove(businessId, id),
    onSuccess: () => {
      invalidate();
      notify("Category deleted.", "success");
      setDeleting(null);
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not delete category.", "error"),
  });

  const categoryName = (id: string | null) => (id ? (categories ?? []).find((c) => c.id === id)?.name ?? "—" : "—");

  const columns: Column<CategoryResponse>[] = [
    {
      key: "name",
      header: "Name",
      render: (c) => (
        <span style={{ fontWeight: 600, paddingLeft: categoryDepth(c.id, categories ?? []) * 16 }}>
          {categoryDepth(c.id, categories ?? []) > 0 && <GitBranch size={11} color="var(--text-faint)" style={{ marginRight: 6, verticalAlign: "middle" }} />}
          {c.name}
        </span>
      ),
    },
    { key: "slug", header: "Slug", render: (c) => <span className="cell-mono cell-muted">{c.slug}</span> },
    { key: "parent", header: "Parent Category", render: (c) => <span className="text-muted">{categoryName(c.parentCategoryId)}</span> },
    { key: "sort", header: "Sort Order", render: (c) => c.sortOrder },
    { key: "status", header: "Status", render: (c) => <Badge tone={c.isActive ? "success" : "neutral"}>{c.isActive ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (c) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <Button
            size="sm"
            variant="ghost"
            title="Add subcategory"
            onClick={() => {
              setCreateParentId(c.id);
              setEditing("new");
            }}
          >
            <Plus size={13} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
            <Pencil size={13} />
          </Button>
          {canDelete && (
            <Button size="sm" variant="ghost" onClick={() => setDeleting(c)} style={{ color: "var(--danger)" }}>
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
        title="Categories"
        subtitle="Organize your catalog, as a flat list or a nested tree."
        actions={
          <>
            <div className="filter-bar" style={{ marginBottom: 0 }}>
              <Button size="sm" variant={view === "flat" ? "secondary" : "ghost"} onClick={() => setView("flat")}>
                <List size={13} /> Flat
              </Button>
              <Button size="sm" variant={view === "tree" ? "secondary" : "ghost"} onClick={() => setView("tree")}>
                <GitBranch size={13} /> Tree
              </Button>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setCreateParentId(null);
                setEditing("new");
              }}
            >
              <Plus size={14} /> New category
            </Button>
          </>
        }
      />

      {categories && categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No Categories Yet"
          description="Create your first category to start organizing products."
          action={
            <Button variant="primary" onClick={() => setEditing("new")} style={{ marginTop: 8 }}>
              <Plus size={14} /> New category
            </Button>
          }
        />
      ) : view === "flat" ? (
        <DataTable columns={columns} rows={categories ?? []} rowKey={(c) => c.id} />
      ) : treeLoading || !tree ? (
        <PageLoader />
      ) : (
        <CategoryTreeView
          nodes={tree}
          onEdit={(id) => {
            const category = (categories ?? []).find((c) => c.id === id);
            if (category) setEditing(category);
          }}
          onAddChild={(id) => {
            setCreateParentId(id);
            setEditing("new");
          }}
          onDelete={
            canDelete
              ? (id) => {
                  const category = (categories ?? []).find((c) => c.id === id);
                  if (category) setDeleting(category);
                }
              : undefined
          }
        />
      )}

      {editing && (
        <CategoryModal
          category={editing === "new" ? null : editing}
          categories={categories ?? []}
          businessId={businessId}
          defaultParentId={editing === "new" ? createParentId : null}
          onClose={() => setEditing(null)}
          onSubmit={(values) => {
            if (editing === "new") {
              createMutation.mutate({
                name: values.name,
                description: values.description,
                imageUrl: values.imageUrl,
                sortOrder: values.sortOrder,
                parentCategoryId: values.parentCategoryId || null,
              });
            } else {
              updateMutation.mutate({
                id: editing.id,
                data: {
                  name: values.name,
                  parentCategoryId: values.parentCategoryId || null,
                  description: values.description,
                  imageUrl: values.imageUrl,
                  sortOrder: values.sortOrder,
                  isActive: values.isActive === "true",
                },
              });
            }
          }}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete Category"
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

function CategoryModal({
  category,
  categories,
  businessId,
  defaultParentId,
  onClose,
  onSubmit,
  loading,
}: {
  category: CategoryResponse | null;
  categories: CategoryResponse[];
  businessId: string;
  defaultParentId: string | null;
  onClose: () => void;
  onSubmit: (values: CategoryForm) => void;
  loading: boolean;
}) {
  const { notify } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CategoryForm>({
    defaultValues: category
      ? {
          name: category.name,
          description: category.description,
          imageUrl: category.imageUrl,
          sortOrder: category.sortOrder,
          parentCategoryId: category.parentCategoryId ?? "",
          isActive: category.isActive ? "true" : "false",
        }
      : { name: "", description: "", imageUrl: "", sortOrder: 0, parentCategoryId: defaultParentId ?? "", isActive: "true" },
  });

  const imageUrl = watch("imageUrl");

  const uploadMutation = useMutation({
    mutationFn: (file: File) => categoryApi.uploadImage(businessId, category!.id, file),
    onSuccess: (updated) => {
      setValue("imageUrl", updated.imageUrl, { shouldDirty: true });
      notify("Image uploaded.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not upload image.", "error"),
  });

  // A category can't be re-parented under itself or its own descendants — exclude both
  // so the picker can never offer a choice the server would 400 as a cycle.
  const excluded = category ? new Set([category.id, ...getDescendantIds(category.id, categories)]) : new Set<string>();
  const parentOptions = categories
    .filter((c) => !excluded.has(c.id))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Modal
      open
      onClose={onClose}
      title={category ? "Edit Category" : "New Category"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={loading} onClick={handleSubmit(onSubmit)}>{category ? "Save changes" : "Create category"}</Button>
        </>
      }
    >
      <form className="section-stack" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Name" error={errors.name?.message}>
          <Input hasError={!!errors.name} {...register("name", { required: "Name is required" })} />
        </Field>
        <Field label="Parent Category" optional>
          <Select {...register("parentCategoryId")}>
            <option value="">— Top level —</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {"— ".repeat(categoryDepth(c.id, categories))}
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description">
          <Textarea rows={3} {...register("description")} />
        </Field>
        <div className="form-grid">
          <Field label="Sort Order">
            <Input type="number" {...register("sortOrder", { valueAsNumber: true })} />
          </Field>
          <Field
            label="Image URL"
            optional
            hint={category ? "Or upload a file (JPEG/PNG/WEBP/GIF, 5MB max)." : "Upload becomes available after creating the category."}
          >
            <Input {...register("imageUrl")} placeholder="https://…" />
          </Field>
        </div>
        {(imageUrl || category) && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {imageUrl && (
              <div style={{ position: "relative" }}>
                <RemoteImage src={imageUrl} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setValue("imageUrl", "", { shouldDirty: true })}
                  style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22 }}
                  aria-label="Remove image"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            {category && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) uploadMutation.mutate(file);
                  }}
                />
                <Button type="button" variant="secondary" size="sm" loading={uploadMutation.isPending} onClick={() => fileInputRef.current?.click()}>
                  <ImagePlus size={13} /> Upload image
                </Button>
              </div>
            )}
          </div>
        )}
        {category && (
          <Field label="Status">
            <Select {...register("isActive")}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </Field>
        )}
      </form>
    </Modal>
  );
}

// Server-provided nested tree (BACKOFFICE_FRONTEND_BLUEPRINT.md §7.3, added 2026-08-15) —
// no client-side tree-building needed, just render the nesting the API already gives us.
function CategoryTreeView({
  nodes,
  onEdit,
  onAddChild,
  onDelete,
  depth = 0,
}: {
  nodes: CategoryTreeNode[];
  onEdit: (id: string) => void;
  onAddChild: (id: string) => void;
  onDelete?: (id: string) => void;
  depth?: number;
}) {
  if (nodes.length === 0 && depth === 0) {
    return <EmptyState icon={FolderTree} title="No Categories Yet" description="Create your first category to start organizing products." />;
  }

  return (
    <div className="card" style={{ padding: depth === 0 ? 8 : 0 }}>
      {nodes.map((node) => (
        <div key={node.id}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              marginLeft: depth * 22,
              borderRadius: 8,
            }}
          >
            <FolderTree size={14} color="var(--text-faint)" />
            <span style={{ fontWeight: 600, fontSize: 13.5, flex: 1 }}>{node.name}</span>
            {node.children.length > 0 && (
              <span className="text-muted" style={{ fontSize: 12 }}>
                {node.children.length} sub{node.children.length === 1 ? "" : "s"}
              </span>
            )}
            <Badge tone={node.isActive ? "success" : "neutral"}>{node.isActive ? "Active" : "Inactive"}</Badge>
            <span className="text-muted" style={{ fontSize: 12 }}>Sort {node.sortOrder}</span>
            <Button size="sm" variant="ghost" title="Add subcategory" onClick={() => onAddChild(node.id)}>
              <Plus size={13} />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onEdit(node.id)}>
              <Pencil size={13} />
            </Button>
            {onDelete && (
              <Button size="sm" variant="ghost" onClick={() => onDelete(node.id)} style={{ color: "var(--danger)" }}>
                <Trash2 size={13} />
              </Button>
            )}
          </div>
          {node.children.length > 0 && (
            <CategoryTreeView nodes={node.children} onEdit={onEdit} onAddChild={onAddChild} onDelete={onDelete} depth={depth + 1} />
          )}
        </div>
      ))}
    </div>
  );
}

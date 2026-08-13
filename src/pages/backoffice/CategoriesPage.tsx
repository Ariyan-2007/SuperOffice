import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, FolderTree } from "lucide-react";
import { categoryApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { useBusinessId } from "../../context/useBusinessId";
import { PageHeader } from "../../components/StatCard";
import { Button } from "../../components/Button";
import { DataTable, type Column } from "../../components/DataTable";
import { PageLoader, EmptyState } from "../../components/Feedback";
import { Badge } from "../../components/Badge";
import { Modal, ConfirmDialog } from "../../components/Modal";
import { Field, Input, Textarea, Select } from "../../components/Field";
import { useToast } from "../../context/ToastContext";
import type { CategoryResponse, CreateCategoryRequest, UpdateCategoryRequest } from "../../types/api";

interface CategoryForm {
  name: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  parentCategoryId: string;
  isActive: "true" | "false";
}

export function CategoriesPage() {
  const businessId = useBusinessId();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CategoryResponse | "new" | null>(null);
  const [deleting, setDeleting] = useState<CategoryResponse | null>(null);

  const { data: categories, isLoading } = useQuery({ queryKey: ["categories", businessId], queryFn: () => categoryApi.list(businessId) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["categories", businessId] });

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

  const columns: Column<CategoryResponse>[] = [
    { key: "name", header: "Name", render: (c) => <span style={{ fontWeight: 600 }}>{c.name}</span> },
    { key: "slug", header: "Slug", render: (c) => <span className="cell-mono cell-muted">{c.slug}</span> },
    { key: "sort", header: "Sort order", render: (c) => c.sortOrder },
    { key: "status", header: "Status", render: (c) => <Badge tone={c.isActive ? "success" : "neutral"}>{c.isActive ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (c) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
            <Pencil size={13} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDeleting(c)} style={{ color: "var(--danger)" }}>
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
        title="Categories"
        subtitle="Organize your catalog. Categories are shown as a flat list."
        actions={
          <Button variant="primary" onClick={() => setEditing("new")}>
            <Plus size={14} /> New category
          </Button>
        }
      />

      {categories && categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No categories yet"
          description="Create your first category to start organizing products."
          action={
            <Button variant="primary" onClick={() => setEditing("new")} style={{ marginTop: 8 }}>
              <Plus size={14} /> New category
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={categories ?? []} rowKey={(c) => c.id} />
      )}

      {editing && (
        <CategoryModal
          category={editing === "new" ? null : editing}
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
        title="Delete category"
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
  onClose,
  onSubmit,
  loading,
}: {
  category: CategoryResponse | null;
  onClose: () => void;
  onSubmit: (values: CategoryForm) => void;
  loading: boolean;
}) {
  const {
    register,
    handleSubmit,
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
      : { name: "", description: "", imageUrl: "", sortOrder: 0, parentCategoryId: "", isActive: "true" },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={category ? "Edit category" : "New category"}
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
        <Field label="Description">
          <Textarea rows={3} {...register("description")} />
        </Field>
        <div className="form-grid">
          <Field label="Sort order">
            <Input type="number" {...register("sortOrder", { valueAsNumber: true })} />
          </Field>
          <Field label="Image URL" optional>
            <Input {...register("imageUrl")} />
          </Field>
        </div>
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

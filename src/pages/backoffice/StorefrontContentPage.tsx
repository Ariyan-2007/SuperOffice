import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { contentApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { useBusinessId } from "../../context/useBusinessId";
import { PageHeader } from "../../components/StatCard";
import { Button } from "../../components/Button";
import { DataTable, type Column } from "../../components/DataTable";
import { PageLoader, EmptyState } from "../../components/Feedback";
import { Badge } from "../../components/Badge";
import { Modal, ConfirmDialog } from "../../components/Modal";
import { Field, Input, Select, Textarea } from "../../components/Field";
import { useToast } from "../../context/ToastContext";
import { toDatetimeLocalValue } from "../../lib/format";
import type { ContentBlockRequest, ContentBlockResponse, ContentBlockType } from "../../types/api";

const TYPES: ContentBlockType[] = ["Banner", "Page", "MenuItem", "Article"];

export function StorefrontContentPage() {
  const businessId = useBusinessId();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<ContentBlockType>("Banner");
  const [editing, setEditing] = useState<ContentBlockResponse | "new" | null>(null);
  const [deleting, setDeleting] = useState<ContentBlockResponse | null>(null);

  const { data: blocks, isLoading } = useQuery({
    queryKey: ["content", businessId, typeFilter],
    queryFn: () => contentApi.list(businessId, typeFilter, 1, 200).then((r) => r.items),
  });
  const { data: allBlocks } = useQuery({
    queryKey: ["content", businessId, "all"],
    queryFn: () => contentApi.list(businessId, undefined, 1, 200).then((r) => r.items),
  });
  const menuItems = (allBlocks ?? []).filter((b) => b.type === "MenuItem");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["content", businessId] });

  const createMutation = useMutation({
    mutationFn: (data: ContentBlockRequest) => contentApi.create(businessId, data),
    onSuccess: () => { invalidate(); notify("Content block created.", "success"); setEditing(null); },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not create content.", "error"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContentBlockRequest }) => contentApi.update(businessId, id, data),
    onSuccess: () => { invalidate(); notify("Content block updated.", "success"); setEditing(null); },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not update content.", "error"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => contentApi.remove(businessId, id),
    onSuccess: () => { invalidate(); notify("Content block deleted.", "success"); setDeleting(null); },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not delete content.", "error"),
  });

  const columns: Column<ContentBlockResponse>[] = [
    { key: "title", header: "Title", render: (b) => <span style={{ fontWeight: 600 }}>{b.title || <span className="text-muted">Untitled</span>}</span> },
    { key: "slug", header: "Slug", render: (b) => <span className="cell-mono cell-muted">{b.slug}</span> },
    { key: "sort", header: "Sort", render: (b) => b.sortOrder },
    { key: "status", header: "Status", render: (b) => <Badge tone={b.isPublished ? "success" : "neutral"}>{b.isPublished ? "Published" : "Draft"}</Badge> },
    {
      key: "actions",
      header: "",
      render: (b) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <Button size="sm" variant="ghost" onClick={() => setEditing(b)}><Pencil size={13} /></Button>
          <Button size="sm" variant="ghost" onClick={() => setDeleting(b)} style={{ color: "var(--danger)" }}><Trash2 size={13} /></Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <PageLoader />;

  return (
    <div className="section-stack">
      <PageHeader
        title="Storefront Content"
        subtitle="Banners, pages, articles and the nav menu. Seed Terms/Privacy as empty Page drafts if you haven't already."
        actions={<Button variant="primary" onClick={() => setEditing("new")}><Plus size={14} /> New block</Button>}
      />

      <div className="tabs">
        {TYPES.map((t) => (
          <div key={t} className={`tab${typeFilter === t ? " active" : ""}`} onClick={() => setTypeFilter(t)}>{t}</div>
        ))}
      </div>

      {!blocks?.length ? (
        <EmptyState icon={FileText} title={`No ${typeFilter} blocks`} description="Create one to get started." />
      ) : (
        <DataTable columns={columns} rows={blocks} rowKey={(b) => b.id} />
      )}

      {editing && (
        <ContentModal
          block={editing === "new" ? null : editing}
          defaultType={typeFilter}
          menuItems={menuItems}
          onClose={() => setEditing(null)}
          onCreate={(data) => createMutation.mutate(data)}
          onUpdate={(id, data) => updateMutation.mutate({ id, data })}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete Content Block"
        description={<>Delete <strong>{deleting?.title || deleting?.slug}</strong>? This can't be undone.</>}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function ContentModal({
  block,
  defaultType,
  menuItems,
  onClose,
  onCreate,
  onUpdate,
  loading,
}: {
  block: ContentBlockResponse | null;
  defaultType: ContentBlockType;
  menuItems: ContentBlockResponse[];
  onClose: () => void;
  onCreate: (data: ContentBlockRequest) => void;
  onUpdate: (id: string, data: ContentBlockRequest) => void;
  loading: boolean;
}) {
  const { register, handleSubmit, watch } = useForm<{
    type: ContentBlockType;
    slug: string;
    title: string;
    subtitle: string;
    body: string;
    imageUrl: string;
    linkUrl: string;
    linkLabel: string;
    parentId: string;
    sortOrder: number;
    isPublished: boolean;
    startsAt: string;
    endsAt: string;
    metaTitle: string;
    metaDescription: string;
  }>({
    defaultValues: block
      ? {
          type: block.type,
          slug: block.slug,
          title: block.title,
          subtitle: block.subtitle,
          body: block.body,
          imageUrl: block.imageUrl,
          linkUrl: block.linkUrl,
          linkLabel: block.linkLabel,
          parentId: block.parentId ?? "",
          sortOrder: block.sortOrder,
          isPublished: block.isPublished,
          startsAt: block.startsAt ? toDatetimeLocalValue(block.startsAt) : "",
          endsAt: block.endsAt ? toDatetimeLocalValue(block.endsAt) : "",
          metaTitle: block.metaTitle,
          metaDescription: block.metaDescription,
        }
      : {
          type: defaultType,
          slug: "",
          title: "",
          subtitle: "",
          body: "",
          imageUrl: "",
          linkUrl: "",
          linkLabel: "",
          parentId: "",
          sortOrder: 0,
          isPublished: false,
          startsAt: "",
          endsAt: "",
          metaTitle: "",
          metaDescription: "",
        },
  });

  const type = watch("type");

  const submit = handleSubmit((v) => {
    const data: ContentBlockRequest = {
      type: v.type,
      slug: v.slug,
      title: v.title,
      subtitle: v.subtitle,
      body: v.body,
      imageUrl: v.imageUrl,
      linkUrl: v.linkUrl,
      linkLabel: v.linkLabel,
      parentId: v.type === "MenuItem" && v.parentId ? v.parentId : null,
      sortOrder: v.sortOrder,
      isPublished: v.isPublished,
      startsAt: v.startsAt ? new Date(v.startsAt).toISOString() : null,
      endsAt: v.endsAt ? new Date(v.endsAt).toISOString() : null,
      metaTitle: v.metaTitle,
      metaDescription: v.metaDescription,
    };
    if (block) onUpdate(block.id, data);
    else onCreate(data);
  });

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={block ? "Edit Content Block" : "New Content Block"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={loading} onClick={submit}>{block ? "Save changes" : "Create"}</Button>
        </>
      }
    >
      <form className="section-stack" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Type">
            <Select {...register("type")}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Slug"><Input {...register("slug", { required: true })} placeholder="terms" /></Field>
          <Field label="Title" className="span-2"><Input {...register("title")} /></Field>
          <Field label="Subtitle" optional className="span-2"><Input {...register("subtitle")} /></Field>
          {type === "MenuItem" && (
            <Field label="Parent Menu Item" optional hint="One level of nesting only">
              <Select {...register("parentId")}>
                <option value="">Top level</option>
                {menuItems.filter((m) => m.id !== block?.id).map((m) => <option key={m.id} value={m.id}>{m.title || m.slug}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Link URL" optional><Input {...register("linkUrl")} /></Field>
          <Field label="Link Label" optional><Input {...register("linkLabel")} /></Field>
          <Field label="Image URL" optional className="span-2"><Input {...register("imageUrl")} /></Field>
          <Field label="Sort Order"><Input type="number" {...register("sortOrder", { valueAsNumber: true })} /></Field>
          <Field label="Published"><label className="checkbox-row" style={{ height: 38 }}><input type="checkbox" {...register("isPublished")} /> Visible on the storefront</label></Field>
          <Field label="Starts At" optional><Input type="datetime-local" {...register("startsAt")} /></Field>
          <Field label="Ends At" optional><Input type="datetime-local" {...register("endsAt")} /></Field>
          <Field label="Body" className="span-2" hint="Markdown">
            <Textarea rows={8} {...register("body")} />
          </Field>
          <Field label="Meta Title" optional><Input {...register("metaTitle")} /></Field>
          <Field label="Meta Description" optional><Input {...register("metaDescription")} /></Field>
        </div>
      </form>
    </Modal>
  );
}

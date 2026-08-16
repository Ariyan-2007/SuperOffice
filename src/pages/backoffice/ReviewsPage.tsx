import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareText, Star, Trash2 } from "lucide-react";
import { productApi, reviewApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { useBusinessId } from "../../context/useBusinessId";
import { useAuth } from "../../auth/AuthContext";
import { ADMIN_LEVEL } from "../../routes/backofficeRoles";
import { usePagedQuery } from "../../lib/usePagedQuery";
import { PageHeader } from "../../components/StatCard";
import { Button } from "../../components/Button";
import { Card, CardBody } from "../../components/Card";
import { PageLoader, EmptyState } from "../../components/Feedback";
import { Badge } from "../../components/Badge";
import { Pagination } from "../../components/Pagination";
import { Select, Textarea } from "../../components/Field";
import { ConfirmDialog } from "../../components/Modal";
import { useToast } from "../../context/ToastContext";
import { formatDate } from "../../lib/format";
import type { ReviewResponse, ReviewStatus } from "../../types/api";

const STATUS_OPTIONS: (ReviewStatus | "All")[] = ["Pending", "Published", "Rejected", "All"];

export function ReviewsPage() {
  const businessId = useBusinessId();
  const { user } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const canDelete = ADMIN_LEVEL.includes(user!.role);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "All">("Pending");
  const [deleting, setDeleting] = useState<ReviewResponse | null>(null);

  const { items: reviews, isLoading, paginationProps } = usePagedQuery(
    ["reviews", businessId, statusFilter],
    (page, pageSize) => reviewApi.list(businessId, statusFilter === "All" ? undefined : statusFilter, page, pageSize),
  );
  // ReviewResponse doesn't carry a product name (URL-scoped on the real API) — look it up
  // client-side against the catalog instead.
  const { data: products } = useQuery({ queryKey: ["products-all", businessId], queryFn: () => productApi.list(businessId, { pageSize: 200 }).then((r) => r.items) });
  const productName = useMemo(() => {
    const map = new Map((products ?? []).map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? id.slice(0, 8) + "…";
  }, [products]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["reviews", businessId] });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReviewStatus }) => reviewApi.setStatus(businessId, id, status),
    onSuccess: () => {
      invalidate();
      notify("Review status updated.", "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not update review.", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reviewApi.remove(businessId, id),
    onSuccess: () => {
      invalidate();
      notify("Review deleted.", "success");
      setDeleting(null);
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not delete review.", "error"),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="section-stack">
      <PageHeader title="Review Moderation" subtitle="Reviews land Pending unless the Business auto-publishes them." />

      <div className="filter-bar">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ReviewStatus | "All")}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === "All" ? "All statuses" : s}</option>
          ))}
        </Select>
      </div>

      {reviews.length === 0 ? (
        <EmptyState icon={MessageSquareText} title="Nothing to moderate" description="Reviews matching this filter will show up here." />
      ) : (
        <div className="section-stack" style={{ gap: 12 }}>
          {reviews.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              productName={productName(r.productId)}
              canDelete={canDelete}
              onStatus={(status) => statusMutation.mutate({ id: r.id, status })}
              onDelete={() => setDeleting(r)}
              businessId={businessId}
            />
          ))}
          {paginationProps && (
            <Card>
              <Pagination {...paginationProps} />
            </Card>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete Review"
        description="Delete this review permanently? This can't be undone."
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function ReviewCard({
  review,
  productName,
  canDelete,
  onStatus,
  onDelete,
  businessId,
}: {
  review: ReviewResponse;
  productName: string;
  canDelete: boolean;
  onStatus: (status: ReviewStatus) => void;
  onDelete: () => void;
  businessId: string;
}) {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState(review.merchantReply ?? "");

  const replyMutation = useMutation({
    mutationFn: () => reviewApi.reply(businessId, review.id, reply),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", businessId] });
      notify("Reply posted.", "success");
      setReplying(false);
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not post reply.", "error"),
  });

  return (
    <Card>
      <CardBody>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ display: "flex", gap: 1 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={13} fill={i < review.rating ? "var(--warning)" : "none"} color="var(--warning)" />
                ))}
              </div>
              <span style={{ fontWeight: 650, fontSize: 13.5 }}>{review.title}</span>
              {review.isVerifiedPurchase && <Badge tone="success">Verified purchase</Badge>}
              <Badge tone={review.status === "Published" ? "success" : review.status === "Rejected" ? "danger" : "warning"}>{review.status}</Badge>
            </div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              {productName} · {review.customerName} · {formatDate(review.createdAt)}
            </div>
            <p style={{ fontSize: 13.5, marginTop: 8, lineHeight: 1.6 }}>{review.body}</p>
            {review.merchantReply && !replying && (
              <div style={{ marginTop: 10, padding: 10, background: "var(--surface-sunken)", borderRadius: 8, fontSize: 12.5 }}>
                <strong>Merchant reply:</strong> {review.merchantReply}
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            {review.status !== "Published" && (
              <Button size="sm" variant="secondary" onClick={() => onStatus("Published")}>Publish</Button>
            )}
            {review.status !== "Rejected" && (
              <Button size="sm" variant="secondary" onClick={() => onStatus("Rejected")}>Reject</Button>
            )}
            {review.status !== "Pending" && (
              <Button size="sm" variant="ghost" onClick={() => onStatus("Pending")}>Reset to Pending</Button>
            )}
            {canDelete && (
              <Button size="sm" variant="ghost" onClick={onDelete} style={{ color: "var(--danger)" }}>
                <Trash2 size={13} />
              </Button>
            )}
          </div>
        </div>
        {!replying && (
          <Button size="sm" variant="ghost" style={{ marginTop: 8 }} onClick={() => setReplying(true)}>
            {review.merchantReply ? "Edit reply" : "Reply"}
          </Button>
        )}
        {replying && (
          <div className="section-stack" style={{ marginTop: 10, gap: 8 }}>
            <Textarea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a public reply…" />
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="sm" variant="primary" loading={replyMutation.isPending} onClick={() => replyMutation.mutate()}>Post reply</Button>
              <Button size="sm" variant="ghost" onClick={() => setReplying(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

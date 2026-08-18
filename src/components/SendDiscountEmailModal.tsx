import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { customerApi, customerGroupApi, discountEmailApi } from "../api/endpoints";
import { ApiError } from "../api/client";
import { useBusinessId } from "../context/useBusinessId";
import { useToast } from "../context/ToastContext";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Field, Select } from "./Field";
import { PageLoader } from "./Feedback";

// §9.43 (added 2026-08-18) — the delivery mechanism a Hidden coupon/promotion code needs, since
// it never surfaces itself on the Shop's available-offers panel.
export function SendDiscountEmailModal({ code, onClose }: { code: string; onClose: () => void }) {
  const businessId = useBusinessId();
  const { notify } = useToast();
  const [customerGroupId, setCustomerGroupId] = useState("");
  const [customerUserIds, setCustomerUserIds] = useState<string[]>([]);

  const { data: customers, isLoading: loadingCustomers } = useQuery({
    queryKey: ["customers", businessId],
    queryFn: () => customerApi.list(businessId),
  });
  const { data: groups } = useQuery({
    queryKey: ["customer-groups", businessId],
    queryFn: () => customerGroupApi.list(businessId, 1, 200).then((r) => r.items),
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      discountEmailApi.send(businessId, {
        code,
        customerUserIds: customerUserIds.length ? customerUserIds : null,
        customerGroupId: customerGroupId || null,
      }),
    onSuccess: (result) => {
      const optedOutNote = result.skippedOptedOut > 0 ? ` (${result.skippedOptedOut} opted out of marketing email)` : "";
      notify(`Sent to ${result.sent} of ${result.totalRecipients}${optedOutNote}.`, "success");
      onClose();
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not send discount email.", "error"),
  });

  const toggleCustomer = (id: string) => {
    setCustomerUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const canSend = customerUserIds.length > 0 || !!customerGroupId;

  return (
    <Modal
      open
      onClose={onClose}
      title="Send Discount Code"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!canSend} loading={sendMutation.isPending} onClick={() => sendMutation.mutate()}>
            Send
          </Button>
        </>
      }
    >
      <div className="section-stack">
        <p className="text-muted" style={{ fontSize: 13 }}>
          Emails code <strong className="cell-mono">{code}</strong> to the recipients below. An individual
          customer selection and a group can both be picked at once — they're combined, not either/or.
        </p>

        <Field label="Customer group" optional>
          <Select value={customerGroupId} onChange={(e) => setCustomerGroupId(e.target.value)}>
            <option value="">None</option>
            {(groups ?? []).map((g) => (
              <option key={g.id} value={g.id}>{g.name} ({g.memberCount} members)</option>
            ))}
          </Select>
        </Field>

        <div>
          <div className="form-label" style={{ marginBottom: 8 }}>
            Individual customers <span className="optional">(optional)</span>
          </div>
          {loadingCustomers ? (
            <PageLoader />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: 220,
                overflowY: "auto",
                padding: 10,
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            >
              {(customers ?? []).length === 0 && <span className="text-muted" style={{ fontSize: 12.5 }}>No customers yet.</span>}
              {(customers ?? []).map((c) => (
                <label key={c.id} className="checkbox-row" style={{ fontSize: 12.5 }}>
                  <input type="checkbox" checked={customerUserIds.includes(c.id)} onChange={() => toggleCustomer(c.id)} /> {c.fullName} ({c.email})
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

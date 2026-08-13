import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deliveryAgentApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { useBusinessId } from "../../context/useBusinessId";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { PageLoader } from "../../components/Feedback";
import { DeliveryStatusBadge } from "../../components/Badge";
import { useToast } from "../../context/ToastContext";
import type { DeliveryAgentStatus } from "../../types/api";

const SELF_OPTIONS: DeliveryAgentStatus[] = ["Free", "Busy", "Offline"];

export function MyStatusPage() {
  const businessId = useBusinessId();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const { data: agent, isLoading } = useQuery({ queryKey: ["delivery-agent-me", businessId], queryFn: () => deliveryAgentApi.me(businessId) });

  const mutation = useMutation({
    mutationFn: (status: DeliveryAgentStatus) => deliveryAgentApi.setMyStatus(businessId, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(["delivery-agent-me", businessId], updated);
      notify(`Status set to ${updated.status}.`, "success");
    },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not update status.", "error"),
  });

  if (isLoading || !agent) return <PageLoader />;

  return (
    <div className="section-stack">
      <Card>
        <CardHeader title="Availability" actions={<DeliveryStatusBadge status={agent.status} />} />
        <CardBody>
          <div style={{ display: "flex", gap: 8 }}>
            {SELF_OPTIONS.map((s) => (
              <Button
                key={s}
                variant={agent.status === s ? "primary" : "secondary"}
                disabled={agent.status === "Blocked"}
                loading={mutation.isPending && mutation.variables === s}
                onClick={() => mutation.mutate(s)}
                style={{ flex: 1 }}
              >
                {s}
              </Button>
            ))}
          </div>
          {agent.status === "Blocked" && (
            <p className="text-muted" style={{ fontSize: 12.5, marginTop: 10 }}>Your account is blocked. Contact your Business admin.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Stats" />
        <CardBody>
          <dl className="kv-grid">
            <dt>Level</dt>
            <dd>{agent.levelCode}</dd>
            <dt>Completed Deliveries</dt>
            <dd>{agent.completedDeliveries}</dd>
            <dt>Delivery Charge</dt>
            <dd>{agent.deliveryCharge}</dd>
            <dt>Balance</dt>
            <dd>{agent.balance} <span className="text-muted">(payouts not yet implemented)</span></dd>
          </dl>
        </CardBody>
      </Card>
    </div>
  );
}

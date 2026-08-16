import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { shippingZoneApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { useBusinessId } from "../../context/useBusinessId";
import { useBusiness } from "../../context/BusinessContext";
import { PageHeader } from "../../components/StatCard";
import { Button } from "../../components/Button";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { PageLoader, EmptyState } from "../../components/Feedback";
import { Badge } from "../../components/Badge";
import { Modal, ConfirmDialog } from "../../components/Modal";
import { Field, Input } from "../../components/Field";
import { useToast } from "../../context/ToastContext";
import { formatMoney } from "../../lib/format";
import type { CreateShippingZoneRequest, ShippingRate, ShippingZoneResponse } from "../../types/api";

interface ZoneForm {
  name: string;
  countries: string;
  regions: string;
  priority: number;
  isActive: boolean;
  rates: ShippingRate[];
}

export function ShippingZonesPage() {
  const businessId = useBusinessId();
  const { business } = useBusiness();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const currency = business?.currency ?? "USD";
  const [editing, setEditing] = useState<ShippingZoneResponse | "new" | null>(null);
  const [deleting, setDeleting] = useState<ShippingZoneResponse | null>(null);

  const { data: zones, isLoading } = useQuery({
    queryKey: ["shipping-zones", businessId],
    queryFn: () => shippingZoneApi.list(businessId, 1, 200).then((r) => r.items),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["shipping-zones", businessId] });

  const createMutation = useMutation({
    mutationFn: (data: CreateShippingZoneRequest) => shippingZoneApi.create(businessId, data),
    onSuccess: () => { invalidate(); notify("Shipping zone created.", "success"); setEditing(null); },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not create zone.", "error"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateShippingZoneRequest }) => shippingZoneApi.update(businessId, id, data),
    onSuccess: () => { invalidate(); notify("Shipping zone updated.", "success"); setEditing(null); },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not update zone.", "error"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => shippingZoneApi.remove(businessId, id),
    onSuccess: () => { invalidate(); notify("Shipping zone deleted.", "success"); setDeleting(null); },
    onError: (err) => notify(err instanceof ApiError ? err.message : "Could not delete zone.", "error"),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="section-stack">
      <PageHeader
        title="Shipping Zones"
        subtitle="Zones with empty countries act as the catch-all fallback."
        actions={<Button variant="primary" onClick={() => setEditing("new")}><Plus size={14} /> New zone</Button>}
      />

      {!zones?.length ? (
        <EmptyState icon={MapPin} title="No Shipping Zones" description="Create a zone to define rates by country, region, weight or order size." />
      ) : (
        <div className="section-stack" style={{ gap: 14 }}>
          {[...zones].sort((a, b) => a.priority - b.priority).map((zone) => (
            <Card key={zone.id}>
              <CardHeader
                title={
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {zone.name}
                    {zone.countries.length === 0 && <Badge tone="brand">Catch-all</Badge>}
                    <Badge tone={zone.isActive ? "success" : "neutral"}>{zone.isActive ? "Active" : "Inactive"}</Badge>
                  </span>
                }
                actions={
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(zone)}><Pencil size={13} /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(zone)} style={{ color: "var(--danger)" }}><Trash2 size={13} /></Button>
                  </div>
                }
              />
              <CardBody>
                <div className="text-muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
                  {zone.countries.length ? zone.countries.join(", ") : "Everywhere"}
                  {zone.regions.length > 0 && ` · ${zone.regions.join(", ")}`} · Priority {zone.priority}
                </div>
                <table className="data-table">
                  <thead>
                    <tr><th>Rate</th><th>Price</th><th>Conditions</th><th>Est. Days</th></tr>
                  </thead>
                  <tbody>
                    {zone.rates.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td>{formatMoney(r.price, currency)}</td>
                        <td className="cell-muted" style={{ fontSize: 12 }}>
                          {r.minOrderSubtotal != null && `Order ≥ ${formatMoney(r.minOrderSubtotal, currency)}`}
                          {r.maxWeightKg != null && ` · ≤ ${r.maxWeightKg}kg`}
                          {r.minOrderSubtotal == null && r.maxWeightKg == null && "—"}
                        </td>
                        <td className="cell-muted">
                          {r.estimatedDaysMin != null ? `${r.estimatedDaysMin}–${r.estimatedDaysMax} days` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <ZoneModal
          zone={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onCreate={(data) => createMutation.mutate(data)}
          onUpdate={(id, data) => updateMutation.mutate({ id, data })}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete Shipping Zone"
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

function ZoneModal({
  zone,
  onClose,
  onCreate,
  onUpdate,
  loading,
}: {
  zone: ShippingZoneResponse | null;
  onClose: () => void;
  onCreate: (data: CreateShippingZoneRequest) => void;
  onUpdate: (id: string, data: CreateShippingZoneRequest) => void;
  loading: boolean;
}) {
  const { register, handleSubmit, control } = useForm<ZoneForm>({
    defaultValues: zone
      ? { name: zone.name, countries: zone.countries.join(", "), regions: zone.regions.join(", "), priority: zone.priority, isActive: zone.isActive, rates: zone.rates }
      : { name: "", countries: "", regions: "", priority: 1, isActive: true, rates: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "rates" });

  const submit = handleSubmit((v) => {
    const data: CreateShippingZoneRequest = {
      name: v.name,
      countries: v.countries.split(",").map((s) => s.trim()).filter(Boolean),
      regions: v.regions.split(",").map((s) => s.trim()).filter(Boolean),
      priority: v.priority,
      isActive: v.isActive,
      rates: v.rates.map((r) => ({
        name: r.name,
        price: Number(r.price),
        minOrderSubtotal: r.minOrderSubtotal == null || (r.minOrderSubtotal as unknown as string) === "" ? null : Number(r.minOrderSubtotal),
        maxOrderSubtotal: r.maxOrderSubtotal == null || (r.maxOrderSubtotal as unknown as string) === "" ? null : Number(r.maxOrderSubtotal),
        minWeightKg: r.minWeightKg == null || (r.minWeightKg as unknown as string) === "" ? null : Number(r.minWeightKg),
        maxWeightKg: r.maxWeightKg == null || (r.maxWeightKg as unknown as string) === "" ? null : Number(r.maxWeightKg),
        estimatedDaysMin: r.estimatedDaysMin == null || (r.estimatedDaysMin as unknown as string) === "" ? null : Number(r.estimatedDaysMin),
        estimatedDaysMax: r.estimatedDaysMax == null || (r.estimatedDaysMax as unknown as string) === "" ? null : Number(r.estimatedDaysMax),
        isActive: r.isActive,
      })),
    };
    if (zone) onUpdate(zone.id, data);
    else onCreate(data);
  });

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={zone ? "Edit Shipping Zone" : "New Shipping Zone"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={loading} onClick={submit}>{zone ? "Save changes" : "Create zone"}</Button>
        </>
      }
    >
      <form className="section-stack" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Zone Name" className="span-2"><Input {...register("name", { required: true })} /></Field>
          <Field label="Countries" optional hint="Comma-separated. Empty = catch-all fallback zone."><Input {...register("countries")} placeholder="United States, Canada" /></Field>
          <Field label="Regions" optional hint="Narrows within those countries"><Input {...register("regions")} placeholder="CA, NY" /></Field>
          <Field label="Priority" hint="Lower wins among equally specific zones"><Input type="number" {...register("priority", { valueAsNumber: true })} /></Field>
          <Field label="Active"><label className="checkbox-row" style={{ height: 38 }}><input type="checkbox" {...register("isActive")} /> Zone is active</label></Field>
        </div>

        <div>
          <div className="form-label" style={{ marginBottom: 8 }}>Rates <span className="optional">(editing replaces the whole list — rate ids are server-generated)</span></div>
          <div className="section-stack" style={{ gap: 10 }}>
            {fields.map((field, index) => (
              <div key={field.id} className="form-grid" style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 8 }}>
                <Field label="Name"><Input {...register(`rates.${index}.name` as const, { required: true })} /></Field>
                <Field label="Price"><Input type="number" step="0.01" min="0" {...register(`rates.${index}.price` as const, { valueAsNumber: true })} /></Field>
                <Field label="Min Order Subtotal" optional><Input type="number" step="0.01" {...register(`rates.${index}.minOrderSubtotal` as const)} /></Field>
                <Field label="Max Order Subtotal" optional><Input type="number" step="0.01" {...register(`rates.${index}.maxOrderSubtotal` as const)} /></Field>
                <Field label="Min Weight (kg)" optional><Input type="number" step="0.01" {...register(`rates.${index}.minWeightKg` as const)} /></Field>
                <Field label="Max Weight (kg)" optional><Input type="number" step="0.01" {...register(`rates.${index}.maxWeightKg` as const)} /></Field>
                <Field label="Est. Days Min" optional><Input type="number" {...register(`rates.${index}.estimatedDaysMin` as const)} /></Field>
                <Field label="Est. Days Max" optional><Input type="number" {...register(`rates.${index}.estimatedDaysMax` as const)} /></Field>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <label className="checkbox-row"><input type="checkbox" {...register(`rates.${index}.isActive` as const)} /> Active</label>
                  <Button type="button" variant="ghost" onClick={() => remove(index)} style={{ color: "var(--danger)" }}><Trash2 size={13} /></Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                append({ name: "", price: 0, minOrderSubtotal: null, maxOrderSubtotal: null, minWeightKg: null, maxWeightKg: null, estimatedDaysMin: null, estimatedDaysMax: null, isActive: true })
              }
              style={{ width: "fit-content" }}
            >
              <Plus size={13} /> Add rate
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

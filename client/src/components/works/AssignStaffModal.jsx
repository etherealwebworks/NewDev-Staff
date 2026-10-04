import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { useStaffOptions } from "../../hooks/useOptions";
import { invalidateWorkData } from "../../lib/queries";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import StaffPicker from "./StaffPicker";

/** Sets the full list of staff on a work: adding, removing or swapping people in one step. */
export default function AssignStaffModal({ open, onClose, work, onSaved }) {
  const toast = useToast();
  const qc = useQueryClient();
  const options = useStaffOptions();
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  const activeIds = useMemo(() => new Set((options.data || []).map((s) => s.id)), [options.data]);
  const current = work?.staff || [];
  const inactive = current.filter((s) => options.data && !activeIds.has(s.id));

  // Initialise once per opening (and once the staff list has loaded); later background refetches must not reset edits.
  const ready = !!options.data;
  useEffect(() => {
    if (open && work && ready) setSelected(work.staff.map((s) => s.id).filter((id) => activeIds.has(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, work?.id, ready]);

  const before = new Set(current.map((s) => s.id));
  const unchanged = selected.length === before.size && selected.every((id) => before.has(id));

  async function save() {
    setSaving(true);
    try {
      const { data } = await api.post(`/works/${work.id}/assign`, { staff_ids: selected, mode: "replace" });
      const removedSomeone = current.some((s) => !selected.includes(s.id));
      toast.success(removedSomeone ? "Work reassigned successfully" : "Work assigned successfully");
      invalidateWorkData(qc);
      qc.invalidateQueries({ queryKey: ["work"] });
      onSaved?.(data.work);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={saving ? undefined : onClose} title="Assign staff" size="md">
      {work && (
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            <span className="font-medium text-text-dark">{work.title}</span> · {work.client?.name}. Anyone added or removed is notified.
          </p>
          {inactive.length > 0 && (
            <p className="rounded-lg bg-warning/10 px-3 py-2.5 text-sm text-warning">
              {inactive.map((s) => s.full_name).join(", ")} {inactive.length === 1 ? "is" : "are"} inactive and will be removed when you save.
            </p>
          )}
          <StaffPicker value={selected} onChange={setSelected} />
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={save} loading={saving} disabled={selected.length === 0 || (unchanged && inactive.length === 0)}>Save assignment</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

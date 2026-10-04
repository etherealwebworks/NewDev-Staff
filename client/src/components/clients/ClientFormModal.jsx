import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { inputClass } from "../../lib/ui";
import Button from "../ui/Button";
import FormField from "../ui/FormField";
import Modal from "../ui/Modal";

const EMPTY = { name: "", company_name: "", email: "", phone: "", address: "" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ClientFormModal({ open, onClose, client, onSaved }) {
  const editing = !!client;
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(editing ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, client[k] || ""])) : EMPTY);
  }, [open, editing, client]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => (er[k] ? { ...er, [k]: undefined } : er));
  };

  async function submit(ev) {
    ev.preventDefault();
    const e = {};
    if (!form.name.trim()) e.name = "Client name is required.";
    if (form.email.trim() && !EMAIL.test(form.email.trim())) e.email = "Enter a valid email.";
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]));
      const { data } = editing ? await api.put(`/clients/${client.id}`, body) : await api.post("/clients", body);
      toast.success(editing ? "Client updated successfully" : "Client added successfully");
      ["clients", "client-options", "dashboard"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onSaved?.(data.client);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={saving ? undefined : onClose} title={editing ? "Edit client" : "Add client"} size="md">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Contact name" htmlFor="cf-name" required error={errors.name}>
            <input id="cf-name" value={form.name} onChange={set("name")} className={inputClass} autoFocus />
          </FormField>
          <FormField label="Company" htmlFor="cf-company">
            <input id="cf-company" value={form.company_name} onChange={set("company_name")} className={inputClass} />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Email" htmlFor="cf-email" error={errors.email}>
            <input id="cf-email" type="email" value={form.email} onChange={set("email")} className={inputClass} />
          </FormField>
          <FormField label="Phone" htmlFor="cf-phone">
            <input id="cf-phone" type="tel" inputMode="tel" value={form.phone} onChange={set("phone")} className={inputClass} />
          </FormField>
        </div>
        <FormField label="Address" htmlFor="cf-address">
          <textarea id="cf-address" rows={2} value={form.address} onChange={set("address")} className={inputClass} />
        </FormField>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving}>{editing ? "Save changes" : "Add client"}</Button>
        </div>
      </form>
    </Modal>
  );
}

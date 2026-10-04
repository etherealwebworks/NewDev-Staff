import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Wand2 } from "lucide-react";

import api, { getErrorMessage } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { inputClass } from "../../lib/ui";

import Button from "../ui/Button";
import FormField from "../ui/FormField";
import Modal from "../ui/Modal";

const EMPTY = {
  full_name: "",
  email: "",
  phone: "",
  job_role: "",
  department: "",
  password: "",
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generatePassword() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

  const bytes = crypto.getRandomValues(
    new Uint32Array(16)
  );

  return Array.from(
    bytes,
    (b) => chars[b % chars.length]
  ).join("");
}

export default function StaffFormModal({
  open,
  onClose,
  staff,
  onSaved,
}) {
  const editing = Boolean(staff);

  const toast = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setErrors({});
    setShowPassword(false);

    if (editing) {
      setForm({
        full_name: staff?.full_name || "",
        email: staff?.email || "",
        phone: staff?.phone || "",
        job_role: staff?.job_role || "",
        department: staff?.department || "",
        password: "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, editing, staff]);

  const setField = (field) => (event) => {
    const value = event.target.value;

    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => {
      if (!current[field]) return current;

      const next = {
        ...current,
      };

      delete next[field];

      return next;
    });
  };

  function validate() {
    const nextErrors = {};

    if (!form.full_name.trim()) {
      nextErrors.full_name = "Full name is required.";
    }

    if (!editing) {
      if (!form.email.trim()) {
        nextErrors.email = "Email is required.";
      } else if (!EMAIL.test(form.email.trim())) {
        nextErrors.email = "Enter a valid email address.";
      }

      if (!form.password) {
        nextErrors.password = "Password is required.";
      } else if (form.password.length < 8) {
        nextErrors.password =
          "Password must contain at least 8 characters.";
      }
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function submit(event) {
    event.preventDefault();

    if (!validate()) return;

    setSaving(true);

    try {
      if (editing) {
        const body = {
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          job_role: form.job_role.trim(),
          department: form.department.trim(),
        };

        const response = await api.put(
          `/staff/${staff.id}`,
          body
        );

        toast.success(
          "Staff member updated successfully."
        );

        onSaved?.(response.data.staff);
      } else {
        const body = {
          full_name: form.full_name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          job_role: form.job_role.trim(),
          department: form.department.trim(),
          password: form.password,
        };

        const response = await api.post(
          "/staff",
          body
        );

        toast.success(
          "Staff member added successfully."
        );

        onSaved?.(response.data.staff);
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["staff"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["staff-options"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["dashboard"],
        }),
      ]);

      onClose();
    } catch (error) {
      console.error(
        "Staff save error:",
        error?.response?.data || error
      );

      toast.error(
        getErrorMessage(error) ||
          "Unable to save staff member."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleGeneratePassword(event) {
    event.preventDefault();

    const password = generatePassword();

    setForm((current) => ({
      ...current,
      password,
    }));

    setShowPassword(true);

    setErrors((current) => {
      const next = {
        ...current,
      };

      delete next.password;

      return next;
    });
  }

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title={
        editing
          ? "Edit staff member"
          : "Add staff member"
      }
      size="md"
    >
      <form
        onSubmit={submit}
        noValidate
        className="space-y-4"
      >
        {/* FULL NAME */}

        <FormField
          label="Full name"
          htmlFor="sf-name"
          required
          error={errors.full_name}
        >
          <input
            id="sf-name"
            type="text"
            value={form.full_name}
            onChange={setField("full_name")}
            className={inputClass}
            autoFocus
            autoComplete="name"
            disabled={saving}
          />
        </FormField>

        {/* EMAIL */}

        <FormField
          label="Email"
          htmlFor="sf-email"
          required={!editing}
          error={errors.email}
          hint={
            editing
              ? "Email cannot be changed after the account is created."
              : "The staff member will use this email to sign in."
          }
        >
          <input
            id="sf-email"
            type="email"
            value={form.email}
            onChange={setField("email")}
            disabled={editing || saving}
            className={inputClass}
            autoComplete="email"
          />
        </FormField>

        {/* ROLE + DEPARTMENT */}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Role / title"
            htmlFor="sf-role"
          >
            <input
              id="sf-role"
              type="text"
              value={form.job_role}
              onChange={setField("job_role")}
              placeholder="e.g. Full-Stack Developer"
              className={inputClass}
              disabled={saving}
            />
          </FormField>

          <FormField
            label="Department"
            htmlFor="sf-dept"
          >
            <input
              id="sf-dept"
              type="text"
              value={form.department}
              onChange={setField("department")}
              placeholder="e.g. Development"
              className={inputClass}
              disabled={saving}
            />
          </FormField>
        </div>

        {/* PHONE */}

        <FormField
          label="Phone"
          htmlFor="sf-phone"
        >
          <input
            id="sf-phone"
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={setField("phone")}
            className={inputClass}
            autoComplete="tel"
            disabled={saving}
          />
        </FormField>

        {/* PASSWORD */}

        {!editing && (
          <FormField
            label="Temporary password"
            htmlFor="sf-password"
            required
            error={errors.password}
            hint="Share this password securely with the staff member."
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="sf-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={form.password}
                  onChange={setField("password")}
                  autoComplete="new-password"
                  className={`${inputClass} pr-10`}
                  disabled={saving}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-text-muted hover:text-text-dark"
                  disabled={saving}
                >
                  {showPassword ? (
                    <EyeOff size={15} />
                  ) : (
                    <Eye size={15} />
                  )}
                </button>
              </div>

              <Button
                type="button"
                variant="secondary"
                icon={Wand2}
                onClick={handleGeneratePassword}
                disabled={saving}
              >
                Generate
              </Button>
            </div>
          </FormField>
        )}

        {/* ACTIONS */}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            loading={saving}
          >
            {editing
              ? "Save changes"
              : "Add staff"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import api, { getErrorMessage } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useSettings } from "../../hooks/useSettings";
import { ACCEPT_ATTR, checkFile, formatBytes, iconFor } from "../../lib/files";
import { formatDate } from "../../lib/format";
import Button from "../ui/Button";
import ConfirmDialog from "../ui/ConfirmDialog";

/** Files on a work: upload (click or drop), download via short-lived link, delete (admin or uploader). */
export default function AttachmentsPanel({ work }) {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const { data: settings } = useSettings();
  const input = useRef(null);
  const [pct, setPct] = useState(null);       // null = idle
  const [dragging, setDragging] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const files = work.attachments || [];
  const enabled = settings?.attachments_enabled !== false;
  if (!enabled && files.length === 0) return null;

  const refresh = () => qc.invalidateQueries({ queryKey: ["work", work.id] });

  async function upload(file) {
    const problem = checkFile(file);
    if (problem) return toast.error(problem);
    const body = new FormData();
    body.append("file", file);
    setPct(0);
    try {
      await api.post(`/works/${work.id}/attachments`, body, { timeout: 120_000, onUploadProgress: (e) => e.total && setPct(Math.round((e.loaded / e.total) * 100)) });
      toast.success("File uploaded successfully");
      refresh();
      qc.invalidateQueries({ queryKey: ["activity"] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPct(null);
      if (input.current) input.current.value = "";
    }
  }

  async function download(f) {
    setBusyId(f.id);
    try {
      const { data } = await api.get(`/works/${work.id}/attachments/${f.id}/download`);
      window.location.assign(data.url); // signed URL with attachment disposition: downloads without leaving the page
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function remove() {
    const f = deleting;
    setBusyId(f.id);
    try {
      await api.delete(`/works/${work.id}/attachments/${f.id}`);
      toast.success("File deleted successfully");
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
      setDeleting(null);
    }
  }

  const canDelete = (f) => user.role === "admin" || f.uploader?.id === user.id;
  const uploading = pct !== null;

  return (
    <section className="rounded-2xl border border-border-muted bg-paper p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text-dark">Files{files.length ? ` (${files.length})` : ""}</h2>
        {enabled && (
          <>
            <input ref={input} type="file" accept={ACCEPT_ATTR} className="sr-only" aria-label="Choose a file to upload" onChange={(e) => e.target.files[0] && upload(e.target.files[0])} />
            <Button size="sm" variant="secondary" icon={Upload} loading={uploading} onClick={() => input.current.click()}>Upload file</Button>
          </>
        )}
      </div>

      {uploading && (
        <div className="mb-4" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-1.5 overflow-hidden rounded-full bg-text-muted/15"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
          <p className="mt-1 text-xs text-text-muted">Uploading… {pct}%</p>
        </div>
      )}

      {files.length === 0 ? (
        <div
          onDragOver={(e) => { if (!enabled) return; e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); if (enabled && e.dataTransfer.files[0]) upload(e.dataTransfer.files[0]); }}
          className={`flex flex-col items-center rounded-xl border border-dashed px-4 py-8 text-center transition ${dragging ? "border-primary bg-primary/5" : "border-border-muted"}`}>
          <Paperclip size={20} className="mb-2 text-text-muted" />
          <p className="text-sm text-text-muted">No files yet. Drop a file here or use Upload.</p>
          <p className="mt-1 text-xs text-text-muted/80">PDF, images, Office files, text/CSV or ZIP · up to 10 MB</p>
        </div>
      ) : (
        <ul className="divide-y divide-border-muted">
          {files.map((f) => {
            const Icon = iconFor(f.file_name);
            const busy = busyId === f.id;
            return (
              <li key={f.id} className="flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon size={17} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-dark" title={f.file_name}>{f.file_name}</p>
                  <p className="truncate text-xs text-text-muted">{[formatBytes(f.size_bytes), f.uploader?.full_name, formatDate(f.created_at)].filter(Boolean).join(" · ")}</p>
                </div>
                <button onClick={() => download(f)} disabled={busy} aria-label={`Download ${f.file_name}`} className="rounded-lg p-2 text-text-muted hover:bg-paper-off hover:text-text-dark disabled:opacity-50">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                </button>
                {canDelete(f) && (
                  <button onClick={() => setDeleting(f)} disabled={busy} aria-label={`Delete ${f.file_name}`} className="rounded-lg p-2 text-text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-50">
                    <Trash2 size={16} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog open={!!deleting} danger loading={busyId === deleting?.id} title="Delete this file?" confirmLabel="Delete"
        message={deleting ? `"${deleting.file_name}" will be permanently removed.` : ""} onClose={() => setDeleting(null)} onConfirm={remove} />
    </section>
  );
}

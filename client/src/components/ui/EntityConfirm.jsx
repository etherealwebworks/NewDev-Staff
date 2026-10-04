import ConfirmDialog from "./ConfirmDialog";

/** Confirmation copy for deactivate/activate/delete, driven by useEntityActions. */
export default function EntityConfirm({ actions, noun, nameOf }) {
  const { confirm, busy, run, cancel } = actions;
  if (!confirm) return <ConfirmDialog open={false} onClose={cancel} />;
  const { type, entity } = confirm;
  const name = nameOf(entity);
  const isDelete = type === "delete";
  const deactivating = !isDelete && entity.is_active;
  return (
    <ConfirmDialog
      open
      danger={isDelete || deactivating}
      loading={busy}
      onClose={cancel}
      onConfirm={run}
      title={isDelete ? `Delete ${noun.toLowerCase()}?` : deactivating ? `Deactivate ${noun.toLowerCase()}?` : `Activate ${noun.toLowerCase()}?`}
      confirmLabel={isDelete ? "Delete" : deactivating ? "Deactivate" : "Activate"}
      message={
        isDelete
          ? `${name} will be permanently removed. This can't be undone. If they have work history, deletion is blocked and you can deactivate instead.`
          : deactivating
          ? noun === "Staff member"
            ? `${name} will be signed out and won't be able to log in or receive new works. Their existing works stay as they are.`
            : `${name} will no longer appear when creating new works. Existing works are unaffected.`
          : `${name} will be active again.`
      }
    />
  );
}

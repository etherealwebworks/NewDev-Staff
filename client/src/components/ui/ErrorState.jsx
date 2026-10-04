import { AlertCircle } from "lucide-react";
import Button from "./Button";
import { getErrorMessage } from "../../services/api";

export default function ErrorState({ error, message, title = "Something went wrong", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center" role="alert">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <AlertCircle size={22} />
      </span>
      <h3 className="text-sm font-semibold text-text-dark">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-text-muted">{message || getErrorMessage(error)}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

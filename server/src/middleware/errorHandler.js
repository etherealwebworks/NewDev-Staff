export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: "Route not found." });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Validation failures from zod schemas become a clean 400.
  if (err?.name === "ZodError") {
    const issue = err.errors?.[0];
    const field = issue?.path?.length ? `${issue.path.join(".")}: ` : "";
    return res.status(400).json({ error: `${field}${issue?.message || "Invalid input."}` });
  }

  console.error(`[error] ${req.method} ${req.path}:`, err.message);

  // Never leak internals (stack traces, DB error text) to the client.
  const status = err.status || 500;
  const message = status === 500 ? "Something went wrong. Please try again." : err.message;
  res.status(status).json({ error: message });
}

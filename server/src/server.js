import app from "./app.js";
import { env } from "./config/env.js";
import { startDeadlineNotifier } from "./services/deadlineNotifier.js";

app.listen(env.port, () => {
  console.log(`Server listening on port ${env.port} [${env.nodeEnv}]`);
  startDeadlineNotifier();
});

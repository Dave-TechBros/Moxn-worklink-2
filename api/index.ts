import app, { dbReady } from "../server/app.js";

// Cap how long the first request on a cold serverless instance waits for the
// database seed. On a flaky Cloud SQL cold start the connection can take
// several seconds; if that blocked the first request, the platform gateway
// could kill the function before it responded and the browser would see a
// gateway error on /api/jobs ("Failed to load listings"). The pg-* helpers fall
// back to the in-memory store when the database is not ready yet, so serving
// the request immediately is safe — the database finishes seeding in the
// background and takes over for subsequent queries. Only the first request
// waits at all; later requests on the warm instance proceed instantly.
const MAX_READY_WAIT_MS = 3500;

let waited: Promise<void> | null = null;
const waitForReady = (): Promise<void> => {
  if (!waited) {
    waited = Promise.race([
      dbReady,
      new Promise<void>((r) => setTimeout(r, MAX_READY_WAIT_MS)),
    ]);
  }
  return waited;
};

export default async function handler(req: any, res: any) {
  await waitForReady();
  return app(req, res);
}

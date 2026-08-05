import app, { dbReady } from "../server/app.js";

export default async function handler(req: any, res: any) {
  await dbReady;
  return app(req, res);
}

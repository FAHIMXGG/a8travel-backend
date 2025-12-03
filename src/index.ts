import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from "./app";
import { env } from "./config/env";

app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});

// This converts Express app to a handler compatible with Vercel
export default function handler(req: VercelRequest, res: VercelResponse) {
  // @ts-ignore
  return app(req, res);
}
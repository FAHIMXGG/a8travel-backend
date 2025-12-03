import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from "./app";
import { env } from "./config/env";

if (!process.env.VERCEL) {
  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
  });
}

// Vercel Node function that forwards everything to your Express app
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Express expects (req, res)
  // Type cast to any to avoid TS complaints
  return (app as any)(req, res);
}
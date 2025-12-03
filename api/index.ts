import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "../src/index";

export default function apiHandler(req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}


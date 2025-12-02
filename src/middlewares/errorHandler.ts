import { NextFunction, Request, Response } from "express";
import { fail } from "../utils/apiResponse";

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(err);
  const status = err.statusCode || 500;
  return res.status(status).json(
    fail(err.message || "Internal server error", err.errors)
  );
};

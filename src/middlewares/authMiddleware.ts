import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { fail } from "../utils/apiResponse";
import { Role } from "@prisma/client";

export const authGuard = (roles?: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const token =
        req.cookies[env.COOKIE_NAME] ||
        (req.headers.authorization?.startsWith("Bearer ")
          ? req.headers.authorization.split(" ")[1]
          : null);

      if (!token) {
        return res.status(401).json(fail("Unauthorized"));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET) as {
        id: string;
        role: Role;
      };

      if (!decoded) {
        return res.status(401).json(fail("Invalid token"));
      }

      if (roles && !roles.includes(decoded.role)) {
        return res.status(403).json(fail("Forbidden"));
      }

      req.user = { id: decoded.id, role: decoded.role };
      next();
    } catch (error) {
      return res.status(401).json(fail("Unauthorized"));
    }
  };
};

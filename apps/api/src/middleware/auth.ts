import { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { repository } from "../data/repository.js";
import { UserRole } from "../types.js";

function authTokenFromRequest(req: Request): string | undefined {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return undefined;
  }
  return header.slice("Bearer ".length).trim();
}

export function requireInternalService(req: Request, res: Response, next: NextFunction): void {
  const key = req.header("x-internal-service");
  if (key !== config.internalApiKey) {
    res.status(401).json({ error_code: "UNAUTHORIZED_INTERNAL", message: "Unauthorized internal caller" });
    return;
  }
  next();
}

export function requireAuthenticated(req: Request, res: Response, next: NextFunction): void {
  const token = authTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error_code: "UNAUTHORIZED", message: "Missing bearer token" });
    return;
  }

  const session = repository.getSessionByAccessToken(token);
  if (!session) {
    res.status(401).json({ error_code: "UNAUTHORIZED", message: "Invalid or expired session" });
    return;
  }

  res.locals.auth = session;
  next();
}

export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = authTokenFromRequest(req);
    if (!token) {
      res.status(401).json({ error_code: "UNAUTHORIZED", message: "Missing bearer token" });
      return;
    }

    const session = repository.getSessionByAccessToken(token);
    if (!session) {
      res.status(401).json({ error_code: "UNAUTHORIZED", message: "Invalid or expired session" });
      return;
    }

    if (!roles.includes(session.role)) {
      res.status(403).json({ error_code: "FORBIDDEN", message: "Insufficient role for this action" });
      return;
    }

    res.locals.auth = session;
    next();
  };
}

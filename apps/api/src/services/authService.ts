import crypto from "crypto";
import { config } from "../config.js";
import { repository } from "../data/repository.js";
import { SessionRecord, UserRole } from "../types.js";

function generateToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function createSession(userId: string, role: UserRole, subject: string): SessionRecord {
  const now = Date.now();
  const session: SessionRecord = {
    accessToken: generateToken(),
    refreshToken: generateToken(),
    userId,
    role,
    subject,
    expiresAt: now + config.accessTokenTtlMinutes * 60 * 1000,
    refreshExpiresAt: now + config.refreshTokenTtlHours * 60 * 60 * 1000,
    createdAt: new Date(now).toISOString()
  };

  return repository.saveSession(session);
}

export function refreshSession(refreshToken: string): SessionRecord | undefined {
  const current = repository.getSessionByRefreshToken(refreshToken);
  if (!current) {
    return undefined;
  }

  repository.revokeSession(current.accessToken);
  return createSession(current.userId, current.role, current.subject);
}

export function revokeSession(accessToken: string): void {
  repository.revokeSession(accessToken);
}
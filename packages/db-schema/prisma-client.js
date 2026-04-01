const { PrismaClient } = require("./generated/client");

const prisma = new PrismaClient();

const blockedAuditLogActions = new Set([
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany"
]);

prisma.$use(async (params, next) => {
  if (params.model === "AuditLog" && blockedAuditLogActions.has(params.action)) {
    throw new Error("AuditLog is append-only. UPDATE and DELETE operations are not permitted.");
  }

  return next(params);
});

module.exports = {
  PrismaClient,
  prisma
};

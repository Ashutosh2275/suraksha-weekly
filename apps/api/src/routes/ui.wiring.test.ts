import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readWorkspaceFile(...segments: string[]) {
  const filePath = path.resolve(process.cwd(), "..", "..", ...segments);
  return fs.readFileSync(filePath, "utf8");
}

describe("UI wiring contracts", () => {
  it("worker portal buttons and forms are wired to handlers", () => {
    const html = readWorkspaceFile("apps", "worker-web", "index.html");
    const script = readWorkspaceFile("apps", "worker-web", "script.js");

    const requiredIds = [
      "worker-auth-form",
      "worker-logout",
      "worker-form",
      "refresh-dashboard",
      "onboarding-form",
      "delete-profile",
      "precheck-form",
      "renewal-form",
      "support-form"
    ];

    requiredIds.forEach((id) => {
      expect(html.includes(`id="${id}"`)).toBe(true);
    });

    const requiredHandlers = [
      "authForm.addEventListener(\"submit\"",
      "logoutButton.addEventListener(\"click\"",
      "form.addEventListener(\"submit\"",
      "refreshButton.addEventListener(\"click\"",
      "onboardingForm.addEventListener(\"submit\"",
      "deleteProfileButton.addEventListener(\"click\"",
      "precheckForm.addEventListener(\"submit\"",
      "renewalForm.addEventListener(\"submit\"",
      "supportForm.addEventListener(\"submit\""
    ];

    requiredHandlers.forEach((token) => {
      expect(script.includes(token)).toBe(true);
    });
  });

  it("admin portal buttons and forms are wired to handlers", () => {
    const html = readWorkspaceFile("apps", "admin-web", "index.html");
    const script = readWorkspaceFile("apps", "admin-web", "script.js");

    const requiredIds = [
      "admin-auth-form",
      "admin-logout",
      "refresh-all",
      "underwriting-form",
      "pricing-form",
      "decision-form",
      "fraud-form",
      "portfolio-form",
      "compliance-form"
    ];

    requiredIds.forEach((id) => {
      expect(html.includes(`id="${id}"`)).toBe(true);
    });

    const requiredHandlers = [
      "authForm.addEventListener(\"submit\"",
      "logoutButton.addEventListener(\"click\"",
      "refreshButton.addEventListener(\"click\"",
      "reviewList.addEventListener(\"click\"",
      "underwritingForm?.addEventListener(\"submit\"",
      "pricingForm?.addEventListener(\"submit\"",
      "decisionForm?.addEventListener(\"submit\"",
      "fraudForm?.addEventListener(\"submit\"",
      "portfolioForm?.addEventListener(\"submit\"",
      "complianceForm?.addEventListener(\"submit\""
    ];

    requiredHandlers.forEach((token) => {
      expect(script.includes(token)).toBe(true);
    });
  });
});

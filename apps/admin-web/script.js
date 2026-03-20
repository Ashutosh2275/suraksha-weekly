const apiBase = "http://localhost:8080/api/v1";
const adminSessionKey = "suraksha_admin_session_v1";
const adminLayerStateKey = "suraksha_admin_layer_v1";
let adminAccessToken = null;
let adminRefreshToken = null;

const authSection = document.getElementById("admin-auth");
const appSection = document.getElementById("admin-app");
const authForm = document.getElementById("admin-auth-form");
const authError = document.getElementById("admin-auth-error");
const authUser = document.getElementById("admin-auth-user");
const logoutButton = document.getElementById("admin-logout");

const heroTargets = {
  workers: document.getElementById("workers-count"),
  policies: document.getElementById("policies-count"),
  inReview: document.getElementById("review-count"),
  duplicates: document.getElementById("duplicate-count")
};

const metricsGrid = document.getElementById("metrics-grid");
const reconciliationCard = document.getElementById("reconciliation-card");
const reviewList = document.getElementById("review-list");
const jobsList = document.getElementById("jobs-list");
const auditList = document.getElementById("audit-list");
const auditListSecondary = document.getElementById("audit-list-secondary");
const refreshButton = document.getElementById("refresh-all");
const adminTabs = Array.from(document.querySelectorAll(".layer-tab"));
const adminLayers = Array.from(document.querySelectorAll(".admin-layer"));
const underwritingForm = document.getElementById("underwriting-form");
const underwritingOutput = document.getElementById("underwriting-output");
const pricingForm = document.getElementById("pricing-form");
const pricingOutput = document.getElementById("pricing-output");
const decisionForm = document.getElementById("decision-form");
const decisionNotes = document.getElementById("decision-notes");
const fraudForm = document.getElementById("fraud-form");
const fraudOutput = document.getElementById("fraud-output");
const portfolioForm = document.getElementById("portfolio-form");
const portfolioOutput = document.getElementById("portfolio-output");
const complianceForm = document.getElementById("compliance-form");
const complianceOutput = document.getElementById("compliance-output");
const adminPriorityList = document.getElementById("admin-priority-list");
const adminSystemStatus = document.getElementById("admin-system-status");
const adminSectionKicker = document.getElementById("admin-section-kicker");
const adminSectionTitle = document.getElementById("admin-section-title");
const adminSectionSummary = document.getElementById("admin-section-summary");
const adminFocusStatus = document.getElementById("admin-focus-status");
const adminFocusSummary = document.getElementById("admin-focus-summary");
const adminPriorityHeading = document.getElementById("admin-priority-heading");
const adminPrioritySummary = document.getElementById("admin-priority-summary");
const adminCommandSearch = document.getElementById("admin-command-search");
const adminMain = document.querySelector(".admin-main");

const adminLayerMeta = {
  overview: {
    kicker: "Admin workspace",
    title: "Command center",
    summary: "The most urgent queue, risk, and payout signals stay visible first.",
    aliases: ["overview", "dashboard", "command", "center"]
  },
  reviews: {
    kicker: "Claims desk",
    title: "Claims desk",
    summary: "Queue decisions and manual rationale live together so review work feels linear.",
    aliases: ["claims", "reviews", "queue", "desk"]
  },
  underwriting: {
    kicker: "Underwriting",
    title: "Underwriting",
    summary: "Evaluate applicant signals and see the override recommendation in one place.",
    aliases: ["underwriting", "eligibility", "approval"]
  },
  pricing: {
    kicker: "Pricing",
    title: "Pricing",
    summary: "Simulate premium decisions without leaving the control center flow.",
    aliases: ["pricing", "premium", "rate"]
  },
  fraud: {
    kicker: "Fraud ops",
    title: "Fraud ops",
    summary: "Tune thresholds and test decision lanes side by side.",
    aliases: ["fraud", "risk", "threshold"]
  },
  portfolio: {
    kicker: "Portfolio",
    title: "Portfolio",
    summary: "Inspect cohort health, loss ratio, and margin in one panel.",
    aliases: ["portfolio", "cohort", "margin"]
  },
  compliance: {
    kicker: "Compliance",
    title: "Compliance",
    summary: "See which control is missing before release or approval moves forward.",
    aliases: ["compliance", "controls", "audit gate"]
  },
  operations: {
    kicker: "Operations",
    title: "Operations",
    summary: "Review jobs and operational runbooks without losing situational context.",
    aliases: ["operations", "jobs", "runbook"]
  },
  audit: {
    kicker: "Audit",
    title: "Audit trail",
    summary: "Move directly into recent immutable records and evidence.",
    aliases: ["audit", "logs", "evidence"]
  }
};

const decisionStore = [];

function adminLoginAllowed(email, password) {
  return email.toLowerCase() === "ops@suraksha.dev" && password === "Admin@123";
}

function setAuthView(authenticated, email = "") {
  authSection.classList.toggle("hidden", authenticated);
  appSection.classList.toggle("hidden", !authenticated);
  if (authenticated) {
    authUser.textContent = email;
  }
}

function restoreSession() {
  const saved = localStorage.getItem(adminSessionKey);
  if (!saved) {
    setAuthView(false);
    return;
  }

  try {
    const session = JSON.parse(saved);
    if (!session?.email || !session?.accessToken) {
      setAuthView(false);
      return;
    }
    adminAccessToken = session.accessToken;
    adminRefreshToken = session.refreshToken;
    setAuthView(true, session.email);
  } catch {
    setAuthView(false);
  }
}

function showAdminLayer(layerKey) {
  const normalizedLayer = adminLayerMeta[layerKey] ? layerKey : "overview";

  adminTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.layer === normalizedLayer);
  });

  adminLayers.forEach((section) => {
    section.classList.toggle("hidden", section.dataset.layerPage !== normalizedLayer);
  });

  localStorage.setItem(adminLayerStateKey, normalizedLayer);
  if (window.location.hash !== `#admin=${normalizedLayer}`) {
    window.history.replaceState(null, "", `#admin=${normalizedLayer}`);
  }

  updateAdminContext(normalizedLayer);
}

function updateAdminContext(layerKey) {
  const meta = adminLayerMeta[layerKey] || adminLayerMeta.overview;
  if (adminSectionKicker) adminSectionKicker.textContent = meta.kicker;
  if (adminSectionTitle) adminSectionTitle.textContent = meta.title;
  if (adminSectionSummary) adminSectionSummary.textContent = meta.summary;
  if (adminMain) {
    adminMain.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function resolveAdminLayer(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return Object.entries(adminLayerMeta).find(([, meta]) => meta.aliases.some((alias) => normalized.includes(alias)))?.[0] || null;
}

function getInitialAdminLayer() {
  const hashValue = window.location.hash.replace(/^#/, "");
  if (hashValue.startsWith("admin=")) {
    const hashLayer = hashValue.slice("admin=".length);
    if (adminLayerMeta[hashLayer]) {
      return hashLayer;
    }
  }

  const storedLayer = localStorage.getItem(adminLayerStateKey);
  if (storedLayer && adminLayerMeta[storedLayer]) {
    return storedLayer;
  }

  return "overview";
}

function injectAdminInterlinks() {
  adminLayers.forEach((section) => {
    const currentLayer = section.dataset.layerPage || "overview";
    const rail = document.createElement("div");
    rail.className = "interlink-rail";

    Object.entries(adminLayerMeta).forEach(([layer, meta]) => {
      if (layer === currentLayer) {
        return;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = "link-pill";
      button.dataset.jump = layer;
      button.textContent = meta.title;
      rail.appendChild(button);
    });

    const heading = section.querySelector(".panel-heading, .hero-panel");
    if (heading?.nextSibling) {
      section.insertBefore(rail, heading.nextSibling);
    } else {
      section.prepend(rail);
    }
  });
}

function currency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function makeChip(text, tone = "") {
  const toneClass = tone ? ` ${tone}` : "";
  return `<span class="chip${toneClass}">${text}</span>`;
}

function renderEmpty(target, message) {
  target.innerHTML = `<div class="empty-state">${message}</div>`;
}

function renderMetricCards(items) {
  metricsGrid.innerHTML = items
    .map(
      ({ label, value }) => `
        <article class="mini-card">
          <span>${label}</span>
          <strong>${value}</strong>
        </article>
      `
    )
    .join("");
}

function renderReconciliation(report) {
  const items = [
    { label: "Total payouts", value: report.totalPayouts },
    { label: "Successful payouts", value: report.successPayouts },
    { label: "Failed payouts", value: report.failedPayouts },
    { label: "Duplicates detected", value: report.duplicatesDetected }
  ];

  reconciliationCard.innerHTML = items
    .map(
      ({ label, value }) => `
        <article class="stack-card">
          <span>${label}</span>
          <strong>${value}</strong>
        </article>
      `
    )
    .join("");
}

function renderReviewQueue(claims) {
  if (!claims.length) {
    renderEmpty(reviewList, "No claims are waiting for review.");
    return;
  }

  reviewList.innerHTML = claims
    .map(
      (claim) => `
        <article class="list-item">
          <header>
            <h3>${claim.id}</h3>
            ${makeChip(claim.status === "in_review" ? "In Review" : claim.status, claim.status === "in_review" ? "warn" : "")}
          </header>
          <p>Worker ${claim.workerId} requested ${currency(claim.payoutAmount)} against policy ${claim.policyId}.</p>
          <div class="list-row">
            ${makeChip(`Fraud ${claim.riskScore}`)}
            ${makeChip(`Trigger ${claim.triggerEventId}`)}
            ${makeChip(claim.status || "pending", claim.status === "paid" ? "good" : "warn")}
          </div>
          <div class="list-row">
            <button type="button" class="review-action" data-claim-id="${claim.id}" data-action="approve">Approve</button>
            <button type="button" class="review-action secondary" data-claim-id="${claim.id}" data-action="reject">Reject</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderJobs(jobs) {
  if (!jobs.length) {
    renderEmpty(jobsList, "No background jobs recorded yet.");
    return;
  }

  jobsList.innerHTML = jobs
    .slice(-8)
    .reverse()
    .map((job) => {
      const status = job.status || "queued";
      return `
        <article class="list-item">
          <header>
            <h3>${job.type}</h3>
            ${makeChip(status, status === "completed" ? "good" : status === "failed" ? "bad" : "warn")}
          </header>
          <p>${job.id}</p>
          <div class="list-row">
            ${makeChip(new Date(job.createdAt).toLocaleString())}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderAudit(entries) {
  if (!entries.length) {
    renderEmpty(auditList, "Audit log is empty.");
    if (auditListSecondary) {
      renderEmpty(auditListSecondary, "Audit log is empty.");
    }
    return;
  }

  const markup = entries
    .slice(-10)
    .reverse()
    .map(
      (entry) => `
        <article class="list-item">
          <header>
            <h3>${entry.entityType} • ${entry.action}</h3>
            ${makeChip(entry.entityId)}
          </header>
          <p>${new Date(entry.createdAt).toLocaleString()}</p>
          <div class="list-row">
            ${entry.payload?.status ? makeChip(`Status ${entry.payload.status}`, "warn") : ""}
            ${entry.payload?.payoutAmount ? makeChip(currency(entry.payload.payoutAmount)) : ""}
            ${entry.payload?.premium ? makeChip(`Premium ${currency(entry.payload.premium)}`) : ""}
          </div>
        </article>
      `
    )
    .join("");

  auditList.innerHTML = markup;
  if (auditListSecondary) {
    auditListSecondary.innerHTML = markup;
  }
}

function prependCard(target, html) {
  if (target.classList.contains("muted")) {
    target.classList.remove("muted");
    target.innerHTML = "";
  }
  target.innerHTML = `<article class="list-item">${html}</article>${target.innerHTML}`;
}

async function fetchJson(path) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: adminAccessToken ? { authorization: `Bearer ${adminAccessToken}` } : {}
  });
  if (!response.ok) {
    throw new Error(`Request failed for ${path}: ${response.status}`);
  }
  return response.json();
}

async function postJson(path, body) {
  const response = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(adminAccessToken ? { authorization: `Bearer ${adminAccessToken}` } : {})
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const payload = await response.json();
    throw new Error(payload.message || payload.error_code || `Request failed for ${path}`);
  }

  return response.json();
}

async function loadAdminConsole() {
  refreshButton.disabled = true;
  refreshButton.textContent = "Refreshing...";

  try {
    const [overview, metrics, reconciliation, auditLogs, jobs, portfolioSummary, fraudOverview, operationsOverview] = await Promise.all([
      fetchJson("/admin/overview"),
      fetchJson("/admin/metrics"),
      fetchJson("/admin/reconciliation"),
      fetchJson("/admin/audit-logs"),
      fetchJson("/admin/jobs"),
      fetchJson("/admin/portfolio/summary"),
      fetchJson("/admin/fraud/overview"),
      fetchJson("/admin/operations/overview")
    ]);

    heroTargets.workers.textContent = overview.metrics.totals.workers;
    heroTargets.policies.textContent = overview.metrics.totals.policies;
    heroTargets.inReview.textContent = overview.inReviewClaims.length;
    heroTargets.duplicates.textContent = reconciliation.report.duplicatesDetected;

    renderMetricCards([
      { label: "Claims submitted", value: metrics.totals.claims },
      { label: "Paid claims", value: metrics.riskBreakdown.paid },
      { label: "Claims in review", value: metrics.riskBreakdown.inReview },
      { label: "Trust mix", value: `${metrics.trustBreakdown.gold}/${metrics.trustBreakdown.silver}/${metrics.trustBreakdown.bronze}` }
    ]);

    renderReconciliation(reconciliation.report);
    renderReviewQueue(overview.inReviewClaims || []);
    renderJobs(jobs.jobs || []);
    renderAudit(auditLogs.auditLogs || []);

    if (adminPriorityList) {
      adminPriorityList.innerHTML = `
        <article class="list-item">
          <h3>Claims backlog</h3>
          <p>${overview.inReviewClaims.length} claims currently need review action.</p>
          <div class="list-row">
            ${makeChip(`${overview.inReviewClaims.length} in review`, overview.inReviewClaims.length ? "warn" : "good")}
            ${makeChip(`${reconciliation.report.duplicatesDetected} duplicates`, reconciliation.report.duplicatesDetected ? "bad" : "good")}
          </div>
        </article>
        <article class="list-item">
          <h3>Payout integrity</h3>
          <p>${reconciliation.report.successPayouts} successful payouts and ${reconciliation.report.failedPayouts} failures are currently visible.</p>
          <div class="list-row">
            ${makeChip(`Success ${reconciliation.report.successPayouts}`, "good")}
            ${makeChip(`Failed ${reconciliation.report.failedPayouts}`, reconciliation.report.failedPayouts ? "bad" : "good")}
          </div>
        </article>
        <article class="list-item">
          <h3>Fraud posture</h3>
          <p>${fraudOverview.claims.inReview} claims are in the fraud review lane.</p>
          <div class="list-row">
            ${makeChip(`High ${fraudOverview.claims.byBand.high}`)}
            ${makeChip(`Critical ${fraudOverview.claims.byBand.critical}`, fraudOverview.claims.byBand.critical ? "bad" : "good")}
          </div>
        </article>
      `;
    }

    if (adminSystemStatus) {
      adminSystemStatus.innerHTML = `
        <article class="list-item">
          <h3>Operations load</h3>
          <p>Jobs ${operationsOverview.jobs.total} | Pending payouts ${operationsOverview.payouts.pending} | Open support ${operationsOverview.support.open}</p>
          <div class="list-row">
            ${makeChip(`Queued ${operationsOverview.jobs.byStatus.queued}`)}
            ${makeChip(`Running ${operationsOverview.jobs.byStatus.running}`)}
            ${makeChip(`Failed ${operationsOverview.jobs.byStatus.failed}`, operationsOverview.jobs.byStatus.failed ? "bad" : "good")}
          </div>
        </article>
        <article class="list-item">
          <h3>Portfolio pulse</h3>
          <p>Loss ratio ${portfolioSummary.summary.lossRatio}% with gross margin ${currency(portfolioSummary.summary.grossMargin)}.</p>
          <div class="list-row">
            ${makeChip(`Workers ${portfolioSummary.summary.workers}`)}
            ${makeChip(`Policies ${portfolioSummary.summary.policies}`)}
            ${makeChip(`Claims ${portfolioSummary.summary.claims}`)}
          </div>
        </article>
      `;
    }

    if (adminFocusStatus) {
      adminFocusStatus.textContent = overview.inReviewClaims.length
        ? `${overview.inReviewClaims.length} claims need attention.`
        : "No claims are waiting for manual review.";
    }

    if (adminFocusSummary) {
      adminFocusSummary.textContent = reconciliation.report.duplicatesDetected
        ? `Duplicate leakage is non-zero. Resolve reconciliation before clearing the queue.`
        : "Queue and payout integrity look stable. Continue monitoring jobs and audit evidence.";
    }

    if (adminPriorityHeading) {
      adminPriorityHeading.textContent = overview.inReviewClaims.length
        ? "Start with the claims desk before moving to simulation workbenches."
        : "Command center is clear enough to shift into pricing, fraud, or audit workflows.";
    }

    if (adminPrioritySummary) {
      adminPrioritySummary.textContent = `Claims in review: ${overview.inReviewClaims.length}. Duplicate leakage: ${reconciliation.report.duplicatesDetected}. Pending payouts: ${operationsOverview.payouts.pending}.`;
    }

    portfolioOutput.classList.remove("muted");
    portfolioOutput.innerHTML = `
      <article class="list-item">
        <h3>Portfolio Summary</h3>
        <p>Workers ${portfolioSummary.summary.workers} | Policies ${portfolioSummary.summary.policies} | Claims ${portfolioSummary.summary.claims}</p>
        <div class="list-row">
          ${makeChip(`Loss ratio ${portfolioSummary.summary.lossRatio}%`)}
          ${makeChip(`Margin ${currency(portfolioSummary.summary.grossMargin)}`)}
          ${makeChip(`Claim rate ${portfolioSummary.summary.claimRate}`)}
        </div>
      </article>
    `;

    fraudOutput.classList.remove("muted");
    fraudOutput.innerHTML = `
      <article class="list-item">
        <h3>Fraud Overview</h3>
        <p>In review ${fraudOverview.claims.inReview} | Rejected ${fraudOverview.claims.rejected} | Paid ${fraudOverview.claims.paid}</p>
        <div class="list-row">
          ${makeChip(`Bands L/M/H/C ${fraudOverview.claims.byBand.low}/${fraudOverview.claims.byBand.medium}/${fraudOverview.claims.byBand.high}/${fraudOverview.claims.byBand.critical}`)}
          ${makeChip(`Decisions ${fraudOverview.manualReview.decisions}`)}
        </div>
      </article>
    `;

    complianceOutput.classList.remove("muted");
    complianceOutput.innerHTML = `
      <article class="list-item">
        <h3>Operations Snapshot</h3>
        <p>Jobs ${operationsOverview.jobs.total} | Pending payouts ${operationsOverview.payouts.pending} | Support open ${operationsOverview.support.open}</p>
        <div class="list-row">
          ${makeChip(`Queued ${operationsOverview.jobs.byStatus.queued}`)}
          ${makeChip(`Running ${operationsOverview.jobs.byStatus.running}`)}
          ${makeChip(`Completed ${operationsOverview.jobs.byStatus.completed}`)}
          ${makeChip(`Failed ${operationsOverview.jobs.byStatus.failed}`)}
        </div>
      </article>
    `;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    renderEmpty(metricsGrid, message);
    renderEmpty(reconciliationCard, message);
    renderEmpty(reviewList, message);
    renderEmpty(jobsList, message);
    renderEmpty(auditList, message);
    renderEmpty(portfolioOutput, message);
    renderEmpty(fraudOutput, message);
    renderEmpty(complianceOutput, message);
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = "Refresh Data";
  }
}

refreshButton.addEventListener("click", loadAdminConsole);

reviewList.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement) || !target.classList.contains("review-action")) {
    return;
  }

  const claimId = target.dataset.claimId;
  const action = target.dataset.action;
  if (!claimId || !action) {
    return;
  }

  target.disabled = true;
  try {
    await postJson(`/admin/claims/${claimId}/review`, { action });
    await loadAdminConsole();
  } catch (error) {
    renderEmpty(reviewList, error instanceof Error ? error.message : String(error));
  } finally {
    target.disabled = false;
  }
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(authForm);
  const email = String(data.get("email") || "").trim();
  const password = String(data.get("password") || "").trim();

  try {
    if (!adminLoginAllowed(email, password)) {
      throw new Error("Invalid credentials.");
    }

    const result = await postJson("/auth/admin/login", { email, password });
    adminAccessToken = result.session.accessToken;
    adminRefreshToken = result.session.refreshToken;
    localStorage.setItem(adminSessionKey, JSON.stringify({ email, accessToken: adminAccessToken, refreshToken: adminRefreshToken }));
    authError.textContent = "";
    authForm.reset();
    setAuthView(true, email);
    loadAdminConsole();
  } catch (error) {
    authError.textContent = error instanceof Error ? error.message : String(error);
  }
});

logoutButton.addEventListener("click", () => {
  if (adminAccessToken) {
    postJson("/auth/logout", {}).catch(() => undefined);
  }
  localStorage.removeItem(adminSessionKey);
  localStorage.removeItem(adminLayerStateKey);
  adminAccessToken = null;
  adminRefreshToken = null;
  setAuthView(false);
});

adminTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    showAdminLayer(tab.dataset.layer || "overview");
  });
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const jumpElement = target.closest("[data-jump]");
  if (!(jumpElement instanceof HTMLElement)) {
    return;
  }

  const layer = jumpElement.dataset.jump;
  if (!layer) {
    return;
  }

  event.preventDefault();
  showAdminLayer(layer);
});

window.addEventListener("hashchange", () => {
  const hashValue = window.location.hash.replace(/^#/, "");
  if (!hashValue.startsWith("admin=")) {
    return;
  }

  const layer = hashValue.slice("admin=".length);
  if (adminLayerMeta[layer]) {
    showAdminLayer(layer);
  }
});

adminCommandSearch?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  const layer = resolveAdminLayer(adminCommandSearch.value);
  if (layer) {
    showAdminLayer(layer);
    adminCommandSearch.value = "";
  }
});

underwritingForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(underwritingForm);
  const trustScore = Number(data.get("trustScore") || 0);
  const accountAge = Number(data.get("accountAge") || 0);
  const activeHours = Number(data.get("activeHours") || 0);
  const locationConsistency = Number(data.get("locationConsistency") || 0);
  const kyc = String(data.get("kyc") || "pending");
  const anomaly = String(data.get("anomaly") || "no");

  const score = trustScore * 0.4 + Math.min(accountAge, 180) * 0.1 + Math.min(activeHours, 120) * 0.2 + locationConsistency * 100 * 0.2 + (kyc === "verified" ? 15 : -15) + (anomaly === "yes" ? -25 : 10);
  const decision = score >= 72 ? "Approve" : score >= 55 ? "Hold For Review" : "Reject";
  const override = decision === "Hold For Review" ? "Manual override possible with dual approval" : "No override needed";

  prependCard(
    underwritingOutput,
    `<h3>${decision}</h3><p>Composite score ${Math.round(score)}. ${override}.</p><div class="list-row"><span class="chip">Trust ${trustScore}</span><span class="chip">Age ${accountAge}d</span><span class="chip">Hours ${activeHours}</span><span class="chip">KYC ${kyc}</span></div>`
  );
});

pricingForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(pricingForm);
  const baseRate = Number(data.get("baseRate") || 0);
  const zoneRisk = String(data.get("zoneRisk") || "medium");
  const addons = Number(data.get("addons") || 0);
  const waitingDays = Number(data.get("waitingDays") || 0);
  const deductible = String(data.get("deductible") || "low");

  const zoneFactor = zoneRisk === "high" ? 1.25 : zoneRisk === "low" ? 0.9 : 1;
  const addOnFactor = addons * 3;
  const waitFactor = waitingDays * -1;
  const deductibleFactor = deductible === "high" ? -6 : deductible === "none" ? 5 : -2;
  const premium = Math.max(20, Math.round(baseRate * zoneFactor + addOnFactor + waitFactor + deductibleFactor));

  prependCard(
    pricingOutput,
    `<h3>${currency(premium)} projected</h3><p>A/B suggestion: ${premium > 70 ? "Test lower base in high-risk zones" : "Stable for current cohort"}.</p><div class="list-row"><span class="chip">Basic ${currency(premium - 10)}</span><span class="chip">Standard ${currency(premium)}</span><span class="chip">Pro ${currency(premium + 14)}</span></div>`
  );
});

decisionForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(decisionForm);
  const note = {
    id: `DEC-${Date.now().toString().slice(-6)}`,
    claimId: String(data.get("claimId")),
    decision: String(data.get("decision")),
    reason: String(data.get("reason")),
    createdAt: new Date().toLocaleString()
  };
  decisionStore.push(note);
  decisionNotes.classList.remove("muted");
  decisionNotes.innerHTML = decisionStore
    .slice(-8)
    .reverse()
    .map((entry) => `<article class="list-item"><h3>${entry.id}</h3><p>${entry.claimId} - ${entry.decision}</p><p>${entry.reason}</p><div class="list-row"><span class="chip">${entry.createdAt}</span></div></article>`)
    .join("");
  decisionForm.reset();
});

fraudForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(fraudForm);
  const medium = Number(data.get("medium") || 35);
  const high = Number(data.get("high") || 60);
  const critical = Number(data.get("critical") || 85);
  const sampleRisk = Number(data.get("sampleRisk") || 0);

  const lane = sampleRisk >= critical ? "Critical" : sampleRisk >= high ? "High" : sampleRisk >= medium ? "Medium" : "Low";
  const fpRisk = lane === "Medium" ? "Potential false positive risk" : "Stable threshold confidence";

  prependCard(
    fraudOutput,
    `<h3>${lane} Risk Lane</h3><p>${fpRisk}</p><div class="list-row"><span class="chip">M ${medium}</span><span class="chip">H ${high}</span><span class="chip">C ${critical}</span><span class="chip">Sample ${sampleRisk}</span></div>`
  );
});

portfolioForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(portfolioForm);
  const city = String(data.get("city") || "");
  const platform = String(data.get("platform") || "");
  const plan = String(data.get("plan") || "standard");
  const retention = Number(data.get("retention") || 0);

  const simulatedLossRatio = plan === "pro" ? 64 : plan === "basic" ? 48 : 56;
  const unitMargin = Math.max(4, Math.round((retention - simulatedLossRatio / 2) / 2));

  prependCard(
    portfolioOutput,
    `<h3>${city} - ${platform}</h3><p>Plan ${plan.toUpperCase()} | Retention target ${retention}%.</p><div class="list-row"><span class="chip">Loss ratio ${simulatedLossRatio}%</span><span class="chip">Unit margin ${unitMargin}%</span><span class="chip">Cohort health ${retention >= 85 ? "Strong" : "Watch"}</span></div>`
  );
});

complianceForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(complianceForm);
  const consent = Boolean(data.get("consent"));
  const kyc = Boolean(data.get("kyc"));
  const dualApproval = Boolean(data.get("dualApproval"));
  const reportExport = Boolean(data.get("reportExport"));

  const passed = consent && kyc && dualApproval;
  complianceOutput.classList.remove("muted");
  complianceOutput.innerHTML = `<article class="list-item"><h3>${passed ? "Compliant" : "Action Required"}</h3><p>${passed ? "Core controls satisfied for this cycle." : "Complete missing approvals before production rollout."}</p><div class="list-row"><span class="chip ${consent ? "good" : "bad"}">Consent ${consent ? "yes" : "no"}</span><span class="chip ${kyc ? "good" : "bad"}">KYC ${kyc ? "yes" : "no"}</span><span class="chip ${dualApproval ? "good" : "warn"}">4-eyes ${dualApproval ? "yes" : "no"}</span><span class="chip ${reportExport ? "good" : "warn"}">Report ${reportExport ? "exported" : "pending"}</span></div></article>`;
});

injectAdminInterlinks();
restoreSession();
showAdminLayer(getInitialAdminLayer());
if (!appSection.classList.contains("hidden")) {
  loadAdminConsole();
}

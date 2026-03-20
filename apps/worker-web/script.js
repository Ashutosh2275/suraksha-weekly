const apiBase = "http://localhost:8080/api/v1";
const workerSessionKey = "suraksha_worker_session_v1";
const workerProfileKey = "suraksha_worker_profile_v1";
const workerTicketsKey = "suraksha_worker_tickets_v1";
const workerLayerStateKey = "suraksha_worker_layer_v1";

const authSection = document.getElementById("worker-auth");
const appSection = document.getElementById("worker-app");
const authForm = document.getElementById("worker-auth-form");
const authError = document.getElementById("worker-auth-error");
const authUser = document.getElementById("worker-auth-user");
const logoutButton = document.getElementById("worker-logout");

const form = document.getElementById("worker-form");
const refreshButton = document.getElementById("refresh-dashboard");
const onboardingForm = document.getElementById("onboarding-form");
const deleteProfileButton = document.getElementById("delete-profile");
const onboardingSummary = document.getElementById("onboarding-summary");
const profileCompleteness = document.getElementById("profile-completeness");
const notificationsBox = document.getElementById("worker-notifications");
const premiumExplain = document.getElementById("premium-explain");
const planCompare = document.getElementById("plan-compare");
const precheckForm = document.getElementById("precheck-form");
const precheckResult = document.getElementById("precheck-result");
const renewalForm = document.getElementById("renewal-form");
const renewalResult = document.getElementById("renewal-result");
const policyNotes = document.getElementById("policy-notes");
const coverageTermsBox = document.getElementById("coverage-terms");
const policyGlossaryBox = document.getElementById("policy-glossary");
const supportForm = document.getElementById("support-form");
const supportList = document.getElementById("support-list");

const metricEligibility = document.getElementById("metric-eligibility");
const metricTier = document.getElementById("metric-tier");
const metricPremium = document.getElementById("metric-premium");
const metricPayout = document.getElementById("metric-payout");
const metricCoveredHours = document.getElementById("metric-covered-hours");
const metricProtectedEarnings = document.getElementById("metric-protected-earnings");
const quoteCard = document.getElementById("quote-card");
const timeline = document.getElementById("timeline");
const policyList = document.getElementById("policy-list");
const claimList = document.getElementById("claim-list");
const payoutList = document.getElementById("payout-list");
const workerTabs = Array.from(document.querySelectorAll(".layer-tab"));
const workerLayers = Array.from(document.querySelectorAll(".worker-layer"));
const workerSectionKicker = document.getElementById("worker-section-kicker");
const workerSectionTitle = document.getElementById("worker-section-title");
const workerSectionSummary = document.getElementById("worker-section-summary");
const workerJourneyStatus = document.getElementById("worker-journey-status");
const workerHelperSummary = document.getElementById("worker-helper-summary");
const workerNextAction = document.getElementById("worker-next-action");
const workerReadinessSummary = document.getElementById("worker-readiness-summary");
const workerActionRail = document.getElementById("worker-action-rail");
const workerCommandSearch = document.getElementById("worker-command-search");
const appContent = document.querySelector(".app-content");

const workerLayerMeta = {
  overview: {
    kicker: "Worker workspace",
    title: "Home",
    summary: "Your dashboard keeps the next action, current cover, and payout state in one place.",
    aliases: ["home", "overview", "dashboard", "status"]
  },
  onboarding: {
    kicker: "Step 1",
    title: "Set up profile",
    summary: "Complete the few identity, work, and payout details needed for personalized coverage.",
    aliases: ["onboarding", "profile", "kyc", "setup"]
  },
  protection: {
    kicker: "Step 2",
    title: "Get cover",
    summary: "Run the premium lab with only the inputs that materially change premium and payout outcomes.",
    aliases: ["premium", "quote", "cover", "policy purchase"]
  },
  claims: {
    kicker: "Step 3",
    title: "Claims",
    summary: "See policy, claims, payouts, and claim pre-check in one continuous view.",
    aliases: ["claims", "payout", "precheck", "eligibility"]
  },
  policy: {
    kicker: "Policy center",
    title: "Policy",
    summary: "Renewal decisions, wording, and glossary stay together so policy information is easier to read.",
    aliases: ["policy", "renewal", "terms", "glossary"]
  },
  support: {
    kicker: "Support",
    title: "Support",
    summary: "Raise a ticket and confirm the latest status without losing context.",
    aliases: ["support", "ticket", "grievance", "help"]
  },
  insights: {
    kicker: "Learn",
    title: "Learn",
    summary: "Use this screen for plain-language education without mixing it with task execution.",
    aliases: ["learn", "guidance", "insights", "how it works"]
  }
};

const state = {
  phone: null,
  accessToken: null,
  refreshToken: null,
  workerId: null,
  policyId: null,
  lastClaimId: null,
  lastPayoutStatus: null,
  onboarding: null,
  tickets: []
};

function loginAllowed(phone, pin) {
  const validPhones = ["9999999999", "123456789"];
  return validPhones.includes(phone) && pin === "1234";
}

function money(amount) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0);
}

function statusClass(status) {
  if (["rejected", "failed", "cancelled"].includes(status)) return "fail";
  if (["in_review", "pending", "lapsed"].includes(status)) return "warn";
  return "";
}

function setAuthView(authenticated, phone = "") {
  authSection.classList.toggle("hidden", authenticated);
  appSection.classList.toggle("hidden", !authenticated);
  if (authenticated) {
    authUser.textContent = `Worker ${phone}`;
  }
}

function persistSession(phone = state.phone) {
  localStorage.setItem(
    workerSessionKey,
    JSON.stringify({
      phone,
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
      workerId: state.workerId
    })
  );
}

function restoreSession() {
  const saved = localStorage.getItem(workerSessionKey);
  if (!saved) {
    setAuthView(false);
    return;
  }

  try {
    const session = JSON.parse(saved);
    if (!session?.phone || !session?.accessToken) {
      setAuthView(false);
      return;
    }
    state.phone = session.phone;
    state.accessToken = session.accessToken;
    state.refreshToken = session.refreshToken;
    state.workerId = session.workerId || null;
    setAuthView(true, session.phone);
  } catch {
    setAuthView(false);
  }
}

function showWorkerLayer(layerKey) {
  const normalizedLayer = workerLayerMeta[layerKey] ? layerKey : "overview";

  workerTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.layer === normalizedLayer);
  });

  workerLayers.forEach((section) => {
    section.classList.toggle("hidden", section.dataset.layerPage !== normalizedLayer);
  });

  localStorage.setItem(workerLayerStateKey, normalizedLayer);
  if (window.location.hash !== `#worker=${normalizedLayer}`) {
    window.history.replaceState(null, "", `#worker=${normalizedLayer}`);
  }

  updateWorkerContext(normalizedLayer);
}

function updateWorkerContext(layerKey) {
  const meta = workerLayerMeta[layerKey] || workerLayerMeta.overview;
  if (workerSectionKicker) workerSectionKicker.textContent = meta.kicker;
  if (workerSectionTitle) workerSectionTitle.textContent = meta.title;
  if (workerSectionSummary) workerSectionSummary.textContent = meta.summary;
  if (appContent) {
    appContent.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function resolveWorkerLayer(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return Object.entries(workerLayerMeta).find(([, meta]) => meta.aliases.some((alias) => normalized.includes(alias)))?.[0] || null;
}

function getInitialWorkerLayer() {
  const hashValue = window.location.hash.replace(/^#/, "");
  if (hashValue.startsWith("worker=")) {
    const hashLayer = hashValue.slice("worker=".length);
    if (workerLayerMeta[hashLayer]) {
      return hashLayer;
    }
  }

  const storedLayer = localStorage.getItem(workerLayerStateKey);
  if (storedLayer && workerLayerMeta[storedLayer]) {
    return storedLayer;
  }

  return "overview";
}

function injectWorkerInterlinks() {
  workerLayers.forEach((section) => {
    const currentLayer = section.dataset.layerPage || "overview";
    const rail = document.createElement("div");
    rail.className = "interlink-rail";

    Object.entries(workerLayerMeta).forEach(([layer, meta]) => {
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

function updateWorkerOverview() {
  let nextAction = "Start by saving your onboarding profile.";
  let readiness = "Once your profile is saved, the console will guide you through quote generation, policy purchase, and claim readiness.";
  let journey = "Sign in to begin your protection journey.";
  let helper = "The dashboard will guide you to the next action after every step.";
  let rail = "Save your profile first so recommendations can be personalized.";

  if (state.phone) {
    journey = `Signed in as ${state.phone}.`;
    helper = "Use quick jumps to move between setup, cover, claims, and support.";
  }

  if (state.onboarding) {
    nextAction = state.policyId ? "Your policy journey is active. Review claims or support next." : "Your profile is ready. Run the premium lab to generate cover options.";
    readiness = `Profile saved for ${state.onboarding.fullName || state.phone}. ${state.onboarding.kycVerified ? "KYC verified." : "KYC still pending."}`;
    journey = `${state.onboarding.city || "Your city"} profile loaded with ${state.onboarding.platformType || "worker"} work pattern.`;
    rail = state.policyId
      ? "Check claim pre-check, payout history, or renewal guidance next."
      : "Go to Get cover to generate a quote and activate a policy.";
  }

  if (state.policyId) {
    nextAction = state.lastClaimId ? "Claim flow has already been run. Review the payout result or refresh the dashboard." : "Your policy is active. If a disruption happens, use Claims to pre-check the outcome.";
    readiness = `Policy ${state.policyId} is active${state.lastPayoutStatus ? ` and the latest payout status is ${state.lastPayoutStatus}.` : "."}`;
    rail = state.lastClaimId
      ? `Latest claim ${state.lastClaimId} is linked to payout status ${state.lastPayoutStatus || "pending"}.`
      : "You now have policy coverage, claim pre-check, and support tools ready.";
  }

  if (workerNextAction) workerNextAction.textContent = nextAction;
  if (workerReadinessSummary) workerReadinessSummary.textContent = readiness;
  if (workerJourneyStatus) workerJourneyStatus.textContent = journey;
  if (workerHelperSummary) workerHelperSummary.textContent = helper;
  if (workerActionRail) {
    workerActionRail.classList.remove("muted");
    workerActionRail.textContent = rail;
  }
}

function setTimeline(items) {
  timeline.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
}

function pushNotification(message) {
  const existing = notificationsBox.classList.contains("muted")
    ? []
    : notificationsBox.innerHTML.split("</div>").filter(Boolean).map((entry) => `${entry}</div>`);
  const next = [`<div class="note-item">${new Date().toLocaleTimeString()} - ${message}</div>`, ...existing].slice(0, 6);
  notificationsBox.classList.remove("muted");
  notificationsBox.innerHTML = next.join("");
  updateWorkerOverview();
}

function fillOnboardingForm(profile) {
  if (!profile) return;
  const values = {
    phone: profile.phone,
    city: profile.city,
    zone: profile.zone,
    serviceZones: (profile.serviceZones || []).join(", "),
    fullName: profile.fullName,
    dob: profile.dob,
    gender: profile.gender,
    emergencyContact: profile.emergencyContact,
    aadhaar4: profile.aadhaar4,
    pan4: profile.pan4,
    riderId: profile.riderId,
    platformType: profile.platformType,
    vehicleType: profile.vehicleType,
    ordersPerDay: profile.ordersPerDay,
    averageDailyOnlineHours: profile.averageDailyOnlineHours,
    activeHoursWeek: profile.activeHoursWeek,
    activeHours14d: profile.activeHours14d,
    weeklyIncome4w: profile.weeklyIncome4w,
    averageWeeklyEarnings: profile.averageWeeklyEarnings,
    volatilityBand: profile.volatilityBand,
    payoutCycle: profile.payoutCycle,
    cashShare: profile.cashShare,
    digitalShare: profile.digitalShare,
    nominee: profile.nominee,
    upiId: profile.upiId,
    bank4: profile.bank4,
    accountAgeDays: profile.accountAgeDays,
    locationConsistency: profile.locationConsistency,
    trustScore: profile.trustScore
  };

  Object.entries(values).forEach(([key, value]) => {
    if (onboardingForm.elements[key]) {
      onboardingForm.elements[key].value = value;
    }
  });

  onboardingForm.elements.payoutAccountVerified.checked = Boolean(profile.payoutAccountVerified);
  onboardingForm.elements.kycVerified.checked = Boolean(profile.kycVerified);
  onboardingForm.elements.consentAccepted.checked = Boolean(profile.consentAccepted);
  onboardingForm.elements.triggerDisclosureAccepted.checked = Boolean(profile.triggerDisclosureAccepted);
}

function syncWorkerForm() {
  if (state.phone && form.elements.phone) {
    form.elements.phone.value = state.phone;
  }
  if (state.onboarding) {
    form.elements.city.value = state.onboarding.city || form.elements.city.value;
    form.elements.zone.value = state.onboarding.zone || form.elements.zone.value;
    form.elements.accountAgeDays.value = state.onboarding.accountAgeDays || form.elements.accountAgeDays.value;
    form.elements.activeHours14d.value = state.onboarding.activeHours14d || form.elements.activeHours14d.value;
    form.elements.locationConsistency.value = state.onboarding.locationConsistency || form.elements.locationConsistency.value;
    form.elements.trustScore.value = state.onboarding.trustScore || form.elements.trustScore.value;
    form.elements.payoutAccountVerified.checked = Boolean(state.onboarding.payoutAccountVerified);
  }
}

function renderProfile(completeness) {
  if (!state.onboarding) {
    onboardingSummary.classList.add("muted");
    onboardingSummary.textContent = "Fill the form to generate profile summary.";
    profileCompleteness.classList.add("muted");
    profileCompleteness.textContent = "No onboarding profile captured yet.";
    updateWorkerOverview();
    return;
  }

  onboardingSummary.classList.remove("muted");
  onboardingSummary.innerHTML = `
    <strong>${state.onboarding.fullName}</strong><br />
    ${state.onboarding.platformType} | Rider ID ${state.onboarding.riderId} | ${state.onboarding.vehicleType}<br />
    ${state.onboarding.city} - ${state.onboarding.zone} | ${state.onboarding.ordersPerDay} orders/day<br />
    Weekly income ${money(state.onboarding.weeklyIncome4w)} | Avg daily hours ${state.onboarding.averageDailyOnlineHours}<br />
    Nominee ${state.onboarding.nominee} | UPI ${state.onboarding.upiId}
  `;

  profileCompleteness.classList.remove("muted");
  profileCompleteness.innerHTML = `
    <div class="quote-lead">${completeness?.percentage ?? 0}% Complete</div>
    <div>KYC ${state.onboarding.kycVerified ? "verified" : "pending"} | Income band ${state.onboarding.volatilityBand}</div>
    <div>Missing: ${(completeness?.missing || []).slice(0, 5).join(", ") || "none"}</div>
  `;
  updateWorkerOverview();
}

function renderCoverageContent(terms, glossary) {
  coverageTermsBox.classList.remove("muted");
  coverageTermsBox.innerHTML = `
    ${terms.transparentTerms.map((term) => `<div>${term}</div>`).join("")}
    <hr />
    ${terms.exclusions.map((term) => `<div>${term}</div>`).join("")}
  `;

  policyGlossaryBox.classList.remove("muted");
  policyGlossaryBox.innerHTML = Object.entries(glossary)
    .map(([key, value]) => `<div><strong>${key.replaceAll("_", " ")}</strong>: ${value}</div>`)
    .join("");
}

function renderTickets() {
  if (!state.tickets.length) {
    supportList.classList.add("muted");
    supportList.textContent = "No support tickets submitted.";
    return;
  }
  supportList.classList.remove("muted");
  supportList.innerHTML = state.tickets
    .slice(-6)
    .reverse()
    .map((ticket) => `<div class="note-item"><strong>${ticket.id}</strong> - ${ticket.issueType} (${ticket.priority})<br />${ticket.details}</div>`)
    .join("");
}

function renderQuote(quote) {
  quoteCard.classList.remove("muted");
  quoteCard.innerHTML = `
    <div class="quote-lead">${money(quote.premium)} / week</div>
    <div>${quote.productNarrative.label}: ${quote.productNarrative.description}</div>
    <div class="chip-row">
      <span class="chip">Risk: ${quote.riskSegment}</span>
      <span class="chip">Trust: ${quote.trustTier}</span>
      <span class="chip">Cap: ${money(quote.weeklyCoverageCap)}</span>
    </div>
    <p>${quote.productNarrative.idealFor}</p>
  `;
  metricPremium.textContent = money(quote.premium);
  updateWorkerOverview();
}

function renderPremiumExplainability(quote, inputs) {
  const addOnCount = [inputs.factorRain, inputs.factorAqi, inputs.factorCurfew].filter(Boolean).length;
  const deductibleFactor = inputs.deductible === "high" ? -6 : inputs.deductible === "low" ? -2 : 0;
  const waitingFactor = Number(inputs.waitingPeriod) * -1;
  const copayFactor = Number(inputs.copay) >= 20 ? -4 : Number(inputs.copay) >= 10 ? -2 : 0;
  const addOnFactor = addOnCount * 4;
  const simulated = Math.max(20, Math.round(quote.premium + deductibleFactor + waitingFactor + copayFactor + addOnFactor));

  premiumExplain.classList.remove("muted");
  premiumExplain.innerHTML = `
    <div class="quote-lead">${money(simulated)} simulated premium</div>
    <div>Base API premium ${money(quote.premium)}</div>
    <div class="chip-row">
      <span class="chip">Deductible impact ${deductibleFactor}</span>
      <span class="chip">Waiting impact ${waitingFactor}</span>
      <span class="chip">Co-pay impact ${copayFactor}</span>
      <span class="chip">Signal impact +${addOnFactor}</span>
    </div>
  `;

  const options = {
    basic: quote.premium - 12,
    standard: quote.premium,
    pro: quote.premium + 14
  };
  planCompare.classList.remove("muted");
  planCompare.innerHTML = `
    <div>Basic Shield: ${money(Math.max(20, options.basic))}</div>
    <div>Standard Guard: ${money(options.standard)}</div>
    <div>Pro Resilience: ${money(options.pro)}</div>
  `;
}

function renderList(container, items, formatter, emptyMessage) {
  if (!items.length) {
    container.className = "list-output muted";
    container.textContent = emptyMessage;
    return;
  }
  container.className = "list-output";
  container.innerHTML = items.map(formatter).join("");
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      "content-type": "application/json",
      ...(state.accessToken ? { authorization: `Bearer ${state.accessToken}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || payload.error_code || "Request failed");
  }
  return payload;
}

async function loadCoverageContent() {
  const [terms, glossary, triggerExplanations] = await Promise.all([
    request("/content/coverage-terms"),
    request("/content/policy-glossary"),
    request("/content/trigger-explanations")
  ]);
  renderCoverageContent(terms, glossary.glossary);
  policyNotes.classList.remove("muted");
  policyNotes.innerHTML = triggerExplanations.triggers
    .slice(0, 3)
    .map((trigger) => `<div><strong>${trigger.type}</strong>: ${trigger.condition}</div>`)
    .join("");
}

async function refreshDashboard() {
  if (!state.workerId) return;
  const [dashboard, timelinePayload, supportPayload] = await Promise.all([
    request(`/workers/${state.workerId}/dashboard`),
    request(`/workers/${state.workerId}/timeline`),
    request(`/workers/${state.workerId}/support/tickets`)
  ]);
  metricEligibility.textContent = dashboard.eligibility.eligible ? "Eligible" : dashboard.eligibility.reason;
  metricTier.textContent = dashboard.trust.tier;
  metricPayout.textContent = state.lastPayoutStatus || "No payout";
  metricCoveredHours.textContent = String(dashboard.protection.coveredHours || 0);
  metricProtectedEarnings.textContent = money(dashboard.protection.estimatedProtectedEarnings || 0);

  if (dashboard.riskProfile) {
    state.onboarding = dashboard.riskProfile;
    fillOnboardingForm(dashboard.riskProfile);
    localStorage.setItem(workerProfileKey, JSON.stringify(dashboard.riskProfile));
    renderProfile(dashboard.profileCompleteness);
    syncWorkerForm();
  }

  policyNotes.classList.remove("muted");
  policyNotes.innerHTML = `Latest policy status ${dashboard.protection.latestPolicyStatus}. Covered hours ${dashboard.protection.coveredHours}. Estimated protected earnings ${money(dashboard.protection.estimatedProtectedEarnings)}.`;

  const timelineItems = timelinePayload.timeline.map((entry) => `${entry.title}: ${entry.detail}`);
  setTimeline(timelineItems.length ? timelineItems : ["No timeline activity yet."]);

  state.tickets = supportPayload.tickets || [];
  localStorage.setItem(workerTicketsKey, JSON.stringify(state.tickets));
  renderTickets();

  renderList(
    policyList,
    dashboard.policies,
    (policy) => `
      <div class="list-card">
        <strong>${policy.plan.toUpperCase()} plan</strong>
        <div>${money(policy.premium)} weekly premium</div>
        <div>${money(policy.weeklyCoverageCap)} cap</div>
        <span class="status-pill ${statusClass(policy.status)}">${policy.status}</span>
      </div>
    `,
    "No active policy yet."
  );

  renderList(
    claimList,
    dashboard.claims,
    (claim) => `
      <div class="list-card">
        <strong>${claim.triggerEventId}</strong>
        <div>Payout requested: ${money(claim.payoutAmount)}</div>
        <div>Risk score: ${claim.riskScore}</div>
        <span class="status-pill ${statusClass(claim.status)}">${claim.status}</span>
      </div>
    `,
    "No claims yet."
  );

  renderList(
    payoutList,
    dashboard.payouts,
    (payout) => `
      <div class="list-card">
        <strong>${money(payout.amount)}</strong>
        <div>Claim ID: ${payout.claimId}</div>
        <span class="status-pill ${statusClass(payout.status)}">${payout.status}</span>
      </div>
    `,
    "No payouts yet."
  );

  updateWorkerOverview();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const payload = {
    phone: String(data.get("phone") || "").trim(),
    city: String(data.get("city") || "").trim(),
    zone: String(data.get("zone") || "").trim(),
    accountAgeDays: Number(data.get("accountAgeDays") || 0),
    activeHours14d: Number(data.get("activeHours14d") || 0),
    payoutAccountVerified: Boolean(data.get("payoutAccountVerified")),
    locationConsistency: Number(data.get("locationConsistency") || 0),
    trustScore: Number(data.get("trustScore") || 0)
  };
  const plan = String(data.get("plan") || "standard");
  const requestedAmount = Number(data.get("requestedAmount") || 0);
  const premiumInputs = {
    deductible: String(data.get("deductible") || "low"),
    waitingPeriod: String(data.get("waitingPeriod") || "1"),
    copay: String(data.get("copay") || "10"),
    factorRain: Boolean(data.get("factorRain")),
    factorAqi: Boolean(data.get("factorAqi")),
    factorCurfew: Boolean(data.get("factorCurfew"))
  };

  try {
    setTimeline(["Syncing worker profile...", "Preparing underwriting checks..."]);
    if (state.workerId) {
      await request(`/workers/${state.workerId}/profile`, {
        method: "PATCH",
        body: JSON.stringify({
          city: payload.city,
          zone: payload.zone,
          accountAgeDays: payload.accountAgeDays,
          activeHours14d: payload.activeHours14d,
          payoutAccountVerified: payload.payoutAccountVerified,
          locationConsistency: payload.locationConsistency,
          trustScore: payload.trustScore
        })
      });
    } else {
      const workerResponse = await request("/workers/register", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      state.workerId = workerResponse.worker.id;
      metricEligibility.textContent = workerResponse.eligibility.eligible ? "Eligible" : workerResponse.eligibility.reason;
    }

    state.phone = payload.phone;
    persistSession(payload.phone);

    setTimeline(["Worker profile ready.", "Generating weekly quote..."]);
    const quote = await request("/policies/quote", {
      method: "POST",
      body: JSON.stringify({ workerId: state.workerId, plan })
    });
    renderQuote(quote);
    renderPremiumExplainability(quote, premiumInputs);
    metricTier.textContent = quote.trustTier;

    setTimeline([`Quote generated at ${money(quote.premium)} weekly premium.`, "Purchasing policy..."]);
    const purchase = await request("/policies/purchase", {
      method: "POST",
      body: JSON.stringify({ workerId: state.workerId, plan })
    });
    state.policyId = purchase.policy.id;

    setTimeline([`Quote generated at ${money(quote.premium)} weekly premium.`, "Policy activated.", "Simulating trigger-linked claim..."]);
    const claim = await request("/claims/initiate", {
      method: "POST",
      body: JSON.stringify({
        workerId: state.workerId,
        policyId: state.policyId,
        triggerEventId: `rain-${Date.now()}`,
        requestedAmount
      })
    });
    state.lastClaimId = claim.claim.id;
    state.lastPayoutStatus = claim.payout?.status || claim.claim.status;
    metricPayout.textContent = state.lastPayoutStatus;

    setTimeline([
      `Quote generated at ${money(quote.premium)} weekly premium.`,
      "Policy activated.",
      `Claim created with ${claim.fraud.decision} fraud risk lane.`,
      `Payout outcome: ${state.lastPayoutStatus}.`
    ]);

    await refreshDashboard();
    pushNotification("Policy flow completed and dashboard refreshed.");
  } catch (error) {
    quoteCard.classList.add("muted");
    quoteCard.textContent = error.message;
    setTimeline([`Flow stopped: ${error.message}`]);
    metricPayout.textContent = "Error";
  }
});

refreshButton.addEventListener("click", async () => {
  try {
    await refreshDashboard();
  } catch (error) {
    setTimeline([`Refresh failed: ${error.message}`]);
  }
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(authForm);
  const phone = String(data.get("phone") || "").trim();
  const pin = String(data.get("pin") || "").trim();

  try {
    await request("/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone })
    });

    const otpVerify = await request("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code: pin })
    });

    if (!loginAllowed(phone, pin)) {
      throw new Error("Invalid phone or OTP.");
    }

    state.phone = phone;
    state.accessToken = otpVerify.session.accessToken;
    state.refreshToken = otpVerify.session.refreshToken;
    persistSession(phone);
    authError.textContent = "";
    authForm.reset();
    setAuthView(true, phone);
    if (onboardingForm.elements.phone) {
      onboardingForm.elements.phone.value = phone;
    }
    syncWorkerForm();
    await loadCoverageContent();
    if (state.workerId) {
      await refreshDashboard();
    }
    pushNotification("Worker signed in successfully.");
  } catch (error) {
    authError.textContent = error.message;
  }
});

logoutButton.addEventListener("click", () => {
  if (state.accessToken) {
    request("/auth/logout", { method: "POST" }).catch(() => undefined);
  }
  localStorage.removeItem(workerSessionKey);
  localStorage.removeItem(workerLayerStateKey);
  state.phone = null;
  state.accessToken = null;
  state.refreshToken = null;
  state.workerId = null;
  setAuthView(false);
  setTimeline(["Signed out. Please login to continue."]);
});

workerTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    showWorkerLayer(tab.dataset.layer || "overview");
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
  showWorkerLayer(layer);
});

window.addEventListener("hashchange", () => {
  const hashValue = window.location.hash.replace(/^#/, "");
  if (!hashValue.startsWith("worker=")) {
    return;
  }

  const layer = hashValue.slice("worker=".length);
  if (workerLayerMeta[layer]) {
    showWorkerLayer(layer);
  }
});

workerCommandSearch?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  const layer = resolveWorkerLayer(workerCommandSearch.value);
  if (layer) {
    showWorkerLayer(layer);
    workerCommandSearch.value = "";
  }
});

onboardingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(onboardingForm);
  const payload = {
    phone: String(data.get("phone") || "").trim(),
    city: String(data.get("city") || "").trim(),
    zone: String(data.get("zone") || "").trim(),
    serviceZones: String(data.get("serviceZones") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    fullName: String(data.get("fullName") || "").trim(),
    dob: String(data.get("dob") || "").trim(),
    gender: String(data.get("gender") || "female"),
    emergencyContact: String(data.get("emergencyContact") || "").trim(),
    aadhaar4: String(data.get("aadhaar4") || "").trim(),
    pan4: String(data.get("pan4") || "").trim(),
    riderId: String(data.get("riderId") || "").trim(),
    platformType: String(data.get("platformType") || "other").trim(),
    vehicleType: String(data.get("vehicleType") || "bike").trim(),
    ordersPerDay: Number(data.get("ordersPerDay") || 0),
    averageDailyOnlineHours: Number(data.get("averageDailyOnlineHours") || 0),
    activeHoursWeek: Number(data.get("activeHoursWeek") || 0),
    activeHours14d: Number(data.get("activeHours14d") || 0),
    weeklyIncome4w: Number(data.get("weeklyIncome4w") || 0),
    averageWeeklyEarnings: Number(data.get("averageWeeklyEarnings") || 0),
    volatilityBand: String(data.get("volatilityBand") || "medium"),
    payoutCycle: String(data.get("payoutCycle") || "weekly"),
    cashShare: Number(data.get("cashShare") || 0),
    digitalShare: Number(data.get("digitalShare") || 0),
    nominee: String(data.get("nominee") || "").trim(),
    upiId: String(data.get("upiId") || "").trim(),
    bank4: String(data.get("bank4") || "").trim(),
    accountAgeDays: Number(data.get("accountAgeDays") || 0),
    locationConsistency: Number(data.get("locationConsistency") || 0),
    trustScore: Number(data.get("trustScore") || 0),
    payoutAccountVerified: Boolean(data.get("payoutAccountVerified")),
    kycVerified: Boolean(data.get("kycVerified")),
    consentAccepted: Boolean(data.get("consentAccepted")),
    triggerDisclosureAccepted: Boolean(data.get("triggerDisclosureAccepted"))
  };

  try {
    const result = await request("/workers/onboarding", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    state.phone = payload.phone;
    state.workerId = result.worker.id;
    state.onboarding = result.riskProfile;
    persistSession(payload.phone);
    localStorage.setItem(workerProfileKey, JSON.stringify(result.riskProfile));
    fillOnboardingForm(result.riskProfile);
    renderProfile(result.profileCompleteness);
    syncWorkerForm();
    metricEligibility.textContent = result.eligibility.eligible ? "Eligible" : result.eligibility.reason;
    pushNotification("Onboarding profile saved.");
    await refreshDashboard();
  } catch (error) {
    onboardingSummary.classList.remove("muted");
    onboardingSummary.textContent = error.message;
  }
});

deleteProfileButton.addEventListener("click", async () => {
  if (!state.workerId) {
    onboardingSummary.classList.remove("muted");
    onboardingSummary.textContent = "No saved worker profile to delete.";
    return;
  }

  try {
    await request(`/workers/${state.workerId}/risk-profile`, { method: "DELETE" });
    state.onboarding = null;
    localStorage.removeItem(workerProfileKey);
    renderProfile();
    pushNotification("Risk profile deleted.");
  } catch (error) {
    onboardingSummary.classList.remove("muted");
    onboardingSummary.textContent = error.message;
  }
});

precheckForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.workerId) {
    precheckResult.classList.remove("muted");
    precheckResult.innerHTML = "<div class=\"quote-lead\">Create or load a worker profile first.</div>";
    return;
  }

  const data = new FormData(precheckForm);
  const requested = Number(data.get("requestedAmount") || 0);
  const confidence = Number(data.get("confidence") || 0);
  const daysImpacted = Number(data.get("daysImpacted") || 0);

  try {
    const estimator = await request(`/workers/${state.workerId}/payout-estimator`, {
      method: "POST",
      body: JSON.stringify({
        policyId: state.policyId || undefined,
        triggerType: confidence >= 0.9 ? "heavy_rain" : confidence >= 0.8 ? "severe_pollution" : "manual",
        lostCoveredHours: Math.max(1, daysImpacted * 4),
        triggerSeverityFactor: Math.max(0.5, Math.min(2, confidence + 0.4))
      })
    });

    const likelyEligible = requested <= estimator.estimate.weeklyCoverageCap && confidence >= 0.75;
    precheckResult.classList.remove("muted");
    precheckResult.innerHTML = `
      <div class="quote-lead">${likelyEligible ? "Likely eligible" : "Needs review"}</div>
      <div>Estimated payout: ${money(estimator.estimate.estimatedPayout)}</div>
      <div>Coverage cap: ${money(estimator.estimate.weeklyCoverageCap)}</div>
      <div>Formula: ${estimator.explanation.formula}</div>
    `;
  } catch (error) {
    precheckResult.classList.remove("muted");
    precheckResult.innerHTML = `<div class="quote-lead">Estimator error</div><div>${error.message}</div>`;
  }
});

renewalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(renewalForm);
  const coverageGoal = Number(data.get("coverageGoal") || 0);
  const income = Number(data.get("income") || state.onboarding?.weeklyIncome4w || 0);
  const risk = String(data.get("risk") || "balanced");
  const riskFactor = risk === "aggressive" ? 1.2 : risk === "conservative" ? 0.9 : 1;
  const estimate = Math.max(25, Math.round((income * 0.009 + coverageGoal * 0.004) * riskFactor));
  renewalResult.classList.remove("muted");
  renewalResult.innerHTML = `<div class="quote-lead">${money(estimate)} / week</div><div>Recommended plan: ${risk === "aggressive" ? "Pro" : risk === "conservative" ? "Basic" : "Standard"}</div>`;
  policyNotes.classList.remove("muted");
  policyNotes.innerHTML = `Renewal signal based on income ${money(income)} and coverage goal ${money(coverageGoal)}.`;
});

supportForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(supportForm);
  if (!state.workerId) {
    pushNotification("Save onboarding profile before creating support tickets.");
    return;
  }

  try {
    const created = await request(`/workers/${state.workerId}/support/tickets`, {
      method: "POST",
      body: JSON.stringify({
        issueType: String(data.get("issueType") || "other"),
        priority: String(data.get("priority") || "medium"),
        details: String(data.get("details") || "")
      })
    });

    state.tickets = [created.ticket, ...state.tickets];
    localStorage.setItem(workerTicketsKey, JSON.stringify(state.tickets));
    supportForm.reset();
    renderTickets();
    pushNotification(`Support ticket ${created.ticket.id} created.`);
    await refreshDashboard();
  } catch (error) {
    pushNotification(`Support request failed: ${error.message}`);
  }
});

setTimeline(["Ready to simulate the worker flow.", "Use onboarding to save a profile or run the quote flow."]);

injectWorkerInterlinks();
restoreSession();
showWorkerLayer(getInitialWorkerLayer());

const savedProfile = localStorage.getItem(workerProfileKey);
if (savedProfile) {
  try {
    state.onboarding = JSON.parse(savedProfile);
    fillOnboardingForm(state.onboarding);
  } catch {
    state.onboarding = null;
  }
}

const savedTickets = localStorage.getItem(workerTicketsKey);
if (savedTickets) {
  try {
    state.tickets = JSON.parse(savedTickets);
  } catch {
    state.tickets = [];
  }
}

if (state.phone && onboardingForm.elements.phone) {
  onboardingForm.elements.phone.value = state.phone;
}
syncWorkerForm();
renderProfile();
renderTickets();
updateWorkerOverview();

if (!appSection.classList.contains("hidden")) {
  loadCoverageContent().catch(() => undefined);
  if (state.workerId) {
    refreshDashboard().catch(() => undefined);
  }
}

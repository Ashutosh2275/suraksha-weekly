import { v4 as uuid } from "uuid";
import { repository } from "../data/repository.js";
import { Policy, PolicyReminder } from "../types.js";

export function policyTermsPlainLanguage(plan: "basic" | "standard" | "pro") {
  const title = plan === "basic" ? "Basic Shield" : plan === "standard" ? "Standard Guard" : "Pro Resilience";
  return {
    title,
    summary: "Weekly plan that protects only disruption-linked income loss.",
    inclusions: [
      "Covers verified income loss from external disruption triggers.",
      "Weekly premium and weekly coverage cap apply.",
      "Approved claims are paid through sandbox payout processing."
    ],
    exclusions: [
      "No health, hospitalization, life, accident, or vehicle repair coverage.",
      "No retroactive policy activation.",
      "No annual policy duration in MVP."
    ]
  };
}

export function lapsePolicies(referenceIso: string, workerId?: string): { lapsed: number; checked: number } {
  const policies = workerId ? repository.listWorkerPolicies(workerId) : repository.listPolicies();
  let lapsed = 0;

  for (const policy of policies) {
    if (policy.status === "active" && policy.endsAt < referenceIso) {
      repository.updatePolicy({ ...policy, status: "lapsed", lapsedAt: referenceIso });
      repository.recordRetentionEvent({
        id: uuid(),
        workerId: policy.workerId,
        policyId: policy.id,
        event: "lapse",
        createdAt: referenceIso
      });
      lapsed += 1;
    }
  }

  return { lapsed, checked: policies.length };
}

export function listPoliciesWithLifecycle(workerId?: string): Policy[] {
  lapsePolicies(new Date().toISOString(), workerId);
  const policies = workerId ? repository.listWorkerPolicies(workerId) : repository.listPolicies();
  const nowIso = new Date().toISOString();

  return policies
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .map((policy) => ({
      ...policy,
      lifecycleState:
        policy.status === "cancelled"
          ? "cancelled"
          : policy.status === "lapsed"
            ? "lapsed"
            : policy.endsAt < nowIso
              ? "expired"
              : "active"
    })) as Policy[];
}

export function scheduleRenewalReminders(workerId: string, nowIso: string, withinHours = 24): PolicyReminder[] {
  const cutoff = new Date(new Date(nowIso).getTime() + withinHours * 60 * 60 * 1000).toISOString();
  const existing = repository.listPolicyReminders(workerId);
  const duePolicies = listPoliciesWithLifecycle(workerId).filter((policy) => policy.status === "active" && policy.endsAt <= cutoff && policy.endsAt > nowIso);

  const reminders: PolicyReminder[] = [];
  for (const policy of duePolicies) {
    const alreadyScheduled = existing.find((reminder) => reminder.policyId === policy.id && reminder.status === "scheduled");
    if (alreadyScheduled) {
      reminders.push(alreadyScheduled);
      continue;
    }

    const reminder = repository.createPolicyReminder({
      id: uuid(),
      policyId: policy.id,
      workerId: policy.workerId,
      dueAt: policy.endsAt,
      channel: "push",
      status: "scheduled"
    });
    repository.updatePolicy({ ...policy, lastReminderAt: nowIso });
    reminders.push(reminder);
  }

  return reminders;
}

export function markReminderSent(reminderId: string, sentAtIso: string): PolicyReminder | undefined {
  const reminder = repository.listPolicyReminders().find((item) => item.id === reminderId);
  if (!reminder) return undefined;
  if (reminder.status === "sent") return reminder;
  return repository.updatePolicyReminder({ ...reminder, status: "sent", sentAt: sentAtIso });
}

export function retentionMetrics() {
  const events = repository.listRetentionEvents();
  const purchases = events.filter((event) => event.event === "purchase").length;
  const renewals = events.filter((event) => event.event === "renewal").length;
  const cancellations = events.filter((event) => event.event === "cancel").length;
  const lapses = events.filter((event) => event.event === "lapse").length;
  const renewalRate = purchases > 0 ? Math.round((renewals / purchases) * 10000) / 100 : 0;

  return {
    purchases,
    renewals,
    cancellations,
    lapses,
    renewalRate
  };
}
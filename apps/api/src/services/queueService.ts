type QueueJob = {
  id: string;
  type:
    | "trigger-ingestion"
    | "trigger-ingestion-batch"
    | "manual-review"
    | "reconciliation"
    | "trigger.confirmed"
    | "claim.initiated"
    | "surge_mode.activated";
  payload: Record<string, unknown>;
  createdAt: string;
};

const jobs: QueueJob[] = [];

export function enqueueJob(job: QueueJob): QueueJob {
  jobs.push(job);
  return job;
}

export function listJobs(): QueueJob[] {
  return [...jobs];
}

export function resetJobs() {
  jobs.length = 0;
}

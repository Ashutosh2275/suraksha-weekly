type QueueJob = {
  id: string;
  type: "trigger-ingestion" | "trigger-ingestion-batch" | "manual-review" | "reconciliation";
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

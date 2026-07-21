export enum JobStatus {
  // Job created, accepted by the service worker, not yet picked up by offscreen.
  pending = 'pending',
  // Offscreen is executing the job; `stage` carries the current step.
  running = 'running',
  succeeded = 'succeeded',
  failed = 'failed',
  // The executing context (offscreen / service worker) was torn down mid-flight
  // before reaching a terminal state. The user must retry.
  interrupted = 'interrupted',
}

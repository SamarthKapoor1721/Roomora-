import { runWarningScan } from './warnings.service';

const INTERVAL_MS = 60 * 60 * 1000; // hourly

/** Starts the periodic warning scanner. Returns a stop function. */
export function startScheduler(): () => void {
  if (process.env.DISABLE_SCHEDULER === 'true') {
    return () => undefined;
  }

  const tick = async () => {
    try {
      const result = await runWarningScan();
      if (result.created > 0) {
        // eslint-disable-next-line no-console
        console.log(`[scheduler] warning scan: ${result.created} new warning(s)`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[scheduler] warning scan failed', err);
    }
  };

  // Run shortly after boot, then on an interval.
  const first = setTimeout(tick, 10_000);
  const interval = setInterval(tick, INTERVAL_MS);

  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}

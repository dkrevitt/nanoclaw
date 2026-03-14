/**
 * Task scheduler for simple-agent
 *
 * Polls database every minute for due tasks.
 */

import { CronExpressionParser } from 'cron-parser';
import { getDueTasks, getTaskById, updateTaskAfterRun, ScheduledTask } from './db.js';

const POLL_INTERVAL = 60_000; // 1 minute
const TIMEZONE = 'America/Los_Angeles';

export type TaskRunner = (task: ScheduledTask) => Promise<string>;

let running = false;

export function startScheduler(runTask: TaskRunner): void {
  if (running) {
    console.log('Scheduler already running');
    return;
  }
  running = true;
  console.log('Scheduler started');

  const loop = async () => {
    try {
      const dueTasks = getDueTasks();
      if (dueTasks.length > 0) {
        console.log(`Found ${dueTasks.length} due task(s)`);
      }

      for (const task of dueTasks) {
        // Re-check task status in case it was cancelled
        const currentTask = getTaskById(task.id);
        if (!currentTask || currentTask.status !== 'active') {
          continue;
        }

        console.log(`Running scheduled task: ${task.id}`);
        const startTime = Date.now();

        try {
          const result = await runTask(currentTask);
          const duration = Date.now() - startTime;
          console.log(`Task ${task.id} completed in ${duration}ms`);

          // Calculate next run time
          let nextRun: string | null = null;
          if (task.schedule_type === 'cron') {
            const interval = CronExpressionParser.parse(task.schedule_value, {
              tz: TIMEZONE,
            });
            nextRun = interval.next().toISOString();
          } else if (task.schedule_type === 'interval') {
            const ms = parseInt(task.schedule_value, 10);
            nextRun = new Date(Date.now() + ms).toISOString();
          }
          // 'once' tasks have no next run

          updateTaskAfterRun(task.id, nextRun, result.slice(0, 500));
        } catch (err) {
          console.error(`Task ${task.id} failed:`, err);
          const errorMsg = err instanceof Error ? err.message : String(err);
          updateTaskAfterRun(task.id, null, `Error: ${errorMsg}`);
        }
      }
    } catch (err) {
      console.error('Error in scheduler loop:', err);
    }

    if (running) {
      setTimeout(loop, POLL_INTERVAL);
    }
  };

  loop();
}

export function stopScheduler(): void {
  running = false;
  console.log('Scheduler stopped');
}

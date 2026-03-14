/**
 * Git sync for workspace changes
 *
 * Auto-commits and pushes after agent modifications.
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = path.join(__dirname, '..', 'workspace');

export function pullChanges(): boolean {
  try {
    execSync('git pull --rebase', {
      cwd: WORKSPACE_DIR,
      stdio: 'pipe',
    });
    return true;
  } catch (err) {
    console.error('Git pull failed:', err);
    return false;
  }
}

export function syncToGithub(summary: string): boolean {
  try {
    // Check if there are any changes
    const status = execSync('git status --porcelain', {
      cwd: WORKSPACE_DIR,
      encoding: 'utf-8',
    }).trim();

    if (!status) {
      // No changes to commit
      return true;
    }

    // Add all changes
    execSync('git add -A', {
      cwd: WORKSPACE_DIR,
      stdio: 'pipe',
    });

    // Create commit message from summary (first 50 chars)
    const commitMsg = `Agent: ${summary.slice(0, 50).replace(/"/g, '\\"')}`;
    execSync(`git commit -m "${commitMsg}"`, {
      cwd: WORKSPACE_DIR,
      stdio: 'pipe',
    });

    // Push to remote
    execSync('git push', {
      cwd: WORKSPACE_DIR,
      stdio: 'pipe',
    });

    console.log('Synced to GitHub');
    return true;
  } catch (err) {
    console.error('Git sync failed:', err);
    return false;
  }
}

export function isGitRepo(): boolean {
  try {
    execSync('git rev-parse --git-dir', {
      cwd: WORKSPACE_DIR,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

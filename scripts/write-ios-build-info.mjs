#!/usr/bin/env node
/* Stamp the real native iOS archive source for visible TestFlight diagnosis.
 * No secrets, no network access, no modifications to client/payment data. */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const root = process.cwd();
function git(...args) {
  try { return execFileSync('git', args, {cwd:root, encoding:'utf8', stdio:['ignore','pipe','ignore']}).trim(); }
  catch { throw new Error('Cannot stamp iOS app: Git commit unavailable'); }
}
const commit = git('rev-parse','HEAD');
if (!/^[a-f0-9]{40}$/i.test(commit)) throw new Error('Invalid Git commit SHA');
const branch = String(process.env.CM_BRANCH || git('branch','--show-current') || 'unknown').slice(0,80);
const rawBuild = String(process.env.PROJECT_BUILD_NUMBER || '');
const buildNumber = /^\d+$/.test(rawBuild) ? Number(rawBuild) : null;
const build = Object.freeze({
  commit,
  branch,
  buildNumber,
  builtAt: new Date().toISOString()
});
const file = path.join(root,'www','ios','build-info.json');
fs.writeFileSync(file, JSON.stringify(build,null,2)+'\n','utf8');
console.log('iOS archive source:',commit.slice(0,12),'branch:',branch,'project build:',buildNumber ?? 'unknown');

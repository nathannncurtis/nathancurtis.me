// Google's CSP Evaluator over the policy in _headers. Fails on any High finding not accepted below.
import { readFileSync } from 'node:fs';
import { CspEvaluator } from 'csp_evaluator/dist/evaluator.js';
import { CspParser } from 'csp_evaluator/dist/parser.js';
import { Severity } from 'csp_evaluator/dist/finding.js';

// Accepted, each with its reason. Remove a line when its follow-up lands.
const ACCEPTED = [];

const line = readFileSync(new URL('../../_headers', import.meta.url), 'utf8').split('\n').find(l => l.includes('Content-Security-Policy:'));
const policy = line.split('Content-Security-Policy:')[1].trim();
const findings = new CspEvaluator(new CspParser(policy).csp).evaluate();
const name = s => Object.keys(Severity).find(k => Severity[k] === s);
let bad = 0;
for (const f of findings) {
  const accepted = ACCEPTED.some(a => a.directive === f.directive && (!f.value || a.value === f.value));
  const sev = name(f.severity);
  console.log(`${accepted ? 'accepted' : sev} ${f.directive} ${f.value ?? ''}: ${f.description}`);
  if (!accepted && (f.severity === Severity.HIGH || f.severity === Severity.SYNTAX)) { console.log(`::error::CSP ${f.directive} ${f.value ?? ''}: ${f.description}`); bad++; }
}
if (bad) process.exit(1);
console.log('csp ok');

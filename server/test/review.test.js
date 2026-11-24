import { test } from 'node:test';
import assert from 'node:assert/strict';
import { numberLines, score, runReview } from '../src/review.js';

test('numberLines prefixes 1-based line numbers', () => {
  assert.equal(numberLines('a\nb'), '   1 | a\n   2 | b');
});

test('score subtracts by severity and floors at 0', () => {
  assert.equal(score([]), 100);
  assert.equal(score([{ severity: 'critical' }, { severity: 'low' }]), 72);
  assert.equal(score(Array(5).fill({ severity: 'critical' })), 0);
});

test('runReview parses LLM JSON, drops out-of-range lines, scores', async () => {
  process.env.LLM_PROVIDER = 'ollama';
  const llmOut = {
    summary: 's',
    findings: [
      { owaspId: 'API1', title: 'IDOR', severity: 'high', lines: [2, 99], explanation: 'e', fix: 'f' },
      { owaspId: 'API9', title: 'padding', severity: 'low', lines: [42], explanation: 'e', fix: 'f' },
    ],
    remediatedCode: 'fixed',
  };
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ message: { content: JSON.stringify(llmOut) } }) });
  const r = await runReview({ code: 'line1\nline2\nline3' });
  assert.equal(r.findings.length, 1);
  assert.deepEqual(r.findings[0].lines, [2]);
  assert.equal(r.score, 85);
  assert.equal(r.llm, 'ollama:llama3.2');
});

test('runReview rejects malformed LLM output', async () => {
  process.env.LLM_PROVIDER = 'ollama';
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ message: { content: '{"summary":1}' } }) });
  await assert.rejects(runReview({ code: 'x' }));
});

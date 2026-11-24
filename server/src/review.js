import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { OWASP, SEVERITIES } from './owasp.js';

export const ReviewSchema = z.object({
  summary: z.string(),
  findings: z.array(z.object({
    owaspId: z.enum(Object.keys(OWASP)),
    title: z.string(),
    severity: z.enum(SEVERITIES),
    lines: z.array(z.number().int()),
    explanation: z.string(),
    fix: z.string(),
  })),
  remediatedCode: z.string(),
});

const categories = Object.entries(OWASP).map(([id, name]) => `- ${id}: ${name}`).join('\n');

export const SYSTEM_PROMPT = `You are CodeSage, an application security reviewer specialised in REST APIs.
Review the submitted backend code strictly against the OWASP API Security Top 10 (2023):
${categories}

Work through every category in order and report each concrete vulnerability you can point to in the code.
For each finding give:
- owaspId: the single best-matching category id
- title: a short name for the flaw
- severity: critical | high | medium | low, by realistic exploitability and impact
- lines: the 1-based line numbers (as shown in the numbered listing) where the flaw lives
- explanation: what an attacker can do and why the code allows it, in 2-4 sentences
- fix: a minimal corrected snippet for just those lines
Then return remediatedCode: the full file with every finding fixed, same language and style, no line numbers.
Do not report style issues or speculative problems in code that is not shown. If the code is clean, return an empty findings list and the code unchanged.`;

export function numberLines(code) {
  return code.split('\n').map((l, i) => `${String(i + 1).padStart(4)} | ${l}`).join('\n');
}

export function userPrompt({ code, filename, language }) {
  return `File: ${filename || 'untitled'}${language ? ` (${language})` : ''}\n\n${numberLines(code)}`;
}

const WEIGHT = { critical: 25, high: 15, medium: 8, low: 3 };
// 100 = no findings; each finding subtracts by severity.
export const score = (findings) => Math.max(0, 100 - findings.reduce((s, f) => s + WEIGHT[f.severity], 0));

export function provider() {
  return process.env.LLM_PROVIDER || (process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'ollama');
}

async function viaAnthropic(input) {
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';
  const stream = client.beta.messages.stream({
    model,
    max_tokens: 64000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'high', format: betaZodOutputFormat(ReviewSchema) },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt(input) }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('The model declined to review this code.');
  if (msg.stop_reason === 'max_tokens') throw new Error('Review was cut off; submit a smaller file.');
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { result: ReviewSchema.parse(JSON.parse(text)), llm: msg.model };
}

async function viaOllama(input) {
  const base = process.env.OLLAMA_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.2';
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      format: z.toJSONSchema(ReviewSchema),
      options: { temperature: 0 },
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt(input) }],
    }),
  });
  if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { result: ReviewSchema.parse(JSON.parse(data.message.content)), llm: `ollama:${model}` };
}

export async function runReview(input) {
  const { result, llm } = provider() === 'anthropic' ? await viaAnthropic(input) : await viaOllama(input);
  const maxLine = input.code.split('\n').length;
  // drop line refs outside the file, then findings that point at no code (small models pad every category)
  const findings = result.findings
    .map((f) => ({ ...f, lines: f.lines.filter((n) => n >= 1 && n <= maxLine) }))
    .filter((f) => f.lines.length);
  return { ...result, findings, score: score(findings), llm };
}

#!/usr/bin/env node
// run.ts — one workflow run with nobody in the session, start to exit code.
//
// Usage: node core/scripts/run.ts <sweep | analysis>
//
// The same run a maintainer starts by hand, in a terminal instead of a
// conversation: a log to read afterwards and an exit code to check. Zero means
// the run finished. Every step prints as it happens, so a long run shows it is
// alive.
//
// Node runs this file directly — type stripping, no build step, no dependency.

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline'

// The argument is the skill name, so the command line and the session say the
// same word. Same two names as WORKFLOWS in the store's lib.js.
const WORKFLOWS = ['sweep', 'analysis']

// CLAUDE.md pins every judgment pass to Opus 5. A session inherits whatever
// model launched it, and a headless one has nobody to notice.
const MODEL = 'claude-opus-5'

const CORE = resolve(import.meta.dirname, '..')
const ENV_FILE = join(CORE, '..', '.env')
const LOCK = join(tmpdir(), 'stuart-run.lock')

// The project carries its own claude, pinned in dashboard/package.json, so a
// cron line or a bare shell needs no PATH arrangement. Missing means the
// dashboard's dependencies were never installed.
const CLAUDE = join(CORE, '..', 'dashboard', 'node_modules', '.bin', 'claude')

function die(reason: string): never {
  console.error(`run: ${reason}`)
  process.exit(1)
}

const workflow = process.argv[2]
if (!workflow || !WORKFLOWS.includes(workflow)) die(`usage: run.ts <${WORKFLOWS.join(' | ')}>`)

// One run at a time. A sweep runs long, and two sessions writing the same
// cache would judge one item twice against two different keys.
function holder(): number {
  try { return Number(readFileSync(join(LOCK, 'pid'), 'utf8')) } catch { return 0 }
}

function running(pid: number): boolean {
  if (!pid) return false
  try { process.kill(pid, 0); return true } catch { return false }
}

function lock(): void {
  try {
    mkdirSync(LOCK)
  } catch {
    const held = holder()
    if (running(held)) die(`a run is already going (pid ${held})`)
    rmSync(LOCK, { recursive: true, force: true })
    mkdirSync(LOCK)
  }
  writeFileSync(join(LOCK, 'pid'), String(process.pid))
  process.on('exit', () => rmSync(LOCK, { recursive: true, force: true }))
}

// Fail here rather than three minutes into a session: the steward reads upstream
// with a GitHub token and cannot recover one itself. The skills' gh.js resolves it
// the same way — environment, then .env, then the local gh login — so this checks
// the same chain. Unauthenticated GitHub is 60 requests/hour, far under one sweep,
// so no token at all is fatal now rather than a wall of 403s halfway through.
function checkToken(): void {
  if (process.env.GITHUB_TOKEN || process.env.GH_TOKEN) return
  const gh = spawnSync('gh', ['auth', 'token'], { stdio: 'ignore' })
  if (gh.error || gh.status !== 0) {
    die('no GitHub token — set GITHUB_TOKEN in .env, or gh auth login')
  }
}

// The environment wins over .env, so one run can be billed differently without
// editing a file. With neither, the session uses the Claude Code login on this
// machine and the run is absorbed by the subscription, exactly like a run
// started by hand (workflow/DESIGN.md, "The runtime engine").
function apiKey(): string {
  return process.env.ANTHROPIC_API_KEY || ''
}

// One line per tool call, keyed on the input that says what it does. A
// subagent's lines are indented under the call that spawned it.
function describe(input: Record<string, unknown>): string {
  const detail = String(input.command ?? input.file_path ?? input.description ?? input.pattern ?? '')
  return detail.split('\n')[0].slice(0, 160)
}

// The session streams one JSON event per line. Only what the steward says and
// does is worth a line; the rest is bookkeeping.
function show(line: string): void {
  let event
  try { event = JSON.parse(line) } catch { console.log(line); return }

  if (event.type === 'rate_limit_event' && event.rate_limit_info?.status !== 'allowed') {
    console.log(`run: usage limit ${event.rate_limit_info?.status}, resets ${new Date(event.rate_limit_info?.resetsAt * 1000).toISOString()}`)
    return
  }
  if (event.type === 'result') {
    console.log(`run: session ${event.subtype} after ${event.num_turns} turns`)
    return
  }
  if (event.type !== 'assistant') return

  const indent = event.parent_tool_use_id ? '    ' : ''
  for (const block of event.message.content) {
    if (block.type === 'text') console.log(`${indent}${block.text}`)
    if (block.type === 'tool_use') console.log(`${indent}> ${block.name} ${describe(block.input)}`)
  }
}

lock()

// Before both checks, so a token or key living in .env is visible to them.
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE)
checkToken()

const key = apiKey()
const billing = key ? 'an api key' : 'the claude code login on this machine'
console.log(`run: ${workflow} starting ${new Date().toISOString()}, billed to ${billing}`)

// The sweep judges its batches in background subagents. A headless session
// stops waiting for them after ten minutes by default and exits zero, so the
// run loses its report and its timestamp while the log reads as a success.
const WAIT_FOR_SUBAGENTS = { CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS: '0' }

const session = spawn(
  CLAUDE,
  [
    '--print', `/${workflow}`,
    '--model', MODEL,
    '--permission-mode', 'bypassPermissions',
    '--output-format', 'stream-json', '--verbose',
  ],
  {
    cwd: CORE,
    stdio: ['ignore', 'pipe', 'inherit'],
    env: { ...process.env, ...WAIT_FOR_SUBAGENTS },
  },
)

session.on('error', error => die(`claude did not start: ${error.message}`))
createInterface({ input: session.stdout }).on('line', show)

session.on('close', status => {
  console.log(`run: ${workflow} finished ${new Date().toISOString()} (exit ${status})`)
  process.exit(status ?? 1)
})

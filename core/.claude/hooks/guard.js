#!/usr/bin/env node
// guard.js — the PreToolUse deny hook: the deterministic back of "data is never
// command." It hard-denies two classes of call, so the security posture is
// enforcement and not etiquette:
//
//   1. Mutating GitHub calls — anything that could comment, label, close, push,
//      or otherwise write upstream, including the quiet ones: GraphQL (which
//      POSTs even for queries), `gh api` field params that flip the call to POST,
//      and request bodies via --input.
//   2. Writes outside the steward's output paths — messages/, reports/,
//      maintainers/, .claude/state/.
//
// Be honest about the fence (workflow/DESIGN.md, "Security posture"): the guard
// path-checks the editing tools' writes and pattern-matches Bash, but a shell
// write (sed -i, tee, a redirect) is best-effort here — the guarantee that always
// holds is the maintainer's commit review, which persists only the allowed paths.
// For UPSTREAM, though, this guard plus GET-only discipline is the load-bearing
// fence, so it is reviewed as such and never loosened.

'use strict';
const path = require('path');
const os = require('os');

function readStdin() {
  try { return require('fs').readFileSync(0, 'utf8'); } catch { return ''; }
}

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `guard: ${reason}`,
    },
  }));
  process.exit(0);
}

function allow() { process.exit(0); } // silent: let the normal permission flow proceed

let input;
try { input = JSON.parse(readStdin() || '{}'); } catch { allow(); }

const tool = input.tool_name || '';
const ti = input.tool_input || {};
const root = input.cwd || process.cwd();

// --- Write scope: the only REPO paths a steward run may write. --------------
// The load-bearing guarantee is that nothing OUTSIDE these paths persists in the
// repo (the commit review closes the same door). Ephemeral scratch outside the
// repo — the OS temp dir — is allowed: it never persists in the repo and the skill
// scripts pass JSON between stages through it. Dangerous system paths (/etc, ~/.ssh)
// stay denied because they are neither under an allowed repo dir nor under a temp root.
const ALLOWED = ['messages', 'reports', 'maintainers', '.claude/state'];
const TMP_ROOTS = [os.tmpdir(), '/tmp', '/private/tmp', '/var/folders']
  .map((d) => path.resolve(d));

function underAny(abs, bases) {
  return bases.some((base) => abs === base || abs.startsWith(base + path.sep));
}

function withinWriteScope(p) {
  if (!p) return false;
  const abs = path.resolve(root, p);
  if (underAny(abs, TMP_ROOTS)) return true; // ephemeral scratch, never committed
  const repoBases = ALLOWED.map((d) => path.resolve(root, d));
  return underAny(abs, repoBases);
}

// --- Editing tools: check the target path outright. ------------------------
if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(tool)) {
  const target = ti.file_path || ti.notebook_path || ti.path;
  if (!withinWriteScope(target)) {
    deny(`write to "${target}" is outside the steward's output paths (${ALLOWED.join(', ')})`);
  }
  allow();
}

// --- Bash: pattern-match for upstream mutations and stray shell writes. -----
if (tool === 'Bash') {
  const cmd = String(ti.command || '');

  // A heredoc body is stdin to a script, never shell: publish-message.js reads a
  // message body that can quote code (->, <tag>) or the word "curl". Strip those
  // bodies for the two tests that read shell syntax; every gh and git check below
  // still reads the whole command.
  const scan = cmd.replace(/<<-?'?([A-Za-z_][A-Za-z0-9_]*)'?[\s\S]*?^\1$/gm, '');

  // No network beyond the GitHub API.
  if (/(^|[\s;&|(])(curl|wget|nc|ncat|telnet)\b/.test(scan)) {
    deny('network access other than the GitHub API is not allowed');
  }

  // Inline node is a network client too: `node -e "fetch(...)"` reaches anywhere the
  // deny-list above blocks, and skips the skills' vetted scripts entirely. The
  // allowed-tools lists already confine node to scripts/, but run.ts launches with
  // --permission-mode bypassPermissions, which discards them and leaves this hook as
  // the only enforcement. Same best-effort caveat as the redirect matching below:
  // this reads shell text, so it catches the ordinary shapes, not every one.
  const nodeCalls = scan.match(/(?:^|[\s;&|(])(?:node|nodejs)\b[^;&|\n]*/g) || [];
  for (const call of nodeCalls) {
    const rest = call.replace(/^[\s;&|(]*(?:node|nodejs)\b/, '');
    if (/(^|\s)(-e|--eval|-p|--print|--input-type)(\s|=|$)/.test(rest)) {
      deny('node -e/--eval/--print runs inline code outside the skills\' scripts — not allowed');
    }
    if (/^\s*$/.test(rest) || /(^|\s)-(\s|$)/.test(rest)) {
      deny('node reading a program from stdin runs code outside the skills\' scripts — not allowed');
    }
  }

  // GraphQL POSTs even for queries.
  if (/\bgh\s+api\b[^\n]*\bgraphql\b/.test(cmd) || /\bgh\s+api\s+graphql\b/.test(cmd)) {
    deny('gh api graphql POSTs even for queries — not allowed; use REST with -X GET');
  }

  // gh api must be explicitly GET, with no request body.
  const ghApiCalls = cmd.match(/\bgh\s+api\b[^;&|]*/g) || [];
  for (const call of ghApiCalls) {
    const method = call.match(/(?:-X|--method)\s+(\S+)/);
    const hasGet = method && method[1].toUpperCase() === 'GET';
    if (method && method[1].toUpperCase() !== 'GET') {
      deny(`gh api with method ${method[1]} is a mutation — only -X GET is allowed`);
    }
    if (/(^|\s)--input\b/.test(call)) {
      deny('gh api --input sends a request body (a mutation) — not allowed');
    }
    // Field flags silently flip gh api to POST unless -X GET is explicit.
    if (/(^|\s)(-f|-F|--field|--raw-field)\b/.test(call) && !hasGet) {
      deny('gh api field params (-f/-F/--field) flip the call to POST — add an explicit -X GET');
    }
  }

  // Mutating gh subcommands (anything that writes to GitHub).
  const ghMutation = /\bgh\s+(pr|issue|release|label|repo|secret|gist|workflow|run|ssh-key|gpg-key|auth\s+(login|logout|refresh|token))\s+(create|edit|close|reopen|merge|comment|review|ready|delete|add|remove|rename|lock|unlock|pin|unpin|transfer|develop|set|login|logout|refresh)\b/;
  if (ghMutation.test(cmd)) {
    deny('a mutating gh subcommand (create/edit/close/comment/merge/…) is not allowed — the steward is read-only upstream');
  }
  if (/\bgit\s+(push|commit|tag|remote)\b/.test(cmd)) {
    deny('the steward never commits or pushes — the maintainer reviews and commits');
  }

  // Best-effort: shell redirects / in-place edits to paths outside the scope.
  // (Redirects into allowed paths, /dev/null, and pipes are fine.)
  const redirects = scan.match(/>>?\s*([^\s|&;<>]+)/g) || [];
  for (const r of redirects) {
    const tgt = r.replace(/>>?\s*/, '');
    if (tgt === '/dev/null' || tgt.startsWith('/dev/std')) continue;
    if (!withinWriteScope(tgt)) {
      deny(`shell redirect to "${tgt}" is outside the steward's output paths`);
    }
  }
  if (/\bsed\s+-i\b|\bperl\s+-i\b|\btee\b/.test(cmd)) {
    // Conservative: these commonly write files; require an allowed target if one is parseable.
    const teeTgt = cmd.match(/\btee\s+(?:-a\s+)?([^\s|&;]+)/);
    if (teeTgt && !withinWriteScope(teeTgt[1])) {
      deny(`tee to "${teeTgt[1]}" is outside the steward's output paths`);
    }
    const sedTgt = cmd.match(/\bsed\s+-i\S*\s+.*?\s([^\s|&;]+)\s*$/);
    if (sedTgt && !withinWriteScope(sedTgt[1])) {
      deny(`in-place edit of "${sedTgt[1]}" is outside the steward's output paths`);
    }
  }

  allow();
}

allow();

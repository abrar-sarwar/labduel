// Scenario Pack 01 — "Acme Corp Under Pressure" (Slice 1: rounds 1–2).
// All tasks are simulated and safe. Red tasks teach how attacks work conceptually
// and where defenses bend; they contain no copy-pasteable exploit instructions.
// REVIEW NOTE (for the club lead): verify wording/accuracy before live use.

import type { ScenarioPack } from "../shared/content-types";

export const PACK_01: ScenarioPack = {
  id: "acme-01",
  title: "Acme Corp Under Pressure",
  summary:
    "A mid-size company is being probed. Blue defends the org; Red looks for the opening. Every round: action and reaction.",
  rounds: [
    // ───────────────────────────── ROUND 1 ─────────────────────────────
    {
      number: 1,
      id: "r1-phishing",
      title: "The Hook",
      concept: "Phishing & social engineering",
      initiativeBonus: 1.25,
      brief: {
        public:
          "A wave of suspicious emails is hitting Acme inboxes. Blue must spot and shut down the phish. Red is working the human angle.",
        blue: "Triage the inbox, recognize the lure, and shut it down before someone clicks.",
        red: "Find the most clickable angle and the weakest human target — conceptually.",
      },
      sides: {
        blue: {
          framing: "Drills incoming. Read the signals and make the call.",
          tasks: [
            {
              id: "r1-b-defender",
              roleKey: "defender",
              type: "classify",
              concept: "Spotting a spoofed sender / lookalike domain",
              prompt:
                "Four emails landed. Which one is the phish?",
              points: 100,
              options: [
                { id: "a", label: "HR: 'Q3 benefits PDF' from hr@acme.com" },
                {
                  id: "b",
                  label:
                    "'IT Helpdesk: reset your password in 1 hour' from it-helpdesk@secure-login-mail.co",
                },
                { id: "c", label: "Calendar invite from a teammate's acme.com address" },
                { id: "d", label: "Newsletter you subscribed to, with an unsubscribe link" },
              ],
              answerId: "b",
            },
            {
              id: "r1-b-analyst",
              roleKey: "analyst",
              type: "match",
              concept: "Mapping indicators to what they reveal",
              prompt: "Match each red flag to what it tells you.",
              points: 120,
              left: [
                { id: "l1", label: "Display name 'IT Helpdesk', domain secure-login-mail.co" },
                { id: "l2", label: "'Act within 1 hour or your account is locked'" },
                { id: "l3", label: "Link reads acme-portal.verify-now.co" },
              ],
              right: [
                { id: "r_spoof", label: "Spoofed sender" },
                { id: "r_urgency", label: "Manufactured urgency" },
                { id: "r_lookalike", label: "Lookalike domain" },
              ],
              answer: { l1: "r_spoof", l2: "r_urgency", l3: "r_lookalike" },
            },
            {
              id: "r1-b-engineer",
              roleKey: "engineer",
              type: "fillBlank",
              concept: "Building a detection rule",
              prompt: "Fill in the detection rule.",
              points: 100,
              template:
                "Flag any external email whose display name matches an internal team but whose domain is ___.",
              options: [
                { id: "o1", label: "not on our allow-list" },
                { id: "o2", label: "on our allow-list" },
                { id: "o3", label: "a .com address" },
                { id: "o4", label: "longer than 10 characters" },
              ],
              answerId: "o1",
            },
            {
              id: "r1-b-responder",
              roleKey: "responder",
              type: "classify",
              concept: "First response after a click",
              prompt:
                "A user already entered their password on the fake page. Best FIRST action?",
              points: 100,
              options: [
                { id: "a", label: "Reset that user's credentials and revoke their active sessions" },
                { id: "b", label: "Delete the email from every inbox first, then decide" },
                { id: "c", label: "Email the whole company a warning and wait" },
                { id: "d", label: "Nothing yet — keep monitoring for more signs" },
              ],
              answerId: "a",
            },
          ],
        },
        red: {
          framing: "Read the human terrain. Pick the angle — all simulated.",
          tasks: [
            {
              id: "r1-r-recon",
              roleKey: "recon",
              type: "classify",
              concept: "OSINT exposure — where targets come from",
              prompt:
                "Which source gives the best target list with the least suspicion?",
              points: 100,
              options: [
                { id: "a", label: "The public 'Meet the Team' page with names and email format" },
                { id: "b", label: "Randomly guessed addresses" },
                { id: "c", label: "Addresses you don't actually have access to" },
                { id: "d", label: "A competitor's staff directory" },
              ],
              answerId: "a",
            },
            {
              id: "r1-r-social",
              roleKey: "social",
              type: "classify",
              concept: "Why credible pretexts succeed",
              prompt: "Which pretext is most likely to earn a click during work hours?",
              points: 100,
              options: [
                { id: "a", label: "'A coworker shared a document that needs your review'" },
                { id: "b", label: "'You won a prize, claim now'" },
                { id: "c", label: "'A foreign official needs your bank help'" },
                { id: "d", label: "'SYSTEM: rebooting in 5 minutes'" },
              ],
              answerId: "a",
            },
            {
              id: "r1-r-operator",
              roleKey: "operator",
              type: "fillBlank",
              concept: "Lookalike domains raise success",
              prompt: "Complete the attacker's reasoning (conceptual).",
              points: 100,
              template:
                "A landing page earns more clicks when its domain visually ___ the real one.",
              options: [
                { id: "o1", label: "resembles" },
                { id: "o2", label: "differs from" },
                { id: "o3", label: "encrypts" },
                { id: "o4", label: "blocks" },
              ],
              answerId: "o1",
            },
            {
              id: "r1-r-strategist",
              roleKey: "strategist",
              type: "match",
              concept: "Reading the defense to find the gap",
              prompt: "Match each Blue control to the attacker advantage it removes.",
              points: 120,
              left: [
                { id: "l1", label: "MFA on all accounts" },
                { id: "l2", label: "Regular phishing training" },
                { id: "l3", label: "Mail filtering on lookalike domains" },
              ],
              right: [
                { id: "r_pw", label: "A stolen password alone is enough" },
                { id: "r_click", label: "Users click without thinking" },
                { id: "r_deliver", label: "The lure reaches the inbox at all" },
              ],
              answer: { l1: "r_pw", l2: "r_click", l3: "r_deliver" },
            },
          ],
        },
      },
      debrief: {
        summary:
          "Red worked the human layer — public info to pick targets, a credible 'shared document' pretext, and a lookalike domain. Blue's job was to recognize the pattern fast.",
        red:
          "The opening is almost never technical first. It's a believable story aimed at a real person found through public info.",
        blue:
          "Spoofed sender + urgency + lookalike domain is the classic combo. After a click, reset credentials and kill sessions BEFORE anything else.",
        takeaway:
          "Phishing is pattern recognition. Train the eyes, filter the inbox, and rehearse the first response.",
      },
    },

    // ───────────────────────────── ROUND 2 ─────────────────────────────
    {
      number: 2,
      id: "r2-mfa",
      title: "The Key Ring",
      concept: "Passwords, MFA & account protection",
      initiativeBonus: 1.2,
      brief: {
        public:
          "Leaked passwords from old breaches are being tried against Acme accounts. Blue hardens identity; Red leans on reuse and human pressure.",
        blue: "Protect the accounts that matter most and respond to suspicious logins.",
        red: "Exploit password reuse and human pressure — conceptually, no real attacks.",
      },
      sides: {
        blue: {
          framing: "Identity is the perimeter now. Hold it.",
          tasks: [
            {
              id: "r2-b-defender",
              roleKey: "defender",
              type: "classify",
              concept: "Risk prioritization",
              prompt: "Which account is the biggest risk right now?",
              points: 100,
              options: [
                { id: "a", label: "Admin reusing an old password, no MFA" },
                { id: "b", label: "Standard user with MFA enabled" },
                { id: "c", label: "Service account with weekly secret rotation" },
                { id: "d", label: "Brand-new user with no access granted yet" },
              ],
              answerId: "a",
            },
            {
              id: "r2-b-analyst",
              roleKey: "analyst",
              type: "match",
              concept: "Reading authentication telemetry",
              prompt: "Match each sign-in pattern to the attack it suggests.",
              points: 120,
              left: [
                { id: "l1", label: "One common password tried across many accounts" },
                { id: "l2", label: "Thousands of attempts against one account" },
                { id: "l3", label: "Login from a new country seconds after a local login" },
              ],
              right: [
                { id: "r_spray", label: "Password spraying" },
                { id: "r_brute", label: "Brute force" },
                { id: "r_travel", label: "Impossible travel" },
              ],
              answer: { l1: "r_spray", l2: "r_brute", l3: "r_travel" },
            },
            {
              id: "r2-b-engineer",
              roleKey: "engineer",
              type: "fillBlank",
              concept: "The control that beats leaked passwords",
              prompt: "Complete the hardening step.",
              points: 100,
              template:
                "Even when passwords are already leaked, the control that still blocks the login is ___.",
              options: [
                { id: "o1", label: "multi-factor authentication" },
                { id: "o2", label: "a longer username" },
                { id: "o3", label: "disabling cookies" },
                { id: "o4", label: "a CAPTCHA only" },
              ],
              answerId: "o1",
            },
            {
              id: "r2-b-responder",
              roleKey: "responder",
              type: "classify",
              concept: "Responding to an impossible-travel alert",
              prompt:
                "Impossible-travel alert fires on an exec account. Best FIRST action?",
              points: 100,
              options: [
                { id: "a", label: "Force re-authentication and revoke active sessions" },
                { id: "b", label: "Ignore it unless another alert fires too" },
                { id: "c", label: "Delete the account immediately" },
                { id: "d", label: "Email the exec and wait for a reply" },
              ],
              answerId: "a",
            },
          ],
        },
        red: {
          framing: "Don't break the lock — reuse the key. All simulated.",
          tasks: [
            {
              id: "r2-r-recon",
              roleKey: "recon",
              type: "classify",
              concept: "Credential reuse as a starting point",
              prompt: "Where do attackers get valid passwords to try first?",
              points: 100,
              options: [
                { id: "a", label: "Public breach/credential dumps from other sites" },
                { id: "b", label: "Guessing 16-character random passwords" },
                { id: "c", label: "Asking the help desk politely" },
                { id: "d", label: "Reading them off the login page" },
              ],
              answerId: "a",
            },
            {
              id: "r2-r-social",
              roleKey: "social",
              type: "classify",
              concept: "MFA fatigue (push bombing) — defensive awareness",
              prompt:
                "Which tactic pressures a tired user into approving a login push?",
              points: 100,
              options: [
                { id: "a", label: "Sending repeated push prompts late at night" },
                { id: "b", label: "Sending one prompt and giving up" },
                { id: "c", label: "Asking the user to change their password" },
                { id: "d", label: "Disabling the authenticator app" },
              ],
              answerId: "a",
            },
            {
              id: "r2-r-operator",
              roleKey: "operator",
              type: "fillBlank",
              concept: "Why credential stuffing works",
              prompt: "Complete the attacker's reasoning (conceptual).",
              points: 100,
              template: "Credential stuffing works because users ___ passwords across sites.",
              options: [
                { id: "o1", label: "reuse" },
                { id: "o2", label: "salt" },
                { id: "o3", label: "rotate" },
                { id: "o4", label: "encrypt" },
              ],
              answerId: "o1",
            },
            {
              id: "r2-r-strategist",
              roleKey: "strategist",
              type: "match",
              concept: "Which control defeats which attack",
              prompt: "Match each Blue control to the attack it shuts down.",
              points: 120,
              left: [
                { id: "l1", label: "MFA on every account" },
                { id: "l2", label: "Number-matching MFA prompts" },
                { id: "l3", label: "Lockout / throttling on failed logins" },
              ],
              right: [
                { id: "r_stuff", label: "Credential stuffing" },
                { id: "r_fatigue", label: "Blind push-approval (MFA fatigue)" },
                { id: "r_brute", label: "Brute force" },
              ],
              answer: { l1: "r_stuff", l2: "r_fatigue", l3: "r_brute" },
            },
          ],
        },
      },
      debrief: {
        summary:
          "Red didn't pick the lock — they reused keys from old breaches and leaned on human pressure (push fatigue). Blue's answer was layered identity: MFA, number-matching, throttling, and fast response to weird logins.",
        red:
          "Reused passwords turn one old breach into many new break-ins. The human approving a push is part of the attack surface.",
        blue:
          "MFA stops leaked passwords cold. Number-matching beats push fatigue. Impossible travel? Re-auth and revoke sessions immediately.",
        takeaway:
          "Identity is the real perimeter. Assume passwords are already leaked and design so that isn't enough.",
      },
    },
  ],
};

export const PACKS: Record<string, ScenarioPack> = {
  [PACK_01.id]: PACK_01,
};

export const DEFAULT_PACK_ID = PACK_01.id;

export function getPack(id: string): ScenarioPack {
  const pack = PACKS[id];
  if (!pack) throw new Error(`Unknown scenario pack: ${id}`);
  return pack;
}

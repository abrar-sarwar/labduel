// Scenario Pack 01, "Acme Corp Under Pressure" (Slice 1: rounds 1-2).
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
        red: "Find the most clickable angle and the weakest human target, conceptually.",
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
              type: "type",
              concept: "Writing a detection rule",
              prompt: "Your lead reads out the new mail rule. Type it exactly to deploy it.",
              reference: "quarantine lookalike sender domains",
              placeholder: "type the rule",
              answer: "quarantine lookalike sender domains",
              points: 100,
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
                { id: "d", label: "Nothing yet, keep monitoring for more signs" },
              ],
              answerId: "a",
            },
          ],
        },
        red: {
          framing: "Read the human terrain. Pick the angle, all simulated.",
          tasks: [
            {
              id: "r1-r-recon",
              roleKey: "recon",
              type: "classify",
              concept: "OSINT exposure, where targets come from",
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
              type: "type",
              concept: "Lookalike domains (conceptual)",
              prompt: "Set up the fake login page. Type the move exactly.",
              reference: "register a lookalike domain",
              placeholder: "type the move",
              answer: "register a lookalike domain",
              points: 100,
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
      insiderObjective: {
        id: "r1-insider",
        prompt:
          "You're trusted on Blue, and the phishing report landed on your desk. Quietly mark it as a false positive so nobody investigates, and the lure stays live.",
        concept: "Insider suppressing a true alert (alert tampering)",
        doLabel: "Bury it as a false positive",
        layLabel: "Lay low, report it honestly",
        penalty: 40,
      },
      debrief: {
        summary:
          "Red worked the human layer, public info to pick targets, a credible 'shared document' pretext, and a lookalike domain. Blue's job was to recognize the pattern fast.",
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
        red: "Exploit password reuse and human pressure, conceptually, no real attacks.",
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
              type: "type",
              concept: "The control that beats leaked passwords",
              prompt: "Roll out the hardening step. Type it exactly.",
              reference: "require mfa on every login",
              placeholder: "type the control",
              answer: "require mfa on every login",
              points: 100,
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
          framing: "Don't break the lock, reuse the key. All simulated.",
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
              concept: "MFA fatigue (push bombing), defensive awareness",
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
              type: "type",
              concept: "Why credential stuffing works",
              prompt: "Log the attack premise (conceptual). Type it exactly.",
              reference: "reuse passwords from old breaches",
              placeholder: "type the premise",
              answer: "reuse passwords from old breaches",
              points: 100,
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
      insiderObjective: {
        id: "r2-insider",
        prompt:
          "An exec wants in fast and you can make it happen. Approve a 'temporary' MFA exception for their account, and conveniently forget to remove it later.",
        concept: "Risky standing exception / quietly weakened control",
        doLabel: "Approve the MFA exception",
        layLabel: "Lay low, deny the exception",
        penalty: 40,
      },
      debrief: {
        summary:
          "Red didn't pick the lock, they reused keys from old breaches and leaned on human pressure (push fatigue). Blue's answer was layered identity: MFA, number-matching, throttling, and fast response to weird logins.",
        red:
          "Reused passwords turn one old breach into many new break-ins. The human approving a push is part of the attack surface.",
        blue:
          "MFA stops leaked passwords cold. Number-matching beats push fatigue. Impossible travel? Re-auth and revoke sessions immediately.",
        takeaway:
          "Identity is the real perimeter. Assume passwords are already leaked and design so that isn't enough.",
      },
    },

    // ───────────────────────────── ROUND 3 ─────────────────────────────
    {
      number: 3,
      id: "r3-secrets",
      title: "Keys Under the Mat",
      concept: "File permissions & exposed secrets",
      initiativeBonus: 1.2,
      brief: {
        public:
          "Acme's secrets are sloppily stored. Blue locks them down; Red hunts for what's been left in the open.",
        blue: "Find the exposure, fix permissions, and rotate what's leaked.",
        red: "Look where secrets leak, repos, buckets, logs. All simulated.",
      },
      sides: {
        blue: {
          framing: "Treat every secret as already half-leaked.",
          tasks: [
            {
              id: "r3-b-defender",
              roleKey: "defender",
              type: "classify",
              concept: "Recognizing a dangerous misconfiguration",
              prompt: "Which of these is the real problem?",
              points: 100,
              options: [
                { id: "a", label: "config.env with API keys set world-readable (chmod 777)" },
                { id: "b", label: "A private key kept only in a password manager" },
                { id: "c", label: "Secrets injected as env vars at runtime" },
                { id: "d", label: "A README describing the project" },
              ],
              answerId: "a",
            },
            {
              id: "r3-b-analyst",
              roleKey: "analyst",
              type: "match",
              concept: "Mapping exposures to their risk",
              prompt: "Match each exposure to what it means.",
              points: 120,
              left: [
                { id: "l1", label: ".env committed to a public git repo" },
                { id: "l2", label: "Storage bucket set to public-read" },
                { id: "l3", label: "App logs printing auth tokens" },
              ],
              right: [
                { id: "r_leak", label: "Secret readable by anyone" },
                { id: "r_data", label: "Data exposed to the internet" },
                { id: "r_plain", label: "Secrets sitting in plaintext logs" },
              ],
              answer: { l1: "r_leak", l2: "r_data", l3: "r_plain" },
            },
            {
              id: "r3-b-engineer",
              roleKey: "engineer",
              type: "fillBlank",
              concept: "Least privilege",
              prompt: "Complete the principle.",
              points: 100,
              template: "A service account should have ___ the permissions it needs for its job.",
              options: [
                { id: "o1", label: "only" },
                { id: "o2", label: "all of" },
                { id: "o3", label: "root-level" },
                { id: "o4", label: "none of" },
              ],
              answerId: "o1",
            },
            {
              id: "r3-b-responder",
              roleKey: "responder",
              type: "classify",
              concept: "Responding to a leaked secret",
              prompt: "A live API key is found in git history. Best response?",
              points: 100,
              options: [
                { id: "a", label: "Rotate/revoke the key, purge it, then audit where it was used" },
                { id: "b", label: "Delete the file in a new commit and move on" },
                { id: "c", label: "Make the repo private and hope nobody saw it" },
                { id: "d", label: "Rename the variable" },
              ],
              answerId: "a",
            },
          ],
        },
        red: {
          framing: "Free wins live in the open. Go find them, safely.",
          tasks: [
            {
              id: "r3-r-recon",
              roleKey: "recon",
              type: "classify",
              concept: "Where exposed secrets are found",
              prompt: "Where does an attacker look first?",
              points: 100,
              options: [
                { id: "a", label: "Public code repos, paste sites, and misconfigured buckets" },
                { id: "b", label: "The locked server room" },
                { id: "c", label: "Employees' personal diaries" },
                { id: "d", label: "Printed manuals" },
              ],
              answerId: "a",
            },
            {
              id: "r3-r-social",
              roleKey: "social",
              type: "classify",
              concept: "Pretext to obtain secrets",
              prompt: "A caller says 'I'm a new dev, can you send me the staging .env?' Why might it work?",
              points: 100,
              options: [
                { id: "a", label: "It impersonates a trusted insider with a plausible request" },
                { id: "b", label: "It offers money" },
                { id: "c", label: "It threatens a lawsuit" },
                { id: "d", label: "It attaches a virus" },
              ],
              answerId: "a",
            },
            {
              id: "r3-r-operator",
              roleKey: "operator",
              type: "fillBlank",
              concept: "Why broad permissions matter",
              prompt: "Complete the attacker's reasoning.",
              points: 100,
              template: "Overly broad file permissions let an attacker ___ files they shouldn't.",
              options: [
                { id: "o1", label: "read or modify" },
                { id: "o2", label: "compile" },
                { id: "o3", label: "encrypt for backup" },
                { id: "o4", label: "defragment" },
              ],
              answerId: "o1",
            },
            {
              id: "r3-r-strategist",
              roleKey: "strategist",
              type: "match",
              concept: "Reading the defense",
              prompt: "Match each Blue control to the advantage it removes.",
              points: 120,
              left: [
                { id: "l1", label: "Secret scanning in CI" },
                { id: "l2", label: "Least-privilege IAM" },
                { id: "l3", label: "Short-lived credentials" },
              ],
              right: [
                { id: "r_commit", label: "Secrets getting committed to code" },
                { id: "r_broad", label: "One account that can touch everything" },
                { id: "r_forever", label: "A leaked key that works forever" },
              ],
              answer: { l1: "r_commit", l2: "r_broad", l3: "r_forever" },
            },
          ],
        },
      },
      insiderObjective: {
        id: "r3-insider",
        prompt:
          "You own the repo settings. Quietly switch off the secret-scanning check 'to speed up builds' so leaked keys slip through.",
        concept: "Disabling a preventive control from the inside",
        doLabel: "Disable secret scanning",
        layLabel: "Lay low, keep scanning on",
        penalty: 40,
      },
      debrief: {
        summary:
          "Red went looking for secrets left in repos, buckets, and logs. Blue's job was least privilege, scanning, and fast rotation when something leaks.",
        red: "You rarely need to break in if someone left the key out. Exposure is everywhere people move fast.",
        blue: "Assume secrets leak: scan for them, scope permissions tightly, and rotate immediately when one escapes.",
        takeaway: "Secrets management is a control, not a habit. Scan, scope, rotate.",
      },
    },

    // ───────────────────────────── ROUND 4 ─────────────────────────────
    {
      number: 4,
      id: "r4-input",
      title: "The Open Form",
      concept: "Web input validation",
      initiativeBonus: 1.25,
      brief: {
        public:
          "A public web form takes user input. Blue makes it handle input safely; Red probes what untrusted input can do.",
        blue: "Validate, encode, and parameterize. Never trust the client.",
        red: "Find inputs the app trusts too much, conceptually.",
      },
      sides: {
        blue: {
          framing: "All input is guilty until validated.",
          tasks: [
            {
              id: "r4-b-defender",
              roleKey: "defender",
              type: "classify",
              concept: "Safe input handling",
              prompt: "Which approach is actually safe?",
              points: 100,
              options: [
                { id: "a", label: "Allow-list validation plus parameterized queries and output encoding" },
                { id: "b", label: "Client-side validation only" },
                { id: "c", label: "Building SQL by gluing strings together" },
                { id: "d", label: "Reflecting raw input straight into the page" },
              ],
              answerId: "a",
            },
            {
              id: "r4-b-analyst",
              roleKey: "analyst",
              type: "match",
              concept: "Recognizing malicious input",
              prompt: "Match each suspicious input to what it's attempting.",
              points: 120,
              left: [
                { id: "l1", label: "A comment containing a <script> tag" },
                { id: "l2", label: "' OR '1'='1 typed into a login field" },
                { id: "l3", label: "../../etc/passwd as a filename" },
              ],
              right: [
                { id: "r_xss", label: "Cross-site scripting (XSS)" },
                { id: "r_sqli", label: "SQL injection attempt" },
                { id: "r_path", label: "Path traversal" },
              ],
              answer: { l1: "r_xss", l2: "r_sqli", l3: "r_path" },
            },
            {
              id: "r4-b-engineer",
              roleKey: "engineer",
              type: "fillBlank",
              concept: "Stopping injected markup",
              prompt: "Complete the rule.",
              points: 100,
              template: "To stop injected HTML/JS from running, ___ user input before displaying it.",
              options: [
                { id: "o1", label: "encode/escape" },
                { id: "o2", label: "trust" },
                { id: "o3", label: "shorten" },
                { id: "o4", label: "uppercase" },
              ],
              answerId: "o1",
            },
            {
              id: "r4-b-responder",
              roleKey: "responder",
              type: "classify",
              concept: "Fixing a reflected-input bug",
              prompt: "A field reflects input into the page unescaped. First fix?",
              points: 100,
              options: [
                { id: "a", label: "Output-encode the value and add server-side validation" },
                { id: "b", label: "Hide the field with CSS" },
                { id: "c", label: "Rename the field" },
                { id: "d", label: "Add a CAPTCHA and call it done" },
              ],
              answerId: "a",
            },
          ],
        },
        red: {
          framing: "Find where the app believes its inputs. Conceptual only.",
          tasks: [
            {
              id: "r4-r-recon",
              roleKey: "recon",
              type: "classify",
              concept: "Finding injectable inputs",
              prompt: "How does an attacker locate inputs worth probing?",
              points: 100,
              options: [
                { id: "a", label: "Sending test characters to forms/URLs and watching the responses" },
                { id: "b", label: "Calling the CEO" },
                { id: "c", label: "Reading the privacy policy" },
                { id: "d", label: "Guessing passwords" },
              ],
              answerId: "a",
            },
            {
              id: "r4-r-social",
              roleKey: "social",
              type: "classify",
              concept: "Why verbose errors help attackers",
              prompt: "Why are detailed error messages useful to an attacker?",
              points: 100,
              options: [
                { id: "a", label: "They leak database and structure details" },
                { id: "b", label: "They are always encrypted" },
                { id: "c", label: "They speed up the site" },
                { id: "d", label: "They log users out" },
              ],
              answerId: "a",
            },
            {
              id: "r4-r-operator",
              roleKey: "operator",
              type: "fillBlank",
              concept: "Why unvalidated input is dangerous",
              prompt: "Complete the idea.",
              points: 100,
              template: "Unvalidated input is dangerous because the app may treat data as ___.",
              options: [
                { id: "o1", label: "code or commands" },
                { id: "o2", label: "images" },
                { id: "o3", label: "colors" },
                { id: "o4", label: "fonts" },
              ],
              answerId: "o1",
            },
            {
              id: "r4-r-strategist",
              roleKey: "strategist",
              type: "match",
              concept: "Which control kills which bug",
              prompt: "Match each Blue control to the attack it removes.",
              points: 120,
              left: [
                { id: "l1", label: "Parameterized queries" },
                { id: "l2", label: "Output encoding" },
                { id: "l3", label: "Allow-list validation" },
              ],
              right: [
                { id: "r_sqli", label: "SQL injection" },
                { id: "r_xss", label: "Cross-site scripting" },
                { id: "r_malformed", label: "Unexpected / malformed input" },
              ],
              answer: { l1: "r_sqli", l2: "r_xss", l3: "r_malformed" },
            },
          ],
        },
      },
      insiderObjective: {
        id: "r4-insider",
        prompt:
          "You own the input-validation ticket. Mark it 'done' without actually adding the allow-list, leaving the gap open.",
        concept: "Falsely closing a security task",
        doLabel: "Close the ticket (do nothing)",
        layLabel: "Lay low, actually fix it",
        penalty: 40,
      },
      debrief: {
        summary:
          "Red probed inputs the app trusted; Blue made the app validate, encode, and parameterize so data can't become code.",
        red: "If the app treats your input as instructions, you control the app. Untrusted input is the front door.",
        blue: "Validate on the server, encode on output, parameterize queries. Client-side checks are UX, not security.",
        takeaway: "Never trust input. Data should stay data.",
      },
    },

    // ───────────────────────────── ROUND 5 ─────────────────────────────
    {
      number: 5,
      id: "r5-detect",
      title: "Signal in the Noise",
      concept: "Logs, alerts & detection",
      initiativeBonus: 1.2,
      brief: {
        public:
          "Something's moving inside the network. Blue must spot it in the logs; Red tries to stay quiet.",
        blue: "Find the real signal, triage it, and respond without burning evidence.",
        red: "Move quietly and blend in, so detection is the whole lesson.",
      },
      sides: {
        blue: {
          framing: "The clue is already in your logs. Find it.",
          tasks: [
            {
              id: "r5-b-defender",
              roleKey: "defender",
              type: "classify",
              concept: "Prioritizing alerts",
              prompt: "Which alert do you work first?",
              points: 100,
              options: [
                { id: "a", label: "Admin login from a new country at 3am, then mass file access" },
                { id: "b", label: "A user mistyped their password once" },
                { id: "c", label: "Scheduled backup completed" },
                { id: "d", label: "A newsletter bounced" },
              ],
              answerId: "a",
            },
            {
              id: "r5-b-analyst",
              roleKey: "analyst",
              type: "match",
              concept: "Reading log lines",
              prompt: "Match each log pattern to what it suggests.",
              points: 120,
              left: [
                { id: "l1", label: "Many 401s then a 200 from one IP" },
                { id: "l2", label: "PowerShell spawned by a Word document" },
                { id: "l3", label: "Outbound traffic to a rare IP at midnight" },
              ],
              right: [
                { id: "r_brute", label: "Successful brute force" },
                { id: "r_chain", label: "Suspicious process chain" },
                { id: "r_exfil", label: "Possible exfiltration / C2" },
              ],
              answer: { l1: "r_brute", l2: "r_chain", l3: "r_exfil" },
            },
            {
              id: "r5-b-engineer",
              roleKey: "engineer",
              type: "fillBlank",
              concept: "Tuning detections",
              prompt: "Complete the rule of thumb.",
              points: 100,
              template: "A good detection rule is specific enough to cut down on ___.",
              options: [
                { id: "o1", label: "false positives" },
                { id: "o2", label: "the budget" },
                { id: "o3", label: "the logs" },
                { id: "o4", label: "the network" },
              ],
              answerId: "o1",
            },
            {
              id: "r5-b-responder",
              roleKey: "responder",
              type: "classify",
              concept: "Responding to a possible exfil alert",
              prompt: "An alert points to possible data exfiltration. First step?",
              points: 100,
              options: [
                { id: "a", label: "Verify scope and isolate the host while preserving evidence" },
                { id: "b", label: "Reboot the server" },
                { id: "c", label: "Delete the logs" },
                { id: "d", label: "Ignore it until morning" },
              ],
              answerId: "a",
            },
          ],
        },
        red: {
          framing: "Quiet wins. Understand detection to beat it, conceptually.",
          tasks: [
            {
              id: "r5-r-recon",
              roleKey: "recon",
              type: "classify",
              concept: "Why 'low and slow' evades alerts",
              prompt: "How do attackers avoid tripping alerts?",
              points: 100,
              options: [
                { id: "a", label: "Moving slowly and blending with normal traffic" },
                { id: "b", label: "Emailing the SOC first" },
                { id: "c", label: "Using the loudest tools available" },
                { id: "d", label: "Only attacking during business hours" },
              ],
              answerId: "a",
            },
            {
              id: "r5-r-social",
              roleKey: "social",
              type: "classify",
              concept: "Alert fatigue",
              prompt: "Why might an attacker generate lots of noise?",
              points: 100,
              options: [
                { id: "a", label: "A flood of alerts can bury the one that matters" },
                { id: "b", label: "Noise deletes backups" },
                { id: "c", label: "It disables MFA" },
                { id: "d", label: "It encrypts the SIEM" },
              ],
              answerId: "a",
            },
            {
              id: "r5-r-operator",
              roleKey: "operator",
              type: "fillBlank",
              concept: "No logs, no detection",
              prompt: "Complete the truth.",
              points: 100,
              template: "You can't detect what you don't ___.",
              options: [
                { id: "o1", label: "log" },
                { id: "o2", label: "buy" },
                { id: "o3", label: "print" },
                { id: "o4", label: "email" },
              ],
              answerId: "o1",
            },
            {
              id: "r5-r-strategist",
              roleKey: "strategist",
              type: "match",
              concept: "Which control closes which gap",
              prompt: "Match each Blue control to the attacker advantage it removes.",
              points: 120,
              left: [
                { id: "l1", label: "Centralized logging / SIEM" },
                { id: "l2", label: "A baseline of 'normal'" },
                { id: "l3", label: "Tuned, prioritized alerts" },
              ],
              right: [
                { id: "r_gaps", label: "Blind spots between systems" },
                { id: "r_blend", label: "Blending in with normal traffic" },
                { id: "r_fatigue", label: "Hiding inside alert fatigue" },
              ],
              answer: { l1: "r_gaps", l2: "r_blend", l3: "r_fatigue" },
            },
          ],
        },
      },
      insiderObjective: {
        id: "r5-insider",
        prompt:
          "You triage the SIEM. Mark the exfiltration alert as a 'false positive' so it's closed without investigation.",
        concept: "Suppressing a true detection",
        doLabel: "Close it as a false positive",
        layLabel: "Lay low, investigate it",
        penalty: 40,
      },
      debrief: {
        summary:
          "Red stayed quiet and leaned on alert fatigue; Blue won by logging everything, baselining normal, and triaging the real signal first.",
        red: "Detection is the attacker's real enemy. Slow, quiet, and noisy-as-cover all target the SOC's attention.",
        blue: "Log centrally, know your baseline, tune alerts, and protect evidence when you respond.",
        takeaway: "Visibility beats noise. Decide what 'normal' looks like before the incident.",
      },
    },

    // ───────────────────────────── ROUND 6 ─────────────────────────────
    {
      number: 6,
      id: "r6-authbypass",
      title: "The Side Door",
      concept: "Injection & auth bypass (conceptual)",
      initiativeBonus: 1.3,
      brief: {
        public:
          "There's a login standing between Red and the data. Blue hardens it; Red looks for the side door, at a safe, conceptual level.",
        blue: "Enforce auth on the server, parameterize, and rate-limit.",
        red: "Reason about where access checks fail. No payloads, just concepts.",
      },
      sides: {
        blue: {
          framing: "If the check isn't on the server, it isn't a check.",
          tasks: [
            {
              id: "r6-b-defender",
              roleKey: "defender",
              type: "classify",
              concept: "Sound login design",
              prompt: "Which login design is safest?",
              points: 100,
              options: [
                { id: "a", label: "Server-side checks, parameterized queries, MFA, and lockout" },
                { id: "b", label: "A secret admin URL as the only protection" },
                { id: "c", label: "Checking auth only in the browser" },
                { id: "d", label: "One shared admin password" },
              ],
              answerId: "a",
            },
            {
              id: "r6-b-analyst",
              roleKey: "analyst",
              type: "match",
              concept: "Weakness to consequence",
              prompt: "Match each weakness to what it allows.",
              points: 120,
              left: [
                { id: "l1", label: "Auth checked only on the client" },
                { id: "l2", label: "Login query built by string concatenation" },
                { id: "l3", label: "No lockout or rate limit" },
              ],
              right: [
                { id: "r_api", label: "Bypass by calling the API directly" },
                { id: "r_sqli", label: "SQL injection auth bypass" },
                { id: "r_brute", label: "Brute force eventually succeeds" },
              ],
              answer: { l1: "r_api", l2: "r_sqli", l3: "r_brute" },
            },
            {
              id: "r6-b-engineer",
              roleKey: "engineer",
              type: "fillBlank",
              concept: "Where to enforce access control",
              prompt: "Complete the rule.",
              points: 100,
              template: "Access control must be enforced on the ___.",
              options: [
                { id: "o1", label: "server" },
                { id: "o2", label: "client" },
                { id: "o3", label: "login button" },
                { id: "o4", label: "homepage" },
              ],
              answerId: "o1",
            },
            {
              id: "r6-b-responder",
              roleKey: "responder",
              type: "classify",
              concept: "Responding to a missing auth check",
              prompt: "You find an endpoint that skips the auth check. First action?",
              points: 100,
              options: [
                { id: "a", label: "Require auth server-side and review logs for prior abuse" },
                { id: "b", label: "Remove the link to it" },
                { id: "c", label: "Rename the endpoint" },
                { id: "d", label: "Add a 'TODO' comment" },
              ],
              answerId: "a",
            },
          ],
        },
        red: {
          framing: "Where does the app forget to check? Concept only.",
          tasks: [
            {
              id: "r6-r-recon",
              roleKey: "recon",
              type: "classify",
              concept: "Finding an auth bypass",
              prompt: "How does an attacker find an auth bypass?",
              points: 100,
              options: [
                { id: "a", label: "Testing whether protected actions work without a valid session" },
                { id: "b", label: "Asking nicely" },
                { id: "c", label: "Reading the EULA" },
                { id: "d", label: "Buying the source code" },
              ],
              answerId: "a",
            },
            {
              id: "r6-r-social",
              roleKey: "social",
              type: "classify",
              concept: "Forced browsing",
              prompt: "What is 'forced browsing'?",
              points: 100,
              options: [
                { id: "a", label: "Directly requesting URLs/endpoints you were never linked to" },
                { id: "b", label: "Browsing with two monitors" },
                { id: "c", label: "Using incognito mode" },
                { id: "d", label: "Clearing cookies" },
              ],
              answerId: "a",
            },
            {
              id: "r6-r-operator",
              roleKey: "operator",
              type: "fillBlank",
              concept: "What injection really changes",
              prompt: "Complete the idea.",
              points: 100,
              template: "Injection happens when untrusted input changes the ___ of a query or command.",
              options: [
                { id: "o1", label: "meaning / structure" },
                { id: "o2", label: "color" },
                { id: "o3", label: "speed" },
                { id: "o4", label: "file size" },
              ],
              answerId: "o1",
            },
            {
              id: "r6-r-strategist",
              roleKey: "strategist",
              type: "match",
              concept: "Control to bypass removed",
              prompt: "Match each Blue control to the bypass it removes.",
              points: 120,
              left: [
                { id: "l1", label: "Server-side authorization" },
                { id: "l2", label: "Parameterized queries" },
                { id: "l3", label: "Rate limiting + lockout" },
              ],
              right: [
                { id: "r_client", label: "Client-side-only checks" },
                { id: "r_sqli", label: "Injection in the login" },
                { id: "r_guess", label: "Unlimited guessing" },
              ],
              answer: { l1: "r_client", l2: "r_sqli", l3: "r_guess" },
            },
          ],
        },
      },
      insiderObjective: {
        id: "r6-insider",
        prompt:
          "You're reviewing the access-control pull request. Approve it even though it only checks auth in the browser, not on the server.",
        concept: "Rubber-stamping a broken access control",
        doLabel: "Approve the weak PR",
        layLabel: "Lay low, request server-side checks",
        penalty: 40,
      },
      debrief: {
        summary:
          "Red reasoned about where checks fail; Blue moved every decision server-side, parameterized queries, and throttled guessing.",
        red: "Bypass beats brute force. If a check lives in the browser or a query is built from strings, there's a side door.",
        blue: "Authorize on the server, parameterize everything, and rate-limit. Obscurity is not access control.",
        takeaway: "Trust boundaries live on the server. Enforce them there, every time.",
      },
    },

    // ───────────────────────────── ROUND 7 ─────────────────────────────
    {
      number: 7,
      id: "r7-containment",
      title: "Stop the Bleeding",
      concept: "Containment & incident response",
      initiativeBonus: 1.25,
      brief: {
        public:
          "A host is compromised and active. Blue must contain it without destroying evidence; Red tries to hold on.",
        blue: "Contain, preserve evidence, eradicate, recover, in order, communicating throughout.",
        red: "Hold the foothold as long as possible, conceptually.",
      },
      sides: {
        blue: {
          framing: "Move fast, but don't burn the evidence.",
          tasks: [
            {
              id: "r7-b-defender",
              roleKey: "defender",
              type: "classify",
              concept: "Choosing a containment action",
              prompt: "A workstation is beaconing to a known-bad host. Best containment?",
              points: 100,
              options: [
                { id: "a", label: "Isolate it from the network while preserving it for analysis" },
                { id: "b", label: "Shut it off and wipe immediately" },
                { id: "c", label: "Unplug the whole office" },
                { id: "d", label: "Do nothing yet" },
              ],
              answerId: "a",
            },
            {
              id: "r7-b-analyst",
              roleKey: "analyst",
              type: "match",
              concept: "The IR lifecycle",
              prompt: "Match each IR phase to its action.",
              points: 120,
              left: [
                { id: "l1", label: "Identification" },
                { id: "l2", label: "Containment" },
                { id: "l3", label: "Recovery" },
              ],
              right: [
                { id: "r_scope", label: "Confirm and scope the incident" },
                { id: "r_limit", label: "Limit the spread" },
                { id: "r_restore", label: "Restore from clean backups" },
              ],
              answer: { l1: "r_scope", l2: "r_limit", l3: "r_restore" },
            },
            {
              id: "r7-b-engineer",
              roleKey: "engineer",
              type: "fillBlank",
              concept: "Preserving evidence",
              prompt: "Complete the step.",
              points: 100,
              template: "Before wiping a compromised host, capture ___ for the investigation.",
              options: [
                { id: "o1", label: "evidence / forensic images" },
                { id: "o2", label: "coffee" },
                { id: "o3", label: "the user manual" },
                { id: "o4", label: "nothing" },
              ],
              answerId: "o1",
            },
            {
              id: "r7-b-responder",
              roleKey: "responder",
              type: "classify",
              concept: "Ordering the response",
              prompt: "After confirming a breach, what's the right order?",
              points: 100,
              options: [
                { id: "a", label: "Contain, then eradicate, then recover, communicating throughout" },
                { id: "b", label: "Recover first, investigate never" },
                { id: "c", label: "Email customers before scoping anything" },
                { id: "d", label: "Delete logs to stay calm" },
              ],
              answerId: "a",
            },
          ],
        },
        red: {
          framing: "Detection is closing in. Don't get cut off, conceptually.",
          tasks: [
            {
              id: "r7-r-recon",
              roleKey: "recon",
              type: "classify",
              concept: "Attacker behavior under pressure",
              prompt: "What does an attacker do when they sense detection?",
              points: 100,
              options: [
                { id: "a", label: "Try to keep persistence and spread before being cut off" },
                { id: "b", label: "Send an apology" },
                { id: "c", label: "Restore the backups" },
                { id: "d", label: "File a support ticket" },
              ],
              answerId: "a",
            },
            {
              id: "r7-r-social",
              roleKey: "social",
              type: "classify",
              concept: "Exploiting incident chaos",
              prompt: "How might an attacker exploit the chaos of an active incident?",
              points: 100,
              options: [
                { id: "a", label: "Impersonate IT 'helping out' to extract more access" },
                { id: "b", label: "Wait politely" },
                { id: "c", label: "Disable their own access" },
                { id: "d", label: "Email the CISO a résumé" },
              ],
              answerId: "a",
            },
            {
              id: "r7-r-operator",
              roleKey: "operator",
              type: "fillBlank",
              concept: "Why persistence matters",
              prompt: "Complete the idea.",
              points: 100,
              template: "Persistence lets an attacker ___ even after a reboot.",
              options: [
                { id: "o1", label: "regain access" },
                { id: "o2", label: "lose access" },
                { id: "o3", label: "get caught" },
                { id: "o4", label: "log out" },
              ],
              answerId: "o1",
            },
            {
              id: "r7-r-strategist",
              roleKey: "strategist",
              type: "match",
              concept: "Blue action to attacker setback",
              prompt: "Match each Blue move to the attacker capability it breaks.",
              points: 120,
              left: [
                { id: "l1", label: "Network isolation" },
                { id: "l2", label: "Org-wide credential reset" },
                { id: "l3", label: "Removing persistence mechanisms" },
              ],
              right: [
                { id: "r_c2", label: "The command-and-control link" },
                { id: "r_creds", label: "Stolen sessions and passwords" },
                { id: "r_return", label: "Regaining access after cleanup" },
              ],
              answer: { l1: "r_c2", l2: "r_creds", l3: "r_return" },
            },
          ],
        },
      },
      insiderObjective: {
        id: "r7-insider",
        prompt:
          "You're on the incident bridge. Quietly 'forget' to reset one set of admin credentials so a way back stays open.",
        concept: "Leaving a foothold during cleanup",
        doLabel: "Skip resetting those creds",
        layLabel: "Lay low, reset everything",
        penalty: 40,
      },
      debrief: {
        summary:
          "Red fought to keep a foothold and used the chaos; Blue contained cleanly, preserved evidence, and eradicated before recovering.",
        red: "An incident isn't over for the defender until every foothold is gone. Persistence and chaos are the attacker's friends.",
        blue: "Contain → preserve → eradicate → recover, and communicate the whole way. Reset all credentials, not most.",
        takeaway: "Order matters in IR. Recovering on top of a live foothold just restarts the breach.",
      },
    },

    // ───────────────────────────── ROUND 8 ─────────────────────────────
    {
      number: 8,
      id: "r8-evasion",
      title: "Hide and Seek",
      concept: "Evasion vs detection (conceptual)",
      initiativeBonus: 1.3,
      brief: {
        public:
          "Red tries to operate unseen; Blue builds detection that survives evasion. All conceptual, the lesson is resilient detection.",
        blue: "Detect behavior, not just names. Keep logs off-host.",
        red: "Understand why evasion works, so you can defeat it.",
      },
      sides: {
        blue: {
          framing: "Names lie. Behavior tells the truth.",
          tasks: [
            {
              id: "r8-b-defender",
              roleKey: "defender",
              type: "classify",
              concept: "Detection that survives evasion",
              prompt: "Which detection holds up best against basic evasion?",
              points: 100,
              options: [
                { id: "a", label: "Behavior-based detection, what it does, not just its name" },
                { id: "b", label: "Blocking one known file hash" },
                { id: "c", label: "Trusting the file extension" },
                { id: "d", label: "Scanning only on Mondays" },
              ],
              answerId: "a",
            },
            {
              id: "r8-b-analyst",
              roleKey: "analyst",
              type: "match",
              concept: "Evasion to its counter",
              prompt: "Match each evasion move to the detection that counters it.",
              points: 120,
              left: [
                { id: "l1", label: "Renaming a tool to look normal" },
                { id: "l2", label: "Obfuscating a script" },
                { id: "l3", label: "Deleting local logs to hide tracks" },
              ],
              right: [
                { id: "r_behavior", label: "Behavior / anomaly detection" },
                { id: "r_runtime", label: "Runtime behavior monitoring" },
                { id: "r_offhost", label: "Centralized off-host logging" },
              ],
              answer: { l1: "r_behavior", l2: "r_runtime", l3: "r_offhost" },
            },
            {
              id: "r8-b-engineer",
              roleKey: "engineer",
              type: "fillBlank",
              concept: "Why behavior beats signatures",
              prompt: "Complete the principle.",
              points: 100,
              template: "Detection that watches ___ is harder to evade than a static signature.",
              options: [
                { id: "o1", label: "behavior" },
                { id: "o2", label: "file names" },
                { id: "o3", label: "icons" },
                { id: "o4", label: "colors" },
              ],
              answerId: "o1",
            },
            {
              id: "r8-b-responder",
              roleKey: "responder",
              type: "classify",
              concept: "Reading anti-forensics",
              prompt: "Host logs were wiped right after suspicious activity. What does that tell you?",
              points: 100,
              options: [
                { id: "a", label: "Likely intentional anti-forensics, escalate and use off-host logs" },
                { id: "b", label: "Routine maintenance, ignore it" },
                { id: "c", label: "The disk was just full" },
                { id: "d", label: "Nothing at all" },
              ],
              answerId: "a",
            },
          ],
        },
        red: {
          framing: "Blend in. Understand evasion to help Blue beat it.",
          tasks: [
            {
              id: "r8-r-recon",
              roleKey: "recon",
              type: "classify",
              concept: "Living off the land",
              prompt: "Why do attackers prefer built-in system tools?",
              points: 100,
              options: [
                { id: "a", label: "They blend in and raise fewer alerts" },
                { id: "b", label: "They are more powerful than any malware" },
                { id: "c", label: "They are free" },
                { id: "d", label: "They look colorful" },
              ],
              answerId: "a",
            },
            {
              id: "r8-r-social",
              roleKey: "social",
              type: "classify",
              concept: "Why attackers blind security tools",
              prompt: "Why disable or blind security tools first?",
              points: 100,
              options: [
                { id: "a", label: "To operate without being detected or stopped" },
                { id: "b", label: "To save battery" },
                { id: "c", label: "To update them" },
                { id: "d", label: "To back them up" },
              ],
              answerId: "a",
            },
            {
              id: "r8-r-operator",
              roleKey: "operator",
              type: "fillBlank",
              concept: "The point of obfuscation",
              prompt: "Complete the idea.",
              points: 100,
              template: "Obfuscation aims to make malicious activity look ___.",
              options: [
                { id: "o1", label: "normal / benign" },
                { id: "o2", label: "faster" },
                { id: "o3", label: "encrypted" },
                { id: "o4", label: "shorter" },
              ],
              answerId: "o1",
            },
            {
              id: "r8-r-strategist",
              roleKey: "strategist",
              type: "match",
              concept: "Evasion to Blue counter",
              prompt: "Match each evasion approach to the Blue counter.",
              points: 120,
              left: [
                { id: "l1", label: "Signature evasion" },
                { id: "l2", label: "Log tampering" },
                { id: "l3", label: "Living off the land" },
              ],
              right: [
                { id: "r_behavior", label: "Behavioral detection" },
                { id: "r_immutable", label: "Off-host / immutable logs" },
                { id: "r_baseline", label: "Baselining normal tool use" },
              ],
              answer: { l1: "r_behavior", l2: "r_immutable", l3: "r_baseline" },
            },
          ],
        },
      },
      insiderObjective: {
        id: "r8-insider",
        prompt:
          "You manage endpoint policy. Set logging to 'minimal' and exclude a folder from scanning 'for performance'.",
        concept: "Quietly blinding the defense",
        doLabel: "Weaken logging & scanning",
        layLabel: "Lay low, keep full coverage",
        penalty: 40,
      },
      debrief: {
        summary:
          "Red leaned on built-in tools, obfuscation, and log tampering; Blue answered with behavioral detection, baselining, and off-host logging.",
        red: "The quietest tools are the ones already on the box. Evasion targets the assumptions in your detection.",
        blue: "Detect behavior, baseline normal, and keep logs somewhere the attacker can't reach. Missing logs are a finding.",
        takeaway: "Assume evasion. Resilient detection watches behavior and trusts logs it controls.",
      },
    },

    // ───────────────────────────── ROUND 9 ─────────────────────────────
    {
      number: 9,
      id: "r9-fullincident",
      title: "The Whole Board",
      concept: "Full incident: attack chain & response chain",
      initiativeBonus: 1.35,
      brief: {
        public:
          "Everything at once: a phish became stolen creds, lateral movement, and data theft. Blue must break the chain; Red must complete it.",
        blue: "Layer your defenses and break any link in the chain.",
        red: "Chain the small weaknesses into one path to the goal.",
      },
      sides: {
        blue: {
          framing: "No single control saves you. Layers and speed do.",
          tasks: [
            {
              id: "r9-b-defender",
              roleKey: "defender",
              type: "classify",
              concept: "Defense in depth",
              prompt: "The strongest single lesson from a full incident?",
              points: 100,
              options: [
                { id: "a", label: "Defense in depth: layers plus fast response beat any one control" },
                { id: "b", label: "Buy one tool that does everything" },
                { id: "c", label: "Blame the user who clicked" },
                { id: "d", label: "Unplug everything forever" },
              ],
              answerId: "a",
            },
            {
              id: "r9-b-analyst",
              roleKey: "analyst",
              type: "match",
              concept: "Chain stage to control",
              prompt: "Match each attack-chain stage to a defensive control.",
              points: 120,
              left: [
                { id: "l1", label: "Initial access (phishing)" },
                { id: "l2", label: "Lateral movement" },
                { id: "l3", label: "Exfiltration" },
              ],
              right: [
                { id: "r_access", label: "Training + mail filtering + MFA" },
                { id: "r_lateral", label: "Segmentation + least privilege" },
                { id: "r_exfil", label: "DLP / egress monitoring" },
              ],
              answer: { l1: "r_access", l2: "r_lateral", l3: "r_exfil" },
            },
            {
              id: "r9-b-engineer",
              roleKey: "engineer",
              type: "fillBlank",
              concept: "Why layers work",
              prompt: "Complete the idea.",
              points: 100,
              template: "Layered defenses work because an attacker must beat ___ control, not just one.",
              options: [
                { id: "o1", label: "every" },
                { id: "o2", label: "no" },
                { id: "o3", label: "the cheapest" },
                { id: "o4", label: "the prettiest" },
              ],
              answerId: "o1",
            },
            {
              id: "r9-b-responder",
              roleKey: "responder",
              type: "classify",
              concept: "Closing the loop",
              prompt: "After the incident, what actually makes you safer next time?",
              points: 100,
              options: [
                { id: "a", label: "A blameless review that turns findings into concrete control improvements" },
                { id: "b", label: "Never speaking of it again" },
                { id: "c", label: "Firing someone" },
                { id: "d", label: "Disabling logging to avoid bad news" },
              ],
              answerId: "a",
            },
          ],
        },
        red: {
          framing: "One path, many small wins. Complete the chain, conceptually.",
          tasks: [
            {
              id: "r9-r-recon",
              roleKey: "recon",
              type: "classify",
              concept: "How chains succeed",
              prompt: "Across the whole incident, what makes an attacker successful?",
              points: 100,
              options: [
                { id: "a", label: "Chaining small weaknesses into a path to the goal" },
                { id: "b", label: "One magic exploit, always" },
                { id: "c", label: "Pure luck" },
                { id: "d", label: "Brute force alone" },
              ],
              answerId: "a",
            },
            {
              id: "r9-r-social",
              roleKey: "social",
              type: "classify",
              concept: "The control that breaks chains early",
              prompt: "Which single human-layer control breaks the most chains early?",
              points: 100,
              options: [
                { id: "a", label: "Phishing-resistant MFA plus a reporting culture" },
                { id: "b", label: "Longer passwords only" },
                { id: "c", label: "Antivirus only" },
                { id: "d", label: "A firewall only" },
              ],
              answerId: "a",
            },
            {
              id: "r9-r-operator",
              roleKey: "operator",
              type: "fillBlank",
              concept: "Breaking the chain",
              prompt: "Complete the idea.",
              points: 100,
              template: "An attack chain fails if defenders break any ___ in it.",
              options: [
                { id: "o1", label: "link" },
                { id: "o2", label: "color" },
                { id: "o3", label: "file" },
                { id: "o4", label: "email" },
              ],
              answerId: "o1",
            },
            {
              id: "r9-r-strategist",
              roleKey: "strategist",
              type: "match",
              concept: "Chain stage to control that breaks it",
              prompt: "Match each stage to the control that breaks it.",
              points: 120,
              left: [
                { id: "l1", label: "Stolen password reused" },
                { id: "l2", label: "Quiet lateral movement" },
                { id: "l3", label: "Bulk data leaving the network" },
              ],
              right: [
                { id: "r_mfa", label: "MFA" },
                { id: "r_seg", label: "Segmentation + detection" },
                { id: "r_egress", label: "Egress monitoring" },
              ],
              answer: { l1: "r_mfa", l2: "r_seg", l3: "r_egress" },
            },
          ],
        },
      },
      insiderObjective: {
        id: "r9-insider",
        prompt:
          "Last chance. As the response finalizes, approve the 'all clear' before the foothold is actually removed.",
        concept: "Declaring victory while the door's still open",
        doLabel: "Sign off the 'all clear' early",
        layLabel: "Lay low, verify eradication first",
        penalty: 40,
      },
      debrief: {
        summary:
          "The whole board: phish → stolen creds → lateral movement → exfiltration. Red chained small gaps; Blue won by layering controls and breaking a link.",
        red: "Attackers don't need one perfect exploit, they need a path. Every unguarded step is a stepping stone.",
        blue: "Defense in depth means an attacker must beat every layer. Break any link and the chain fails. Then review and improve.",
        takeaway: "Security is a chain on both sides. Build layers, respond fast, and turn every incident into a better defense.",
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

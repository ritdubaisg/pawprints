# Security Policy

PawPrints is maintained by the **RIT Dubai Student Government — Tech Services Team**. It handles student identity and petition data, and its integrity underpins the legitimacy of every petition outcome, so we take reports seriously.

Security testing of PawPrints is covered by the **RIT Dubai Student Government Vulnerability Disclosure Program (VDP)**:

**https://sg.ritdubai.ae/vdp**

Read the VDP before you begin testing. It defines the full scope, rules of engagement, our response commitments, and the safe-harbour terms we extend to good-faith research. This file is a summary, the VDP is the sole authoritative document.

## Supported Versions

PawPrints runs as a single live deployment. Only the currently deployed version of `main` is supported; there are no tagged releases and no backported fixes.

| Version | Supported |
| ------- | --------- |
| `main` (currently deployed) | Yes |
| Any earlier commit | No |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email **sgdubaitech@rit.edu** using the report template in Section 8 of the VDP. At minimum, include:

- The affected URL or endpoint
- Vulnerability type and your severity estimate
- Steps to reproduce
- A minimal proof of concept, with any real PII redacted
- Realistic impact — what an attacker could actually do, and who is affected
- Your contact details, testing timestamps (GST/UTC), and the test account or custom header you used

One vulnerability per report. If a single root cause affects several endpoints, group them and say so.

### What happens next

| Stage | Target |
| --- | --- |
| Acknowledgement of receipt | Within 3 business days |
| Initial triage and validity decision | Within 10 business days |
| Severity assignment and remediation plan | Within 15 business days of validation |
| Status updates | At least every 14 days until resolved |
| Remediation | Critical: 10 days · High: 15 days · Medium: 30 days · Low: best-effort |

We are a student-run team, so these are best-effort and may slip during exam periods and university breaks. We will tell you if that happens rather than going quiet.

Accepted reports get a fix and, with your consent, recognition — an acknowledgements page, a letter of appreciation, or thanks in the release notes. You may also stay anonymous. This is a disclosure program, not a paid bug bounty; there are no monetary rewards.

Declined reports get an explanation. Findings that are real but low-impact are usually marked informational and closed without a formal remediation timeline.

## Scope

**In scope:** `https://pawprintsritd.vercel.app/*` — the web application, its APIs, authentication flows, and client-side code served from that origin. The source in this repository is in scope for review.

Most relevant to this codebase: broken access control and IDOR, privilege escalation across the student / staff / superadmin roles, petition integrity (signature counts, status transitions, the review workflow), stored XSS in petition content, exposure of unpublished, returned or removed petitions, injection, SSRF, CSRF on sensitive actions, and secrets exposed in served assets.

**Out of scope:** Vercel, Firebase, Google, Prisma and every other third-party provider — report those to the vendor directly. Also out of scope: any `ritdubai.ae` asset not listed in the VDP, RIT Rochester systems, campus networks and Wi-Fi, personal devices, and social media accounts. Section 5 of the VDP has the full list.

**Generally not accepted** without demonstrated impact: scanner output with no validated finding, missing security headers, missing cookie flags on non-sensitive cookies, clickjacking on pages with no sensitive actions, self-XSS, logout CSRF, rate-limiting issues with no shown impact, verbose errors containing nothing sensitive, and best-practice suggestions that are not vulnerabilities. Section 6 of the VDP has the full list.

## Rules of Engagement

The VDP (Section 7) governs. In short — do not run DoS, stress, or resource-exhaustion tests; throttle automated tooling; do not access, modify, or exfiltrate data that is not yours; do not pivot or maintain persistence; and do not social-engineer students or staff.

Use your own test accounts, label them clearly, and identify your traffic where you can (`X-Bug-Bounty: VDP-<yourhandle>` or a recognisable User-Agent). For write or injection findings, use benign marked values such as `VDP-TEST-<yourhandle>`.

If you come across PII or credentials: stop, do not save or copy anything, keep only the minimal redacted evidence needed to prove the issue, and tell us immediately.

## Coordinated Disclosure

Keep findings confidential until we have remediated or given written permission. You may request permission to disclose publicly 90 days after your initial report, or sooner once a fix is confirmed. If remediation is running long we will explain why and agree a revised timeline with you rather than leaving it open-ended.

We are happy to review write-ups, blog posts, or talk material that references our systems — share drafts before publishing. Any public write-up must redact real user data and internal identifiers.

## Safe Harbour

Research conducted in accordance with the VDP is authorised, and we will not pursue or support legal action over good-faith testing that complies with it. Full terms, including the limits, are in Section 12 of the VDP.

Note that the Student Government can only authorise testing of assets it controls. That authorisation does not extend to third-party providers, and it does not override UAE law. If you are unsure whether a specific action is in scope or lawful, ask at **sgdubaitech@rit.edu** before proceeding.

## Eligibility

Current members of the SG Tech Services Team, and anyone with privileged or insider access to the administration of these systems, are not eligible for recognition under the Program — though internal reporting is always welcome and encouraged. If you are under 18, you should have parental or guardian consent to participate.

---

**Security reports and scope questions:** sgdubaitech@rit.edu
**Program owner:** RIT Dubai Student Government — Tech Services Team
**Full policy:** https://sg.ritdubai.ae/vdp

Thank you for helping keep the RIT Dubai student community safe.

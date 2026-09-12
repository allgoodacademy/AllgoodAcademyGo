# Privacy document audit — two live policies, and they disagree

**Status:** Findings only. **No privacy copy was edited in producing this document, and none should be edited on the strength of it alone.** This is legal copy; the differences below are reported for a human to reconcile.
**Audited:** 2026-09-11, against `claude/retention-infrastructure` (branched from `claude/hopeful-gates-vezwqu`).
**Author:** Claude Code, Retention Infrastructure sprint, Goal 1.

> **RESOLVED 2026-09-11** — *Legal pages reconciliation — one privacy policy, updated terms.*
> There is now one privacy policy. `public/privacy/index.html` was deleted, `public/privacy.html`
> was replaced with a document that carries the disclosures which previously existed only on the
> orphan (parent/teacher deletion route, teacher data, classroom code, advertising disclaimer)
> plus Google Analytics, free-text handling and Local Storage, and `firebase.json` now 301s
> `/privacy`, `/privacy/` and `/privacy/**` to `/privacy.html`. The retention prose (recommendation 4,
> still escalated) was carried over **byte-identical** and is now Section 8. The generated
> "last updated" date (recommendation 3) is gone with the file that contained it; both legal
> pages now carry a hardcoded date. The findings below are kept as the record of what was
> reconciled and why — they describe the state before this change, not the state today.

---

## Headline

There are two privacy policies in `public/`. **Both are served. They are not the same document, and on the single most consequential point — how long children's data is kept — they say opposite things.**

| | `public/privacy.html` | `public/privacy/index.html` |
|---|---|---|
| Served at | `/privacy.html` | `/privacy` and `/privacy/` |
| Linked from the site | **Yes** — all three links | **No — linked from nowhere** |
| Retention of student data | **Purged after 90 days of inactivity** | **"Kept for as long as the account is in use"** |
| Mentions "13" | 6 times | **0** |
| Mentions COPPA | 1 | **0** |
| Mentions Recruit Code | 3 | **0** |
| Last substantive change | 2026-09-06 (`611e23a`) | **Never since the initial commit** — the only later change (`b59110e`, 2026-09-10) swapped a CSS tag |

`public/privacy/index.html` predates the Recruit Code system. When the under-13 compliance work landed on 2026-09-06, it was not updated. It has been sitting at `/privacy` ever since, describing a product that no longer exists.

---

## Which document does a visitor actually get?

`firebase.json` sets **no** `cleanUrls`, **no** `rewrites`, **no** `trailingSlash`, and no redirect matching `/privacy`. So Firebase Hosting's default resolution applies:

| URL | What is served |
|---|---|
| `/privacy.html` | `public/privacy.html` — the 90-day document |
| `/privacy` | No file at `public/privacy`; the directory `public/privacy/` has an `index.html`, so Hosting redirects to `/privacy/` and serves **`public/privacy/index.html`** — the indefinite-retention document |
| `/privacy/` | `public/privacy/index.html` — the indefinite-retention document |

**Every link on the site points to `/privacy.html`.** Three `href="/privacy.html"` occurrences, in `public/index.html`, `public/for-teachers/index.html` and `public/about/index.html`. Nothing anywhere links to `/privacy` or `/privacy/`.

So the orphan is reachable by typing the URL, by following an external or historical link, or from a search engine that indexed it — but never by clicking through the site. **That reduces how often it is hit. It does not make it not-live**, and "/privacy" is the URL a parent or a regulator would guess first.

> ⚠️ **This table is derived from `firebase.json` and Firebase Hosting's documented default behaviour. It was NOT confirmed against a running server.** Every outbound HTTPS request from this sandbox is refused by the agent proxy (HTTP 403 on the CONNECT tunnel) — staging and `allgoodacademy.com` alike. **Someone with a browser should open all three URLs and confirm this table before it is relied on.** It is the one claim here that could not be tested and the one most worth testing.

---

## Claim-by-claim comparison

`DIFFERS` means both documents address the point and say different things. `ONE ONLY` means one is silent.

### Retention and deletion

| Claim | `privacy.html` | `privacy/index.html` | Verdict |
|---|---|---|---|
| Retention window for student/telemetry data | §4: *"All anonymous interaction data and telemetry logs are **permanently purged** from our systems **after 90 days of inactivity**."* Specifies session records and event logs. | *"Account and progress data is kept **for as long as the account is in use**, so a student's progress isn't lost between sessions."* | 🔴 **DIFFERS — directly contradictory** |
| Stated deletion timeframe | Yes — 90 days, bolded | **None.** "As long as the account is in use" states no timeframe and no endpoint | 🔴 **DIFFERS** |
| Clock starts from | Last activity; records still active are retained while activity continues | Not stated | **ONE ONLY** (privacy.html) |
| Parent/teacher deletion request route | No request route. Only says a mis-created under-13 13+ account will be deleted on discovery | Dedicated *"Requesting a review or deletion"* section with a mailto for parents, guardians and teachers | 🔴 **ONE ONLY (privacy/index.html)** — and it is the *more* protective of the two here |

### Under-13 handling

| Claim | `privacy.html` | `privacy/index.html` | Verdict |
|---|---|---|---|
| Age gate exists | §3: must be 13+ to create an account or use Google sign-in | **Silent.** No age is mentioned anywhere | 🔴 **ONE ONLY** |
| COPPA named | §3 heading: *"Age Restrictions (COPPA Compliance)"* | **Silent** | 🔴 **ONE ONLY** |
| Under-13 mechanism | Recruit Code — auto-generated 3-word passphrase, auto-assigned display name and avatar | **Silent.** Describes only "sign in anonymously" | 🔴 **ONE ONLY** |
| Who chooses the nickname | Auto-assigned; *"nothing you enter identifies you personally"* | *"A student **picks** (or is given) a nickname"* | 🔴 **DIFFERS — materially.** A student-chosen nickname can contain a real name. The two documents describe different PII exposure |
| PII collected from under-13s | *"We collect **zero** Personally Identifiable Information (PII) for under-13 agent learners"* | No under-13 category exists in this document | **ONE ONLY** |

### What is collected

| Claim | `privacy.html` | `privacy/index.html` | Verdict |
|---|---|---|---|
| Student Google sign-in | §1: 13+ signing in via Google → name, email, profile picture collected | *"Students sign in **anonymously** — we never ask a student for their real name or email address"* | 🔴 **DIFFERS.** One says some students hand over name and email; the other says no student ever does |
| Performance data | Answers, scores, choices within GoodBlocks, time spent | Scores and completion status | **MATCH** (differing granularity, no contradiction) |
| Classroom code | **Silent** | *"Which classroom code (if any) a student joined"* | **ONE ONLY** (privacy/index.html) |
| Activity timestamps | Implied via session records | Explicit — last login, module completion time | **ONE ONLY** (privacy/index.html) |
| Local Storage on device | §1 — non-identifying session data cached locally | **Silent** | **ONE ONLY** (privacy.html) |
| Teacher data | **Silent** — teachers are not mentioned | Real Google account (name, email); authorized-staff attestation before first classroom | 🔴 **ONE ONLY** (privacy/index.html) |

### Use, sharing, third parties

| Claim | `privacy.html` | `privacy/index.html` | Verdict |
|---|---|---|---|
| Selling data | *"We do not sell your personal data to third parties"* | *"We do not sell data"* | **MATCH** |
| Advertising | **Silent** | *"we do not use it for advertising"* | **ONE ONLY** (privacy/index.html) |
| Purpose limitation | Customization, content improvement, authentication | Run the experience, teacher visibility, fix bugs and improve lessons | **MATCH** in substance |
| Third parties named | Google Firebase, explicitly | **None named** | 🔴 **ONE ONLY** (privacy.html) |
| Security posture | §6 — industry-standard measures, no absolute guarantee | **Silent** | **ONE ONLY** (privacy.html) |
| Contact | `learning@allgoodacademy.com` | mailto deletion/review request | **MATCH** in effect |

### Document metadata

| Claim | `privacy.html` | `privacy/index.html` | Verdict |
|---|---|---|---|
| "Last updated" date | Static: **December 7, 2025** | **Generated in JavaScript on every page load** (`:70`) — always renders today's date | 🔴 **DIFFERS, and the second is a problem on its own** |

**On the generated date.** `public/privacy/index.html:70` is:

```js
document.getElementById('updated-date').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
```

Every visitor is told the policy was last updated **today**, whenever today is, regardless of whether a word has changed since the initial commit. A parent cannot tell when the terms they agreed to actually changed, and the page asserts a currency it does not have. Flagged, not fixed — it is inside a legal document and out of scope for this sprint.

---

## What this means for the retention work

The sprint this audit belongs to is building a job to honour the **90-day** promise in `privacy.html`. That promise is live, specific, and currently unkept.

**The audit surfaces a second problem that the job does not solve.** `privacy/index.html` tells anyone who reaches `/privacy` that student data is kept *as long as the account is in use* — an open-ended retention statement covering children, with no stated deletion timeframe. Building and scheduling the prune job makes `privacy.html` true. It does nothing about the document at `/privacy` that says the opposite, and a prune job that deletes data at 90 days puts the product in direct conflict with that page's stated terms.

**The new `[retention]` invariant check makes this asymmetry visible.** That check (added in the same sprint, `scripts/check-invariants.js`) looks for a deletion verb near a duration. It matches `privacy.html` and requires a scheduled job behind it. It does **not** match `privacy/index.html` — correctly, because "kept for as long as the account is in use" contains no duration and is therefore not a deletion deadline at all. The document that states a deadline is now enforced. The document that states no deadline cannot be enforced by any check, because there is nothing to enforce. That is the finding, not a gap in the check.

This interacts with the escalation already open in the Decisions & Context Log (*"⚠️ ESCALATION — request to remove under-13 90-day retention promise NOT actioned"*). Whatever counsel advises about the 90-day window, **there are two documents to advise on, not one**, and the unlinked one is the one that states no timeframe at all.

---

## Collections written since this audit, and what they hold

Added so a new collection is never invisible when the retention question comes back from counsel. This audit is about what the two policies *say*; this section is about what the product actually *writes*, which is the thing counsel will need alongside them.

| Collection | Holds | ageTier stamped? | Student-readable? | Under the 90-day prune? |
|---|---|---|---|---|
| `artifacts/{appId}/course_feedback` | End-of-lab star rating and free-text comment | Yes | No — admin-read only | Yes |
| `artifacts/{appId}/topic_selections` | **New (Comms pass one).** What a student picked in answer to "what do you want to get better at?" — a category, the module suggested, and whether they confirmed | Yes | No — admin-read only | Yes — listed in `scripts/prune-telemetry.js` |
| `artifacts/{appId}/users/{uid}/comms_receipts` | **New (Comms pass one).** The student's own readable copy of a note they sent — a 140-character excerpt, not the full text | No — the doc lives under the student's own uid, so the tier is one read away on their profile | **Yes** — owner-readable, by design; it is the only way Comms can show that a note exists | **No — see below** |

**`topic_selections` is not free text, and is still a record about a child.** It is one row per tap saying what a student believes they are bad at. It is not student-readable for that reason: nothing in the product reads it back to them, so nothing should be able to. It carries `ageTier` on every document so an under-13 row can be found for a parental deletion request without joining back to the user profile — the same property that made `course_feedback` answerable.

**`comms_receipts` is deliberately outside the prune script, and that is a decision worth seeing.** It lives under `artifacts/{appId}/users/{uid}/`, which the prune job does not walk — that job sweeps flat top-level collections by a timestamp field. Deleting a receipt at 90 days would also silently delete the acknowledgement item the student sees in Comms. It holds a 140-character excerpt of text the student themselves wrote and can read back. **If counsel's answer on the 90-day window covers everything a child typed, this collection needs a sweep the current script cannot perform, because per-user subtrees are not in its model.** Flagged here rather than quietly assumed to be covered.

**No inbound message ever stores operator text.** Every item Comms renders is generated from a fixed template in `/js/message-hq.js`. There is no collection holding an adult's words addressed to a child, because there is no path that writes one.

---

## Recommendations — recommendations only, nothing was changed

Ranked. None of these were carried out; all of them touch legal copy.

1. **Decide which document is authoritative, and make the other stop being served.** One policy per domain. Either `public/privacy/index.html` is deleted and `/privacy` redirected to `/privacy.html`, or its content is replaced wholesale by the maintained document. A redirect is a one-line addition to `firebase.json` and needs no copy written — but it is still a change to what a legal page serves, so it is the founder's call, not a cleanup task.
2. **Whichever survives should carry the content that only the other one has.** Each document holds material the other lacks. `privacy.html` is missing: the parent/teacher deletion-request route, the teacher-data section, the classroom-code disclosure, and the advertising disclaimer. `privacy/index.html` is missing: everything about under-13s, COPPA, Recruit Codes, the 90-day window, Firebase, and security. **Neither is a superset. Deleting either one loses real disclosures.**
3. **Replace the generated "last updated" date with a hardcoded one** reflecting the actual last substantive edit.
4. **Have counsel look at the pair together**, not `privacy.html` alone, when answering the open escalation.

**Explicitly not recommended:** changing the 90-day figure, softening the purge language, or adjusting any retention wording. That question is escalated and awaiting counsel. This sprint built the machinery and left it inert.

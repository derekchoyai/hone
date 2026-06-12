# Example — Coding Review

**Illustrates:** clean, correct-looking AI-generated code shipped by someone who can't
explain its riskiest line. Model-quality evals would pass this. Hone does not.

---

## The work (AI-generated, pasted by the user)

```ts
// Rate-limit middleware for our public API
const hits = new Map<string, { count: number; ts: number }>();

export function rateLimit(req, res, next) {
  const key = req.headers["x-forwarded-for"] ?? req.ip;
  const now = Date.now();
  const rec = hits.get(key);
  if (!rec || now - rec.ts > 60_000) {
    hits.set(key, { count: 1, ts: now });
    return next();
  }
  if (rec.count >= 100) {
    return res.status(429).json({ error: "Too many requests" });
  }
  rec.count++;
  next();
}
```

**Context / stakes:** "Goes on our public production API today. Stops abuse."

## Classification
- **Domain:** coding · **Risk:** high (production, public, abuse-facing) · **Interview depth:** 7

## Work map (excerpt)
- **Claims:** limits each client to 100 requests/minute.
- **Assumptions:** `x-forwarded-for` identifies the client; single server process; in-memory state is acceptable.
- **Risks:** spoofable header; memory grows unbounded; resets on deploy; no shared state across instances.
- **Unknowns:** how many server instances run in production.

## Interview (human's actual answers)

> **Q: In your own words, what does this code do and why is it structured this way?**
> "It blocks anyone who makes more than 100 requests a minute. The AI wrote it, it's a standard pattern."

> **Q: Which line or dependency here could you NOT explain right now?**
> "The `x-forwarded-for` line — I think it's just how you get the IP."

> **Q: What inputs or conditions would break this?**
> "Not sure, it looked complete."

> **Q: How many server instances run this in production?**
> "Probably a few behind the load balancer."

> **Q: What happens to `hits` over time, and on deploy?**
> "Hadn't thought about it."

> **Q: Could a caller get around the limit?**
> "I don't think so?"

> **Q: What are you least confident about?**
> "Honestly the whole thing, I just trusted it."

## AI-Q

**37 / 100 — Riding the AI**

| Dimension | Score | Why |
|---|---|---|
| Understanding | 2 | Knows the intent, not the mechanism. |
| Verification | 1 | Ran nothing; trusted the output. |
| Assumption awareness | 2 | Didn't see the single-instance / header-trust assumptions. |
| Risk recognition | 1 | Couldn't name any failure mode. |
| Confidence calibration | 3 | Did admit low confidence — the one bright spot. |
| Accountability | 2 | "The AI wrote it" framing. |

### What you clearly own
- You correctly stated the intent (100 req/min) and that it's abuse-facing.

### Your judgment gaps
- The **load-bearing assumption** — that this runs on one process — is false behind a load
  balancer: the in-memory `Map` makes the real limit `100 × (number of instances)`.
- `x-forwarded-for` is **client-spoofable**; an attacker rotates it to bypass the limit.
- `hits` **grows unbounded** (no eviction) → memory leak; and resets every deploy.

### Verify before you ship
- [ ] Confirm instance count; if >1, this limiter is ineffective as written.
- [ ] Move state to shared store (Redis) or use a vetted library.
- [ ] Don't trust `x-forwarded-for` unless it's set by your own trusted proxy.
- [ ] Add eviction / TTL for `hits`.

### How to defend this (you currently can't)
> "How does this behave across multiple instances?" — *no current answer.* That's the gap.

### Practice next
Before shipping AI code, find the one line you can't explain and explain it — that line is
usually where the risk lives. Here it was `x-forwarded-for`.

---

**The point:** the code is well-written. The *judgment* around shipping it is not. No
model-quality metric would have caught that.

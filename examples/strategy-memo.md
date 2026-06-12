# Example — Strategy Review

**Illustrates:** a polished AI-drafted recommendation resting on one unchecked
load-bearing assumption. Contrast with the same memo handled with *high* judgment.

---

## The work (AI-assisted, pasted by the user)

> **Recommendation:** Raise prices 15% next quarter. Our NPS is high (62) and churn has
> been flat for two quarters, so customers have low price sensitivity. Estimated impact:
> +13% revenue with negligible churn risk.

**Context / stakes:** "Going to the CFO Friday; sets next year's pricing."

## Classification
- **Domain:** strategy · **Risk:** high (irreversible-ish, exec decision, revenue) · **Depth:** 7

## Work map (excerpt)
- **Claim:** customers have low price sensitivity → +13% revenue, negligible churn.
- **Load-bearing assumption:** *high NPS + flat churn at current price ⇒ low sensitivity to a higher price.*
- **Risks:** churn is a lagging indicator; NPS ≠ willingness to pay more; competitor response.

## Interview — two versions

### Version A — low judgment (score 43, "Riding the AI")

> **Q: Which single assumption, if wrong, sinks this — and have you checked it?**
> "That customers aren't price sensitive. NPS is high so they love us."

> **Q: Does flat churn at the current price tell you about churn at a 15% higher price?**
> "I'd assume it's similar."

> **Q: How would you get an early signal before rolling out to everyone?**
> "Just monitor churn after."

### Version B — high judgment (score 90, "Owns it")

> **Q: Which single assumption, if wrong, sinks this — and have you checked it?**
> "That NPS implies pricing power. It doesn't directly — NPS measures satisfaction at the
> *current* price. I haven't validated willingness to pay at +15%, which is the real
> question. That's the weak point."

> **Q: How would you get an early signal before rolling out to everyone?**
> "Test the new price on a cohort or new customers first, watch conversion and churn for a
> month, and check with sales on competitor pricing before a blanket increase."

## AI-Q (Version A)

**43 / 100 — Riding the AI**

| Dimension | A | B |
|---|---|---|
| Understanding | 3 | 4 |
| Verification | 1 | 4 |
| Assumption awareness | 2 | 5 |
| Risk recognition | 2 | 5 |
| Confidence calibration | 2 | 5 |
| Accountability | 3 | 4 |

### The decisive gap (Version A)
The memo conflates **satisfaction** (NPS) with **price elasticity**. Flat churn *at today's
price* is silent about churn at a 15% higher price. The whole +13% rests on an assumption
the author never tested.

### Verify before you ship
- [ ] Validate willingness-to-pay at +15% (cohort test, surveys, or sales signal).
- [ ] Separate new-customer pricing from existing-customer increases.
- [ ] Check competitor pricing and likely response.

### How to defend this
> "NPS measures love at the current price — what's your evidence they'll pay 15% more?"
> Version A has no answer. Version B does.

---

**The point:** same model output, same memo. The difference Hone measures is entirely in the
human's grasp of the load-bearing assumption.

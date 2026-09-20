# ARCA pitch — Sunday submit

**Freeze the product.** Do not merge Shahn’s monorepo. Do not debug the Talaia 401. The console ranks. That is enough to show.

Say **Bombers** (Catalan fire service). Then once, in English: firefighters. ARCA does not replace them. ARCA ranks who runs out of time so the coordinator can call with Bombers, not instead of them.

---

## Who does what (now)

| Person | Next 20 min | Then |
|---|---|---|
| **Speaker** | Learn the 60s below out loud, twice | Record the video. One take is enough if it is felt. |
| **Demo laptop** | `npm run demo:reset` then `npm run dev`. Browser on `:3000`. Hide the red Talaia alert if you can collapse “Data sources”. | Click R-CARE-041 → why they are first. Then REGA-B-1842. Stop. |
| **Slides (Codex)** | Paste the Codex prompt at the bottom. **Seven slides. No architecture diagrams.** | Export PDF. Put the last slide on screen while you talk if the demo flakes. |
| **Cursor / code** | **Stop.** No Talaia key chase. No new kinds. No Railway. | Only if the demo will not boot. |
| **Shahn’s repo** | Already in: we fetch Talaia. The key is rejected. Honest fallback is a feature. | If a judge asks: “Inventory API is Talaia. Key was revoked overnight. Ranking still runs on the official snapshot.” |

Do not split the room into two products. One story, one screen, one list.

---

## 60 seconds (record this)

People do not stay in a wildfire because they are stupid.

They stay because the dog is family. And because the sheep are the rent.

In the United States, three out of four pet owners say they would not leave if they could not take the animal. In Catalonia we do not need a survey. In the Alt Empordà fire, two men hid in a ravine and listened to five hundred sheep die. They had tried to walk the flock to the reservoir. They did not make it.

This July, in Ponent, two farmers died inside the fire. Owner and worker. One called the other to be picked up. Bombers held the perimeter. What nobody had was the list: who is inside the next hours, how long they need to move, and who is already late.

That list is ARCA.

Deepfire says where the fire may go. Talaia is the inventory of what is there — schools, care homes, farms. ARCA subtracts. Spare time equals arrival minus evacuation. A care home with sixty-four people and one minibus is first. A school that can walk out in twenty minutes is not. The formula ranks. The model explains. A human has to Approve before anyone is called.

Bombers fight the fire. ARCA says who to call first.

---

## Three minutes if you have a live screen

**0:00 — the refusal.** Same opening as the 60s. Stop after the five hundred sheep. Let it sit.

**0:40 — the missing list.** Show the map. Hour rings are a labelled demo ensemble. Say that out loud. Do not pretend they are a live Deepfire spread. Hotspots can be live. The rings are the briefing shape.

**1:10 — the list.** Rank 1 is the care home. Spare time is negative. They need four hours. The fire is in three. That is not an order to leave. That is a clock. Coordinator decides with Bombers.

**1:40 — the farm.** REGA-B-1842. Four hundred on the register, three hundred twelve reported. The flock is the rent. If they tell us two hundred then correct to three hundred, we keep three hundred. Capacity is not occupancy. We say that.

**2:10 — who decides.** Point at the chip: human approval required. The language model cannot place a call. There is no path from chat to a ringing phone that skips Approve.

**2:30 — close.** Deepfire: where it goes. Talaia: what is there. ARCA: who is late. We built it for the person on duty at two in the morning, not for a dashboard prize.

---

## Numbers you may say (and the source)

Use only these. If you cannot name the source, skip the number.

| Line | Source |
|---|---|
| 76% of US pet owners would stay if they could not take the pet (2023) | PetSmart Charities / Wakefield, 1,000 owners, May 2023 |
| ~500 sheep died; farmers heard them from a ravine | Alt Empordà / La Jonquera fire, survivor account, *Diari de Girona* 17 Jul 2022 (looking back) |
| Two farmers dead (owner and worker, 34 and 45), ~5,000 ha | Ponent fire, Torrefeta i Florejacs / Coscó, 1–2 Jul 2025. Catalan News, ARA |
| Pigs died of smoke on at least one farm; another saved the herd with slurry | Same fire, ARA |
| Catalonia 2025: 2,168 vegetation fires, 8,616 ha, +63% vs 2024 | Interior / Catalan News season report |
| Extremadura summer 2025, ASAJA members: 200+ cows, 600+ sheep, ~4,000 hives | ASAJA Extremadura, 25 Aug 2025. Spain, not Catalunya — say so if you use it |

Do **not** invent a Catalunya-wide animal death total. There is not a clean official series. That absence is the point: people and livestock are still not on the same list as the fire.

---

## Words

- **Bombers** first. Then “Catalan firefighters” once if the room is English-only.
- **Coordinator**, not “AI commander.”
- **Spare time**, not “risk score.”
- **Reported, not verified** if you mention a phone log.
- Never: “we tell them to evacuate.” ARCA does not issue orders.
- Never: “live Talaia” while the card says the key was rejected. Say “Talaia is the inventory API we wired. Tonight we degrade to the official snapshot and we say so.”

---

## Paste this into Codex (slides only)

```
We submit in under an hour. Make a 7-slide PDF for HackBarna / Norrsken Values-at-risk.
No architecture. No logos soup. Dark, quiet, one idea per slide.

1. Title: ARCA. Sub: Deepfire says where a fire may go. Talaia says what is there. ARCA says who to call first.
2. People stay for the dog and the sheep. 76% of US pet owners would not leave without the animal. In Alt Empordà, two men heard 500 sheep die. In July 2025 two Catalan farmers died in the Ponent fire.
3. Bombers already have the fire. Nobody hands the coordinator the list: who is inside, how long to empty, who is already late.
4. One formula, large: spare time = arrival − evacuation. Care home first, not the nearest school.
5. Screenshot of the ranked list (I'll paste). Caption: formula ranks, model explains, human Approves.
6. We never call without a recorded human decision. Exercise mode on. Empty allowlist by default.
7. Ask: a ranked list for the person on duty at 2am.

Speaker notes = the 60-second script. Export PDF. Do not write code.
```

---

## If the demo dies on stage

Read the 60 seconds. Show slide 5 if you have it. Say the care-home number from memory: four hours to leave, three hours of fire, spare time negative. Sit down.

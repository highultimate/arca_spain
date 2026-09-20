# Norma scan — arca-hackbarna2026

Project scanned: **arca-hackbarna2026** (`https://github.com/akhtarshahnawaz/arca-hackbarna2026`)

Norma MCP connected (OAuth). Workspace remote in this checkout is `https://github.com/highultimate/arca_spain.git`.

## Scores

| | Production-Ready Score | live_check (HIGH) |
|---|---|---|
| **Before** | Not available | **2** (`rct-unsafe-href-binding`) |
| **After** | Not available | **0** (same rule, clean) |

The portal Full Scan / Production-Ready Score lives at [norma.qualityclouds.com](https://norma.qualityclouds.com). `link_repository` for `arca-hackbarna2026` failed with `auto_import_not_available` — the repo is not imported into this Norma organisation, and automatic import is not available from MCP. `get_open_issues` therefore returned `no_linked_repository`. `register_applied_actions` also failed (`unlinked`).

Do not treat the table as a portal score. The before/after numbers are Norma `live_check` results for the finding below.

## Finding fixed

- **id:** `rct-unsafe-href-binding-1.0` (`rct-unsafe-href-binding`)
- **title:** Dynamic Value Bound to href Without URL Validation
- **severity:** HIGH / security
- **file:** `components/command-console.tsx`
- **what was wrong:** Place details rendered `href={site.sourceUrl}` and `href={site.capacitySourceUrl}` with no protocol check. A `javascript:` or `data:` URL in inventory data would run on click (DOM XSS).
- **what changed:** Added `sanitizeUrl()` that allowlists `https:`, `http:`, and `mailto:` (Norma’s prescribed fix). Both links now use `href={sanitizeUrl(...)}`. Other values become `#`.

Rescan: `live_check` on the sanitized links returned `clean`.

## Defend this fix (2 minutes)

Coordinators click “source” and “capacity source” on a place. Those URLs come from Talaia / open-data records, not from a hardcoded allowlist. React does not block `javascript:` in `href`. If a record is poisoned, the click leaves the console and executes in the coordinator’s browser.

The fix is a 10-line allowlist, the same one Norma’s rule documents. Official Catalonia dataset URLs are `https://` and still work. We did not change ranking, contact policy, or call flow.

## Remaining (not fixed)

`live_check` of the header also reported **MEDIUM** `js-nested-ternary` (nested ternary for “N places still need your decision”). Left alone — one finding only.

`package.json` `live_check` was clean.

# Data model

All tables live in `<catalog>.<prefix>device_demo`. Customer portals read views in `<catalog>.<prefix>portal_northwind` and `<catalog>.<prefix>portal_bastion`, filtered to one customer each. Everything is synthetic and fictional.

| Table | Rows | Grain | Notes |
|---|---|---|---|
| `devices` | ~262K | One row per device processed (Nov 2025 to Nov 2026) | Identity (IMEI, model, born-on), program, facility, diagnostics (8 tests), cosmetic grade on arrival and final, battery health, OEM parts, genuine and blacklist status, next best action, dock-to-stock hours, value as received, action cost, value recovered, net value lift, disposition channel |
| `repair_orders` | ~85K | One row per device routed to repair | Partner, repair type, OEM vs aftermarket parts, sent/returned dates, turnaround, QA pass/bounce, repair, logistics and rework cost, value erosion while out |
| `customers` | 6 | Customer program | Northwind Mobile and Atlas Wireless (carriers), Bastion Protect (insurer), Meridian Devices (OEM), Circuit Market (marketplace), Harbor Leasing (device finance) |
| `facilities` | 5 | Processing site | Automation level (Full Automation Line, robotic cells, manual stations) and whether it has a buff & polish cell |
| `repair_partners` | 6 | Repair partner | In-house hub, domestic, nearshore and overseas partners |
| `device_models` | 36 | Model | OEM, family, release date, grade A resale benchmark, type allocation code |

Functions:

- `verify_device(imei)` and `verify_devices('imei1,imei2,...')`: return only `imei, verdict, genuine, approved`. Verdicts: `GENUINE - APPROVED`, `GENUINE - NOT APPROVED` (lost/stolen or unpaid balance), `NOT GENUINE` (counterfeit), `UNKNOWN` (no record).

## How the value fields relate

- `value_as_received`: market value as graded on arrival (US benchmark).
- `action_cost`: buff & polish, or repair + logistics + rework.
- `value_recovered`: realized value after the action and the sales channel (EU sells slightly higher; LATAM, Africa and APAC exports lower).
- `net_value_lift = value_recovered - action_cost - value_as_received`. Devices sold as-is into export channels can show a small negative lift; quarantined devices go to zero.

## Story levers (in `setup/sql/06_stage.sql`)

- Daily volume multipliers: Sep 12 to Oct 31 surge (x2.15), late Dec to Jan bump (x1.45), weekend dip, 30% growth over the year.
- Dock-to-stock median by facility and a surge multiplier per facility (manual site x2.6).
- Repair partner quality: bounce rate and OEM-parts share per partner; one overseas partner switches to aftermarket screen parts from Aug 1.
- Battery decline per month of age, with a weaker Galaxy S22 cohort.
- Next best action rules: quarantine, recycle, harvest parts, repair, buff & polish (only at sites with a polish cell), resell as-is.

The generator uses `xxhash64(seq, '<salt>')` for every random draw, so the same SQL produces the same rows (and the same sample IMEIs) in any workspace.

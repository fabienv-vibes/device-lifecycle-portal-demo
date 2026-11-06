# Demo script (about 15 minutes)

Audience: a device lifecycle / reverse-logistics platform (trade-in, insurance claims, refurb, resale) whose customers keep asking for reports, and who wants to share device data with partners and regulators. All data is fictional.

## Before you start (5 min)

1. Open the app on **Contoso Operations** and let the Overview load once to warm the warehouse.
2. Set **Site** to "All sites". Open **Ask your data** and click "New conversation".
3. Check the **Executive dashboard** tab renders. If the embed shows a login, use "Open in Databricks".

## The story in one line

"Same platform, same data, different views: what your ops team sees, what each customer sees in a portal with their own brand, and what a regulator gets, which is only the answer."

## Beat 1: the platform's own ops view (3 min)

- KPIs compare the last 90 days with the prior 90. Volume is up about 70% with the fall flagship launches, and dock-to-stock (dock to sellable stock) got slower.
- **Dock-to-stock chart:** fully automated lines stay near 16 to 18 hours through the surge; manual stations go past 100.
- Set **Site = Memphis**: no buff & polish cell, so the Buff & polish bar disappears, there's no grade A uplift, and dock-to-stock is up over 100%.
- **Scorecard:** the overseas partner quotes about $40 a repair, but with rework on failed QA and value lost while phones are out for about 20 days, its true cost is about $80, the highest of any partner.

## Beat 2: what a customer sees (2 to 3 min)

- Switch to **Northwind Mobile**. Same app, white-labeled. The platform brand stays on top; the customer brand is inside. They see their program, not your partners or sites.
- KPIs: value recovered, average recovery per device, days to complete, fraud and risk caught before credit (with exposure stopped), second-life rate (an ESG metric carriers report). "Your devices right now" answers "where are my devices?"
- Flash **Bastion Protect** (insurer): salvage per claim and claim fraud before payout. Different brand, different data, enforced in Unity Catalog.

## Beat 3: executive dashboard (1 to 2 min)

- A no-code AI/BI dashboard on the same governed views, embedded in the app. Sparkline KPIs, and an `AI_FORECAST` projection (Preview) from a built-in SQL function. On the ops view, the heatmap shows Memphis turning red in Sep and Oct.

## Beat 4: Ask your data, Genie (3 min)

- As Northwind, click "How many of our trade-ins were flagged as lost/stolen or unpaid balance, and what were they worth?" (about 20 seconds).
- Point at the generated SQL and the data scope: this Genie space can only see Northwind's governed views.
- Optional: as Contoso Operations, ask the Memphis buff & polish question to put a dollar figure on Beat 1 (about $810K).

## Beat 5: device record, then the regulator (3 min)

- Open **Device Record**, click "Repair bounced": one governed record per phone, including the aftermarket screen that cost it EU resale eligibility.
- Switch to **National Telecom Regulator**. A container of used phones arrives in a country that runs an IMEI register. Click **Load sample shipment**, then **Verify 13 devices**: 9 allowed, 2 blocked (stolen or unpaid), 1 counterfeit, 1 held (no record).
- The regulator only gets the verdict, through one Unity Catalog function, never the device tables. OEM and carrier data stays where it is; OpenSharing delivers the verdicts into the regulator's environment.

## Q&A one-liners

- **Is this real data?** No, it's synthetic, shaped like a device lifecycle business.
- **Do we have to move data?** No. Databricks runs in your cloud account on open formats; you can read operational Postgres in place before deciding what to bring over.
- **How is each customer kept separate?** Unity Catalog: each portal, dashboard and Genie space only has access to that customer's governed views.
- **Can Genie be wrong?** It can, so it always shows its SQL. You tune spaces with instructions and example questions and benchmark them.
- **Can customers use their own tools?** Claude or ChatGPT users can connect through Genie's MCP server (check current maturity); BI-tool users get their governed slice through OpenSharing.
- **Can customers build their own dashboards?** Yes, AI/BI dashboards authored on their own governed data. External identity and cost model are design follow-ups.
- **Is the forecast reliable?** It's a statistical projection from 12 months of history (`AI_FORECAST`, Preview); validate before customer use.
- **What does dock-to-stock mean?** Hours from the receiving dock to graded, sellable stock. Repair time is tracked separately as turnaround.

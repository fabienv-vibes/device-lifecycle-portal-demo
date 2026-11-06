T='{{DATA}}'  # replaced with <catalog>.<schema> at build time
EX = [
("Which repair partners have the highest bounce rate since August 2026, and what has rework cost us?",
f"""SELECT p.partner_name, p.partner_type, COUNT(*) AS repairs_completed,
  ROUND(AVG(CASE WHEN r.qa_result = 'Bounce' THEN 1 ELSE 0 END) * 100, 1) AS bounce_rate_pct,
  ROUND(SUM(r.rework_cost), 0) AS rework_cost_usd
FROM {T}.repair_orders r JOIN {T}.repair_partners p ON r.partner_id = p.partner_id
WHERE r.repair_status = 'Completed' AND r.sent_date >= DATE'2026-08-01'
GROUP BY p.partner_name, p.partner_type ORDER BY bounce_rate_pct DESC"""),
("What is the true cost per successful display repair by partner?",
f"""SELECT p.partner_name, COUNT(*) AS display_repairs,
  ROUND(AVG(r.repair_cost + r.logistics_cost), 2) AS quoted_cost_usd,
  ROUND(SUM(r.repair_cost + r.logistics_cost + r.rework_cost + r.value_erosion) / SUM(CASE WHEN r.qa_result = 'Pass' THEN 1 ELSE 0 END), 2) AS true_cost_per_successful_repair_usd,
  ROUND(AVG(CASE WHEN r.parts_type = 'Aftermarket' THEN 1 ELSE 0 END) * 100, 1) AS aftermarket_parts_pct
FROM {T}.repair_orders r JOIN {T}.repair_partners p ON r.partner_id = p.partner_id
WHERE r.repair_status = 'Completed' AND r.repair_type = 'Display' AND r.sent_date >= DATE'2026-08-01'
GROUP BY p.partner_name ORDER BY true_cost_per_successful_repair_usd DESC"""),
("How did dock-to-stock time change at each facility during the September-October trade-in surge?",
f"""SELECT f.facility_name, f.automation_level,
  ROUND(PERCENTILE(CASE WHEN d.received_date BETWEEN DATE'2026-07-01' AND DATE'2026-09-11' THEN d.dock_to_stock_hours END, 0.5), 1) AS median_hours_before_surge,
  ROUND(PERCENTILE(CASE WHEN d.received_date BETWEEN DATE'2026-09-12' AND DATE'2026-10-31' THEN d.dock_to_stock_hours END, 0.5), 1) AS median_hours_during_surge
FROM {T}.devices d JOIN {T}.facilities f ON d.facility_id = f.facility_id
GROUP BY f.facility_name, f.automation_level ORDER BY median_hours_during_surge DESC"""),
("How much value did buff & polish add by facility this year?",
f"""SELECT f.facility_name, COUNT(*) AS devices_polished,
  ROUND(SUM(d.net_value_lift), 0) AS net_value_lift_usd, ROUND(AVG(d.net_value_lift), 2) AS avg_lift_per_device_usd
FROM {T}.devices d JOIN {T}.facilities f ON d.facility_id = f.facility_id
WHERE d.next_best_action = 'Buff & polish' AND d.processing_status = 'Completed' AND YEAR(d.received_date) = 2026
GROUP BY f.facility_name ORDER BY net_value_lift_usd DESC"""),
("How much value are we leaving on the table at Memphis by selling grade B devices as-is instead of buff & polishing them?",
f"""WITH lift AS (
  SELECT AVG((d.value_recovered + d.action_cost) / d.value_as_received) AS uplift_ratio, AVG(d.action_cost) AS avg_polish_cost
  FROM {T}.devices d WHERE d.next_best_action = 'Buff & polish' AND d.processing_status = 'Completed' AND d.disposition_channel = 'Resold - US')
SELECT COUNT(*) AS eligible_devices_sold_as_is,
  ROUND(SUM(d.value_as_received * (l.uplift_ratio - 1) - l.avg_polish_cost), 0) AS missed_value_usd
FROM {T}.devices d CROSS JOIN lift l
WHERE d.facility_id = 'FAC-MEM' AND d.next_best_action = 'Resell as-is' AND d.cosmetic_grade = 'B'
  AND d.functional_status = 'Fully functional' AND d.value_as_received >= 160"""),
("How many devices lost EU market eligibility because of aftermarket repair parts, by partner?",
f"""SELECT p.partner_name, COUNT(*) AS devices_with_aftermarket_parts,
  ROUND(SUM(d.value_as_received), 0) AS value_as_received_usd
FROM {T}.repair_orders r JOIN {T}.devices d ON r.device_id = d.device_id JOIN {T}.repair_partners p ON r.partner_id = p.partner_id
WHERE r.parts_type = 'Aftermarket' AND d.oem_parts_only = TRUE
GROUP BY p.partner_name ORDER BY devices_with_aftermarket_parts DESC"""),
("Which models have the worst battery health on arrival?",
f"""SELECT d.oem, d.model, COUNT(*) AS devices, ROUND(AVG(d.battery_health_pct), 1) AS avg_battery_health_pct,
  ROUND(AVG(CASE WHEN d.battery_health_pct < 80 THEN 1 ELSE 0 END) * 100, 1) AS pct_below_eu_threshold
FROM {T}.devices d WHERE d.functional_status <> 'No power'
GROUP BY d.oem, d.model HAVING COUNT(*) > 1000 ORDER BY avg_battery_health_pct ASC LIMIT 10"""),
("Show weekly devices received and value recovered for Northwind Mobile",
f"""SELECT DATE_TRUNC('WEEK', d.received_date) AS week, COUNT(*) AS devices_received, ROUND(SUM(d.value_recovered), 0) AS value_recovered_usd
FROM {T}.devices d JOIN {T}.customers c ON d.customer_id = c.customer_id
WHERE c.customer_name = 'Northwind Mobile' GROUP BY 1 ORDER BY 1"""),
]

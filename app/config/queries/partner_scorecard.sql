-- @param tenant_schema STRING = __DATA_SCHEMA__
-- @param facility_id STRING = ALL
SELECT p.partner_name, p.partner_type, COUNT(*) AS repairs,
  ROUND(AVG(CASE WHEN r.qa_result = 'Bounce' THEN 1.0 ELSE 0.0 END), 4) AS bounce_rate,
  ROUND(AVG(r.turnaround_days), 1) AS avg_turnaround_days,
  ROUND(AVG(r.repair_cost + r.logistics_cost), 2) AS quoted_cost,
  ROUND(SUM(r.repair_cost + r.logistics_cost + r.rework_cost + r.value_erosion) / NULLIF(SUM(CASE WHEN r.qa_result = 'Pass' THEN 1 ELSE 0 END), 0), 2) AS true_cost,
  ROUND(AVG(CASE WHEN r.parts_type = 'Aftermarket' THEN 1.0 ELSE 0.0 END), 4) AS aftermarket_share
FROM IDENTIFIER(:tenant_schema || '.repair_orders') r
JOIN IDENTIFIER(:tenant_schema || '.repair_partners') p ON r.partner_id = p.partner_id
WHERE r.repair_status = 'Completed' AND (:facility_id = 'ALL' OR r.facility_id = :facility_id) AND r.sent_date >= DATE'2026-08-01'
GROUP BY p.partner_name, p.partner_type
ORDER BY true_cost DESC

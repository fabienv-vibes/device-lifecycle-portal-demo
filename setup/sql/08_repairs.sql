CREATE OR REPLACE TABLE {{DATA}}.repair_orders
COMMENT 'Repair orders: one row per device routed to a repair partner (next best action = Repair). Bounce = repaired device failed QA on return and had to be reworked in-house.'
AS SELECT
  CONCAT('RO-', LPAD(CAST(seq AS STRING), 7, '0')) AS repair_id,
  CONCAT('DEV-', LPAD(CAST(seq AS STRING), 7, '0')) AS device_id,
  customer_id, facility_id, partner_id, model_id, repair_type, parts_type,
  sent_date,
  IF(repair_status = 'Completed', DATE_ADD(sent_date, turnaround_days), NULL) AS returned_date,
  IF(repair_status = 'Completed', turnaround_days, NULL) AS turnaround_days,
  repair_status,
  IF(repair_status = 'Completed', qa_result, NULL) AS qa_result,
  repair_cost, logistics_cost,
  IF(repair_status = 'Completed', rework_cost, 0.0) AS rework_cost,
  IF(repair_status = 'Completed', ROUND(clean_value * 0.0012 * turnaround_days, 2), NULL) AS value_erosion
FROM {{DATA}}._gen_stage
WHERE partner_id IS NOT NULL

CREATE OR REPLACE TABLE {{DATA}}.devices
COMMENT 'Device record: one row per device processed on the platform (fictional data). Identity, diagnostics, grading, next best action, value recovered and disposition.'
AS
WITH s AS (
  SELECT *,
    CASE WHEN received_date >= DATE'2026-11-04' AND next_best_action <> 'Quarantine' THEN 'Grading'
         WHEN repair_status = 'In progress' THEN 'In repair' ELSE 'Completed' END AS processing_status
  FROM {{DATA}}._gen_stage
)
SELECT
  CONCAT('DEV-', LPAD(CAST(seq AS STRING), 7, '0')) AS device_id,
  CONCAT(tac, LPAD(CAST(seq AS STRING), 6, '0'), CAST(PMOD(XXHASH64(seq, 'chk'), 10) AS STRING)) AS imei,
  oem, model, model_family, model_id, storage_gb, color, born_on_date, device_age_months,
  CASE WHEN device_age_months > 48 THEN 2 + CAST(u_life * 2 AS INT) WHEN device_age_months > 24 THEN 1 + CAST(u_life * 2 AS INT) ELSE 1 END AS previous_owners,
  customer_id, program, facility_id, received_date,
  functional_status, primary_defect, cosmetic_grade, battery_health_pct, battery_replaced, oem_parts_only, genuine_status, blacklist_status,
  CASE WHEN functional_status = 'No power' THEN 'NOT RUN' WHEN primary_defect = 'Display' THEN 'FAIL' ELSE 'PASS' END AS test_display,
  CASE WHEN functional_status = 'No power' THEN 'NOT RUN' WHEN primary_defect = 'Display' AND u_touch < 0.5 THEN 'FAIL' ELSE 'PASS' END AS test_touch,
  CASE WHEN functional_status = 'No power' THEN 'NOT RUN' WHEN primary_defect = 'Battery' OR battery_health_pct < 70 THEN 'FAIL' ELSE 'PASS' END AS test_battery,
  CASE WHEN functional_status = 'No power' THEN 'NOT RUN' WHEN primary_defect = 'Camera' THEN 'FAIL' ELSE 'PASS' END AS test_camera,
  CASE WHEN functional_status = 'No power' THEN 'NOT RUN' WHEN primary_defect = 'Audio' THEN 'FAIL' ELSE 'PASS' END AS test_audio,
  CASE WHEN functional_status = 'No power' THEN 'NOT RUN' WHEN primary_defect = 'Charging port' THEN 'FAIL' ELSE 'PASS' END AS test_charging,
  CASE WHEN functional_status = 'No power' THEN 'NOT RUN' WHEN primary_defect = 'Biometrics' THEN 'FAIL' ELSE 'PASS' END AS test_biometrics,
  CASE WHEN functional_status = 'No power' THEN 'NOT RUN' WHEN primary_defect = 'Connectivity' THEN 'FAIL' ELSE 'PASS' END AS test_connectivity,
  next_best_action,
  IF(partner_id IS NOT NULL, CONCAT('RO-', LPAD(CAST(seq AS STRING), 7, '0')), NULL) AS repair_id,
  dock_to_stock_hours,
  cosmetic_grade_final, battery_health_final, oem_parts_final, eu_market_eligible,
  value_as_received,
  ROUND(polish_cost + COALESCE(repair_cost, 0) + COALESCE(logistics_cost, 0) + COALESCE(rework_cost, 0), 2) AS action_cost,
  IF(processing_status = 'Completed', ROUND(value_after_action * channel_factor, 2), NULL) AS value_recovered,
  IF(processing_status = 'Completed',
     ROUND(value_after_action * channel_factor - (polish_cost + COALESCE(repair_cost, 0) + COALESCE(logistics_cost, 0) + COALESCE(rework_cost, 0)) - value_as_received, 2), NULL) AS net_value_lift,
  IF(processing_status = 'Completed', disposition_channel, 'Pending') AS disposition_channel,
  processing_status,
  IF(processing_status = 'Completed',
     DATE_ADD(received_date, CAST(CEIL(dock_to_stock_hours / 24) AS INT) + IF(partner_id IS NOT NULL, 1 + turnaround_days, 0)), NULL) AS completed_date
FROM s

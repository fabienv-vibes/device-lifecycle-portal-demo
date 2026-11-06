-- @param tenant_schema STRING = __DATA_SCHEMA__
-- @param facility_id STRING = ALL
WITH d AS (SELECT * FROM IDENTIFIER(:tenant_schema || '.devices') WHERE (:facility_id = 'ALL' OR facility_id = :facility_id)),
anchor AS (SELECT MAX(received_date) AS asof FROM d),
w AS (
  SELECT d.*,
    CASE WHEN d.received_date > DATE_SUB(a.asof, 90) THEN 'cur'
         WHEN d.received_date > DATE_SUB(a.asof, 180) THEN 'prev' END AS period
  FROM d CROSS JOIN anchor a
)
SELECT
  (SELECT asof FROM anchor) AS as_of_date,
  SUM(CASE WHEN period = 'cur' THEN 1 ELSE 0 END) AS devices_cur,
  SUM(CASE WHEN period = 'prev' THEN 1 ELSE 0 END) AS devices_prev,
  ROUND(SUM(CASE WHEN period = 'cur' THEN value_recovered ELSE 0 END), 0) AS value_cur,
  ROUND(SUM(CASE WHEN period = 'prev' THEN value_recovered ELSE 0 END), 0) AS value_prev,
  ROUND(SUM(CASE WHEN period = 'cur' THEN net_value_lift ELSE 0 END), 0) AS lift_cur,
  ROUND(SUM(CASE WHEN period = 'prev' THEN net_value_lift ELSE 0 END), 0) AS lift_prev,
  ROUND(PERCENTILE(CASE WHEN period = 'cur' THEN dock_to_stock_hours END, 0.5), 1) AS dts_cur,
  ROUND(PERCENTILE(CASE WHEN period = 'prev' THEN dock_to_stock_hours END, 0.5), 1) AS dts_prev,
  ROUND(AVG(CASE WHEN period = 'cur' AND processing_status = 'Completed' THEN CASE WHEN eu_market_eligible THEN 1.0 ELSE 0.0 END END), 4) AS eu_cur,
  ROUND(AVG(CASE WHEN period = 'prev' AND processing_status = 'Completed' THEN CASE WHEN eu_market_eligible THEN 1.0 ELSE 0.0 END END), 4) AS eu_prev,
  SUM(CASE WHEN period = 'cur' AND next_best_action = 'Quarantine' THEN 1 ELSE 0 END) AS quarantined_cur,
  SUM(CASE WHEN period = 'prev' AND next_best_action = 'Quarantine' THEN 1 ELSE 0 END) AS quarantined_prev
FROM w

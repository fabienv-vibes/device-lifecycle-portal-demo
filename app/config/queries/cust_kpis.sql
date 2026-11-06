-- @param tenant_schema STRING = __DATA_SCHEMA__
WITH d AS (SELECT * FROM IDENTIFIER(:tenant_schema || '.devices')),
anchor AS (SELECT MAX(received_date) AS asof FROM d),
w AS (
  SELECT d.*,
    CASE WHEN d.received_date > DATE_SUB(a.asof, 90) THEN 'cur'
         WHEN d.received_date > DATE_SUB(a.asof, 180) THEN 'prev' END AS period,
    CASE WHEN d.disposition_channel LIKE 'Resold%' OR d.disposition_channel LIKE 'Exported%' THEN 1.0 ELSE 0.0 END AS reused
  FROM d CROSS JOIN anchor a
)
SELECT
  SUM(CASE WHEN period = 'cur' THEN 1 ELSE 0 END) AS devices_cur,
  SUM(CASE WHEN period = 'prev' THEN 1 ELSE 0 END) AS devices_prev,
  ROUND(SUM(CASE WHEN period = 'cur' THEN value_recovered ELSE 0 END), 0) AS value_cur,
  ROUND(SUM(CASE WHEN period = 'prev' THEN value_recovered ELSE 0 END), 0) AS value_prev,
  ROUND(AVG(CASE WHEN period = 'cur' AND processing_status = 'Completed' AND next_best_action <> 'Quarantine' THEN value_recovered END), 2) AS avg_value_cur,
  ROUND(AVG(CASE WHEN period = 'prev' AND processing_status = 'Completed' AND next_best_action <> 'Quarantine' THEN value_recovered END), 2) AS avg_value_prev,
  ROUND(AVG(CASE WHEN period = 'cur' AND processing_status = 'Completed' THEN DATEDIFF(completed_date, received_date) END), 1) AS days_cur,
  ROUND(AVG(CASE WHEN period = 'prev' AND processing_status = 'Completed' THEN DATEDIFF(completed_date, received_date) END), 1) AS days_prev,
  SUM(CASE WHEN period = 'cur' AND next_best_action = 'Quarantine' THEN 1 ELSE 0 END) AS risk_cur,
  SUM(CASE WHEN period = 'prev' AND next_best_action = 'Quarantine' THEN 1 ELSE 0 END) AS risk_prev,
  ROUND(SUM(CASE WHEN period = 'cur' AND next_best_action = 'Quarantine' THEN value_as_received ELSE 0 END), 0) AS risk_value_cur,
  ROUND(AVG(CASE WHEN period = 'cur' AND processing_status = 'Completed' THEN reused END), 4) AS reuse_cur,
  ROUND(AVG(CASE WHEN period = 'prev' AND processing_status = 'Completed' THEN reused END), 4) AS reuse_prev
FROM w

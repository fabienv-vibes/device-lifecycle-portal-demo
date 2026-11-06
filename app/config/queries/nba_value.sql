-- @param tenant_schema STRING = __DATA_SCHEMA__
-- @param facility_id STRING = ALL
SELECT next_best_action, COUNT(*) AS devices,
  ROUND(SUM(net_value_lift), 0) AS net_value_lift,
  ROUND(AVG(net_value_lift), 2) AS avg_lift_per_device,
  ROUND(SUM(value_recovered), 0) AS value_recovered
FROM IDENTIFIER(:tenant_schema || '.devices')
WHERE processing_status = 'Completed' AND (:facility_id = 'ALL' OR facility_id = :facility_id)
GROUP BY next_best_action
ORDER BY devices DESC

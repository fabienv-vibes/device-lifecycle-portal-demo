-- @param tenant_schema STRING = __DATA_SCHEMA__
SELECT DATE_FORMAT(DATE_TRUNC('MONTH', received_date), 'MMM yyyy') AS month,
  COUNT(*) AS devices,
  ROUND(SUM(value_recovered), 0) AS value_recovered
FROM IDENTIFIER(:tenant_schema || '.devices')
WHERE received_date >= DATE'2025-11-01' AND received_date < DATE'2026-11-01'
GROUP BY DATE_TRUNC('MONTH', received_date)
ORDER BY DATE_TRUNC('MONTH', received_date)

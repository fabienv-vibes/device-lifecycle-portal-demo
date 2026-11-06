-- @param tenant_schema STRING = __DATA_SCHEMA__
SELECT DATE_FORMAT(DATE_TRUNC('MONTH', received_date), 'MMM yyyy') AS month,
  SUM(CASE WHEN blacklist_status = 'Lost/stolen' THEN 1 ELSE 0 END) AS lost_stolen,
  SUM(CASE WHEN blacklist_status = 'Unpaid balance' THEN 1 ELSE 0 END) AS unpaid_balance,
  SUM(CASE WHEN genuine_status = 'Counterfeit' THEN 1 ELSE 0 END) AS counterfeit
FROM IDENTIFIER(:tenant_schema || '.devices')
WHERE received_date >= DATE'2025-11-01' AND received_date < DATE'2026-11-01'
GROUP BY DATE_TRUNC('MONTH', received_date)
ORDER BY DATE_TRUNC('MONTH', received_date)

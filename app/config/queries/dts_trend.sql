-- @param tenant_schema STRING = __DATA_SCHEMA__
-- @param facility_id STRING = ALL
SELECT DATE_TRUNC('WEEK', d.received_date) AS week, f.automation_level,
  ROUND(PERCENTILE(d.dock_to_stock_hours, 0.5), 1) AS median_hours
FROM IDENTIFIER(:tenant_schema || '.devices') d
JOIN IDENTIFIER(:tenant_schema || '.facilities') f ON d.facility_id = f.facility_id
WHERE d.received_date >= DATE'2026-05-01' AND d.received_date < DATE'2026-11-02' AND (:facility_id = 'ALL' OR d.facility_id = :facility_id)
GROUP BY 1, 2
ORDER BY 1, 2

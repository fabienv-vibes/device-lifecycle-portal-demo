-- @param tenant_schema STRING = __DATA_SCHEMA__
-- @param facility_id STRING = ALL
SELECT DATE_TRUNC('WEEK', d.received_date) AS week, f.facility_name AS facility, COUNT(*) AS devices
FROM IDENTIFIER(:tenant_schema || '.devices') d
JOIN IDENTIFIER(:tenant_schema || '.facilities') f ON d.facility_id = f.facility_id
WHERE d.received_date >= DATE'2025-11-03' AND d.received_date < DATE'2026-11-02' AND (:facility_id = 'ALL' OR d.facility_id = :facility_id)
GROUP BY 1, 2
ORDER BY 1, 2

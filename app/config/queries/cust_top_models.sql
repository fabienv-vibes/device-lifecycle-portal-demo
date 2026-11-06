-- @param tenant_schema STRING = __DATA_SCHEMA__
SELECT CONCAT(oem, ' ', model) AS device, COUNT(*) AS devices, ROUND(SUM(value_recovered), 0) AS value_recovered
FROM IDENTIFIER(:tenant_schema || '.devices')
WHERE processing_status = 'Completed'
GROUP BY oem, model
ORDER BY value_recovered DESC
LIMIT 8

-- @param tenant_schema STRING = __DATA_SCHEMA__
SELECT
  CASE WHEN disposition_channel = 'Resold - US' THEN 'Resold in the US'
       WHEN disposition_channel IN ('Resold - EU', 'Exported - EU') THEN 'Resold in the EU'
       WHEN disposition_channel LIKE 'Exported%' THEN 'Exported for reuse'
       WHEN disposition_channel = 'Parts harvested' THEN 'Parts harvested'
       WHEN disposition_channel = 'Recycled' THEN 'Recycled'
       ELSE 'Quarantined' END AS outcome,
  COUNT(*) AS devices
FROM IDENTIFIER(:tenant_schema || '.devices')
WHERE processing_status = 'Completed'
GROUP BY 1
ORDER BY devices DESC

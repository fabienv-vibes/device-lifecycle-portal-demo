-- @param tenant_schema STRING = __DATA_SCHEMA__
WITH d AS (SELECT * FROM IDENTIFIER(:tenant_schema || '.devices')),
anchor AS (SELECT MAX(received_date) AS asof FROM d)
SELECT
  SUM(CASE WHEN d.processing_status = 'Grading' THEN 1 ELSE 0 END) AS grading,
  SUM(CASE WHEN d.processing_status = 'In repair' THEN 1 ELSE 0 END) AS in_repair,
  SUM(CASE WHEN d.processing_status = 'Completed' AND d.completed_date > DATE_SUB(a.asof, 7) THEN 1 ELSE 0 END) AS completed_7d,
  SUM(CASE WHEN d.received_date > DATE_SUB(a.asof, 7) THEN 1 ELSE 0 END) AS received_7d
FROM d CROSS JOIN anchor a

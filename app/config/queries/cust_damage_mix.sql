-- @param tenant_schema STRING = __DATA_SCHEMA__
SELECT
  CASE WHEN functional_status = 'No power' THEN 'No power'
       WHEN primary_defect IS NOT NULL THEN primary_defect
       WHEN cosmetic_grade IN ('C', 'D') THEN 'Cosmetic damage only'
       ELSE 'No issues found' END AS finding,
  COUNT(*) AS devices
FROM IDENTIFIER(:tenant_schema || '.devices')
WHERE received_date >= DATE'2025-11-01'
GROUP BY 1
ORDER BY devices DESC

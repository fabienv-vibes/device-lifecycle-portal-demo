-- @param tenant_schema STRING = __DATA_SCHEMA__
SELECT f.facility_id, f.facility_name, f.automation_level, f.has_buff_polish_cell
FROM IDENTIFIER(:tenant_schema || '.facilities') f
WHERE f.facility_id IN (SELECT DISTINCT facility_id FROM IDENTIFIER(:tenant_schema || '.devices'))
ORDER BY f.facility_name

-- @param tenant_schema STRING = __DATA_SCHEMA__
-- @param facility_id STRING = ALL
SELECT g.grade,
  SUM(CASE WHEN d.cosmetic_grade = g.grade THEN 1 ELSE 0 END) AS on_arrival,
  SUM(CASE WHEN d.cosmetic_grade_final = g.grade THEN 1 ELSE 0 END) AS after_action
FROM IDENTIFIER(:tenant_schema || '.devices') d
CROSS JOIN (SELECT EXPLODE(ARRAY('A', 'B', 'C', 'D')) AS grade) g
WHERE d.processing_status = 'Completed' AND (:facility_id = 'ALL' OR d.facility_id = :facility_id) AND d.next_best_action NOT IN ('Recycle', 'Harvest parts', 'Quarantine')
GROUP BY g.grade
ORDER BY g.grade

-- @param tenant_schema STRING = __DATA_SCHEMA__
WITH d AS (SELECT * FROM IDENTIFIER(:tenant_schema || '.devices') WHERE processing_status = 'Completed'),
r AS (SELECT * FROM IDENTIFIER(:tenant_schema || '.repair_orders')),
cand AS (
  SELECT d.imei, d.oem, d.model, d.device_id,
    CASE WHEN d.genuine_status = 'Counterfeit' THEN 'Counterfeit'
         WHEN d.blacklist_status = 'Lost/stolen' THEN 'Reported stolen'
         WHEN r.qa_result = 'Bounce' AND r.partner_id = 'RP-05' AND r.parts_type = 'Aftermarket' AND r.sent_date >= DATE'2026-08-15' THEN 'Repair bounced'
         WHEN d.next_best_action = 'Buff & polish' AND d.cosmetic_grade_final = 'A' AND d.value_as_received > 450 THEN 'Buff & polish win'
    END AS story
  FROM d LEFT JOIN r ON d.repair_id = r.repair_id
)
SELECT story, imei, oem, model
FROM (SELECT cand.*, ROW_NUMBER() OVER (PARTITION BY story ORDER BY device_id DESC) AS rn FROM cand WHERE story IS NOT NULL)
WHERE rn = 1
ORDER BY CASE story WHEN 'Buff & polish win' THEN 1 WHEN 'Repair bounced' THEN 2 WHEN 'Reported stolen' THEN 3 ELSE 4 END

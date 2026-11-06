-- @param tenant_schema STRING = __DATA_SCHEMA__
-- @param imei STRING = 000000000000000
SELECT d.device_id, d.imei, d.oem, d.model, d.storage_gb, d.color, d.born_on_date, d.device_age_months, d.previous_owners,
  d.program, f.facility_name, f.automation_level, d.received_date, d.functional_status, d.primary_defect,
  d.cosmetic_grade, d.cosmetic_grade_final, d.battery_health_pct, d.battery_health_final, d.battery_replaced,
  d.oem_parts_only, d.oem_parts_final, d.genuine_status, d.blacklist_status, d.eu_market_eligible,
  d.test_display, d.test_touch, d.test_battery, d.test_camera, d.test_audio, d.test_charging, d.test_biometrics, d.test_connectivity,
  d.next_best_action, d.dock_to_stock_hours, d.value_as_received, d.action_cost, d.value_recovered, d.net_value_lift,
  d.disposition_channel, d.processing_status, LEAST(d.completed_date, DATE'2026-11-05') AS completed_date,
  r.repair_type, r.parts_type, r.qa_result, r.turnaround_days, p.partner_name
FROM IDENTIFIER(:tenant_schema || '.devices') d
JOIN IDENTIFIER(:tenant_schema || '.facilities') f ON d.facility_id = f.facility_id
LEFT JOIN IDENTIFIER(:tenant_schema || '.repair_orders') r ON d.repair_id = r.repair_id
LEFT JOIN IDENTIFIER(:tenant_schema || '.repair_partners') p ON r.partner_id = p.partner_id
WHERE d.imei = :imei
LIMIT 1

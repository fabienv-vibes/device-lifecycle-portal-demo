CREATE OR REPLACE TABLE {{DATA}}.device_models
COMMENT 'Device model catalog. grade_a_value = current US resale benchmark (USD) for a fully functional, cosmetic grade A, 128GB unit.'
AS SELECT model_id, oem, model, model_family, release_date, grade_a_value, tac AS type_allocation_code FROM {{DATA}}._gen_models

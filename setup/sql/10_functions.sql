CREATE OR REPLACE FUNCTION {{DATA}}.verify_device(imei_to_check STRING)
RETURNS TABLE (imei STRING, verdict STRING, genuine BOOLEAN, approved BOOLEAN)
COMMENT 'Homologation check: returns only the approved answer for an IMEI. Never exposes device record attributes such as owner, condition or value.'
RETURN SELECT imei_to_check AS imei,
  CASE WHEN d.imei IS NULL THEN 'UNKNOWN' WHEN d.genuine_status = 'Counterfeit' THEN 'NOT GENUINE'
       WHEN d.blacklist_status <> 'Clean' THEN 'GENUINE - NOT APPROVED' ELSE 'GENUINE - APPROVED' END AS verdict,
  CASE WHEN d.imei IS NULL THEN NULL ELSE d.genuine_status = 'Genuine' END AS genuine,
  CASE WHEN d.imei IS NULL THEN NULL ELSE (d.genuine_status = 'Genuine' AND d.blacklist_status = 'Clean') END AS approved
FROM (SELECT 1 AS one) x LEFT JOIN {{DATA}}.devices d ON d.imei = imei_to_check;
CREATE OR REPLACE FUNCTION {{DATA}}.verify_devices(imeis STRING)
RETURNS TABLE (imei STRING, verdict STRING, genuine BOOLEAN, approved BOOLEAN)
COMMENT 'Batch homologation check: takes a comma-separated list of IMEIs and returns only the approved answer for each. Never exposes device record attributes.'
RETURN SELECT i.imei,
  CASE WHEN d.imei IS NULL THEN 'UNKNOWN' WHEN d.genuine_status = 'Counterfeit' THEN 'NOT GENUINE'
       WHEN d.blacklist_status <> 'Clean' THEN 'GENUINE - NOT APPROVED' ELSE 'GENUINE - APPROVED' END AS verdict,
  CASE WHEN d.imei IS NULL THEN NULL ELSE d.genuine_status = 'Genuine' END AS genuine,
  CASE WHEN d.imei IS NULL THEN NULL ELSE (d.genuine_status = 'Genuine' AND d.blacklist_status = 'Clean') END AS approved
FROM (SELECT DISTINCT TRIM(x) AS imei FROM (SELECT EXPLODE(SPLIT(imeis, ',')) AS x) WHERE TRIM(x) <> '') i
LEFT JOIN {{DATA}}.devices d ON d.imei = i.imei;

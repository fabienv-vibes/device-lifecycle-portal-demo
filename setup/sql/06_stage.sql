CREATE OR REPLACE TABLE {{DATA}}._gen_stage AS
WITH days AS (
  SELECT d,
    (CASE WHEN d BETWEEN DATE'2026-09-12' AND DATE'2026-10-31' THEN 2.15
          WHEN d BETWEEN DATE'2025-12-26' AND DATE'2026-01-31' THEN 1.45
          ELSE 1.0 END)
    * (CASE WHEN DAYOFWEEK(d) IN (1,7) THEN 0.3 ELSE 1.0 END)
    * (1.0 + 0.30 * DATEDIFF(d, DATE'2025-11-03') / 368.0)
    * (0.88 + 0.24 * PMOD(XXHASH64(d), 1000) / 1000.0) AS mult
  FROM (SELECT EXPLODE(SEQUENCE(DATE'2025-11-03', DATE'2026-11-05', INTERVAL 1 DAY)) AS d)
),
base AS (
  SELECT d AS received_date, ROW_NUMBER() OVER (ORDER BY d, n) AS seq
  FROM days LATERAL VIEW EXPLODE(SEQUENCE(1, CAST(ROUND(640 * mult) AS INT))) t AS n
),
r AS (
  SELECT received_date, seq,
    PMOD(XXHASH64(seq,'cust'),1000000)/1e6 AS u_cust,
    PMOD(XXHASH64(seq,'prog'),1000000)/1e6 AS u_prog,
    PMOD(XXHASH64(seq,'fac'),1000000)/1e6 AS u_fac,
    PMOD(XXHASH64(seq,'model'),1000000)/1e6 AS u_model,
    PMOD(XXHASH64(seq,'stor'),1000000)/1e6 AS u_stor,
    PMOD(XXHASH64(seq,'age'),1000000)/1e6 AS u_age,
    PMOD(XXHASH64(seq,'cos'),1000000)/1e6 AS u_cos,
    PMOD(XXHASH64(seq,'fun'),1000000)/1e6 AS u_fun,
    PMOD(XXHASH64(seq,'def'),1000000)/1e6 AS u_def,
    PMOD(XXHASH64(seq,'touch'),1000000)/1e6 AS u_touch,
    (PMOD(XXHASH64(seq,'b1'),1000000)+1)/1000001.0 AS u_b1,
    PMOD(XXHASH64(seq,'b2'),1000000)/1e6 AS u_b2,
    PMOD(XXHASH64(seq,'gen'),1000000)/1e6 AS u_gen,
    PMOD(XXHASH64(seq,'bl'),1000000)/1e6 AS u_bl,
    PMOD(XXHASH64(seq,'parts'),1000000)/1e6 AS u_parts,
    PMOD(XXHASH64(seq,'batrep'),1000000)/1e6 AS u_batrep,
    PMOD(XXHASH64(seq,'val'),1000000)/1e6 AS u_val,
    PMOD(XXHASH64(seq,'polish'),1000000)/1e6 AS u_polish,
    PMOD(XXHASH64(seq,'pcost'),1000000)/1e6 AS u_pcost,
    (PMOD(XXHASH64(seq,'h1'),1000000)+1)/1000001.0 AS u_h1,
    PMOD(XXHASH64(seq,'h2'),1000000)/1e6 AS u_h2,
    PMOD(XXHASH64(seq,'chan'),1000000)/1e6 AS u_chan,
    PMOD(XXHASH64(seq,'color'),1000000)/1e6 AS u_color,
    PMOD(XXHASH64(seq,'life'),1000000)/1e6 AS u_life,
    PMOD(XXHASH64(seq,'rp'),1000000)/1e6 AS u_rp,
    PMOD(XXHASH64(seq,'tat'),1000000)/1e6 AS u_tat,
    PMOD(XXHASH64(seq,'pt'),1000000)/1e6 AS u_pt,
    PMOD(XXHASH64(seq,'qa'),1000000)/1e6 AS u_qa,
    PMOD(XXHASH64(seq,'rc'),1000000)/1e6 AS u_rc,
    PMOD(XXHASH64(seq,'sent'),1000000)/1e6 AS u_sent,
    PMOD(XXHASH64(seq,'bh'),1000000)/1e6 AS u_bh
  FROM base
),
c AS (
  SELECT r.*,
    CASE WHEN u_cust < 0.36 THEN 'CUST-01' WHEN u_cust < 0.58 THEN 'CUST-02' WHEN u_cust < 0.73 THEN 'CUST-03'
         WHEN u_cust < 0.82 THEN 'CUST-04' WHEN u_cust < 0.94 THEN 'CUST-05' ELSE 'CUST-06' END AS customer_id
  FROM r
),
p AS (
  SELECT c.*,
    CASE customer_id WHEN 'CUST-01' THEN IF(u_prog < 0.88, 'Trade-in', 'Lease return')
      WHEN 'CUST-02' THEN IF(u_prog < 0.80, 'Trade-in', 'Lease return')
      WHEN 'CUST-03' THEN 'Insurance claim' WHEN 'CUST-04' THEN 'Warranty return'
      WHEN 'CUST-05' THEN 'Buyback' ELSE 'Lease return' END AS program,
    CASE WHEN customer_id = 'CUST-05' AND u_fac < 0.72 THEN 'FAC-RTM'
         WHEN customer_id = 'CUST-05' THEN 'FAC-DAL'
         WHEN u_fac < 0.36 THEN 'FAC-DAL' WHEN u_fac < 0.60 THEN 'FAC-LOU' WHEN u_fac < 0.82 THEN 'FAC-MEM' ELSE 'FAC-REN' END AS facility_id
  FROM c
),
m AS (
  SELECT p.*, g.model_id, g.oem, g.model, g.model_family, g.release_date, g.grade_a_value, g.tac,
    DATE_ADD(g.release_date, CAST(u_age * 240 AS INT)) AS born_on_date,
    CASE WHEN u_stor < 0.05 THEN 64 WHEN u_stor < 0.50 THEN 128 WHEN u_stor < 0.85 THEN 256 ELSE 512 END AS storage_gb,
    CASE WHEN u_color < 0.34 THEN 'Black' WHEN u_color < 0.56 THEN 'Silver' WHEN u_color < 0.72 THEN 'Blue'
         WHEN u_color < 0.86 THEN 'Titanium Gray' WHEN u_color < 0.93 THEN 'Green' ELSE 'Purple' END AS color
  FROM p JOIN {{DATA}}._gen_models g ON p.u_model >= g.lo AND p.u_model < g.hi
),
a AS (
  SELECT m.*,
    CAST(FLOOR(MONTHS_BETWEEN(received_date, born_on_date)) AS INT) AS device_age_months,
    u_cos + 0.003 * MONTHS_BETWEEN(received_date, born_on_date) AS cos_score,
    u_fun + 0.002 * MONTHS_BETWEEN(received_date, born_on_date) AS fun_score,
    SQRT(-2 * LN(u_b1)) * COS(2 * PI() * u_b2) AS z_bat,
    SQRT(-2 * LN(u_h1)) * COS(2 * PI() * u_h2) AS z_dts
  FROM m
),
g1 AS (
  SELECT a.*,
    CASE WHEN program IN ('Trade-in','Lease return','Buyback') THEN
           CASE WHEN cos_score < 0.30 THEN 'A' WHEN cos_score < 0.72 THEN 'B' WHEN cos_score < 0.92 THEN 'C' ELSE 'D' END
         WHEN program = 'Insurance claim' THEN
           CASE WHEN cos_score < 0.06 THEN 'A' WHEN cos_score < 0.26 THEN 'B' WHEN cos_score < 0.60 THEN 'C' ELSE 'D' END
         ELSE CASE WHEN cos_score < 0.55 THEN 'A' WHEN cos_score < 0.86 THEN 'B' WHEN cos_score < 0.97 THEN 'C' ELSE 'D' END
    END AS cosmetic_grade,
    CASE WHEN program IN ('Trade-in','Lease return','Buyback') THEN
           CASE WHEN fun_score < 0.80 THEN 'Fully functional' WHEN fun_score < 0.92 THEN 'Minor defect' WHEN fun_score < 0.985 THEN 'Major defect' ELSE 'No power' END
         WHEN program = 'Insurance claim' THEN
           CASE WHEN fun_score < 0.30 THEN 'Fully functional' WHEN fun_score < 0.58 THEN 'Minor defect' WHEN fun_score < 0.92 THEN 'Major defect' ELSE 'No power' END
         ELSE CASE WHEN fun_score < 0.12 THEN 'Fully functional' WHEN fun_score < 0.58 THEN 'Minor defect' WHEN fun_score < 0.94 THEN 'Major defect' ELSE 'No power' END
    END AS functional_status,
    CASE WHEN u_gen < 0.0035 THEN 'Counterfeit' ELSE 'Genuine' END AS genuine_status,
    CASE WHEN u_bl < 0.008 THEN 'Lost/stolen' WHEN u_bl < 0.019 THEN 'Unpaid balance' ELSE 'Clean' END AS blacklist_status,
    NOT (u_parts > 0.93 - 0.0015 * MONTHS_BETWEEN(received_date, born_on_date)) AS oem_parts_only,
    (MONTHS_BETWEEN(received_date, born_on_date) > 36 AND u_batrep < 0.10) AS battery_replaced
  FROM a
),
g2 AS (
  SELECT g1.*,
    CASE WHEN functional_status IN ('Fully functional','No power') THEN NULL
         WHEN program = 'Insurance claim' AND u_def < 0.60 THEN 'Display'
         WHEN u_def < 0.30 THEN 'Display' WHEN u_def < 0.58 THEN 'Battery' WHEN u_def < 0.70 THEN 'Charging port'
         WHEN u_def < 0.80 THEN 'Camera' WHEN u_def < 0.89 THEN 'Audio' WHEN u_def < 0.96 THEN 'Biometrics' ELSE 'Connectivity' END AS primary_defect
  FROM g1
),
g3 AS (
  SELECT g2.*,
    CAST(GREATEST(52, LEAST(100, ROUND(
      IF(battery_replaced, 97 - 0.06 * MONTHS_BETWEEN(received_date, born_on_date), 100 - 0.38 * MONTHS_BETWEEN(received_date, born_on_date))
      - IF(model_id IN ('SAM-S22','SAM-S22U'), 9, 0)
      - ABS(z_bat) * 3.5
      - IF(primary_defect = 'Battery', 16, 0)))) AS INT) AS battery_health_pct,
    grade_a_value * (CASE WHEN storage_gb = 64 THEN 0.92 WHEN storage_gb = 128 THEN 1.0 WHEN storage_gb = 256 THEN 1.08 ELSE 1.18 END)
      * (1 + 0.015 * MONTHS_BETWEEN(DATE'2026-11-05', received_date))
      * (0.93 + 0.14 * u_val) AS clean_value,
    f.has_buff_polish_cell AS has_polish
  FROM g2 JOIN {{DATA}}.facilities f ON f.facility_id = g2.facility_id
),
v AS (
  SELECT g3.*,
    ROUND(clean_value
      * (CASE cosmetic_grade WHEN 'A' THEN 1.0 WHEN 'B' THEN 0.80 WHEN 'C' THEN 0.60 ELSE 0.40 END)
      * (CASE functional_status WHEN 'Fully functional' THEN 1.0 WHEN 'Minor defect' THEN 0.68 WHEN 'Major defect' THEN 0.42 ELSE 0.12 END), 2) AS value_as_received,
    CASE
      WHEN genuine_status = 'Counterfeit' OR blacklist_status <> 'Clean' THEN 'Quarantine'
      WHEN functional_status = 'No power' THEN IF(grade_a_value >= 300, 'Harvest parts', 'Recycle')
      WHEN functional_status = 'Major defect' AND grade_a_value < 150 THEN 'Recycle'
      WHEN functional_status = 'Minor defect' AND grade_a_value < 150 THEN 'Resell as-is'
      WHEN functional_status IN ('Minor defect','Major defect') THEN 'Repair'
      WHEN cosmetic_grade = 'D' AND grade_a_value < 120 THEN 'Recycle'
      WHEN cosmetic_grade = 'D' AND grade_a_value >= 400 THEN 'Repair'
      WHEN cosmetic_grade = 'C' AND grade_a_value >= 560 THEN 'Repair'
      WHEN cosmetic_grade = 'B' AND grade_a_value >= 200 AND has_polish THEN 'Buff & polish'
      ELSE 'Resell as-is' END AS next_best_action
  FROM g3
),
rp AS (
  SELECT v.*,
    CASE WHEN next_best_action <> 'Repair' THEN NULL
         WHEN primary_defect IS NULL THEN IF(u_def < 0.6, 'Display', 'Back glass')
         WHEN primary_defect = 'Connectivity' THEN 'Board-level'
         ELSE primary_defect END AS repair_type,
    DATE_ADD(received_date, 1 + CAST(u_sent * 2 AS INT)) AS sent_date
  FROM v
),
rp2 AS (
  SELECT rp.*,
    CASE WHEN repair_type IS NULL THEN NULL
         WHEN repair_type = 'Battery' THEN CASE WHEN u_rp < 0.55 THEN 'RP-03' WHEN u_rp < 0.90 THEN 'RP-01' ELSE 'RP-04' END
         WHEN repair_type = 'Display' THEN CASE WHEN u_rp < 0.30 THEN 'RP-01' WHEN u_rp < 0.48 THEN 'RP-02' WHEN u_rp < 0.78 THEN 'RP-05' WHEN u_rp < 0.93 THEN 'RP-06' ELSE 'RP-04' END
         WHEN repair_type = 'Back glass' THEN CASE WHEN u_rp < 0.35 THEN 'RP-05' WHEN u_rp < 0.70 THEN 'RP-06' ELSE 'RP-01' END
         ELSE CASE WHEN u_rp < 0.45 THEN 'RP-01' WHEN u_rp < 0.70 THEN 'RP-04' ELSE 'RP-06' END END AS partner_id,
    (sent_date BETWEEN DATE'2026-09-12' AND DATE'2026-10-31') AS in_surge
  FROM rp
),
rp3 AS (
  SELECT rp2.*,
    CASE partner_id
      WHEN 'RP-01' THEN 2 + CAST(u_tat * 3 AS INT) + IF(in_surge, 2, 0)
      WHEN 'RP-02' THEN 4 + CAST(u_tat * 4 AS INT) + IF(in_surge, 1, 0)
      WHEN 'RP-03' THEN 4 + CAST(u_tat * 3 AS INT) + IF(in_surge, 1, 0)
      WHEN 'RP-04' THEN 6 + CAST(u_tat * 4 AS INT) + IF(in_surge, 2, 0)
      WHEN 'RP-05' THEN 13 + CAST(u_tat * 8 AS INT) + IF(in_surge, 4, 0)
      WHEN 'RP-06' THEN 12 + CAST(u_tat * 7 AS INT) + IF(in_surge, 4, 0) END AS tat_base,
    CASE WHEN partner_id IS NULL THEN NULL
      WHEN u_pt < CASE partner_id WHEN 'RP-01' THEN 0.96 WHEN 'RP-02' THEN 0.72 WHEN 'RP-03' THEN 0.85 WHEN 'RP-04' THEN 0.70
                   WHEN 'RP-05' THEN IF(sent_date >= DATE'2026-08-01', 0.18, 0.62) ELSE 0.50 END THEN 'OEM' ELSE 'Aftermarket' END AS parts_type
  FROM rp2
),
rp4 AS (
  SELECT rp3.*,
    CASE WHEN partner_id IS NULL THEN NULL
      WHEN u_qa < (CASE
          WHEN partner_id = 'RP-05' AND sent_date >= DATE'2026-08-01' AND repair_type = 'Display' THEN 0.22
          WHEN partner_id = 'RP-05' AND sent_date >= DATE'2026-08-01' THEN 0.07
          WHEN partner_id = 'RP-01' THEN 0.022 WHEN partner_id = 'RP-02' THEN 0.038 WHEN partner_id = 'RP-03' THEN 0.030
          WHEN partner_id = 'RP-04' THEN 0.045 WHEN partner_id = 'RP-05' THEN 0.042 ELSE 0.065 END
          + IF(parts_type = 'Aftermarket', 0.03, 0)) THEN 'Bounce' ELSE 'Pass' END AS qa_result,
    (CASE repair_type WHEN 'Display' THEN 52 WHEN 'Battery' THEN 28 WHEN 'Back glass' THEN 34 WHEN 'Charging port' THEN 22
       WHEN 'Camera' THEN 38 WHEN 'Audio' THEN 20 WHEN 'Biometrics' THEN 45 WHEN 'Board-level' THEN 65 END) AS type_base_cost
  FROM rp3
),
rp5 AS (
  SELECT rp4.*,
    tat_base + IF(qa_result = 'Bounce', 3, 0) AS turnaround_days,
    ROUND(type_base_cost * (CASE partner_id WHEN 'RP-01' THEN 1.0 WHEN 'RP-02' THEN 1.1 WHEN 'RP-03' THEN 0.95 WHEN 'RP-04' THEN 0.78 WHEN 'RP-05' THEN 0.52 ELSE 0.60 END) * (0.92 + 0.16 * u_rc), 2) AS repair_cost,
    CAST(CASE partner_id WHEN 'RP-01' THEN 0 WHEN 'RP-02' THEN 7.5 WHEN 'RP-03' THEN 7.5 WHEN 'RP-04' THEN 10.5 WHEN 'RP-05' THEN 16 WHEN 'RP-06' THEN 15 END AS DOUBLE) AS logistics_cost,
    IF(qa_result = 'Bounce', ROUND(type_base_cost + 2.5, 2), 0.0) AS rework_cost
  FROM rp4
),
fin AS (
  SELECT rp5.*,
    CASE WHEN partner_id IS NOT NULL AND DATE_ADD(sent_date, turnaround_days) > DATE'2026-11-05' THEN 'In progress'
         WHEN partner_id IS NOT NULL THEN 'Completed' END AS repair_status,
    CASE WHEN next_best_action = 'Buff & polish' AND u_polish < 0.84 THEN 'A'
         WHEN next_best_action = 'Repair' AND repair_type IN ('Display','Back glass') AND cosmetic_grade IN ('C','D') THEN 'B'
         ELSE cosmetic_grade END AS cosmetic_grade_final,
    CASE WHEN repair_type = 'Battery' THEN 96 + CAST(u_bh * 5 AS INT) ELSE battery_health_pct END AS battery_health_final,
    (oem_parts_only AND (parts_type IS NULL OR parts_type = 'OEM')) AS oem_parts_final,
    CASE WHEN next_best_action = 'Buff & polish' THEN ROUND(9.5 + 3 * u_pcost, 2) ELSE 0.0 END AS polish_cost
  FROM rp5
),
fin2 AS (
  SELECT fin.*,
    CASE
      WHEN next_best_action = 'Quarantine' THEN 0.0
      WHEN next_best_action = 'Recycle' THEN ROUND(4 + 8 * u_val, 2)
      WHEN next_best_action = 'Harvest parts' THEN ROUND(value_as_received * (1.05 + 0.25 * u_val), 2)
      WHEN next_best_action = 'Buff & polish' THEN IF(cosmetic_grade_final = 'A', ROUND(value_as_received / 0.80, 2), value_as_received)
      WHEN next_best_action = 'Repair' THEN ROUND(clean_value
          * (CASE cosmetic_grade_final WHEN 'A' THEN 1.0 WHEN 'B' THEN 0.80 WHEN 'C' THEN 0.60 ELSE 0.40 END)
          * 0.97 * IF(parts_type = 'Aftermarket', 0.88, 1.0)
          * (1 - 0.0012 * turnaround_days), 2)
      ELSE value_as_received END AS value_after_action,
    (battery_health_final >= 80 AND oem_parts_final AND cosmetic_grade_final IN ('A','B') AND genuine_status = 'Genuine' AND blacklist_status = 'Clean'
       AND next_best_action NOT IN ('Recycle','Harvest parts','Quarantine')) AS eu_market_eligible
  FROM fin
),
ch AS (
  SELECT fin2.*,
    CASE
      WHEN next_best_action = 'Quarantine' THEN 'Quarantined'
      WHEN next_best_action = 'Recycle' THEN 'Recycled'
      WHEN next_best_action = 'Harvest parts' THEN 'Parts harvested'
      WHEN facility_id = 'FAC-RTM' THEN IF(eu_market_eligible, 'Resold - EU', IF(u_chan < 0.6, 'Exported - Africa', 'Exported - APAC'))
      WHEN cosmetic_grade_final IN ('C','D') THEN CASE WHEN u_chan < 0.35 THEN 'Exported - LATAM' WHEN u_chan < 0.75 THEN 'Exported - Africa' ELSE 'Exported - APAC' END
      WHEN eu_market_eligible THEN CASE WHEN u_chan < 0.55 THEN 'Resold - US' WHEN u_chan < 0.80 THEN 'Exported - EU' ELSE 'Exported - LATAM' END
      ELSE CASE WHEN u_chan < 0.45 THEN 'Resold - US' WHEN u_chan < 0.75 THEN 'Exported - LATAM' WHEN u_chan < 0.90 THEN 'Exported - Africa' ELSE 'Exported - APAC' END
    END AS disposition_channel,
    ROUND(EXP(LN(
      (CASE facility_id WHEN 'FAC-DAL' THEN 16 WHEN 'FAC-RTM' THEN 18 WHEN 'FAC-LOU' THEN 26 WHEN 'FAC-REN' THEN 28 ELSE 44 END)
      * IF(received_date BETWEEN DATE'2026-09-12' AND DATE'2026-10-31',
           CASE facility_id WHEN 'FAC-DAL' THEN 1.15 WHEN 'FAC-RTM' THEN 1.10 WHEN 'FAC-LOU' THEN 1.5 WHEN 'FAC-REN' THEN 1.5 ELSE 2.6 END, 1.0))
      + 0.35 * z_dts), 1) AS dock_to_stock_hours
  FROM fin2
)
SELECT ch.*,
  CASE WHEN disposition_channel IN ('Resold - EU','Exported - EU') THEN 1.06 WHEN disposition_channel = 'Resold - US' THEN 1.0
       WHEN disposition_channel = 'Exported - LATAM' THEN 0.93 WHEN disposition_channel = 'Exported - Africa' THEN 0.86
       WHEN disposition_channel = 'Exported - APAC' THEN 0.90 ELSE 1.0 END AS channel_factor
FROM ch

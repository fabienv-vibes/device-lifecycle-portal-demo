CREATE OR REPLACE TABLE {{DATA}}.repair_partners
COMMENT 'Repair partners that devices are routed to when next best action = Repair. In-house = platform-managed repair hub.'
AS SELECT * FROM VALUES
 ('RP-01','In-house Repair Hub','In-house','Dallas, TX','United States'),
 ('RP-02','ClearPane Repair','Domestic','Columbus, OH','United States'),
 ('RP-03','Amperline Battery Co','Domestic','Phoenix, AZ','United States'),
 ('RP-04','Norteño Repair Works','Nearshore','Monterrey','Mexico'),
 ('RP-05','Mekong Refurb Co','Overseas','Ho Chi Minh City','Vietnam'),
 ('RP-06','Pearl River Repair','Overseas','Shenzhen','China')
AS t(partner_id, partner_name, partner_type, city, country)

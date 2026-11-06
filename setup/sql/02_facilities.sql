CREATE OR REPLACE TABLE {{DATA}}.facilities
COMMENT 'Processing facilities running the platform. Operated by third-party logistics (3PL) partners; the platform provides the automation, diagnostics and software.'
AS SELECT * FROM VALUES
 ('FAC-DAL','Dallas Processing Center','Dallas, TX','United States','Corvex Logistics','Full Automation Line',true),
 ('FAC-LOU','Louisville Processing Center','Louisville, KY','United States','Corvex Logistics','Robotic cells (RSA)',true),
 ('FAC-MEM','Memphis Processing Center','Memphis, TN','United States','Tidewater Returns','Manual stations',false),
 ('FAC-REN','Reno Processing Center','Reno, NV','United States','Tidewater Returns','Robotic cells (RSA)',true),
 ('FAC-RTM','Rotterdam Processing Center','Rotterdam','Netherlands','Northsea 3PL','Full Automation Line',true)
AS t(facility_id, facility_name, city, country, operator, automation_level, has_buff_polish_cell)

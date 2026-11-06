CREATE OR REPLACE TABLE {{DATA}}.customers
COMMENT 'Platform customers (fictional). Each customer runs one or more device recovery programs processed on the platform.'
AS SELECT * FROM VALUES
 ('CUST-01','Northwind Mobile','Carrier','Trade-in','United States'),
 ('CUST-02','Atlas Wireless','Carrier','Trade-in','United States'),
 ('CUST-03','Bastion Protect','Insurer','Insurance claim','United States'),
 ('CUST-04','Meridian Devices','OEM','Warranty return','United States'),
 ('CUST-05','Circuit Market','Marketplace','Buyback','United States and EU'),
 ('CUST-06','Harbor Leasing','Device finance','Lease return','United States')
AS t(customer_id, customer_name, customer_type, primary_program, region)

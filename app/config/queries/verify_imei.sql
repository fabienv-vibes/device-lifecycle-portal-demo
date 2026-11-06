-- @param imei STRING = 000000000000000
SELECT imei, verdict, genuine, approved FROM __DATA_SCHEMA__.verify_device(:imei)

-- @param imeis STRING = 359999990000001
SELECT imei, verdict, genuine, approved FROM __DATA_SCHEMA__.verify_devices(:imeis)

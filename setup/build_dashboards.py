"""Create the three AI/BI dashboards (operations + two customer portals) with the platform dark theme."""
import json, subprocess
def ql(sql): return [l + '\n' for l in sql.strip().split('\n')]
USD = {'type':'number-currency','currencyCode':'USD','abbreviation':'compact','decimalPlaces':{'type':'max','places':1}}
USD0 = {'type':'number-currency','currencyCode':'USD','decimalPlaces':{'type':'max','places':0}}
CNT = {'type':'number','abbreviation':'compact','decimalPlaces':{'type':'max','places':1}}
PCT = {'type':'number-percent','decimalPlaces':{'type':'max','places':0}}

T = {
 'ops': {'title':'Contoso Operations: Device Recovery Overview','accent':'#04B2FC','kind':'internal',
   'narrative':"**All customers, sites and repair partners on the Contoso platform.** Volume nearly doubled in the Sep-Oct flagship-launch surge. Automated lines kept dock-to-stock flat while manual stations fell behind, and next-best-action decisions turned grading into recovered value. Fictional demo data."},
 'northwind': {'title':'Northwind Mobile: Device Returns Overview','accent':'#E0218A','kind':'customer',
   'intake':'Trade-ins received','value':'Trade-in value recovered','avg':'Avg recovery per device','fraud':'Trade-in fraud and risk caught before credit',
   'narrative':"**Your trade-in and lease-return program, processed by Contoso.** Value recovered, where your devices went, and the fraud stopped before credit was issued. Projection uses AI_FORECAST (Preview). Fictional demo data."},
 'bastion': {'title':'Bastion Protect: Claims Device Overview','accent':'#14B8A6','kind':'customer',
   'intake':'Claim devices received','value':'Salvage value recovered','avg':'Avg salvage per claim','fraud':'Claim fraud and risk caught before payout',
   'narrative':"**Your insurance-claim devices, processed by Contoso.** Salvage value recovered, how claim devices arrive, and the fraud stopped before payout. Projection uses AI_FORECAST (Preview). Fictional demo data."},
}

DS_MONTHLY = """
SELECT DATE_TRUNC('MONTH', d.received_date) AS period,
  COUNT(*) AS devices,
  SUM(d.value_recovered) AS value_recovered,
  SUM(d.net_value_lift) AS net_lift,
  PERCENTILE(d.dock_to_stock_hours, 0.5) AS median_dts,
  SUM(CASE WHEN d.next_best_action = 'Quarantine' THEN 1 ELSE 0 END) AS risk,
  AVG(CASE WHEN d.processing_status = 'Completed' AND d.next_best_action <> 'Quarantine' THEN d.value_recovered END) AS avg_recovery
FROM devices d
WHERE d.received_date < DATE'2026-11-01'
GROUP BY 1
"""
DS_FORECAST = """
WITH actuals AS (
  SELECT DATE_TRUNC('MONTH', received_date) AS period, SUM(value_recovered) AS v
  FROM devices WHERE received_date < DATE'2026-11-01' GROUP BY 1
),
dates AS (SELECT MAX(period) AS max_d FROM actuals),
forecast AS (
  SELECT period, v_forecast, v_upper, v_lower
  FROM AI_FORECAST(TABLE(actuals), horizon => (SELECT ADD_MONTHS(max_d, 4) FROM dates),
    time_col => 'period', value_col => 'v', parameters => '{"global_floor": 0}')
),
bridge AS (SELECT a.period, a.v FROM actuals a JOIN dates dd ON a.period = dd.max_d)
SELECT period, v / 1e6 AS actual_m, CAST(NULL AS DOUBLE) AS forecast_m, CAST(NULL AS DOUBLE) AS upper_m, CAST(NULL AS DOUBLE) AS lower_m FROM actuals
UNION ALL SELECT period, CAST(NULL AS DOUBLE), v / 1e6, v / 1e6, v / 1e6 FROM bridge
UNION ALL SELECT period, CAST(NULL AS DOUBLE), v_forecast / 1e6, v_upper / 1e6, v_lower / 1e6 FROM forecast
"""
DS_NBA = """
SELECT next_best_action, COUNT(*) AS devices, SUM(net_value_lift) AS net_lift
FROM devices WHERE processing_status = 'Completed'
GROUP BY next_best_action
"""
DS_HEAT_DTS = """
SELECT REPLACE(f.facility_name, ' Processing Center', '') AS facility,
  DATE_FORMAT(DATE_TRUNC('MONTH', d.received_date), 'MMM') AS month_label,
  DATE_TRUNC('MONTH', d.received_date) AS month_start,
  ROUND(PERCENTILE(d.dock_to_stock_hours, 0.5), 0) AS median_dts
FROM devices d JOIN facilities f ON d.facility_id = f.facility_id
WHERE d.received_date >= DATE'2026-05-01' AND d.received_date < DATE'2026-11-01'
GROUP BY 1, 2, 3
ORDER BY month_start
"""
DS_REPAIRS = """
SELECT DATE_TRUNC('MONTH', r.sent_date) AS month, p.partner_name,
  AVG(CASE WHEN r.qa_result = 'Bounce' THEN 1.0 ELSE 0.0 END) AS bounce_rate
FROM repair_orders r JOIN repair_partners p ON r.partner_id = p.partner_id
WHERE r.repair_status = 'Completed' AND r.sent_date < DATE'2026-11-01'
GROUP BY 1, 2
"""
DS_SCORE = """
SELECT p.partner_name,
  ROUND(AVG(CASE WHEN r.qa_result = 'Bounce' THEN 1.0 ELSE 0.0 END), 4) AS bounce_rate,
  ROUND(AVG(r.repair_cost + r.logistics_cost), 2) AS quoted_cost,
  ROUND(SUM(r.repair_cost + r.logistics_cost + r.rework_cost + r.value_erosion) / SUM(CASE WHEN r.qa_result = 'Pass' THEN 1 ELSE 0 END), 2) AS true_cost,
  ROUND(AVG(CASE WHEN r.parts_type = 'Aftermarket' THEN 1.0 ELSE 0.0 END), 4) AS aftermarket_share
FROM repair_orders r JOIN repair_partners p ON r.partner_id = p.partner_id
WHERE r.repair_status = 'Completed' AND r.sent_date >= DATE'2026-08-01'
GROUP BY p.partner_name
ORDER BY true_cost DESC
"""
DS_OUTCOMES = """
SELECT CASE WHEN disposition_channel = 'Resold - US' THEN 'Resold in the US'
       WHEN disposition_channel IN ('Resold - EU', 'Exported - EU') THEN 'Resold in the EU'
       WHEN disposition_channel LIKE 'Exported%' THEN 'Exported for reuse'
       WHEN disposition_channel = 'Parts harvested' THEN 'Parts harvested'
       WHEN disposition_channel = 'Recycled' THEN 'Recycled'
       ELSE 'Quarantined' END AS outcome,
  COUNT(*) AS devices
FROM devices WHERE processing_status = 'Completed'
GROUP BY 1
"""
DS_RISK = """
SELECT DATE_TRUNC('MONTH', received_date) AS month,
  CASE WHEN genuine_status = 'Counterfeit' THEN 'Counterfeit' ELSE blacklist_status END AS risk_type,
  COUNT(*) AS devices
FROM devices
WHERE next_best_action = 'Quarantine' AND received_date < DATE'2026-11-01'
GROUP BY 1, 2
"""
DS_CONDITION = """
SELECT model_family, CONCAT('Grade ', cosmetic_grade) AS grade,
  COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY model_family) AS share
FROM devices
GROUP BY model_family, cosmetic_grade
"""
DS_MODELS = """
SELECT CONCAT(oem, ' ', model) AS device, SUM(value_recovered) / 1e6 AS value_m
FROM devices WHERE processing_status = 'Completed'
GROUP BY oem, model
ORDER BY value_m DESC
LIMIT 10
"""

def pos(x, y, w, h): return {'x':x,'y':y,'width':w,'height':h}
def text(name, lines, p): return {'widget':{'name':name,'multilineTextboxSpec':{'lines':lines}},'position':p}
def counter(name, field, title, p, fmt=None, template=None):
    enc = {'value': {'fieldName': f'max({field})', 'displayName': title}, 'period': {'fieldName': 'monthly(period)'}}
    if fmt: enc['value']['format'] = fmt
    if template: enc['value']['formatTemplate'] = template
    return {'widget':{'name':name,'queries':[{'name':'main_query','query':{'datasetName':'ds_monthly',
        'fields':[{'name':f'max({field})','expression':f'MAX(`{field}`)'},{'name':'monthly(period)','expression':'DATE_TRUNC("MONTH", `period`)'}],'disaggregated':False}}],
        'spec':{'version':2,'widgetType':'counter','encodings':enc,'frame':{'title':title,'showTitle':True,'showDescription':True,'description':'Latest month · trend over 12 months'}}},'position':p}
def forecast(title, p):
    return {'widget':{'name':'value_forecast','queries':[{'name':'main_query','query':{'datasetName':'ds_forecast','fields':[
        {'name':'period','expression':'`period`'},{'name':'actual_m','expression':'`actual_m`'},{'name':'forecast_m','expression':'`forecast_m`'},
        {'name':'upper_m','expression':'`upper_m`'},{'name':'lower_m','expression':'`lower_m`'}],'disaggregated':True}}],
      'spec':{'version':1,'widgetType':'forecast-line','encodings':{'x':{'fieldName':'period','scale':{'type':'temporal'},'axis':{'hideTitle':True}},
          'y':{'scale':{'type':'quantitative','domainMin':0},'original':{'fieldName':'actual_m','displayName':'Actual ($M)'},
               'prediction':{'fieldName':'forecast_m','displayName':'AI_FORECAST ($M)'},'predictionUpper':{'fieldName':'upper_m'},'predictionLower':{'fieldName':'lower_m'}}},
        'frame':{'showTitle':True,'title':title}}},'position':p}
def combo(name, title, bar_field, bar_label, line_field, line_label, p):
    return {'widget':{'name':name,'queries':[{'name':'main_query','query':{'datasetName':'ds_monthly','fields':[
        {'name':'period','expression':'`period`'},{'name':f'sum({bar_field})','expression':f'SUM(`{bar_field}`)'},{'name':f'max({line_field})','expression':f'MAX(`{line_field}`)'}],'disaggregated':False}}],
      'spec':{'version':1,'widgetType':'combo','encodings':{'x':{'fieldName':'period','scale':{'type':'temporal'},'axis':{'hideTitle':True}},
          'y':{'scale':{'type':'quantitative'},'primary':{'fields':[{'fieldName':f'sum({bar_field})','displayName':bar_label}]},
               'secondary':{'fields':[{'fieldName':f'max({line_field})','displayName':line_label}]}},'label':{'show':False}},
        'frame':{'showTitle':True,'title':title}}},'position':p}
def hbar(name, ds, cat, val, val_expr, title, p, fmt=None, color=None):
    y = {'fieldName':cat,'scale':{'type':'categorical','sort':{'by':'value'}},'axis':{'hideTitle':True}}
    x = {'fieldName':val,'scale':{'type':'quantitative'},'axis':{'hideTitle':True}}
    if fmt: x['format'] = fmt
    enc = {'x':x,'y':y}
    return {'widget':{'name':name,'queries':[{'name':'main_query','query':{'datasetName':ds,'fields':[
        {'name':cat,'expression':f'`{cat}`'},{'name':val,'expression':val_expr}],'disaggregated':False}}],
      'spec':{'version':3,'widgetType':'bar','encodings':enc,'frame':{'showTitle':True,'title':title}}},'position':p}
def heatmap(name, ds, x, y, val, title, p, ramp, fmt=None, xsort=None):
    xs = {'fieldName':x,'scale':{'type':'categorical'},'axis':{'hideTitle':True}}
    if xsort: xs['scale']['sort'] = {'by':'custom-order','orderedValues':xsort}
    color = {'fieldName':f'sum({val})','displayName':val,'scale':{'type':'quantitative','colorRamp':{'mode':'custom-sequential','colors':ramp}}}
    if fmt: color['format'] = fmt
    return {'widget':{'name':name,'queries':[{'name':'main_query','query':{'datasetName':ds,'fields':[
        {'name':x,'expression':f'`{x}`'},{'name':y,'expression':f'`{y}`'},{'name':f'sum({val})','expression':f'SUM(`{val}`)'}],'disaggregated':False}}],
      'spec':{'version':3,'widgetType':'heatmap','encodings':{'x':xs,'y':{'fieldName':y,'scale':{'type':'categorical'},'axis':{'hideTitle':True}},'color':color,'label':{'show':True}},
        'frame':{'showTitle':True,'title':title}}},'position':p}

def build(k):
    t = T[k]; a = t['accent']
    L = [text('header', [f"## {t['title']}\n", "\n", t['narrative'] + "\n"], pos(0,0,12,2))]
    ds = [{'name':'ds_monthly','displayName':'Monthly KPIs','queryLines':ql(DS_MONTHLY)},
          {'name':'ds_forecast','displayName':'Value recovered + AI_FORECAST','queryLines':ql(DS_FORECAST)}]
    if t['kind'] == 'internal':
        ds += [{'name':'ds_nba','displayName':'Next best action','queryLines':ql(DS_NBA)},
               {'name':'ds_heat','displayName':'Dock-to-stock by site','queryLines':ql(DS_HEAT_DTS)},
               {'name':'ds_repairs','displayName':'Repair QA','queryLines':ql(DS_REPAIRS)},
               {'name':'ds_score','displayName':'Partner scorecard','queryLines':ql(DS_SCORE)}]
        L += [counter('kpi_devices','devices','Devices processed',pos(0,2,3,3),CNT),
              counter('kpi_value','value_recovered','Value recovered',pos(3,2,3,3),USD),
              counter('kpi_lift','net_lift','Value created by next best action',pos(6,2,3,3),USD),
              counter('kpi_dts','median_dts','Median dock-to-stock',pos(9,2,3,3),{'type':'number-plain','decimalPlaces':{'type':'max','places':1}},'{{ @formatted }} h')]
        L.append(forecast('Value recovered by month, with AI_FORECAST projection (Preview), $M', pos(0,5,8,6)))
        L.append(hbar('nba','ds_nba','next_best_action','sum(net_lift)','SUM(`net_lift`)','Value created by each next best action',pos(8,5,4,6),USD))
        L.append(combo('volume_vs_speed','Volume vs median dock-to-stock hours (surge stress test)','devices','Devices received','median_dts','Median dock-to-stock (h)',pos(0,11,6,6)))
        L.append(heatmap('dts_heat','ds_heat','month_label','facility','median_dts','Median dock-to-stock hours by site (redder = slower)',pos(6,11,6,6),
                         {'start':'#1B3B47','end':'#FF6B5E'},None,['May','Jun','Jul','Aug','Sep','Oct']))
        L.append({'widget':{'name':'bounce_trend','queries':[{'name':'main_query','query':{'datasetName':'ds_repairs','fields':[
            {'name':'month','expression':'`month`'},{'name':'partner_name','expression':'`partner_name`'},{'name':'avg(bounce_rate)','expression':'AVG(`bounce_rate`)'}],'disaggregated':False}}],
          'spec':{'version':3,'widgetType':'line','encodings':{'x':{'fieldName':'month','scale':{'type':'temporal'},'axis':{'hideTitle':True}},
              'y':{'fieldName':'avg(bounce_rate)','scale':{'type':'quantitative'},'displayName':'Bounce rate','format':{'type':'number-percent','decimalPlaces':{'type':'max','places':0}}},
              'color':{'fieldName':'partner_name','scale':{'type':'categorical'},'displayName':'Partner'}},
            'annotations':[{'type':'vertical-line','encodings':{'x':{'dataValue':'2026-08-01T00:00:00.000','dataType':'DATETIME'},'label':{'value':'Mekong switches to aftermarket parts'},'color':{'value':{'themeColorType':'visualizationColors','position':3}}}}],
            'frame':{'showTitle':True,'title':'Repair bounce rate by partner (failed QA on return)'}}},'position':pos(0,17,6,6)})
        L.append({'widget':{'name':'scorecard','queries':[{'name':'main_query','query':{'datasetName':'ds_score','fields':[{'name':c,'expression':f'`{c}`'} for c in
            ['partner_name','bounce_rate','aftermarket_share','quoted_cost','true_cost']],'disaggregated':True}}],
          'spec':{'version':2,'widgetType':'table','encodings':{'columns':[
            {'fieldName':'partner_name','displayName':'Repair partner'},
            {'fieldName':'bounce_rate','displayName':'Bounce rate','format':{'type':'number-percent','decimalPlaces':{'type':'max','places':1}}},
            {'fieldName':'aftermarket_share','displayName':'Aftermarket parts','format':PCT},
            {'fieldName':'quoted_cost','displayName':'Quoted / repair','format':USD0},
            {'fieldName':'true_cost','displayName':'True cost / success','format':USD0}]},
            'frame':{'showTitle':True,'title':'The cheapest quote isn’t the cheapest repair (since Aug 1)'}}},'position':pos(6,17,6,6)})
    else:
        ds += [{'name':'ds_outcomes','displayName':'Outcomes','queryLines':ql(DS_OUTCOMES)},
               {'name':'ds_risk','displayName':'Fraud and risk','queryLines':ql(DS_RISK)},
               {'name':'ds_condition','displayName':'Condition on arrival','queryLines':ql(DS_CONDITION)},
               {'name':'ds_models','displayName':'Top models','queryLines':ql(DS_MODELS)}]
        L += [counter('kpi_intake','devices',t['intake'],pos(0,2,3,3),CNT),
              counter('kpi_value','value_recovered',t['value'],pos(3,2,3,3),USD),
              counter('kpi_avg','avg_recovery',t['avg'],pos(6,2,3,3),USD0),
              counter('kpi_risk','risk','Fraud & risk caught',pos(9,2,3,3),{'type':'number-plain','decimalPlaces':{'type':'max','places':0}})]
        L.append(forecast(f"{t['value']} by month, with AI_FORECAST projection (Preview), $M", pos(0,5,8,6)))
        L.append(hbar('outcomes','ds_outcomes','outcome','sum(devices)','SUM(`devices`)','Where your devices went',pos(8,5,4,6)))
        L.append(combo('volume_vs_value',f"{t['intake']} vs {t['avg'].lower()}",'devices',t['intake'],'avg_recovery',t['avg']+' ($)',pos(0,11,6,6)))
        L.append(heatmap('condition','ds_condition','grade','model_family','share','Condition on arrival by device family (share of devices)',pos(6,11,6,6),
                         {'start':'#1B3B47','end':a},PCT,['Grade A','Grade B','Grade C','Grade D']))
        L.append({'widget':{'name':'risk','queries':[{'name':'main_query','query':{'datasetName':'ds_risk','fields':[
            {'name':'month','expression':'`month`'},{'name':'risk_type','expression':'`risk_type`'},{'name':'sum(devices)','expression':'SUM(`devices`)'}],'disaggregated':False}}],
          'spec':{'version':3,'widgetType':'bar','encodings':{'x':{'fieldName':'month','scale':{'type':'temporal'},'axis':{'hideTitle':True}},
              'y':{'fieldName':'sum(devices)','scale':{'type':'quantitative'},'displayName':'Devices flagged'},
              'color':{'fieldName':'risk_type','scale':{'type':'categorical','mappings':[{'value':'Lost/stolen','color':'#FF6B5E'},{'value':'Unpaid balance','color':'#F5A524'},{'value':'Counterfeit','color':'#6B46FF'}]},'displayName':'Risk type'}},
            'frame':{'showTitle':True,'title':t['fraud']}}},'position':pos(0,17,6,6)})
        L.append(hbar('top_models','ds_models','device','sum(value_m)','SUM(`value_m`)','Which devices return the most value ($M)',pos(6,17,6,6)))
    dark = lambda v: {'light':v,'dark':v}
    theme = {'canvasBackgroundColor':dark('#14191A'),'widgetBackgroundColor':dark('#1C2224'),'widgetBorderColor':dark('#1C2224'),
             'fontColor':dark('#E6ECEE'),'selectionColor':dark(a),
             'visualizationColors':[a,'#6B46FF','#F5A524','#5CC9FD','#76DCC2','#FF6B5E','#C5EAFF','#9B9B9B'] if a != '#04B2FC' else ['#04B2FC','#6B46FF','#F5A524','#76DCC2','#FF6B5E','#5CC9FD','#C5EAFF','#9B9B9B'],
             'fontFamily':'Roboto','widgetCornerRadius':12,'widgetHeaderAlignment':'LEFT'}
    return {'datasets':ds,'pages':[{'name':'overview','displayName':'Overview','pageType':'PAGE_TYPE_CANVAS','layoutVersion':'GRID_V1','layout':L}],'uiSettings':{'theme':theme}}

def create_dashboards(profile, warehouse, catalog, schemas, parent_path):
    """schemas: {'ops': schema, 'northwind': schema, 'bastion': schema} (schema names inside `catalog`)."""
    subprocess.run(['databricks', 'workspace', 'mkdirs', parent_path, '--profile', profile], capture_output=True, text=True)
    ids = {}
    for k, t in T.items():
        dj = json.dumps(build(k))
        r = subprocess.run(['databricks', 'lakeview', 'create', '--display-name', t['title'], '--warehouse-id', warehouse,
                            '--dataset-catalog', catalog, '--dataset-schema', schemas[k], '--serialized-dashboard', dj,
                            '--json', json.dumps({'parent_path': parent_path}), '--profile', profile, '-o', 'json'],
                           capture_output=True, text=True)
        if r.returncode:
            raise RuntimeError(f'Dashboard {k} failed: {r.stderr[:600]}')
        did = json.loads(r.stdout)['dashboard_id']
        p = subprocess.run(['databricks', 'lakeview', 'publish', did, '--warehouse-id', warehouse, '--profile', profile, '-o', 'json'],
                           capture_output=True, text=True)
        if p.returncode:
            raise RuntimeError(f'Publish {k} failed: {p.stderr[:300]}')
        ids[k] = did
        print('  dashboard', k, did)
    return ids

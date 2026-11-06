"""Create the three Genie spaces (operations + two white-labeled customer portals)."""
import json, subprocess, hashlib, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from examples import EX
def hid(s): return hashlib.md5(s.encode()).hexdigest()
DESC = {
'devices': {'device_id':'Device record ID','imei':'15-digit IMEI','customer_id':'Platform customer that sent the device','program':'Recovery program: Trade-in, Insurance claim, Warranty return, Lease return, Buyback',
  'functional_status':'Diagnostics result: Fully functional, Minor defect, Major defect, No power','cosmetic_grade':'Cosmetic grade on arrival: A (like new) to D (heavy damage)',
  'battery_health_pct':'Battery state of health % on arrival; EU resale requires >= 80','next_best_action':'Next-best-action routing decision: Resell as-is, Buff & polish, Repair, Harvest parts, Recycle, Quarantine',
  'dock_to_stock_hours':'Hours from receiving dock to sellable stock','value_as_received':'Market value in USD as graded on arrival','value_recovered':'Realized value in USD after action and sales channel (null until completed)',
  'net_value_lift':'value_recovered - action_cost - value_as_received (USD)','eu_market_eligible':'Meets EU resale rules: battery >= 80%, OEM parts only, grade A/B, genuine, clean',
  'disposition_channel':'Where the device went: Resold - US/EU, Exported - EU/LATAM/Africa/APAC, Recycled, Parts harvested, Quarantined, Pending'},
'repair_orders': {'qa_result':'Pass, or Bounce = failed QA on return and was reworked in-house','parts_type':'OEM or Aftermarket; aftermarket parts make the device ineligible for EU resale',
  'turnaround_days':'Days out at the repair partner','value_erosion':'Market value lost in USD while the device was out at the partner','rework_cost':'In-house rework cost in USD when the repair bounced'},
}
CATS = {'devices':['program','functional_status','cosmetic_grade','next_best_action','disposition_channel','oem','model','primary_defect','genuine_status','blacklist_status','processing_status'],
        'repair_orders':['repair_type','parts_type','qa_result','repair_status'],
        'repair_partners':['partner_name','partner_type'],'facilities':['facility_name','automation_level'],'customers':['customer_name','customer_type']}
COMMON_RULES = [
 "Today is 2026-11-06. Data covers devices received 2025-11-03 to 2026-11-05. 'This year' = 2026. 'Last quarter' = 2026 Q3 (Jul-Sep).",
 "All money is USD. Round dollar amounts to whole dollars and rates to one decimal.",
 "Bounce rate = share of completed repairs (repair_status = 'Completed') with qa_result = 'Bounce'.",
 "True cost per successful repair = SUM(repair_cost + logistics_cost + rework_cost + value_erosion) / COUNT of repairs with qa_result = 'Pass'. Use it when asked which partner is really cheapest or most expensive.",
 "The trade-in surge (new flagship launch) = received_date between 2026-09-12 and 2026-10-31. Compare against 2026-07-01 to 2026-09-11 as the baseline.",
 "value_recovered and net_value_lift are only populated when processing_status = 'Completed'.",
 "Dock-to-stock: report the median (PERCENTILE 0.5) of dock_to_stock_hours, not the average.",
 "EU eligibility: use devices.eu_market_eligible. Aftermarket repair parts (repair_orders.parts_type = 'Aftermarket') remove EU eligibility.",
 "Memphis Processing Center (FAC-MEM) is a manual site with no buff & polish cell; grade B devices there are sold as-is.",
]
def space(S, title, desc, persona, samples, examples, include_customers, data_schema):
    schema = S
    tabs = ['devices','repair_orders','repair_partners','facilities','device_models'] + (['customers'] if include_customers else [])
    tables=[]
    for t in sorted(tabs):
        cc=[]
        for col in sorted(set(CATS.get(t,[])) | set(DESC.get(t,{}).keys())):
            c={'column_name':col}
            if col in DESC.get(t,{}): c['description']=[DESC[t][col]]
            if col in CATS.get(t,[]): c['enable_format_assistance']=True; c['enable_entity_matching']=True
            cc.append(c)
        e={'identifier':f'{S}.{t}'}
        if cc: e['column_configs']=cc
        tables.append(e)
    joins=[('devices','facilities','`devices`.`facility_id` = `facilities`.`facility_id`','MANY_TO_ONE'),
           ('devices','device_models','`devices`.`model_id` = `device_models`.`model_id`','MANY_TO_ONE'),
           ('repair_orders','devices','`repair_orders`.`device_id` = `devices`.`device_id`','ONE_TO_ONE'),
           ('repair_orders','repair_partners','`repair_orders`.`partner_id` = `repair_partners`.`partner_id`','MANY_TO_ONE')]
    if include_customers: joins.append(('devices','customers','`devices`.`customer_id` = `customers`.`customer_id`','MANY_TO_ONE'))
    js=[{'id':hid(schema+l+r),'left':{'identifier':f'{S}.{l}','alias':l},'right':{'identifier':f'{S}.{r}','alias':r},'sql':[cond,f'--rt=FROM_RELATIONSHIP_TYPE_{rt}--']} for l,r,cond,rt in joins]
    exs=[{'id':hid(schema+'ex'+q),'question':[q],'sql':[sql.replace('{{DATA}}',S)]} for q,sql in examples]
    payload={'version':2,
      'config':{'sample_questions':sorted([{'id':hid(schema+'sq'+q),'question':[q]} for q in samples],key=lambda x:x['id'])},
      'data_sources':{'tables':tables},
      'instructions':{'text_instructions':[{'id':hid(schema+'ti'),'content':[persona]+COMMON_RULES}],
                      'example_question_sqls':sorted(exs,key=lambda x:x['id']),
                      'join_specs':sorted(js,key=lambda x:x['id'])}}
    return title, desc, json.dumps(payload)

ops_ex = EX
tenant_ex = [e for e in EX if 'Northwind' not in e[0]] + [("Show weekly devices received and value recovered",
  "SELECT DATE_TRUNC('WEEK', d.received_date) AS week, COUNT(*) AS devices_received, ROUND(SUM(d.value_recovered), 0) AS value_recovered_usd FROM {{DATA}}.devices d GROUP BY 1 ORDER BY 1")]
def create_spaces(profile, warehouse, data, nw, ba):
  SPACES = {
   'ops': space(data,'Contoso Device Intelligence (Operations)','All customers, facilities and repair partners on the Contoso platform (fictional demo data).',
     "You are Contoso's internal operations analyst across all customers, facilities and repair partners. Answer for the whole platform unless a customer is named.",
     ["Which repair partners have the highest bounce rate since August, and what has rework cost us?",
      "What is the true cost per successful display repair by partner?",
      "How did dock-to-stock time change at each facility during the September-October surge?",
      "How much value are we leaving on the table at Memphis by not buff & polishing grade B devices?"], ops_ex, True, data),
   'northwind': space(nw,'Northwind Mobile Device Returns Assistant','Self-service analytics for Northwind Mobile trade-in and lease returns, powered by Contoso (fictional demo data).',
     "You are the self-service analytics assistant inside Northwind Mobile's device returns portal, powered by Contoso. Northwind Mobile is a wireless carrier; its devices come from Trade-in and Lease return programs. All data in these tables is Northwind Mobile's devices only, so say 'your devices'.",
     ["How much trade-in value did we recover each month this year?",
      "Which device models drive the most recovered value for us?",
      "How many of our trade-ins were flagged as lost/stolen or unpaid balance, and what were they worth?",
      "What share of our devices got a second life vs were recycled?"], tenant_ex, False, data),
   'bastion': space(ba,'Bastion Protect Claims Device Assistant','Self-service analytics for Bastion Protect insurance-claim devices, powered by Contoso (fictional demo data).',
     "You are the self-service analytics assistant inside Bastion Protect's claims device portal, powered by Contoso. Bastion Protect is a device insurer; its devices come from insurance claims. All data in these tables is Bastion Protect's devices only, so say 'your claim devices'.",
     ["What share of our claim devices were repaired vs recycled or harvested for parts?",
      "What is our average repair turnaround by partner this quarter?",
      "Which models have the highest display damage rate in our claims?",
      "How much value did repairs recover on our claim devices this year?"], tenant_ex, False, data),
  }
  out={}
  for k,(title,desc,ser) in SPACES.items():
    r=subprocess.run(['databricks','genie','create-space',warehouse,ser,'--title',title,'--description',desc,'--profile',profile,'-o','json'],capture_output=True,text=True)
    if r.returncode:
      raise RuntimeError(f'Genie space {k} failed: {r.stderr[:600]}')
    out[k]=json.loads(r.stdout).get('space_id'); print('  genie', k, out[k])
  return out

import { DASHBOARDS, SCHEMAS, WORKSPACE_HOST, WORKSPACE_ID } from './config.generated';

export type TenantId = 'northwind' | 'bastion' | 'ops' | 'regulator';

export interface Tenant {
  id: TenantId;
  name: string;
  portalName: string;
  tagline: string;
  kind: 'customer' | 'internal' | 'regulator';
  /** Unity Catalog schema holding this tenant's governed views */
  schema: string;
  genieAlias: TenantId;
  dashboardId: string;
  accent: string;
  accentSoft: string;
  palette: string[];
  suggested: string[];
  /** Customer-facing wording */
  copy: { intake: string; value: string; avgValue: string; second: string };
}

export { WORKSPACE_HOST, WORKSPACE_ID };
export const DATA_AS_OF = 'Nov 5, 2026';

export const SAMPLE_SHIPMENT: string[] = ["359845752175456", "355476552175471", "357814352617474", "356614232175503", "355476552175516", "357576402175538", "358173392618652", "356423192175600", "359999990000001", "355273392175659", "355243142175690", "358173392617813", "350565142175749"];

export const TENANTS: Tenant[] = [
  {
    id: 'ops',
    name: 'Contoso Operations',
    portalName: 'All customers',
    tagline: 'Platform-wide view across every customer, facility and partner',
    kind: 'internal',
    schema: SCHEMAS.ops,
    genieAlias: 'ops',
    dashboardId: DASHBOARDS.ops,
    accent: '#04B2FC',
    accentSoft: 'rgba(4, 178, 252, 0.14)',
    palette: ['#04B2FC', '#6B46FF', '#5CC9FD', '#F5A524', '#76DCC2', '#0050B9'],
    suggested: [
      'Which repair partners have the highest bounce rate since August, and what has rework cost us?',
      'What is the true cost per successful display repair by partner?',
      'How did dock-to-stock time change at each facility during the September-October surge?',
      'How much value are we leaving on the table at Memphis by not buff & polishing grade B devices?',
    ],
    copy: { intake: 'Devices processed', value: 'Value recovered', avgValue: 'Avg value per device', second: 'devices' },
  },
  {
    id: 'northwind',
    name: 'Northwind Mobile',
    portalName: 'Device Returns',
    tagline: 'Trade-in and lease returns, processed by Contoso',
    kind: 'customer',
    schema: SCHEMAS.northwind,
    genieAlias: 'northwind',
    dashboardId: DASHBOARDS.northwind,
    accent: '#E0218A',
    accentSoft: 'rgba(224, 33, 138, 0.14)',
    palette: ['#E0218A', '#04B2FC', '#6B46FF', '#F5A524', '#76DCC2', '#5CC9FD'],
    suggested: [
      'How much trade-in value did we recover each month this year?',
      'Which device models drive the most recovered value for us?',
      'How many of our trade-ins were flagged as lost/stolen or unpaid balance, and what were they worth?',
      'What share of our devices got a second life vs were recycled?',
    ],
    copy: { intake: 'Trade-ins received', value: 'Trade-in value recovered', avgValue: 'Avg recovery per device', second: 'trade-ins' },
  },
  {
    id: 'bastion',
    name: 'Bastion Protect',
    portalName: 'Claims Devices',
    tagline: 'Insurance-claim devices, processed by Contoso',
    kind: 'customer',
    schema: SCHEMAS.bastion,
    genieAlias: 'bastion',
    dashboardId: DASHBOARDS.bastion,
    accent: '#14B8A6',
    accentSoft: 'rgba(20, 184, 166, 0.14)',
    palette: ['#14B8A6', '#04B2FC', '#6B46FF', '#F5A524', '#E0218A', '#5CC9FD'],
    suggested: [
      'What share of our claim devices were repaired vs recycled or harvested for parts?',
      'Which models have the highest display damage rate in our claims?',
      'How much salvage value did we recover on our claim devices each month this year?',
      'How many claim devices were flagged as counterfeit or lost/stolen?',
    ],
    copy: { intake: 'Claim devices received', value: 'Salvage value recovered', avgValue: 'Avg salvage per claim', second: 'claim devices' },
  },
  {
    id: 'regulator',
    name: 'National Telecom Regulator',
    portalName: 'Device Verification',
    tagline: 'Homologation checks for devices entering the network',
    kind: 'regulator',
    schema: 'verify_devices() only',
    genieAlias: 'ops',
    dashboardId: '',
    accent: '#E5B53A',
    accentSoft: 'rgba(229, 181, 58, 0.14)',
    palette: ['#E5B53A', '#04B2FC', '#6B46FF', '#76DCC2'],
    suggested: [],
    copy: { intake: 'Devices checked', value: '', avgValue: '', second: 'devices' },
  },
];

export function getTenant(id: string | null | undefined): Tenant {
  return TENANTS.find((t) => t.id === id) ?? TENANTS[0];
}

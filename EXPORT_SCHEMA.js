/**
 * EXPORT SCHEMA — Single source of truth for INPUT tab row order
 * 
 * Each row in the INPUT tab (starting at row 2) corresponds to one week.
 * Column A = week ending date
 * Columns B+ = KPI values in this exact order
 * 
 * Generated: 2026-07-12
 * Do NOT manually reorder — lock before building Google Sheet
 */

const EXPORT_SCHEMA = [
  { idx: 1, id: 'week', label: 'Week Ending', source: 'date', type: 'date', category: 'Meta' },
  { idx: 2, id: 'total_rev', label: 'Total Revenue', source: 'calc_prov', type: 'currency', category: 'Revenue' },
  { idx: 3, id: 'total_consults', label: 'Completed Consults', source: 'calc_prov', type: 'number', category: 'Revenue' },
  { idx: 4, id: 'total_nc', label: 'New Clients', source: 'calc_prov', type: 'number', category: 'Revenue' },
  { idx: 5, id: 'clinic_occ', label: 'Clinic Occupancy %', source: 'calc_prov', type: 'decimal', decimals: 4, category: 'Occupancy' },
  { idx: 6, id: 'physio_occ', label: 'Physio Occupancy %', source: 'calc_prov', type: 'decimal', decimals: 4, category: 'Occupancy' },
  { idx: 7, id: 'massage_occ', label: 'Massage Occupancy %', source: 'calc_prov', type: 'decimal', decimals: 4, category: 'Occupancy' },
  { idx: 8, id: 'ep_occ', label: 'EP Occupancy %', source: 'calc_prov', type: 'decimal', decimals: 4, category: 'Occupancy' },
  { idx: 9, id: 'm_glofox', label: 'Glofox Income', source: 'manual', type: 'currency', category: 'Gym' },
  { idx: 10, id: 'm_gym3p', label: '3rd Party Gym Revenue', source: 'manual', type: 'currency', category: 'Gym' },
  { idx: 11, id: 'm_mscred', label: 'Move Strong Credits', source: 'manual', type: 'currency', category: 'Gym' },
  { idx: 12, id: 'gym_total', label: 'Total Gym Revenue', source: 'calc_gym', type: 'currency', category: 'Gym' },
  { idx: 13, id: 'm_mems', label: 'Paid Memberships', source: 'manual', type: 'number', category: 'Gym' },
  { idx: 14, id: 'm_pod_rev', label: 'Podiatry Revenue (÷2)', source: 'manual', type: 'currency', category: 'Podiatry' },
  { idx: 15, id: 'm_pod_c', label: 'Podiatry Consults', source: 'manual', type: 'number', category: 'Podiatry' },
  { idx: 16, id: 'm_pod_ytd', label: 'Podiatry YTD Revenue', source: 'manual', type: 'currency', category: 'Podiatry' },
  { idx: 17, id: 'total_adjust_pod_rev', label: 'Total Adjust + Podiatry Revenue', source: 'calc_total_rev', type: 'currency', category: 'Revenue' },
  { idx: 18, id: 'cx_cancels', label: 'Cancellations (count)', source: 'calc_cx', type: 'number', category: 'CX' },
  { idx: 19, id: 'cx_pct', label: 'Cancellation %', source: 'calc_cx', type: 'decimal', decimals: 4, category: 'CX' },
  { idx: 20, id: 'cx_dnas', label: 'Did Not Arrive (count)', source: 'calc_cx', type: 'number', category: 'CX' },
  { idx: 21, id: 'cx_nr', label: 'Not Rebooked (count)', source: 'calc_cx', type: 'number', category: 'CX' },
  { idx: 22, id: 'cx_nr_pct', label: 'Not Rebooked %', source: 'calc_cx', type: 'decimal', decimals: 4, category: 'CX' },
  { idx: 23, id: 'cx_rsx_pct', label: 'Reschedule %', source: 'calc_cx', type: 'decimal', decimals: 4, category: 'CX' },
  { idx: 24, id: 'cx_in7_pct', label: 'Booked Within 7 Days %', source: 'calc_cx', type: 'decimal', decimals: 4, category: 'CX' }
];

function getExportHeaders() { return EXPORT_SCHEMA.map(r => r.label); }
function getExportSchemaById(id) { return EXPORT_SCHEMA.find(r => r.id === id); }
function getExportSchemaByCategory(cat) { return EXPORT_SCHEMA.filter(r => r.category === cat); }

/* Render the shared model in the original tracker layout. No capacity model runs here. */
(function (global) {
  'use strict';
  const numeric = value => value === null || value === undefined || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
  const format = (value, digits = 1) => numeric(value) === null ? 'Unknown' : Number(value).toLocaleString('en-US', { maximumFractionDigits: digits });
  function range(low, high, digits = 1) {
    low = numeric(low); high = numeric(high);
    if (low === null && high === null) return 'Unknown';
    if (high === null) return '≥ ' + format(low, digits);
    if (low === null) return '≤ ' + format(high, digits);
    return low === high ? format(low, digits) : format(low, digits) + '–' + format(high, digits);
  }
  function sumBounds(rows, low, high) {
    const total = key => rows.some(row => numeric(row[key]) === null && row.capacity_known) ? null : rows.reduce((sum, row) => sum + (numeric(row[key]) ?? 0), 0);
    const unknown = rows.filter(row => !row.capacity_known && !['operational', 'cancelled', 'dormant'].includes(row.indicator)).length;
    const known = rows.some(row => numeric(row[low]) !== null && (row.capacity_known || ['operational', 'cancelled', 'dormant'].includes(row.indicator)));
    return { low: !known && unknown ? null : total(low), high: !known && unknown ? null : total(high), unknown };
  }
  function assertContract(data) {
    if (data.scope !== 'manually_approved_projects' || !Array.isArray(data.project_scenarios) || !Array.isArray(data.projects)) throw new Error('Shared scenario result required.');
    if (data.projects.some(project => project.record_type !== 'existing') || data.project_scenarios.some(row => !row.included_in_result)) throw new Error('Unapproved project in public result.');
    const keys = data.project_scenarios.map(row => row.project_id + ':' + row.scenario);
    if (new Set(keys).size !== keys.length || keys.length !== data.projects.length * data.method.scenarios.length) throw new Error('Incomplete or duplicate project scenarios.');
    return data;
  }
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const tags = value => String(value || '').split(';').map(tag => tag.trim()).filter(Boolean);
  const countryLabel = value => ({ SE: 'Sweden', NO: 'Norway', FI: 'Finland' }[value] || value);
  const basisLabel = value => ({ it_nameplate: 'IT capacity', it_peak: 'Peak IT load', it_unspecified: 'IT power', facility_nameplate: 'Total site capacity', facility_peak: 'Peak site load', facility_unspecified: 'Site power', grid: 'Grid connection', unspecified: 'Measure not specified', backup: 'Backup generation', generation: 'Power generation', density: 'Rack density' }[value] || 'Unknown');
  const decisionLabel = value => ({ yes: 'Confirmed', no: 'Not confirmed', unclear: 'Unknown', not_applicable: 'Not applicable' }[value] || 'Unknown');
  const timingLabel = value => ({ first_capacity: 'First operation', full_capacity: 'Full capacity', grid_availability: 'Grid available', unknown: 'Date unknown' }[value] || 'Date unknown');
  const excludedReasons = new Set(['operational', 'cancelled', 'dormant', 'identity_conflict', 'related_identity', 'no_datacenter_load', 'capacity_unknown', 'pending_approval']);
  function reported(claim) {
    if (!claim || numeric(claim.mw) === null) return 'Unknown';
    if (claim.qualifier === 'at_least' && !claim.mw_max) return '≥ ' + format(claim.mw);
    if (claim.qualifier === 'up_to' && !claim.mw_max) return '≤ ' + format(claim.mw);
    return range(claim.mw, claim.mw_max || claim.mw);
  }
  function operationYears(claims) {
    return [...new Set(claims.filter(claim => !['Operational', 'Cancelled', 'Dormant'].includes(claim.status) && ['first_capacity', 'full_capacity'].includes(claim.timing) && claim.first_year && claim.issue !== 'identity_conflict').map(claim => claim.first_year === claim.last_year || !claim.last_year ? claim.first_year : claim.first_year + '–' + claim.last_year))].sort().join('; ') || 'Unknown';
  }
  function projectDecision(claims) {
    const active = claims.filter(claim => !['Operational', 'Cancelled', 'Dormant'].includes(claim.status) && claim.issue !== 'identity_conflict' && !['backup', 'generation', 'density'].includes(claim.basis));
    if (!active.length) return 'Unknown';
    const confirmed = active.filter(claim => claim.decision === 'yes');
    if (confirmed.length) return confirmed.length === active.length ? 'Confirmed' : 'Confirmed for part';
    return active.every(claim => claim.decision === 'no') ? 'Not confirmed' : 'Unknown';
  }
  function rowsFor(data, scenario, filters = {}) {
    const projects = new Map(data.projects.map(project => [project.project_id, project]));
    const match = (values, value) => !values?.length || values.includes(value);
    return data.project_scenarios.filter(row => {
      const project = projects.get(row.project_id);
      return row.scenario === scenario && match(filters.countries, project.country) && match(filters.zones, row.bidding_zone) && match(filters.statuses, project.status) && (!filters.types?.length || tags(project.type).some(type => filters.types.includes(type)));
    });
  }
  function makeView(data, scenario, filters = {}) {
    const rows = rowsFor(data, scenario, filters);
    const totals = list => ({ mw: sumBounds(list, 'mw_low', 'mw_high'), twh: sumBounds(list, 'annual_twh_low', 'annual_twh_high'), planned: sumBounds(list, 'nameplate_mw_low', 'nameplate_mw_high') });
    const zones = {};
    for (const feature of data.bidding_zones.features) {
      const zone = feature.properties.bidding_zone || feature.id;
      const country = feature.properties.country || zone.slice(0, 2);
      const excluded = Boolean((filters.countries?.length && !filters.countries.includes(country)) || (filters.zones?.length && !filters.zones.includes(zone)));
      const selected = rows.filter(row => row.bidding_zone === zone);
      zones[zone] = { ...totals(selected).mw, excluded, project_count: selected.length, country };
    }
    const countries = {};
    for (const country of ['NO', 'SE', 'FI']) countries[country] = { ...totals(rows.filter(row => row.country === country)).mw, excluded: Boolean((filters.countries?.length && !filters.countries.includes(country)) || (filters.zones?.length && !Object.values(zones).some(zone => zone.country === country && !zone.excluded))) };
    return { scenario, rows, zones, countries, totals: totals(rows), filters };
  }
  async function mount(document) {
    const root = document.getElementById('dc-tracker');
    if (!root) return;
    const status = document.getElementById('summary-box');
    try {
      const response = await fetch(root.dataset.results);
      if (!response.ok) throw new Error('Could not load project data.');
      const data = assertContract(await response.json());
      const projects = new Map(data.projects.map(project => [project.project_id, project]));
      const sources = new Map(data.sources.map(source => [source.source_id, source]));
      const claims = new Map(data.projects.map(project => [project.project_id, data.capacity.filter(claim => claim.project_id === project.project_id)]));
      const sourceIds = project => [...new Set([...tags(project.source_ids), ...claims.get(project.project_id).flatMap(claim => tags(claim.source_ids))])];
      let scenario = 'stated_2030';
      const groupNames = { countries: 'country', zones: 'zone', statuses: 'status', types: 'type' };
      const filters = () => Object.fromEntries(Object.entries(groupNames).map(([key, name]) => [key, Array.from(document.querySelectorAll('#filter-' + name + '-group input:checked')).map(input => input.value)]));
      function choices(name, values, label = value => value) {
        const parent = document.getElementById('filter-' + name + '-group');
        parent.replaceChildren();
        [...new Set(values.filter(Boolean))].sort().forEach(value => {
          const wrapper = document.createElement('label');
          const input = document.createElement('input');
          input.type = 'checkbox'; input.value = value; input.addEventListener('change', render);
          wrapper.append(input, document.createTextNode(label(value))); parent.append(wrapper);
        });
      }
      choices('country', data.projects.map(project => project.country), countryLabel);
      choices('zone', data.projects.map(project => project.bidding_zone).filter(zone => !zone.endsWith('-unassigned')));
      choices('status', data.projects.map(project => project.status));
      choices('type', data.projects.flatMap(project => tags(project.type)));
      const scenarioParent = document.getElementById('filter-scenario-group');
      data.method.scenarios.forEach(item => {
        const wrapper = document.createElement('label'); const input = document.createElement('input');
        input.type = 'radio'; input.name = 'tracker-scenario'; input.value = item.id; input.checked = item.id === scenario;
        input.addEventListener('change', () => selectScenario(item.id));
        wrapper.append(input, document.createTextNode(item.label + ' ' + item.year)); scenarioParent.append(wrapper);
      });
      function selectScenario(id) {
        scenario = id;
        scenarioParent.querySelectorAll('input').forEach(input => { input.checked = input.value === scenario; });
        render();
      }
      function sourceLinks(refs) {
        return refs.map(id => sources.get(id)).filter(Boolean).map(source => '<a href="' + escape(source.url) + '" target="_blank" rel="noopener noreferrer">' + escape(source.title) + '</a>').join('<br>') || 'No source listed';
      }
      function evidence(project) {
        const own = claims.get(project.project_id);
        const ledger = new Map(data.ledger.filter(row => row.scenario === scenario && row.project_id === project.project_id).map(row => [row.claim_id, row]));
        const body = own.map(claim => {
          const row = ledger.get(claim.claim_id);
          const counted = row && !excludedReasons.has(row.reason) ? range(row.counted_mw_low, row.counted_mw_high) : claim.issue === 'identity_conflict' ? 'Not attributed' : numeric(claim.mw) === null ? 'Unknown' : 'Not included';
          const timing = claim.first_year ? timingLabel(claim.timing) + ': ' + (claim.last_year && claim.last_year !== claim.first_year ? claim.first_year + '–' + claim.last_year : claim.first_year) : 'Unknown';
          return '<tr><td>' + escape(claim.phase) + '</td><td class="number-cell">' + escape(reported(claim)) + '</td><td>' + escape(basisLabel(claim.basis)) + '</td><td>' + escape(claim.status) + '</td><td>' + escape(decisionLabel(claim.decision)) + '</td><td>' + escape(claim.construction_year || 'Unknown') + '</td><td>' + escape(timing) + '</td><td class="number-cell">' + escape(counted) + '</td><td class="entry-notes">' + escape(claim.notes) + '</td><td>' + sourceLinks(tags(claim.source_ids)) + '</td></tr>';
        }).join('');
        return '<div class="detail-title">Project phases and sources</div>' + (project.notes ? '<div class="detail-notes">' + escape(project.notes) + '</div>' : '') + (own.length ? '<table class="entry-table"><thead><tr><th>Phase</th><th>Reported MW</th><th>Measure</th><th>Status</th><th>Investment decision</th><th>Construction start</th><th>Operation / grid date</th><th>Included MW</th><th>Notes</th><th>Sources</th></tr></thead><tbody>' + body + '</tbody></table>' : '<div class="detail-notes">Capacity and dates have not been disclosed.</div>') + '<div class="detail-notes">' + sourceLinks(sourceIds(project)) + '</div>';
      }
      let map = null;
      function render() {
        const view = makeView(data, scenario, filters());
        const year = data.method.scenarios.find(item => item.id === scenario).year;
        document.getElementById('grid-side-mw-header').textContent = 'Capacity in ' + year + ' (MW)';
        const rows = [...view.rows].sort((a, b) => (numeric(b.nameplate_mw_high) ?? numeric(b.nameplate_mw_low) ?? -1) - (numeric(a.nameplate_mw_high) ?? numeric(a.nameplate_mw_low) ?? -1) || projects.get(a.project_id).project_name.localeCompare(projects.get(b.project_id).project_name));
        const { mw, twh, planned } = view.totals;
        status.innerHTML = '<strong>' + rows.length + '</strong> projects shown · <strong>' + range(planned.low, planned.high) + '</strong> MW planned · <strong>' + range(mw.low, mw.high) + '</strong> MW in ' + year + ' · <strong>' + range(twh.low, twh.high, 3) + '</strong> TWh/year' + (mw.unknown ? ' · ' + mw.unknown + ' projects with unknown capacity' : '');
        const tbody = document.querySelector('#tracker-table tbody');
        tbody.innerHTML = rows.map(row => {
          const project = projects.get(row.project_id), own = claims.get(row.project_id);
          const checked = sourceIds(project).map(id => sources.get(id)?.accessed).filter(Boolean).sort().pop() || 'Unknown';
          const knownRange = (low, high, digits = 1) => row.capacity_known || ['operational', 'cancelled', 'dormant'].includes(row.indicator) ? range(row[low], row[high], digits) : 'Unknown';
          return '<tr class="project-row" data-project="' + escape(project.project_id) + '"><td><button type="button" class="toggle-button" data-toggle="' + escape(project.project_id) + '" aria-expanded="false" aria-controls="details-' + escape(project.project_id) + '" aria-label="Show details for ' + escape(project.project_name) + '">+</button></td><td class="project-cell">' + escape(project.project_name) + '</td><td>' + escape(project.developer) + '</td><td>' + escape(countryLabel(project.country)) + '</td><td>' + escape(project.bidding_zone || 'Unknown') + '</td><td>' + escape(tags(project.type).join('; ')) + '</td><td>' + escape(project.status) + '</td><td>' + escape(projectDecision(own)) + '</td><td class="number-cell">' + knownRange('nameplate_mw_low', 'nameplate_mw_high') + '</td><td class="number-cell" data-mw="' + escape(row.project_id) + '">' + knownRange('mw_low', 'mw_high') + '</td><td class="number-cell">' + knownRange('annual_twh_low', 'annual_twh_high', 3) + '</td><td>' + escape(operationYears(own)) + '</td><td>' + escape(checked) + '</td></tr><tr class="detail-row" id="details-' + escape(project.project_id) + '"><td class="detail-cell" colspan="13"></td></tr>';
        }).join('');
        tbody.querySelectorAll('[data-toggle]').forEach(button => button.addEventListener('click', () => {
          const id = button.dataset.toggle, detail = document.getElementById('details-' + id), open = button.getAttribute('aria-expanded') !== 'true';
          button.setAttribute('aria-expanded', String(open)); button.textContent = open ? '−' : '+'; detail.style.display = open ? 'table-row' : 'none';
          if (open && !detail.firstElementChild.innerHTML) detail.firstElementChild.innerHTML = evidence(projects.get(id));
        }));
        if (global.DCTrackerMap && global.d3) {
          if (!map) map = global.DCTrackerMap.mount(document.getElementById('dc-scenario-map'), data, view, selectScenario);
          else map.update(view);
        }
      }
      render();
    } catch (error) { status.textContent = 'Could not load tracker: ' + error.message; status.setAttribute('role', 'alert'); }
  }
  const api = { numeric, range, sumBounds, assertContract, rowsFor, makeView, reported, basisLabel, decisionLabel, operationYears, projectDecision, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.DCTracker = api;
  if (global.document) {
    if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', () => mount(global.document));
    else mount(global.document);
  }
})(typeof window === 'undefined' ? globalThis : window);

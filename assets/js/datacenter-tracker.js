/* Render the shared model in the original tracker layout. No capacity model runs here. */
(function (global) {
  'use strict';
  const numeric = value => value === null || value === undefined || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
  // One rounding rule for every number on the page: no more precision than the sources carry.
  function rounded(value, kind = 'mw') {
    const v = Math.abs(value);
    if (kind === 'twh') return v === 0 ? 0 : v < 0.1 ? Math.round(value * 100) / 100 : v < 10 ? Math.round(value * 10) / 10 : Math.round(value);
    return v < 10 ? Math.round(value * 10) / 10 : v < 1000 ? Math.round(value) : Math.round(value / 10) * 10;
  }
  const format = (value, kind = 'mw') => numeric(value) === null ? 'Unknown' : rounded(Number(value), kind).toLocaleString('en-US', { maximumFractionDigits: 2 });
  function range(low, high, kind = 'mw') {
    low = numeric(low); high = numeric(high);
    if (low === null && high === null) return 'Unknown';
    if (high === null) return '≥ ' + format(low, kind);
    if (low === null) return '≤ ' + format(high, kind);
    const a = format(low, kind), b = format(high, kind);
    return a === b ? a : a + '–' + b;
  }
  function sumBounds(rows, low, high) {
    const unknown = rows.filter(row => !row.capacity_known && !['operational', 'cancelled', 'dormant'].includes(row.indicator)).length;
    const known = rows.some(row => numeric(row[low]) !== null && (row.capacity_known || ['operational', 'cancelled', 'dormant'].includes(row.indicator)));
    const total = key => rows.reduce((sum, row) => sum + (numeric(row[key]) ?? 0), 0);
    return { low: !known && unknown ? null : total(low), high: !known && unknown ? null : total(high), unknown };
  }
  const totalRange = (t, kind = 'mw') => !t || t.low === null ? 'Unknown' : range(t.low, t.high, kind);
  function assertContract(data) {
    if (data.scope !== 'manually_approved_projects' || !Array.isArray(data.project_scenarios) || !Array.isArray(data.projects)) throw new Error('Shared scenario result required.');
    if (data.projects.some(project => project.record_type !== 'existing') || data.project_scenarios.some(row => !row.included_in_result)) throw new Error('Unapproved project in public result.');
    const keys = data.project_scenarios.map(row => row.project_id + ':' + row.scenario);
    if (new Set(keys).size !== keys.length || keys.length !== data.projects.length * data.method.scenarios.length) throw new Error('Incomplete or duplicate project scenarios.');
    const projectIds = new Set(data.projects.map(project => project.project_id));
    const actorKeys = (data.actors || []).map(actor => actor.project_id + ':' + actor.actor_name.toLowerCase().trim());
    if (new Set(actorKeys).size !== actorKeys.length || (data.actors || []).some(actor => !projectIds.has(actor.project_id))) throw new Error('Orphaned or duplicate project actors.');
    return data;
  }
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const tags = value => String(value || '').split(';').map(tag => tag.trim()).filter(Boolean);
  const regionNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
  const hqCountryLabel = country => country ? regionNames?.of(country) || country : 'Unknown';
  const countryLabel = value => ({ SE: 'Sweden', NO: 'Norway', FI: 'Finland' }[value] || value);
  const basisLabel = value => ({ it_nameplate: 'IT capacity', it_peak: 'Peak IT load', it_unspecified: 'IT power', facility_nameplate: 'Total site capacity', facility_peak: 'Peak site load', facility_unspecified: 'Site power', grid: 'Grid connection', unspecified: 'Measure not specified', backup: 'Backup generation', generation: 'Power generation', density: 'Rack density' }[value] || 'Unknown');
  const decisionLabel = value => ({ yes: 'Confirmed', no: 'Not confirmed', unclear: 'Unknown', not_applicable: 'Not applicable' }[value] || 'Unknown');
  const timingLabel = value => ({ first_capacity: 'First operation', full_capacity: 'Full capacity', grid_availability: 'Grid available', unknown: 'Date unknown' }[value] || 'Date unknown');
  function reported(claim) {
    if (!claim || numeric(claim.mw) === null) return 'Unknown';
    if (claim.qualifier === 'at_least' && !claim.mw_max) return '≥ ' + format(claim.mw);
    if (claim.qualifier === 'up_to' && !claim.mw_max) return '≤ ' + format(claim.mw);
    return range(claim.mw, claim.mw_max || claim.mw);
  }
  // Operation years first; without one, a construction start or grid date, labelled as such.
  function operationYears(claims, projectStatus = '') {
    const active = claims.filter(claim => !['Operational', 'Cancelled', 'Dormant'].includes(claim.status) && claim.issue !== 'identity_conflict');
    const years = (list, field, prefix = '') => [...new Set(list.map(claim => prefix + (field === 'construction_year' || claim.first_year === claim.last_year || !claim.last_year ? claim[field] : claim.first_year + '–' + claim.last_year)))].sort().join('; ');
    return years(active.filter(claim => ['first_capacity', 'full_capacity'].includes(claim.timing) && claim.first_year), 'first_year') ||
      (projectStatus === 'Operational' ? '' : years(active.filter(claim => claim.construction_year), 'construction_year', 'Construction ')) ||
      years(active.filter(claim => claim.timing === 'grid_availability' && claim.first_year), 'first_year', 'Grid ') || 'Unknown';
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
    const projectIds = filters.projectIds ? new Set(filters.projectIds) : null;
    const actors = new Map();
    for (const actor of data.actors || []) {
      if (!actors.has(actor.project_id)) actors.set(actor.project_id, []);
      actors.get(actor.project_id).push(actor);
    }
    const match = (values, value) => !values?.length || values.includes(value);
    const anyTag = (values, value) => !values?.length || tags(value).some(tag => values.includes(tag));
    return data.project_scenarios.filter(row => {
      const project = projects.get(row.project_id);
      const own = actors.get(row.project_id) || [{ hq_facets: 'unknown', actor_type: 'unknown' }];
      // Country/region and actor type must be satisfied by the same actor in a partnership.
      const actorMatch = own.some(actor => anyTag(filters.hqCountries, actor.hq_facets) && anyTag(filters.actorTypes, actor.actor_type));
      return row.scenario === scenario && (!projectIds || projectIds.has(row.project_id)) && match(filters.countries, project.country) && match(filters.zones, row.bidding_zone) && match(filters.statuses, project.status) && anyTag(filters.types, project.type) && match(filters.hqOrigins, project.actor_hq_origin || 'unknown') && actorMatch;
    });
  }
  function makeView(data, scenario, filters = {}) {
    const rows = rowsFor(data, scenario, filters);
    const totals = list => ({ mw: sumBounds(list, 'mw_low', 'mw_high'), twh: sumBounds(list, 'annual_twh_low', 'annual_twh_high'), planned: sumBounds(list, 'nameplate_mw_low', 'nameplate_mw_high'), buildout: sumBounds(list, 'buildout_twh_low', 'buildout_twh_high') });
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
      const actorRows = new Map(data.projects.map(project => [project.project_id, (data.actors || []).filter(actor => actor.project_id === project.project_id)]));
      const actorMethod = data.method.actor_classification;
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
        const sc = data.method.scenarios.find(item => item.id === scenario);
        const countedLabel = sc.label + ' ' + sc.year + ' (MW)';
        const reasonLabel = { operational: 'Already operating', cancelled: 'Cancelled', dormant: 'Dormant', identity_conflict: 'Not attributed', related_identity: 'Possible duplicate', no_datacenter_load: 'Not datacenter load', capacity_unknown: 'MW unknown', capacity_without_upper_limit: 'No assigned capacity', pending_approval: 'Pending review' };
        // Each row shows what that figure alone gives in the scenario; the project total below uses the
        // largest of overlapping figures, as the model does.
        const contribution = (claim, row) => {
          if (!row) return 'Unknown';
          if (reasonLabel[row.reason]) return reasonLabel[row.reason];
          if (numeric(row.share_high) === 0) return String(row.assumptions).split(';').includes('undated_deployment_0_to_1') ? 'Undated' : sc.selection === 'decided_dated' && claim.decision !== 'yes' ? 'No investment decision' : 'After ' + sc.year;
          if (claim.baseline_scope === 'existing_known' && numeric(row.direct_mw_high) === 0) return 'No addition to existing';
          return range(row.direct_mw_low, row.direct_mw_high);
        };
        const own = claims.get(project.project_id);
        const ledger = new Map(data.ledger.filter(row => row.scenario === scenario && row.project_id === project.project_id).map(row => [row.claim_id, row]));
        const body = own.map(claim => {
          const row = ledger.get(claim.claim_id);
          const counted = contribution(claim, row);
          const timing = claim.first_year ? timingLabel(claim.timing) + ': ' + (claim.last_year && claim.last_year !== claim.first_year ? claim.first_year + '–' + claim.last_year : claim.first_year) : 'Unknown';
          return '<tr><td>' + escape(claim.phase) + '</td><td class="number-cell">' + escape(reported(claim)) + '</td><td>' + escape(basisLabel(claim.basis)) + '</td><td>' + escape(claim.status) + '</td><td>' + escape(decisionLabel(claim.decision)) + '</td><td>' + escape(claim.construction_year || 'Unknown') + '</td><td>' + escape(timing) + '</td><td class="number-cell">' + escape(counted) + '</td><td class="entry-notes">' + escape(claim.notes) + '</td><td>' + sourceLinks(tags(claim.source_ids)) + '</td></tr>';
        }).join('');
        const total = data.project_scenarios.find(row => row.scenario === scenario && row.project_id === project.project_id);
        const parents = total && containedIn(total);
        const overlap = own.some(claim => ['included_in', 'possibly_included_in'].includes(claim.relation));
        const totalLine = !total ? '' : parents ? 'Counted as part of ' + escape(parents) + ' in the scenarios.' :
          'Counted for the project in ' + escape(sc.label + ' ' + sc.year) + ': <strong>' + escape(total.capacity_known || total.indicator !== 'pipeline' ? totalRange({ low: numeric(total.mw_low), high: numeric(total.mw_high) }) : 'Unknown') + ' MW</strong>.' +
          (overlap ? ' The figures overlap (phases are part of the campus figure), so the largest applies, not the sum.' : '');
        const actors = actorRows.get(project.project_id);
        const actorBody = actors.map(actor => '<tr><td>' + escape(actor.actor_name) + '</td><td>' + escape(tags(actor.role).map(value => actorMethod.roles[value]).join('; ')) + '</td><td>' + escape(tags(actor.actor_type).map(value => actorMethod.types[value]).join('; ')) + '</td><td>' + escape([actor.hq_city, hqCountryLabel(actor.hq_country)].filter(Boolean).join(', ')) + '</td><td>' + escape(actor.ownership_notes || 'Not verified') + (actor.notes ? '<br>' + escape(actor.notes) : '') + '</td><td>' + escape(actor.checked_at) + '</td><td>' + sourceLinks(tags(actor.source_ids)) + '</td></tr>').join('');
        const actorInfo = '<div class="detail-title">Project actors and headquarters</div>' + (actors.length ? '<table class="entry-table actor-table"><thead><tr><th>Actor</th><th>Role</th><th>Actor type</th><th>Global HQ</th><th>Ownership and notes</th><th>Checked</th><th>Sources</th></tr></thead><tbody>' + actorBody + '</tbody></table>' : '<div class="detail-notes">Actor headquarters have not been reviewed for this project.</div>');
        return actorInfo + '<div class="detail-title">Project phases and sources</div>' + (project.notes ? '<div class="detail-notes">' + escape(project.notes) + '</div>' : '') + (own.length ? '<table class="entry-table"><thead><tr><th>Phase</th><th>Reported MW</th><th>Measure</th><th>Status</th><th>Investment decision</th><th>Construction start</th><th>Operation / grid date</th><th>' + escape(countedLabel) + '</th><th>Notes</th><th>Sources</th></tr></thead><tbody>' + body + '</tbody></table>' + (totalLine ? '<div class="detail-notes">' + totalLine + '</div>' : '') : '<div class="detail-notes">Capacity and dates have not been disclosed.</div>') + '<div class="detail-notes">' + sourceLinks(sourceIds(project)) + '</div>';
      }
      // A project whose capacity is only part of another project's envelope is counted there, not here.
      const claimProject = new Map(data.capacity.map(claim => [claim.claim_id, claim.project_id]));
      function containedIn(row) {
        const notes = String(row.note || '').split(';').filter(Boolean);
        if (!notes.length || !notes.every(note => note.startsWith('included_in:'))) return null;
        const names = [...new Set(notes.map(note => projects.get(claimProject.get(note.slice(12)))?.project_name).filter(Boolean))];
        return names.length && !names.includes(projects.get(row.project_id).project_name) ? names.join('; ') : null;
      }
      let map = null;
      function render() {
        const view = makeView(data, scenario, filters());
        const year = data.method.scenarios.find(item => item.id === scenario).year;
        const rows = [...view.rows].sort((a, b) => (numeric(b.nameplate_mw_high) ?? numeric(b.nameplate_mw_low) ?? -1) - (numeric(a.nameplate_mw_high) ?? numeric(a.nameplate_mw_low) ?? -1) || projects.get(a.project_id).project_name.localeCompare(projects.get(b.project_id).project_name));
        const { mw, twh, planned, buildout } = view.totals;
        const notes = [];
        if (planned.unknown) notes.push(planned.unknown + ' without assigned capacity');
        const inCampus = rows.filter(row => containedIn(row)).length;
        if (inCampus) notes.push(inCampus + ' counted in campus totals');
        status.innerHTML = '<div class="summary-grid">' +
          '<div class="summary-block summary-selection"><span class="summary-kicker">Selection</span><span><strong>' + rows.length + '</strong> project' + (rows.length === 1 ? '' : 's') + (notes.length ? ' · ' + notes.join(' · ') : '') + '</span></div>' +
          '<div class="summary-block"><span class="summary-kicker">Full build-out</span><span><strong>' + totalRange(planned, 'mw') + ' MW</strong> · <strong>' + totalRange(buildout, 'twh') + ' TWh/year</strong></span></div>' +
          '<div class="summary-block"><span class="summary-kicker">Selected scenario</span><span><strong>' + totalRange(mw, 'mw') + ' MW</strong> in operation in ' + year + ' · <strong>' + totalRange(twh, 'twh') + ' TWh/year</strong></span></div>' +
          '</div>';
        const tbody = document.querySelector('#tracker-table tbody');
        tbody.innerHTML = rows.map(row => {
          const project = projects.get(row.project_id), own = claims.get(row.project_id);
          const checked = sourceIds(project).map(id => sources.get(id)?.accessed).filter(Boolean).sort().pop() || 'Unknown';
          const parents = containedIn(row);
          const knownRange = (low, high, kind = 'mw') => parents ? (kind === 'mw' ? '<span title="Included in ' + escape(parents) + '">In campus</span>' : '–') : row.capacity_known || ['operational', 'cancelled', 'dormant'].includes(row.indicator) ? range(row[low], row[high], kind) : 'Unknown';
          return '<tr class="project-row" data-project="' + escape(project.project_id) + '"><td><button type="button" class="toggle-button" data-toggle="' + escape(project.project_id) + '" aria-expanded="false" aria-controls="details-' + escape(project.project_id) + '" aria-label="Show details for ' + escape(project.project_name) + '">+</button></td><td class="project-cell">' + escape(project.project_name) + '</td><td>' + escape(project.developer) + '</td><td>' + escape(countryLabel(project.country)) + '</td><td>' + escape(project.bidding_zone || 'Unknown') + '</td><td>' + escape(tags(project.type).join('; ')) + '</td><td>' + escape(project.status) + '</td><td>' + escape(projectDecision(own)) + '</td><td class="number-cell">' + knownRange('nameplate_mw_low', 'nameplate_mw_high') + '</td><td class="number-cell">' + knownRange('buildout_twh_low', 'buildout_twh_high', 'twh') + '</td><td>' + escape(operationYears(own, project.status)) + '</td><td>' + escape(checked) + '</td></tr><tr class="detail-row" id="details-' + escape(project.project_id) + '"><td class="detail-cell" colspan="12"></td></tr>';
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
  const api = { numeric, range, totalRange, sumBounds, assertContract, rowsFor, makeView, reported, basisLabel, decisionLabel, operationYears, projectDecision, hqCountryLabel, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.DCTracker = api;
  if (global.document) {
    if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', () => mount(global.document));
    else mount(global.document);
  }
})(typeof window === 'undefined' ? globalThis : window);

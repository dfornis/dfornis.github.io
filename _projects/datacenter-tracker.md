---
layout: page
title: Swedish data center tracker
permalink: /projects/datacenter-tracker/
---

This page tracks publicly reported data center projects in Sweden. The dataset and methodology is under development.

The overview table shows one row per project or campus. Capacity phases and reported capacity entries can be expanded under each project. Summary values are based only on the selected overview entry for each project, not on all underlying capacity entries.

<div class="tracker-controls">
  <label>
    Bidding zone
    <select id="filter-zone">
      <option value="">All</option>
    </select>
  </label>

  <label>
    Status
    <select id="filter-status">
      <option value="">All</option>
    </select>
  </label>

  <label>
    Type
    <select id="filter-type">
      <option value="">All</option>
    </select>
  </label>

  <label>
    Scenario tag
    <select id="filter-scenario">
      <option value="">All</option>
    </select>
  </label>

  <label>
    Search
    <input id="filter-search" type="search" placeholder="Project, developer, notes..." />
  </label>
</div>

<div id="summary-box" class="summary-box"></div>

<div class="table-wrapper">
  <table id="tracker-table">
    <thead>
      <tr>
        <th></th>
        <th>Project</th>
        <th>Developer</th>
        <th>Zone</th>
        <th>Type</th>
        <th>Status</th>
        <th>Reported MW</th>
        <th>Est. IT load MW</th>
        <th>Est. grid load MW</th>
        <th>Est. TWh/year</th>
        <th>PUE</th>
        <th>Load factor</th>
        <th>Expected operation</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>
</div>

## Capacity interpretation and derived load estimates

Capacity figures reported for data center projects are heterogeneous. A reported MW value may refer to IT load, cumulative site capacity, an incremental expansion, full campus build-out potential, backup generation capacity, or generation capacity associated with a proposed co-located energy source. These concepts are not equivalent and have different implications for electricity-system analysis.

The tracker therefore separates the reported capacity value from its interpreted `capacity_basis`. The reported value is stored as `reported_capacity_mw` in the capacity data. The harmonized estimates shown in the table are taken from the processed capacity dataset:

<pre>
reported_capacity_mw
interpreted_it_load_mw
interpreted_grid_load_mw
pue
load_factor
</pre>

For entries interpreted as data center IT or site load, the processed dataset translates reported capacity into estimated grid load using the assigned PUE assumption. Annual electricity use is then estimated from the interpreted grid load and the assigned load factor:

<pre>
estimated TWh/year = interpreted_grid_load_mw × load_factor × 8,760 / 1,000
</pre>

Backup power permits and reactor capacity entries are not treated as data center grid load unless a separate IT load, site load, or grid-connection capacity is reported. This is why some projects may show a reported capacity but no estimated grid load.

The assumptions follow the standard data center energy accounting distinction between IT equipment energy and total facility energy. Shehabi et al. use Power Usage Effectiveness (PUE) to translate IT equipment energy into total data center energy and report typical PUE values of 1.2 for hyperscale facilities, 1.7 for high-end data centers, 1.9 for mid-tier data centers, 2.0 for localized data centers and 2.5 for server rooms. The assumptions file used for this tracker applies PUE and load-factor values by broad project type, including hyperscale, AI/HPC and colocation categories.

<style>
.tracker-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 1.25rem 0 1rem 0;
  align-items: end;
}

.tracker-controls label {
  display: flex;
  flex-direction: column;
  font-size: 0.82rem;
  gap: 0.2rem;
  color: #444;
}

.tracker-controls select,
.tracker-controls input {
  padding: 0.28rem 0.35rem;
  min-width: 145px;
  font-size: 0.82rem;
  border: 1px solid #cfcfcf;
  border-radius: 4px;
  background: #fff;
}

.summary-box {
  margin: 0.75rem 0 1rem 0;
  padding: 0.55rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #f7f6f2;
  font-size: 0.85rem;
  color: #333;
}

.table-wrapper {
  overflow-x: auto;
  border: 1px solid #ddd;
  border-radius: 6px;
}

#tracker-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.5rem;
  line-height: 1.1;
}

#tracker-table th,
#tracker-table td {
  border-bottom: 1px solid #e2e2e2;
  padding: 0.2rem 0.28rem;
  vertical-align: top;
  text-align: left;
}

#tracker-table th {
  font-weight: 600;
  white-space: nowrap;
  background: #f0eee8;
  color: #222;
  position: sticky;
  top: 0;
  z-index: 1;
}

#tracker-table tbody tr.project-row:nth-child(4n+1) {
  background: #ffffff;
}

#tracker-table tbody tr.project-row:nth-child(4n+3) {
  background: #faf8f3;
}

#tracker-table tbody tr.project-row:hover {
  background: #f1eadf;
}

#tracker-table td.project-cell {
  font-weight: 500;
  min-width: 145px;
}

#tracker-table td.number-cell {
  text-align: right;
  white-space: nowrap;
}

#tracker-table td.notes-cell {
  max-width: 320px;
  font-size: 0.72rem;
  color: #444;
}
  #tracker-table td.capacity-cell {
  min-width: 92px;
}

#tracker-table td.capacity-cell .muted {
  display: block;
  margin-top: 0.08rem;
  text-align: right;
}

.toggle-button {
  border: 1px solid #cfcfcf;
  background: #fff;
  border-radius: 4px;
  padding: 0.1rem 0.35rem;
  font-size: 0.72rem;
  cursor: pointer;
}

.toggle-button:hover {
  background: #f1eadf;
}

.detail-row {
  display: none;
  background: #fbfaf7;
}

.detail-cell {
  padding: 0.65rem 0.75rem !important;
  border-bottom: 1px solid #d8d8d8 !important;
}

.detail-title {
  font-size: 0.78rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
}

.entry-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.71rem;
  line-height: 1.2;
  background: #fff;
  border: 1px solid #e0ded8;
}

.entry-table th,
.entry-table td {
  padding: 0.25rem 0.35rem;
  border-bottom: 1px solid #ece9e2;
  vertical-align: top;
}

.entry-table th {
  background: #f5f3ee;
  font-weight: 600;
  white-space: nowrap;
}

.entry-table td.number-cell {
  text-align: right;
}

.entry-table td.entry-notes {
  max-width: 420px;
  color: #444;
}

.muted {
  color: #777;
  font-size: 0.62rem;
}

/* Force compact tracker table */
#tracker-table,
#tracker-table thead,
#tracker-table tbody,
#tracker-table tr,
#tracker-table th,
#tracker-table td {
  font-size: 11px !important;
  line-height: 1.15 !important;
}

#tracker-table th,
#tracker-table td {
  padding: 4px 6px !important;
}

/* Force compact expanded phase table */
.entry-table,
.entry-table thead,
.entry-table tbody,
.entry-table tr,
.entry-table th,
.entry-table td {
  font-size: 10px !important;
  line-height: 1 !important;
}

.entry-table th,
.entry-table td {
  padding: 3px 5px !important;
}

/* Keep notes slightly smaller */
#tracker-table td.notes-cell {
  font-size: 10px !important;
  line-height: 1.1 !important;
}

.entry-table td.entry-notes {
  font-size: 9px !important;
  line-height: 1.1 !important;
}
  
/* Softer table headers */
#tracker-table th,
.entry-table th {
  font-weight: 400 !important;
  color: #333 !important;
  letter-spacing: 0.01em;
}
</style>

<script>
const DATA_PATHS = {
  projects: "{{ '/assets/data/datacenters/projects.json' | relative_url }}",
  capacity: "{{ '/assets/data/datacenters/capacity.json' | relative_url }}",
  assumptions: "{{ '/assets/data/datacenters/assumptions.json' | relative_url }}"
};

let capacityEntriesByProject = {};

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error("Could not load " + path);
  }
  return response.json();
}

function isBlank(value) {
  return value === null || value === undefined || value === "";
}

function blank(value) {
  return isBlank(value) ? "" : value;
}

function escapeHtml(value) {
  if (isBlank(value)) return "";

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value, digits = 1) {
  const parsed = num(value);
  if (parsed === null) return "";
  return parsed.toFixed(digits);
}

function truncateText(text, maxLength = 240) {
  if (!text) return "";
  return text.length > maxLength ? text.slice(0, maxLength).trim() + "..." : text;
}

function splitTags(value) {
  if (!value) return [];
  return String(value).split(";").map(x => x.trim()).filter(Boolean);
}

function uniqueSorted(values) {
  return [...new Set(values.filter(v => !isBlank(v)))].sort();
}

function populateSelect(id, values) {
  const select = document.getElementById(id);

  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function capacityPriority(capacityType) {
  const priorities = {
    "initial_phase_capacity": 1,
    "it_load": 2,
    "cumulative_site_capacity": 3,
    "incremental_expansion_capacity": 4,
    "full_campus_potential": 5,
    "unknown": 6,
    "reactor_capacity": 7,
    "permit_backup_power": 8
  };

  return priorities[capacityType] || 99;
}

function chooseOverviewEntry(entries) {
  if (!entries || entries.length === 0) return null;

  return [...entries].sort((a, b) => {
    const startA = num(a.start_year);
    const startB = num(b.start_year);

    if (startA !== null && startB !== null && startA !== startB) {
      return startA - startB;
    }

    if (startA !== null && startB === null) return -1;
    if (startA === null && startB !== null) return 1;

    const pa = capacityPriority(a.capacity_type);
    const pb = capacityPriority(b.capacity_type);

    if (pa !== pb) return pa - pb;

    const va = num(a.reported_capacity_mw) || 0;
    const vb = num(b.reported_capacity_mw) || 0;

    return vb - va;
  })[0];
}

function estimatedTwh(entry) {
  if (!entry) return null;

  const gridLoad = num(entry.interpreted_grid_load_mw);
  const loadFactor = num(entry.load_factor);

  if (gridLoad === null || loadFactor === null) return null;

  return gridLoad * loadFactor * 8760 / 1000;
}

function buildCapacityIndex(capacityEntries) {
  const index = {};

  capacityEntries.forEach(entry => {
    if (!index[entry.project_id]) {
      index[entry.project_id] = [];
    }

    index[entry.project_id].push(entry);
  });

  Object.keys(index).forEach(projectId => {
    index[projectId].sort((a, b) => {
      const startA = num(a.start_year);
      const startB = num(b.start_year);

      if (startA !== null && startB !== null && startA !== startB) {
        return startA - startB;
      }

      if (startA !== null && startB === null) return -1;
      if (startA === null && startB !== null) return 1;

      return capacityPriority(a.capacity_type) - capacityPriority(b.capacity_type);
    });
  });

  return index;
}

function buildProjectRows(projects, capacityEntries) {
  const index = buildCapacityIndex(capacityEntries);
  capacityEntriesByProject = index;

  return projects.map(project => {
    const entries = index[project.project_id] || [];
    const overviewEntry = chooseOverviewEntry(entries);

    return {
      project_id: project.project_id,
      project_name: project.project_name,
      developer: project.developer,
      bidding_zone: project.bidding_zone,
      type: project.type,
      status: project.status,
      expected_operational_years: project.expected_operational_years,
      notes: project.notes,
      entry_count: entries.length,
      overview_entry_id: overviewEntry ? overviewEntry.claim_id : "",
      phase: overviewEntry ? overviewEntry.phase : "",
      scenario_tag: overviewEntry ? overviewEntry.scenario_tag : "",
      capacity_basis: overviewEntry ? overviewEntry.capacity_type : "unknown",
      reported_capacity_mw: overviewEntry ? overviewEntry.reported_capacity_mw : project.max_reported_capacity_mw,
      interpreted_it_load_mw: overviewEntry ? overviewEntry.interpreted_it_load_mw : null,
      interpreted_grid_load_mw: overviewEntry ? overviewEntry.interpreted_grid_load_mw : null,
      estimated_twh_year: estimatedTwh(overviewEntry),
      pue: overviewEntry ? overviewEntry.pue : null,
      load_factor: overviewEntry ? overviewEntry.load_factor : null
    };
  });
}

function getFilters() {
  return {
    zone: document.getElementById("filter-zone").value,
    status: document.getElementById("filter-status").value,
    type: document.getElementById("filter-type").value,
    scenario: document.getElementById("filter-scenario").value,
    search: document.getElementById("filter-search").value.toLowerCase().trim()
  };
}

function rowMatches(row, filters) {
  const tags = splitTags(row.type);

  const entries = capacityEntriesByProject[row.project_id] || [];
  const entryText = entries.map(entry => [
    entry.phase,
    entry.capacity_type,
    entry.scenario_tag,
    entry.notes
  ].join(" ")).join(" ");

  const text = [
    row.project_name,
    row.developer,
    row.bidding_zone,
    row.type,
    row.status,
    row.capacity_basis,
    row.scenario_tag,
    row.notes,
    entryText
  ].join(" ").toLowerCase();

  const scenarioMatch =
    !filters.scenario ||
    entries.some(entry => entry.scenario_tag === filters.scenario);

  return (
    (!filters.zone || row.bidding_zone === filters.zone) &&
    (!filters.status || row.status === filters.status) &&
    (!filters.type || tags.includes(filters.type)) &&
    scenarioMatch &&
    (!filters.search || text.includes(filters.search))
  );
}

function renderSummary(rows) {
  const totalProjects = rows.length;

  const totalReportedMw = rows.reduce((sum, row) => {
    return sum + (num(row.reported_capacity_mw) || 0);
  }, 0);

  const totalItLoadMw = rows.reduce((sum, row) => {
    return sum + (num(row.interpreted_it_load_mw) || 0);
  }, 0);

  const totalGridLoadMw = rows.reduce((sum, row) => {
    return sum + (num(row.interpreted_grid_load_mw) || 0);
  }, 0);

  const totalTwh = rows.reduce((sum, row) => {
    return sum + (num(row.estimated_twh_year) || 0);
  }, 0);

  document.getElementById("summary-box").innerHTML =
    "<strong>" + totalProjects + "</strong> projects shown · " +
    "<strong>" + round(totalReportedMw, 0) + "</strong> reported MW · " +
    "<strong>" + round(totalItLoadMw, 0) + "</strong> interpreted IT load MW · " +
    "<strong>" + round(totalGridLoadMw, 0) + "</strong> interpreted grid load MW · " +
    "<strong>" + round(totalTwh, 1) + "</strong> estimated TWh/year";
}

function renderEntryTable(projectId) {
  const entries = capacityEntriesByProject[projectId] || [];

  if (entries.length === 0) {
    return "<div class='muted'>No capacity entries available.</div>";
  }

  let html = "";
  html += "<div class='detail-title'>Capacity phases and reported entries</div>";
  html += "<table class='entry-table'>";
  html += "<thead><tr>";
  html += "<th>Entry ID</th>";
  html += "<th>Phase</th>";
  html += "<th>Capacity basis</th>";
  html += "<th>Scenario</th>";
  html += "<th>Start year</th>";
  html += "<th>Reported MW</th>";
  html += "<th>IT load MW</th>";
  html += "<th>Grid load MW</th>";
  html += "<th>TWh/year</th>";
  html += "<th>PUE</th>";
  html += "<th>Load factor</th>";
  html += "<th>Notes</th>";
  html += "</tr></thead><tbody>";

  entries.forEach(entry => {
    html += "<tr>";
    html += "<td>" + escapeHtml(entry.claim_id) + "</td>";
    html += "<td>" + escapeHtml(entry.phase) + "</td>";
    html += "<td>" + escapeHtml(entry.capacity_type) + "</td>";
    html += "<td>" + escapeHtml(entry.scenario_tag) + "</td>";
    html += "<td>" + escapeHtml(entry.start_year) + "</td>";
    html += "<td class='number-cell'>" + round(entry.reported_capacity_mw, 0) + "</td>";
    html += "<td class='number-cell'>" + round(entry.interpreted_it_load_mw, 0) + "</td>";
    html += "<td class='number-cell'>" + round(entry.interpreted_grid_load_mw, 0) + "</td>";
    html += "<td class='number-cell'>" + round(estimatedTwh(entry), 0) + "</td>";
    html += "<td class='number-cell'>" + round(entry.pue, 2) + "</td>";
    html += "<td class='number-cell'>" + round(entry.load_factor, 2) + "</td>";
    html += "<td class='entry-notes'>" + escapeHtml(truncateText(entry.notes, 300)) + "</td>";
    html += "</tr>";
  });

  html += "</tbody></table>";
  return html;
}

function toggleDetails(projectId) {
  const detailRow = document.getElementById("details-" + projectId);
  const button = document.getElementById("toggle-" + projectId);

  if (!detailRow || !button) return;

  const isOpen = detailRow.style.display === "table-row";

  detailRow.style.display = isOpen ? "none" : "table-row";
  button.textContent = isOpen ? "+" : "–";
}

function renderTable(rows) {
  const tbody = document.querySelector("#tracker-table tbody");
  tbody.innerHTML = "";

  rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.className = "project-row";

    const detailButton =
      "<button class='toggle-button' id='toggle-" + escapeHtml(row.project_id) + "' onclick=\"toggleDetails('" + escapeHtml(row.project_id) + "')\">+</button>";

    const capacityBasisInfo = row.capacity_basis
      ? "<br><span class='muted'>" + escapeHtml(row.capacity_basis) + "</span>"
      : "";

    tr.innerHTML =
      "<td>" + detailButton + "</td>" +
      "<td class='project-cell'>" + escapeHtml(row.project_name) + "</td>" +
      "<td>" + escapeHtml(row.developer) + "</td>" +
      "<td>" + escapeHtml(row.bidding_zone) + "</td>" +
      "<td>" + escapeHtml(row.type) + "</td>" +
      "<td>" + escapeHtml(row.status) + "</td>" +
      "<td class='number-cell capacity-cell'>" + round(row.reported_capacity_mw, 0) + capacityBasisInfo + "</td>" +
      "<td class='number-cell'>" + round(row.interpreted_it_load_mw, 0) + "</td>" +
      "<td class='number-cell'>" + round(row.interpreted_grid_load_mw, 0) + "</td>" +
      "<td class='number-cell'>" + round(row.estimated_twh_year, 0) + "</td>" +
      "<td class='number-cell'>" + round(row.pue, 2) + "</td>" +
      "<td class='number-cell'>" + round(row.load_factor, 2) + "</td>" +
      "<td>" + escapeHtml(row.expected_operational_years) + "</td>" +
      "<td class='notes-cell'>" + escapeHtml(truncateText(row.notes)) + "</td>";

    tbody.appendChild(tr);

    const detailTr = document.createElement("tr");
    detailTr.className = "detail-row";
    detailTr.id = "details-" + row.project_id;

    detailTr.innerHTML =
      "<td class='detail-cell' colspan='14'>" +
      renderEntryTable(row.project_id) +
      "</td>";

    tbody.appendChild(detailTr);
  });
}

function redraw(rows) {
  const filters = getFilters();
  const filtered = rows.filter(row => rowMatches(row, filters));

  renderSummary(filtered);
  renderTable(filtered);
}

async function initTracker() {
  const projects = await loadJson(DATA_PATHS.projects);
  const capacity = await loadJson(DATA_PATHS.capacity);
  await loadJson(DATA_PATHS.assumptions);

  const rows = buildProjectRows(projects, capacity);

  populateSelect("filter-zone", uniqueSorted(rows.map(r => r.bidding_zone)));
  populateSelect("filter-status", uniqueSorted(rows.map(r => r.status)));

  const allTypes = uniqueSorted(rows.flatMap(r => splitTags(r.type)));
  populateSelect("filter-type", allTypes);

  const allScenarios = uniqueSorted(capacity.map(entry => entry.scenario_tag));
  populateSelect("filter-scenario", allScenarios);

  ["filter-zone", "filter-status", "filter-type", "filter-scenario", "filter-search"].forEach(id => {
    document.getElementById(id).addEventListener("input", () => redraw(rows));
    document.getElementById(id).addEventListener("change", () => redraw(rows));
  });

  redraw(rows);
}

initTracker().catch(error => {
  console.error(error);
  document.getElementById("summary-box").innerHTML = "Could not load tracker data.";
});
</script>

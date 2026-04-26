---
layout: page
title: Swedish data center tracker
permalink: /projects/datacenter-tracker/
---

This page tracks publicly reported data center projects in Sweden. The dataset is being developed for an upcoming research article estimating the impact of data center load additions on electricity prices in Swedish bidding zones. Sweden is one of the fastest expanding markets in the world for data centers, in large part because it offers renewable electricity and a favourable climate for cooling. Given broader public interest in this ongoing development, I'm sharing the dataset here as a public resource. Note that all entries are interpretations based on news reports and press releases. The dataset and methodology is under development. Key assumptions are stated below.

Projects can be expanded with the **+** sign to show project phases when applicable and what scenario the project is included in.  

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
        <th>Est. grid-side MW</th>
        <th>Est. TWh/year</th>
        <th>PUE</th>
        <th></th>
        <th>Expected operation</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>
</div>

<div class="after-table-space"></div>

## Scenario map

The map below shows estimated additional grid load from data center projects across Swedish bidding zones under four deployment scenarios that are under development for the research article.

<div style="font-size: 0.8em;" markdown="1">
  
| Scenario    | Includes |
| -------    | ------- |
| Low 2030   | Projects with a confirmed investment decision, operational before 2030|
| Stated 2030| All projects and phases with an announced year of operation by 2030|
| Stated 2035| All projects and phases with an announced year of operation by 2035|
| High 2035  | All known projects including ones without an announced year of operation|

</div>

<figure class="scenario-map-figure">
  <img
    src="{{ '/assets/images/datacenter_scenario_map_2.png' | relative_url }}"
    alt="Scenario map of interpreted data-centre load additions in Swedish bidding zones"
    class="scenario-map-image"
  >
</figure>

## Capacity interpretation and derived load estimates

Capacity figures reported for data center projects are heterogeneous. A reported MW value may refer to name-plate (grid connection) capacity, IT load, an incremental undefined expansion, full campus build-out potential or backup generation capacity. These concepts are not equivalent, requiring a layer of interpretation to be applied for comparability. This means that reported figures are first classified by `capacity_basis` before any comparison or harmonization is made. The tracker stores the original reported figure as `reported_capcity_mw`. This value is extracted from press releases, media reports, permitting documents, or company material. It is then translated into two harmonized capacity-side estimates:

<pre>
interpreted_it_load_mw
estimated_grid_side_mw
</pre>

`interpreted_it_load_mw` is the estimate of the IT-side capacity represented by the reported figure. `estimated_grid_side_mw` is the estimated facility- or gride-side capacity after applying the assigned PUE. It is not an estimate of average or peak load.


Annual electricity use is estimated separately using the assigned :

<pre>
estimated TWh/year = grid-side MW × Utilization proxy × 8,760 / 1,000,000
</pre>

Backup power permits and reactor capacity entries are not treated as data center grid load unless a separate IT load, site load, or grid-connection capacity is reported. This is why some projects may show a reported capacity but no estimated grid load.

The assumptions follow the standard data center energy accounting distinction between IT equipment energy and total facility energy. Shehabi et al. (2016) use Power Usage Effectiveness (PUE) to translate IT equipment energy into total data center energy and report typical PUE values of 1.2 for hyperscale facilities, 1.7 for high-end data centers, 1.9 for mid-tier data centers, 2.0 for localized data centers and 2.5 for server rooms. The assumptions file used for this tracker applies PUE and load-factor values by broad project type, including hyperscale, AI/HPC and colocation categories.



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

/* Smaller column headers */
#tracker-table th {
  font-size: 11px !important;
  line-height: 1.12 !important;
  font-weight: 500 !important;
}

/* Smaller expanded-table headers */
.entry-table th {
  font-size: 10.5px !important;
  line-height: 1.12 !important;
  font-weight: 500 !important;
}

/* Smaller summary / pink-beige box text */
.summary-box {
  font-size: 12px !important;
  line-height: 1.25 !important;
  padding: 0.45rem 0.65rem !important;
}

/* Add space between summary box and table */
.table-wrapper {
  margin-top: 0.85rem !important;
}

  /* Space below main table before the method section */
.table-wrapper {
  margin-bottom: 2rem !important;
}

/* Smaller text in the summary box */
#summary-box.summary-box,
div#summary-box.summary-box,
.summary-box,
.summary-box * {
  font-size: 11px !important;
  line-height: 1.2 !important;
}

#summary-box.summary-box {
  padding: 0.4rem 0.6rem !important;
}

.after-table-space {
  height: 1.25rem;
}

  /* Smaller method-code boxes */
pre {
  font-size: 11px !important;
  line-height: 1.25 !important;
  padding: 0.45rem 0.65rem !important;
  margin: 0.6rem 0 0.8rem 0 !important;
}

 .scenario-map-figure {
  margin: 1.2rem 0 1.8rem 0;
  text-align: center;
}

.scenario-map-image {
  display: block;
  max-width: 760px;
  width: 100%;
  height: auto;
  margin: 0 auto;
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
  const loadFactor = num(entry.utilization_proxy);

  if (gridLoad === null || loadFactor === null) return null;

  return gridLoad * loadFactor * 8760 / 1000000;
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
      utilization_proxy: overviewEntry ? overviewEntry.utilization_proxy : null
    };
  });
}

function getFilters() {
  return {
    zone: document.getElementById("filter-zone").value,
    status: document.getElementById("filter-status").value,
    type: document.getElementById("filter-type").value,
    scenario: document.getElementById("filter-scenario").value,
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
    "<strong>" + round(totalGridLoadMw, 0) + "</strong> interpreted grid-side MW · " +
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
  html += "<th>Util. proxy</th>";
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
    html += "<td class='number-cell'>" + round(estimatedTwh(entry), 1) + "</td>";
    html += "<td class='number-cell'>" + round(entry.pue, 2) + "</td>";
    html += "<td class='number-cell'>" + round(entry.utilization_proxy, 2) + "</td>";
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
      "<td class='number-cell'>" + round(row.utilization_proxy, 2) + "</td>" +
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

  ["filter-zone", "filter-status", "filter-type", "filter-scenario"].forEach(id => {
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

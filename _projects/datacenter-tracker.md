---
layout: page
title: Swedish data center tracker
permalink: /projects/datacenter-tracker/
---

This page tracks publicly reported plans for new data center projects in Sweden. The dataset is being developed for an upcoming research article estimating the impact of data center load additions on electricity prices in Swedish bidding zones. The tracker compiles publicly reported project information from press releases, media reports, permitting documents and company material. 

Sweden is currently attracting substantial interest from data center developers due to cheap renewable electricity, climate conditions and land availibility. Given  growing public interest in this development, I'm sharing the dataset here as a public resource. The methodology is still under development. In particular, I am working on improving how heterogenous reported MW figures should be interpreted, and how PUE and annual load factors should be assigned. Corrections, missing projects, better source material and methodological comments are very welcome, please send them **<here><fornborg@kth.se>**.

Projects can be expanded with the **+** sign to show multiple project phases, capacity interpretations, key assumptions, and scenario inclusion.

<div class="tracker-controls">

  <details class="filter-dropdown">
    <summary>Bidding zone</summary>
    <div id="filter-zone-group" class="checkbox-filter-options"></div>
  </details>

  <details class="filter-dropdown">
    <summary>Status</summary>
    <div id="filter-status-group" class="checkbox-filter-options"></div>
  </details>

  <details class="filter-dropdown">
    <summary>Type</summary>
    <div id="filter-type-group" class="checkbox-filter-options"></div>
  </details>

  <details class="filter-dropdown">
    <summary>Scenario</summary>
    <div id="filter-scenario-group" class="checkbox-filter-options"></div>
  </details>

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

| Scenario | Includes |
| ------- | ------- |
| Low 2030 | Projects with a confirmed investment decision, operational before 2030 |
| Stated 2030 | All projects and phases with an announced year of operation by 2030 |
| Stated 2035 | All projects and phases with an announced year of operation by 2035 |
| High 2035 | All known projects including ones without an announced year of operation |

</div>

<figure class="scenario-map-figure">
  <img
    src="{{ '/assets/images/datacenter_scenario_map_2.png' | relative_url }}"
    alt="Scenario map of interpreted data-centre load additions in Swedish bidding zones"
    class="scenario-map-image"
  >
</figure>

## Capacity interpretation and derived estimates

Capacity figures reported for data center projects are heterogeneous. A reported MW value may refer to nameplate grid-connection capacity, IT load, an incremental expansion, full campus build-out potential, or backup generation capacity. These concepts are classified using `capacity_type`. The tracker stores the original reported figure as `reported_capacity_mw`. This value is extracted from press releases, media reports, permitting documents, or company material. Where possible, it is translated into a harmonized IT-side estimate:

<pre>
interpreted_it_load_mw
</pre>

`interpreted_it_load_mw` is the estimated IT-side capacity represented by the reported figure. A corresponding facility- or grid-side estimate is then derived by applying the assigned PUE. Entries that only report backup generation capacity, reactor capacity, or other non-load capacities are not translated into grid-side data center load unless a separate IT load, site load, or grid-connection capacity is reported.

Annual electricity use is estimated using an annual load factor:

<pre>
estimated TWh/year = estimated_grid_side_mw × annual_load_factor × 8,760 / 1,000,000
</pre>

The annual load factor is a facility-type level parameter for annualisation. It is defined here as average realised grid-side load divided by reported or estimated grid-side/nameplate capacity. The parameter captures the fact that reported MW figures often represent maximum, nameplate, contracted, or headline capacity rather than average realised load. A load factor of 0.75 means that a facility with 100 MW of estimated grid-side capacity is assumed to draw 75 MW on average over the year.

The assumptions simplify the data center energy accounting approach in Shehabi et al. (2024), which distinguishes between rated power, maximum power, operational power, idle power, annual average power, and server operational time. In this tracker, Shehabi et al. are used mainly to inform the relative ranking between workload categories, while more facility-level grid-planning sources are used to motivate the load-factor assumptions. EPRI (2026), for example, distinguishes nominal IT capacity, non-IT facility load, ramp-up, annual load factors, hourly utilization, and realised peak demand. E3 (2024) uses a higher data center load-factor assumption when converting between energy and capacity, while Regen and National Grid DSO (2025) highlight that storage, cloud, AI training, and AI inference can have different load shapes.

<style>
.tracker-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin: 1.25rem 0 0.9rem 0;
  align-items: flex-start;
}

.filter-dropdown {
  position: relative;
  min-width: 150px;
  font-size: 11px;
}

.filter-dropdown summary {
  list-style: none;
  cursor: pointer;
  padding: 0.32rem 0.45rem;
  border: 1px solid #cfcfcf;
  border-radius: 4px;
  background: #fff;
  color: #333;
  user-select: none;
}

.filter-dropdown summary::-webkit-details-marker {
  display: none;
}

.filter-dropdown summary::after {
  content: "▾";
  float: right;
  color: #777;
  margin-left: 0.5rem;
}

.filter-dropdown[open] summary::after {
  content: "▴";
}

.filter-dropdown .checkbox-filter-options {
  position: absolute;
  z-index: 20;
  top: calc(100% + 0.25rem);
  left: 0;
  min-width: 230px;
  max-height: 260px;
  overflow-y: auto;
  padding: 0.45rem 0.55rem;
  border: 1px solid #d6d2ca;
  border-radius: 5px;
  background: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.checkbox-filter-options {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 11px;
  color: #444;
}

.checkbox-filter-options label {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  line-height: 1.2;
  cursor: pointer;
}

.checkbox-filter-options input {
  margin-top: 0.05rem;
}

.summary-box {
  margin: 0.75rem 0 1rem 0;
  padding: 0.4rem 0.6rem !important;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #f7f6f2;
  color: #333;
}

#summary-box.summary-box,
div#summary-box.summary-box,
.summary-box,
.summary-box * {
  font-size: 11px !important;
  line-height: 1.2 !important;
}

.table-wrapper {
  overflow-x: auto;
  border: 1px solid #ddd;
  border-radius: 6px;
  margin-top: 0.85rem !important;
  margin-bottom: 2rem !important;
}

#tracker-table {
  width: 100%;
  border-collapse: collapse;
}

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
  border-bottom: 1px solid #e2e2e2;
  padding: 4px 6px !important;
  vertical-align: top;
  text-align: left;
}

#tracker-table th {
  white-space: nowrap;
  background: #f0eee8;
  color: #333 !important;
  position: sticky;
  top: 0;
  z-index: 1;
  font-size: 11px !important;
  line-height: 1.12 !important;
  font-weight: 500 !important;
  letter-spacing: 0.01em;
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
  font-size: 10px !important;
  line-height: 1.1 !important;
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
  background: #fff;
  border: 1px solid #e0ded8;
}

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
  border-bottom: 1px solid #ece9e2;
  vertical-align: top;
}

.entry-table th {
  background: #f5f3ee;
  white-space: nowrap;
  color: #333 !important;
  font-size: 10.5px !important;
  line-height: 1.12 !important;
  font-weight: 500 !important;
  letter-spacing: 0.01em;
}

.entry-table td.number-cell {
  text-align: right;
}

.entry-table td.entry-notes {
  max-width: 420px;
  color: #444;
  font-size: 9px !important;
  line-height: 1.1 !important;
}

.muted {
  color: #777;
  font-size: 0.62rem;
}

.after-table-space {
  height: 1.25rem;
}

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
let assumptionIndex = {};

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

function scenarioLabel(value) {
  const labels = {
    "low_2030": "Low 2030",
    "stated_2030": "Stated 2030",
    "stated_2035": "Stated 2035",
    "high_2035": "High 2035"
  };

  return labels[value] || value;
}

function typeLabel(value) {
  const labels = {
    "hyperscale": "Hyperscale",
    "AI": "AI",
    "HPC": "HPC",
    "colocation": "Colocation",
    "research": "Research",
    "SMR-linked": "SMR-linked"
  };

  return labels[value] || value;
}

function normalizeTypeTags(value) {
  return splitTags(value).map(tag => tag.toLowerCase());
}

function assumptionCategory(typeValue) {
  const tags = normalizeTypeTags(typeValue);

  const hasHyperscale = tags.includes("hyperscale");
  const hasAi = tags.includes("ai");
  const hasHpc = tags.includes("hpc");
  const hasColocation = tags.includes("colocation");
  const hasResearch = tags.includes("research") || tags.includes("smr-linked");

  if (hasResearch) return "Research_SMR";
  if (hasColocation && hasAi) return "Colocation_AI";
  if (hasColocation) return "Colocation";
  if (hasAi && hasHpc) return "AI_HPC";
  if (hasHyperscale && hasAi) return "Hyperscale_AI";
  if (hasHyperscale) return "Hyperscale";
  if (hasAi || hasHpc) return "AI_HPC";

  return "Hyperscale";
}

function buildAssumptionIndex(assumptions) {
  const index = {};

  assumptions.forEach(item => {
    index[item.assumption_id] = item;
  });

  return index;
}

function assumptionValue(id) {
  const item = assumptionIndex[id];
  return item ? num(item.value) : null;
}

function pueForType(typeValue) {
  const category = assumptionCategory(typeValue);
  return assumptionValue("PUE_" + category);
}

function loadFactorForType(typeValue) {
  const category = assumptionCategory(typeValue);
  return assumptionValue("LF_" + category);
}

function populateCheckboxGroup(id, values, labelFunction = value => value) {
  const container = document.getElementById(id);
  container.innerHTML = "";

  values.forEach(value => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.value = value;
    checkbox.dataset.filterGroup = id;

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(labelFunction(value)));

    container.appendChild(label);
  });
}

function getCheckedValues(groupId) {
  return Array.from(
    document.querySelectorAll("#" + groupId + " input[type='checkbox']:checked")
  ).map(input => input.value);
}

function capacityPriority(capacityType) {
  const priorities = {
    "initial_phase_capacity": 1,
    "it_load": 2,
    "cumulative_site_capacity": 3,
    "incremental_expansion": 4,
    "incremental_expansion_capacity": 4,
    "full_campus_potential": 5,
    "unknown": 6,
    "reactor_capacity": 7,
    "permit_backup_power": 8
  };

  return priorities[capacityType] || 99;
}

function isNonLoadCapacity(entry) {
  return ["permit_backup_power", "reactor_capacity"].includes(entry.capacity_type);
}

function entryPue(entry) {
  const direct = num(entry.pue);
  if (direct !== null) return direct;
  if (isNonLoadCapacity(entry) && num(entry.interpreted_it_load_mw) === null) return null;
  return pueForType(entry.type);
}

function entryLoadFactor(entry) {
  const direct = num(entry.annual_load_factor);
  if (direct !== null) return direct;

  const legacy = num(entry.load_factor);
  if (legacy !== null) return legacy;

  const oldProxy = num(entry.utilization_proxy);
  if (oldProxy !== null) return oldProxy;

  if (isNonLoadCapacity(entry) && num(entry.interpreted_it_load_mw) === null) return null;
  return loadFactorForType(entry.type);
}

function estimatedGridSideMw(entry) {
  if (!entry) return null;

  const explicitGrid = num(entry.estimated_grid_side_mw);
  if (explicitGrid !== null) return explicitGrid;

  const legacyGrid = num(entry.interpreted_grid_load_mw);
  if (legacyGrid !== null) return legacyGrid;

  const gridSide = num(entry.grid_side_capacity_mw);
  if (gridSide !== null) return gridSide;

  const itLoad = num(entry.interpreted_it_load_mw);
  const pue = entryPue(entry);

  if (itLoad === null || pue === null) return null;

  return itLoad * pue;
}

function estimatedTwh(entry) {
  if (!entry) return null;

  const gridSideMw = estimatedGridSideMw(entry);
  const loadFactor = entryLoadFactor(entry);

  if (gridSideMw === null || loadFactor === null) return null;

  return gridSideMw * loadFactor * 8760 / 1000000;
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
      estimated_grid_side_mw: overviewEntry ? estimatedGridSideMw(overviewEntry) : null,
      estimated_twh_year: estimatedTwh(overviewEntry),
      pue: overviewEntry ? entryPue(overviewEntry) : null,
      annual_load_factor: overviewEntry ? entryLoadFactor(overviewEntry) : null
    };
  });
}

function getFilters() {
  return {
    zones: getCheckedValues("filter-zone-group"),
    statuses: getCheckedValues("filter-status-group"),
    types: getCheckedValues("filter-type-group"),
    scenarios: getCheckedValues("filter-scenario-group")
  };
}

function rowMatches(row, filters) {
  const rowTypeTags = splitTags(row.type);
  const entries = capacityEntriesByProject[row.project_id] || [];

  const zoneMatch =
    filters.zones.length === 0 ||
    filters.zones.includes(row.bidding_zone);

  const statusMatch =
    filters.statuses.length === 0 ||
    filters.statuses.includes(row.status);

  const typeMatch =
    filters.types.length === 0 ||
    filters.types.some(type => rowTypeTags.includes(type));

  const scenarioMatch =
    filters.scenarios.length === 0 ||
    entries.some(entry => {
      const entryScenarios = splitTags(entry.scenario_tag);
      return filters.scenarios.some(scenario => entryScenarios.includes(scenario));
    });

  return zoneMatch && statusMatch && typeMatch && scenarioMatch;
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
    return sum + (num(row.estimated_grid_side_mw) || 0);
  }, 0);

  const totalTwh = rows.reduce((sum, row) => {
    return sum + (num(row.estimated_twh_year) || 0);
  }, 0);

  document.getElementById("summary-box").innerHTML =
    "<strong>" + totalProjects + "</strong> projects shown · " +
    "<strong>" + round(totalReportedMw, 0) + "</strong> reported MW · " +
    "<strong>" + round(totalItLoadMw, 0) + "</strong> interpreted IT load MW · " +
    "<strong>" + round(totalGridLoadMw, 0) + "</strong> estimated grid-side MW · " +
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
  html += "<th>Capacity type</th>";
  html += "<th>Scenario</th>";
  html += "<th>Start year</th>";
  html += "<th>Reported MW</th>";
  html += "<th>IT load MW</th>";
  html += "<th>Grid-side MW</th>";
  html += "<th>TWh/year</th>";
  html += "<th>PUE</th>";
  html += "<th>Load factor</th>";
  html += "<th>Notes</th>";
  html += "</tr></thead><tbody>";

  entries.forEach(entry => {
    const scenarioText = splitTags(entry.scenario_tag).map(scenarioLabel).join("; ");

    html += "<tr>";
    html += "<td>" + escapeHtml(entry.claim_id) + "</td>";
    html += "<td>" + escapeHtml(entry.phase) + "</td>";
    html += "<td>" + escapeHtml(entry.capacity_type) + "</td>";
    html += "<td>" + escapeHtml(scenarioText) + "</td>";
    html += "<td>" + escapeHtml(entry.start_year) + "</td>";
    html += "<td class='number-cell'>" + round(entry.reported_capacity_mw, 0) + "</td>";
    html += "<td class='number-cell'>" + round(entry.interpreted_it_load_mw, 0) + "</td>";
    html += "<td class='number-cell'>" + round(estimatedGridSideMw(entry), 0) + "</td>";
    html += "<td class='number-cell'>" + round(estimatedTwh(entry), 1) + "</td>";
    html += "<td class='number-cell'>" + round(entryPue(entry), 2) + "</td>";
    html += "<td class='number-cell'>" + round(entryLoadFactor(entry), 2) + "</td>";
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
      "<td class='number-cell'>" + round(row.estimated_grid_side_mw, 0) + "</td>" +
      "<td class='number-cell'>" + round(row.estimated_twh_year, 1) + "</td>" +
      "<td>" + escapeHtml(row.expected_operational_years) + "</td>" +
      "<td class='notes-cell'>" + escapeHtml(truncateText(row.notes)) + "</td>";

    tbody.appendChild(tr);

    const detailTr = document.createElement("tr");
    detailTr.className = "detail-row";
    detailTr.id = "details-" + row.project_id;

    detailTr.innerHTML =
      "<td class='detail-cell' colspan='12'>" +
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
  const assumptions = await loadJson(DATA_PATHS.assumptions);

  assumptionIndex = buildAssumptionIndex(assumptions);

  const rows = buildProjectRows(projects, capacity);

  populateCheckboxGroup(
    "filter-zone-group",
    uniqueSorted(rows.map(r => r.bidding_zone))
  );

  populateCheckboxGroup(
    "filter-status-group",
    uniqueSorted(rows.map(r => r.status))
  );

  const allTypes = uniqueSorted(
    rows.flatMap(r => splitTags(r.type))
  );

  populateCheckboxGroup(
    "filter-type-group",
    allTypes,
    typeLabel
  );

  const allScenarios = uniqueSorted(
    capacity.flatMap(entry => splitTags(entry.scenario_tag))
  );

  populateCheckboxGroup(
    "filter-scenario-group",
    allScenarios,
    scenarioLabel
  );

  document.querySelectorAll(".checkbox-filter-options input[type='checkbox']").forEach(input => {
    input.addEventListener("change", () => redraw(rows));
  });

  redraw(rows);
}

initTracker().catch(error => {
  console.error(error);
  document.getElementById("summary-box").innerHTML = "Could not load tracker data.";
});
</script>

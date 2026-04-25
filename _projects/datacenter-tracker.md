---
layout: page
title: Swedish data center tracker
permalink: /projects/datacenter-tracker/
---

# Swedish data center tracker

This page collects publicly reported data center projects in Sweden. The dataset is under development and should be interpreted as a structured tracker of reported plans, not as a forecast.

The table combines project-level information with reported capacity claims. Where possible, reported capacity is translated into an estimated grid load and annual electricity use using explicit assumptions.

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
    Search
    <input id="filter-search" type="search" placeholder="Project, developer, municipality..." />
  </label>
</div>

<div id="summary-box" class="summary-box"></div>

<div class="table-wrapper">
  <table id="tracker-table">
    <thead>
      <tr>
        <th>Project</th>
        <th>Developer</th>
        <th>Zone</th>
        <th>Municipality</th>
        <th>Type</th>
        <th>Status</th>
        <th>Reported MW</th>
        <th>Capacity basis</th>
        <th>Est. grid load MW</th>
        <th>Est. TWh/year</th>
        <th>Expected operation</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>
</div>

<style>
.tracker-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin: 1.5rem 0;
  align-items: end;
}

.tracker-controls label {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  gap: 0.25rem;
}

.tracker-controls select,
.tracker-controls input {
  padding: 0.35rem;
  min-width: 160px;
}

.summary-box {
  margin: 1rem 0;
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fafafa;
  font-size: 0.95rem;
}

.table-wrapper {
  overflow-x: auto;
}

#tracker-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

#tracker-table th,
#tracker-table td {
  border-bottom: 1px solid #ddd;
  padding: 0.45rem;
  vertical-align: top;
  text-align: left;
}

#tracker-table th {
  font-weight: 600;
  white-space: nowrap;
}

#tracker-table td.notes-cell {
  max-width: 360px;
  font-size: 0.85rem;
}

.muted {
  color: #666;
}
</style>

<script>
const DATA_PATHS = {
  projects: "{{ '/assets/data/datacenters/projects.json' | relative_url }}",
  capacity: "{{ '/assets/data/datacenters/capacity.json' | relative_url }}",
  assumptions: "{{ '/assets/data/datacenters/assumptions.json' | relative_url }}"
};

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Could not load ${path}`);
  }
  return response.json();
}

function blank(value) {
  return value === null || value === undefined || Number.isNaN(value) ? "" : value;
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

function truncateText(text, maxLength = 260) {
  if (!text) return "";
  return text.length > maxLength ? text.slice(0, maxLength).trim() + "..." : text;
}

function splitTags(value) {
  if (!value) return [];
  return value.split(";").map(x => x.trim()).filter(Boolean);
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
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
    "full_campus_potential": 1,
    "cumulative_site_capacity": 2,
    "initial_phase_capacity": 3,
    "incremental_expansion_capacity": 4,
    "it_load": 5,
    "reactor_capacity": 6,
    "permit_backup_power": 7,
    "unknown": 99
  };

  return priorities[capacityType] || 98;
}

function chooseDisplayCapacity(claims) {
  if (!claims || claims.length === 0) return null;

  return [...claims].sort((a, b) => {
    const pa = capacityPriority(a.capacity_type);
    const pb = capacityPriority(b.capacity_type);

    if (pa !== pb) return pa - pb;

    const va = num(a.value_mw) || 0;
    const vb = num(b.value_mw) || 0;

    return vb - va;
  })[0];
}

function getAssumptionValue(assumptions, type, fallback) {
  const match = assumptions.find(a =>
    String(a.assumption_type || "").toLowerCase() === type.toLowerCase()
  );

  const value = match ? num(match.value) : null;
  return value === null ? fallback : value;
}

function deriveGridLoadMw(claim, assumptions) {
  if (!claim) return null;

  const existing = num(claim.interpreted_grid_load_mw);
  if (existing !== null) return existing;

  const valueMw = num(claim.value_mw);
  if (valueMw === null) return null;

  const pue = num(claim.pue) || getAssumptionValue(assumptions, "PUE", 1.3);

  if (claim.capacity_type === "permit_backup_power") {
    return null;
  }

  if (claim.capacity_type === "reactor_capacity") {
    return null;
  }

  return valueMw * pue;
}

function deriveAnnualTwh(gridLoadMw, claim, assumptions) {
  if (gridLoadMw === null) return null;

  const loadFactor =
    num(claim.load_factor) ||
    num(claim.load_factor_assumption) ||
    getAssumptionValue(assumptions, "Load Factor", 0.75);

  return gridLoadMw * loadFactor * 8760 / 1000;
}

function buildProjectRows(projects, capacityClaims, assumptions) {
  return projects.map(project => {
    const claims = capacityClaims.filter(c => c.project_id === project.project_id);
    const displayClaim = chooseDisplayCapacity(claims);

    const reportedMw = displayClaim ? num(displayClaim.value_mw) : num(project.max_reported_capacity_mw);
    const gridLoadMw = deriveGridLoadMw(displayClaim, assumptions);
    const annualTwh = deriveAnnualTwh(gridLoadMw, displayClaim || {}, assumptions);

    return {
      project_id: project.project_id,
      project_name: project.project_name,
      developer: project.developer,
      bidding_zone: project.bidding_zone,
      municipality: project.municipality,
      county: project.county,
      type: project.type,
      status: project.status,
      expected_operational_years: project.expected_operational_years,
      notes: project.notes,
      reported_mw: reportedMw,
      capacity_basis: displayClaim ? displayClaim.capacity_type : "unknown",
      selected_claim_id: displayClaim ? displayClaim.claim_id : "",
      estimated_grid_load_mw: gridLoadMw,
      estimated_twh_year: annualTwh
    };
  });
}

function getFilters() {
  return {
    zone: document.getElementById("filter-zone").value,
    status: document.getElementById("filter-status").value,
    type: document.getElementById("filter-type").value,
    search: document.getElementById("filter-search").value.toLowerCase().trim()
  };
}

function rowMatches(row, filters) {
  const tags = splitTags(row.type);

  const text = [
    row.project_name,
    row.developer,
    row.municipality,
    row.county,
    row.bidding_zone,
    row.type,
    row.status,
    row.notes
  ].join(" ").toLowerCase();

  return (
    (!filters.zone || row.bidding_zone === filters.zone) &&
    (!filters.status || row.status === filters.status) &&
    (!filters.type || tags.includes(filters.type)) &&
    (!filters.search || text.includes(filters.search))
  );
}

function renderSummary(rows) {
  const totalProjects = rows.length;

  const totalReportedMw = rows.reduce((sum, row) => sum + (num(row.reported_mw) || 0), 0);
  const totalGridLoadMw = rows.reduce((sum, row) => sum + (num(row.estimated_grid_load_mw) || 0), 0);
  const totalTwh = rows.reduce((sum, row) => sum + (num(row.estimated_twh_year) || 0), 0);

  document.getElementById("summary-box").innerHTML = `
    <strong>${totalProjects}</strong> projects shown ·
    <strong>${round(totalReportedMw, 0)}</strong> reported MW ·
    <strong>${round(totalGridLoadMw, 0)}</strong> estimated grid load MW ·
    <strong>${round(totalTwh, 1)}</strong> estimated TWh/year
  `;
}

function renderTable(rows) {
  const tbody = document.querySelector("#tracker-table tbody");
  tbody.innerHTML = "";

  rows.forEach(row => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${blank(row.project_name)}</td>
      <td>${blank(row.developer)}</td>
      <td>${blank(row.bidding_zone)}</td>
      <td>${blank(row.municipality)}</td>
      <td>${blank(row.type)}</td>
      <td>${blank(row.status)}</td>
      <td>${round(row.reported_mw, 0)}</td>
      <td>
        ${blank(row.capacity_basis)}
        ${row.selected_claim_id ? `<br><span class="muted">${row.selected_claim_id}</span>` : ""}
      </td>
      <td>${round(row.estimated_grid_load_mw, 0)}</td>
      <td>${round(row.estimated_twh_year, 1)}</td>
      <td>${blank(row.expected_operational_years)}</td>
      <td class="notes-cell">${truncateText(row.notes)}</td>
    `;

    tbody.appendChild(tr);
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

  const rows = buildProjectRows(projects, capacity, assumptions);

  populateSelect("filter-zone", uniqueSorted(rows.map(r => r.bidding_zone)));
  populateSelect("filter-status", uniqueSorted(rows.map(r => r.status)));

  const allTypes = uniqueSorted(rows.flatMap(r => splitTags(r.type)));
  populateSelect("filter-type", allTypes);

  ["filter-zone", "filter-status", "filter-type", "filter-search"].forEach(id => {
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

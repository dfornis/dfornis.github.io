---
layout: page
title: Nordic data center tracker
img: /assets/images/datacenter_thumbnail_2.png
permalink: /projects/datacenter-tracker/
---

This page tracks publicly reported plans for new data center projects in Sweden, Norway and Finland. The dataset is being developed for an upcoming research article estimating the impact of data center load additions on electricity prices in Nordic bidding zones. The tracker compiles publicly reported project information from press releases, media reports, permitting documents and company material.

The Nordic countries are currently attracting substantial interest from data center developers due to cheap renewable electricity, climate conditions and land availability. I'm sharing the dataset here as a public resource and to open the project for comments and suggestions. The methodology is still under development. In particular, I am working on improving how heterogeneous reported MW figures should be interpreted, and how PUE and annual load factors should be assigned. Corrections, missing projects, better source material and methodological comments are very welcome, please send them to <fornborg@kth.se>.

Projects can be expanded with the **+** sign to show multiple project phases, capacity interpretations, key assumptions, and scenario inclusion.

<div class="tracker-controls">

  <details class="filter-dropdown">
    <summary>Country</summary>
    <div id="filter-country-group" class="checkbox-filter-options"></div>
  </details>

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
        <th>Country</th>
        <th>Zone</th>
        <th>Type</th>
        <th>Project status</th>
        <th>Investment decision</th>
        <th id="reported-mw-header">Max reported MW</th>
        <th id="it-load-mw-header">Est. IT load MW</th>
        <th id="grid-side-mw-header">Est. grid-side MW</th>
        <th id="twh-header">Est. TWh/year</th>
        <th>Expected operation</th>
        <th>Last updated</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>
</div>

<div class="after-table-space"></div>

## Scenario map

The map below shows estimated grid-side (nameplate) capacity from data center projects across Nordic bidding zones under four deployment scenarios. Depending on the initial reported number, they include auxiliary power use through the assigned PUE assumptions. They should not be interpreted as average load.


<div class="after-table-space"></div>


<div id="dc-scenario-map"></div>



<script>
window.DC_TRACKER_PATHS = {
  projects: "{{ '/assets/data/datacenters/projects.json' | relative_url }}?v=20260514-fi",
  capacity: "{{ '/assets/data/datacenters/capacity.json' | relative_url }}?v=20260514-fi",
  scenarioZone: "{{ '/assets/data/datacenters/scenario_zone.json' | relative_url }}?v=20260514-fi",
  biddingZones: "{{ '/assets/data/datacenters/bidding_zones.geojson' | relative_url }}?v=20260514-fi"
};
</script>

<script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
<script src="{{ '/assets/js/datacenter-tracker/scenario-map-d3.js?v=20260514-total-row-align' | relative_url }}"></script>

<div class="after-table-space"></div>


| Scenario | Includes |
| ------- | ------- |
| Low 2030 | Projects and phases with a confirmed investment decision, operational before 2030 |
| Stated 2030 | All projects and phases with an announced year of operation by 2030 |
| Stated 2035 | All projects and phases with an announced year of operation by 2035 |
| High 2035 | Close to all known projects including ones without an announced year of operation |

<div class="after-table-space"></div>



## Capacity interpretation and derived estimates

Capacity figures reported for data center projects are heterogeneous. A reported MW value may refer to nameplate grid-connection capacity, IT load, an incremental expansion, full campus build-out potential, or backup generation capacity. These concepts are classified using `capacity_type`. The tracker stores the original reported figure as `reported_capacity_mw`. This value is extracted from press releases, media reports, permitting documents, or company material. Where possible, it is translated into a harmonized IT-side estimate:

<pre>
interpreted_it_load_mw
</pre>

`interpreted_it_load_mw` is the estimated IT-side capacity represented by the reported figure. A corresponding facility- or grid-side estimate is derived locally in the data build script by applying the assigned PUE. Entries that only report backup generation capacity, reactor capacity, or other non-load capacities are not translated into grid-side data center load unless a separate IT load, site load, or grid-connection capacity is reported.

Annual electricity use is estimated in the local data build script using an annual load factor:

<pre>
estimated TWh/year = estimated_grid_side_mw × annual_load_factor × 8,760 / 1,000,000
</pre>

Reported capacity figures need two additional assumptions before they can be compared as electricity demand. PUE is used to move from IT load to total facility load, including cooling and other site electricity use. The load factor is used to annualise capacity: it describes average realised grid-side load as a share of reported or estimated grid-side/nameplate capacity.

The most direct source for the load-factor assumptions is EPRI (2026), which reports observed annual load factors relative to nameplate capacity for both a large hyperscale facility and smaller multi-tenant colocation facilities. Shehabi et al. (2024) provides the main basis for separating AI/HPC from more conventional workloads, especially through its treatment of AI training operational time, cooling systems and PUE. Regen (2024) is used to interpret how cloud, colocation, AI training and AI inference can differ in load shape. E3 (2024) and IEA (2025) are used as broader checks against recent data center electricity outlooks.


<div class="assumption-table-wrap">
  <table class="assumption-table">
    <thead>
      <tr>
        <th>Data center type</th>
        <th>PUE</th>
        <th>Load factor</th>
        <th>Adapted from</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Hyperscale</td>
        <td class="number-cell">1.20</td>
        <td class="number-cell">0.75</td>
        <td class="assumption-source">EPRI (2026); Shehabi et al. (2024)</td>
      </tr>
      <tr>
        <td>Hyperscale / AI</td>
        <td class="number-cell">1.20</td>
        <td class="number-cell">0.75</td>
        <td class="assumption-source">EPRI (2026); Shehabi et al. (2024); Regen (2024)</td>
      </tr>
      <tr>
        <td>AI / HPC</td>
        <td class="number-cell">1.25</td>
        <td class="number-cell">0.80</td>
        <td class="assumption-source">Shehabi et al. (2024); EPRI (2026)</td>
      </tr>
      <tr>
        <td>Colocation / AI</td>
        <td class="number-cell">1.35</td>
        <td class="number-cell">0.60</td>
        <td class="assumption-source">EPRI (2026); Regen (2024); Shehabi et al. (2024)</td>
      </tr>
      <tr>
        <td>Colocation</td>
        <td class="number-cell">1.35</td>
        <td class="number-cell">0.57</td>
        <td class="assumption-source">EPRI (2026); Shehabi et al. (2024)</td>
      </tr>
    </tbody>
  </table>
</div>

The table gives the type-level assumptions used in the calculations. They are not measurements of individual Nordic facilities. They are a transparent bridge between public project announcements, which often report headline MW figures, and the grid-side capacity and annual electricity estimates shown above. A load factor of 0.75 means that a facility with 100 MW of estimated grid-side capacity is assumed to draw 75 MW on average over the year.

## How the dataset is built

The dataset behind this page is maintained in a separate pipeline repository so that only reviewed records reach the public site. Language-model agents handle source discovery and auditing; a human reviews everything before it becomes master data; R scripts handle the steps in between.

1. **Shared reference data.** Countries, bidding zones, administrative units, PUE and load-factor assumptions, and source records live in master files that define the allowed geography and the assumptions used by every later step. These are manually maintained.

2. **Country-scoped discovery and audit.** A base prompt is combined with one country overlay (Swedish, Finnish, or Norwegian) and run with an agent. Discovery searches for new sites and capacity claims; audit re-checks existing rows against newer or stronger evidence. Runs are scoped to one country at a time and tailored to language and national reporting conventions. 

3. **Agent output goes to review files.** Proposed updates and new candidates are written to audit and candidate files with source URL, evidence excerpt, and rationale. 

4. **Human review.** Every proposed change is checked manually before it can become master data: source quality, conflicts between sources, how reported MW figures should be interpreted, and whether a candidate should be included or not. An R script is run which allows for manual inclusion and exclusion of candidates when merging with the master documents.

5. **Build.** Once master data is updated, an R script applies the documented PUE and load-factor assumptions, derives grid-side capacity and annual electricity use, assembles scenarios with de-duplication, and writes the JSON files that enter this tracker. Generated JSON files are not edited by hand. If something is wrong, the master data is corrected and the build is re-run.

<style>
@import url("{{ '/assets/css/datacenter-tracker-map.css?v=20260514-total-row-align' | relative_url }}");
  
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
  max-height: 430px;
  overflow: auto;
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

.detail-notes {
  margin: 0 0 0.65rem 0;
  padding: 0.45rem 0.55rem;
  border: 1px solid #e0ded8;
  background: #fff;
  color: #444;
  font-size: 10px !important;
  line-height: 1.2 !important;
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

.assumption-table-wrap {
  margin: 0.75rem 0 1rem 0;
  overflow-x: auto;
  border: 1px solid #e0ded8;
  border-radius: 6px;
  background: #fffdf8;
}

.assumption-table {
  width: 100%;
  border-collapse: collapse;
  background: transparent;
}

.assumption-table,
.assumption-table thead,
.assumption-table tbody,
.assumption-table tr,
.assumption-table th,
.assumption-table td {
  font-size: 10px !important;
  line-height: 1.16 !important;
}

.assumption-table th,
.assumption-table td {
  padding: 5px 6px !important;
  border-bottom: 1px solid #ece9e2;
  vertical-align: top;
  text-align: left;
}

.assumption-table th {
  background: #f5f3ee;
  color: #333 !important;
  white-space: nowrap;
  font-weight: 500 !important;
}

.assumption-table td.number-cell {
  text-align: right;
  white-space: nowrap;
}

.assumption-table .assumption-source {
  color: #555;
}

.muted {
  color: #777;
  font-size: 0.62rem;
}

.after-table-space {
  height: 1.25rem;
}

.dc-scenario-map-root {
  max-width: 760px;
  margin: 0.8rem auto 1.8rem auto;
}

.dc-map-controls {
  display: flex;
  justify-content: center;
  gap: 0.85rem;
  align-items: center;
  margin-bottom: 0.45rem;
}

.dc-scenario-controls {
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
}

.dc-scenario-button {
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #2f3331;
  padding: 0.12rem 0.34rem 0.2rem 0.34rem;
  cursor: pointer;
  font-size: 12px !important;
  line-height: 1.05 !important;
  min-width: 55px;
}

.dc-scenario-button span,
.dc-scenario-button small {
  display: block;
  letter-spacing: 0;
}

.dc-scenario-button small {
  color: #777;
  margin-top: 0.08rem;
}

.dc-scenario-button.active {
  border-bottom-color: #2f3331;
  color: #111;
}

.dc-scenario-svg-wrap {
  width: 100%;
}

.dc-scenario-svg {
  display: block;
  width: 100%;
  height: auto;
}

.dc-zone {
  stroke: #6f7474;
  stroke-width: 1.1;
  transition: fill 0.16s ease;
}

.dc-zone-label {
  fill: #4b5356;
  font-family: "Avenir Next", "Helvetica Neue", Arial, sans-serif;
  font-size: 13px !important;
  font-weight: 400 !important;
  letter-spacing: 0.01em;
  pointer-events: none;
}

.dc-callout-line {
  stroke: #8a9295;
  stroke-width: 0.8;
  stroke-dasharray: 2 3;
}

.dc-callout-value {
  fill: #2f383b;
  font-family: "Avenir Next", "Helvetica Neue", Arial, sans-serif;
  font-size: 15.4px !important;
  font-weight: 400 !important;
  letter-spacing: 0.01em;
}

.dc-callout.empty {
  opacity: 0.45;
}

.dc-phase-point {
  cursor: pointer;
  outline: none;
}

.dc-phase-dot {
  fill: #6f7f76;
  fill-opacity: 0.72;
  stroke: #fbf8f0;
  stroke-width: 1.1;
  vector-effect: non-scaling-stroke;
}

.dc-phase-point:hover .dc-phase-dot,
.dc-phase-point:focus .dc-phase-dot {
  fill-opacity: 0.9;
  stroke-width: 1.6;
}

.dc-phase-count {
  fill: #fff;
  font-size: 9.5px;
  font-weight: 700;
  pointer-events: none;
}

.dc-phase-popup-bg {
  fill: #fffdf8;
  stroke: #d6d2ca;
  stroke-width: 1;
}

.dc-phase-popup-text {
  fill: #333;
  font-size: 10px;
}

.dc-phase-popup-title {
  font-weight: 700;
  font-size: 12.8px;
}

.dc-phase-popup-meta {
  fill: #666;
  font-size: 9.6px;
}

.dc-phase-popup-line {
  fill: #333;
  font-size: 9.4px;
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
  projects: "{{ '/assets/data/datacenters/projects.json' | relative_url }}?v=20260514-fi",
  capacity: "{{ '/assets/data/datacenters/capacity.json' | relative_url }}?v=20260514-fi"
};

let capacityEntriesByProject = {};
let projectRowsById = {};

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

function formatNumber(value, digits = 0) {
  const parsed = num(value);
  if (parsed === null) return "";

  return parsed.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
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

function countryLabel(value) {
  const labels = {
    "SE": "Sweden",
    "NO": "Norway",
    "FI": "Finland"
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

function estimatedGridSideMw(entry) {
  if (!entry) return null;
  return num(entry.estimated_grid_side_mw);
}

function estimatedTwh(entry) {
  if (!entry) return null;
  return num(entry.estimated_twh_year);
}

function scenarioTimeYear(entry) {
  const years = [entry.start_year, entry.construction_start_year]
    .map(value => {
      const match = String(value || "").match(/^[0-9]{4}/);
      return match ? Number(match[0]) : null;
    })
    .filter(value => value !== null);

  return years.length ? Math.min(...years) : null;
}

function isScenarioEligible(entry) {
  return num(entry.interpreted_it_load_mw) !== null && !isNonLoadCapacity(entry);
}

function isSiteTotalCapacity(entry) {
  return ["full_campus_potential", "cumulative_site_capacity"].includes(entry.capacity_type);
}

function isAdditiveCapacity(entry) {
  return ["incremental_expansion", "incremental_expansion_capacity"].includes(entry.capacity_type);
}

function entryMatchesScenarioDirectly(entry, scenarioId) {
  if (!isScenarioEligible(entry)) return false;

  const year = scenarioTimeYear(entry);

  if (scenarioId === "low_2030") {
    return entry.investment_decision === "yes" && year !== null && year <= 2030;
  }

  if (scenarioId === "stated_2030") {
    return year !== null && year <= 2030;
  }

  if (scenarioId === "stated_2035") {
    return year !== null && year <= 2035;
  }

  if (scenarioId === "high_2035") {
    return true;
  }

  return false;
}

function scenarioSort(a, b) {
  const gridA = estimatedGridSideMw(a) ?? -Infinity;
  const gridB = estimatedGridSideMw(b) ?? -Infinity;

  if (gridA !== gridB) return gridB - gridA;

  const yearA = scenarioTimeYear(a) ?? 9999;
  const yearB = scenarioTimeYear(b) ?? 9999;

  return yearA - yearB;
}

function chooseScenarioAccountingEntries(entries) {
  const siteTotals = entries.filter(isSiteTotalCapacity);

  if (siteTotals.length > 0) {
    return [...siteTotals].sort(scenarioSort).slice(0, 1);
  }

  const additiveEntries = entries.filter(isAdditiveCapacity);
  const baselineEntries = entries.filter(entry => !isAdditiveCapacity(entry));

  if (additiveEntries.length > 0) {
    if (baselineEntries.length === 0) return additiveEntries;

    const baseline = [...baselineEntries].sort(scenarioSort).slice(0, 1);
    return [...baseline, ...additiveEntries];
  }

  return [...entries].sort(scenarioSort).slice(0, 1);
}

function scenarioAccountingEntries(row, filters) {
  if (!filters.scenarios || filters.scenarios.length === 0) return null;

  const entries = capacityEntriesByProject[row.project_id] || [];
  const directEntries = entries.filter(entry =>
    filters.scenarios.some(scenario => entryMatchesScenarioDirectly(entry, scenario))
  );

  const deduped = Array.from(
    new Map(directEntries.map(entry => [entry.claim_id, entry])).values()
  );

  return chooseScenarioAccountingEntries(deduped);
}

function sumEntries(entries, fieldFunction) {
  return entries.reduce((sum, entry) => sum + (fieldFunction(entry) || 0), 0);
}

function rowMetrics(row, filters) {
  const scenarioEntries = scenarioAccountingEntries(row, filters);

  if (scenarioEntries === null) {
    return {
      reported_capacity_mw: num(row.reported_capacity_mw),
      interpreted_it_load_mw: num(row.interpreted_it_load_mw),
      estimated_grid_side_mw: num(row.estimated_grid_side_mw),
      estimated_twh_year: num(row.estimated_twh_year),
      capacity_basis: row.capacity_basis
    };
  }

  return {
    reported_capacity_mw: sumEntries(scenarioEntries, entry => num(entry.reported_capacity_mw)),
    interpreted_it_load_mw: sumEntries(scenarioEntries, entry => num(entry.interpreted_it_load_mw)),
    estimated_grid_side_mw: sumEntries(scenarioEntries, estimatedGridSideMw),
    estimated_twh_year: sumEntries(scenarioEntries, estimatedTwh),
    capacity_basis: scenarioEntries.length === 1 ? scenarioEntries[0].capacity_type : "scenario sum"
  };
}

function isProjectHeadlineCandidate(entry) {
  if (!entry) return false;
  if (isNonLoadCapacity(entry) && num(entry.interpreted_it_load_mw) === null) return false;
  return num(entry.reported_capacity_mw) !== null || num(entry.interpreted_it_load_mw) !== null;
}

function projectHeadlinePriority(capacityType) {
  const priorities = {
    "full_campus_potential": 1,
    "cumulative_site_capacity": 2,
    "it_load": 3,
    "initial_phase_capacity": 4,
    "incremental_expansion": 5,
    "incremental_expansion_capacity": 5,
    "unknown": 9
  };

  return priorities[capacityType] || 99;
}

function chooseProjectHeadlineEntry(entries) {
  if (!entries || entries.length === 0) return null;

  const candidates = entries.filter(isProjectHeadlineCandidate);
  const pool = candidates.length > 0 ? candidates : entries;

  return [...pool].sort((a, b) => {
    const reportedA = num(a.reported_capacity_mw) || 0;
    const reportedB = num(b.reported_capacity_mw) || 0;

    if (reportedA !== reportedB) return reportedB - reportedA;

    const gridA = estimatedGridSideMw(a) || 0;
    const gridB = estimatedGridSideMw(b) || 0;

    if (gridA !== gridB) return gridB - gridA;

    const pa = projectHeadlinePriority(a.capacity_type);
    const pb = projectHeadlinePriority(b.capacity_type);

    if (pa !== pb) return pa - pb;

    const startA = num(a.start_year) || 9999;
    const startB = num(b.start_year) || 9999;

    return startA - startB;
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

  const rows = projects.map(project => {
    const entries = index[project.project_id] || [];
    const overviewEntry = chooseProjectHeadlineEntry(entries);

    return {
      project_id: project.project_id,
      project_name: project.project_name,
      developer: project.developer,
      country: project.country,
      bidding_zone: project.bidding_zone,
      type: project.type,
      project_status: project.project_status,
      investment_decision: project.investment_decision,
      expected_operational_years: project.expected_operational_years,
      notes: project.notes,
      last_updated: project.last_updated,
      entry_count: entries.length,
      overview_entry_id: overviewEntry ? overviewEntry.claim_id : "",
      phase: overviewEntry ? overviewEntry.phase : "",
      scenario_tag: overviewEntry ? overviewEntry.scenario_tag : "",
      capacity_basis: overviewEntry ? overviewEntry.capacity_type : "unknown",
      reported_capacity_mw: overviewEntry ? overviewEntry.reported_capacity_mw : project.max_reported_capacity_mw,
      interpreted_it_load_mw: overviewEntry ? overviewEntry.interpreted_it_load_mw : null,
      estimated_grid_side_mw: overviewEntry ? estimatedGridSideMw(overviewEntry) : null,
      estimated_twh_year: estimatedTwh(overviewEntry),
      pue: overviewEntry ? overviewEntry.pue : null,
      annual_load_factor: overviewEntry ? overviewEntry.annual_load_factor : null
    };
  });

  rows.sort((a, b) => {
    const powerA = num(a.reported_capacity_mw) ?? -Infinity;
    const powerB = num(b.reported_capacity_mw) ?? -Infinity;
    if (powerA !== powerB) return powerB - powerA;
    return String(a.project_name).localeCompare(String(b.project_name));
  });

  projectRowsById = Object.fromEntries(rows.map(row => [row.project_id, row]));
  return rows;
}

function getFilters() {
  return {
    countries: getCheckedValues("filter-country-group"),
    zones: getCheckedValues("filter-zone-group"),
    statuses: getCheckedValues("filter-status-group"),
    types: getCheckedValues("filter-type-group"),
    scenarios: getCheckedValues("filter-scenario-group")
  };
}

function rowMatches(row, filters) {
  const rowTypeTags = splitTags(row.type);
  const entries = capacityEntriesByProject[row.project_id] || [];

  const countryMatch =
    filters.countries.length === 0 ||
    filters.countries.includes(row.country);

  const zoneMatch =
    filters.zones.length === 0 ||
    filters.zones.includes(row.bidding_zone);

  const statusMatch =
    filters.statuses.length === 0 ||
    filters.statuses.includes(row.project_status);

  const typeMatch =
    filters.types.length === 0 ||
    filters.types.some(type => rowTypeTags.includes(type));

  const scenarioMatch =
    filters.scenarios.length === 0 ||
    entries.some(entry => {
      const entryScenarios = splitTags(entry.scenario_tag);
      return filters.scenarios.some(scenario => entryScenarios.includes(scenario));
    });

  return countryMatch && zoneMatch && statusMatch && typeMatch && scenarioMatch;
}

function renderSummary(rows, filters) {
  const totalProjects = rows.length;

  const totalReportedMw = rows.reduce((sum, row) => {
    return sum + (rowMetrics(row, filters).reported_capacity_mw || 0);
  }, 0);

  const totalItLoadMw = rows.reduce((sum, row) => {
    return sum + (rowMetrics(row, filters).interpreted_it_load_mw || 0);
  }, 0);

  const totalGridLoadMw = rows.reduce((sum, row) => {
    return sum + (rowMetrics(row, filters).estimated_grid_side_mw || 0);
  }, 0);

  const totalTwh = rows.reduce((sum, row) => {
    return sum + (rowMetrics(row, filters).estimated_twh_year || 0);
  }, 0);

  document.getElementById("summary-box").innerHTML =
    "<strong>" + totalProjects + "</strong> projects shown · " +
    "<strong>" + formatNumber(totalReportedMw, 0) + "</strong> reported MW · " +
    "<strong>" + formatNumber(totalItLoadMw, 0) + "</strong> interpreted IT load MW · " +
    "<strong>" + formatNumber(totalGridLoadMw, 0) + "</strong> estimated grid-side MW · " +
    "<strong>" + formatNumber(totalTwh, 1) + "</strong> estimated TWh/year";
}

function renderEntryTable(projectId) {
  const entries = capacityEntriesByProject[projectId] || [];
  const project = projectRowsById[projectId];

  if (entries.length === 0) {
    return "<div class='muted'>No capacity entries available.</div>";
  }

  let html = "";
  html += "<div class='detail-title'>Capacity phases and reported entries</div>";
  if (project && project.notes) {
    html += "<div class='detail-notes'><strong>Project notes:</strong> " + escapeHtml(project.notes) + "</div>";
  }
  html += "<table class='entry-table'>";
  html += "<thead><tr>";
  html += "<th>Entry ID</th>";
  html += "<th>Country</th>";
  html += "<th>Phase</th>";
  html += "<th>Capacity type</th>";
  html += "<th>Status</th>";
  html += "<th>Investment</th>";
  html += "<th>Scenario relevance</th>";
  html += "<th>Start year</th>";
  html += "<th>Reported MW</th>";
  html += "<th>Est. IT load MW</th>";
  html += "<th>Est. grid-side MW</th>";
  html += "<th>Est. TWh/year</th>";
  html += "<th>Last updated</th>";
  html += "<th>Notes</th>";
  html += "</tr></thead><tbody>";

  entries.forEach(entry => {
    const scenarioText = splitTags(entry.scenario_tag).map(scenarioLabel).join("; ");

    html += "<tr>";
    html += "<td>" + escapeHtml(entry.claim_id) + "</td>";
    html += "<td>" + escapeHtml(countryLabel(entry.country)) + "</td>";
    html += "<td>" + escapeHtml(entry.phase) + "</td>";
    html += "<td>" + escapeHtml(entry.capacity_type) + "</td>";
    html += "<td>" + escapeHtml(entry.capacity_status) + "</td>";
    html += "<td>" + escapeHtml(entry.investment_decision) + "</td>";
    html += "<td>" + escapeHtml(scenarioText) + "</td>";
    html += "<td>" + escapeHtml(entry.start_year) + "</td>";
    html += "<td class='number-cell'>" + round(entry.reported_capacity_mw, 0) + "</td>";
    html += "<td class='number-cell'>" + round(entry.interpreted_it_load_mw, 0) + "</td>";
    html += "<td class='number-cell'>" + round(estimatedGridSideMw(entry), 0) + "</td>";
    html += "<td class='number-cell'>" + round(estimatedTwh(entry), 1) + "</td>";
    html += "<td>" + escapeHtml(entry.last_updated) + "</td>";
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

function updateCapacityHeaders(filters) {
  const scenarioMode = filters.scenarios.length > 0;

  document.getElementById("reported-mw-header").textContent = scenarioMode ? "Scenario reported MW" : "Max reported MW";
  document.getElementById("it-load-mw-header").textContent = scenarioMode ? "Scenario IT load MW" : "Est. IT load MW";
  document.getElementById("grid-side-mw-header").textContent = scenarioMode ? "Scenario grid-side MW" : "Est. grid-side MW";
  document.getElementById("twh-header").textContent = scenarioMode ? "Scenario TWh/year" : "Est. TWh/year";
}

function renderTable(rows, filters) {
  const tbody = document.querySelector("#tracker-table tbody");
  tbody.innerHTML = "";

  rows.forEach(row => {
    const metrics = rowMetrics(row, filters);

    const tr = document.createElement("tr");
    tr.className = "project-row";

    const detailButton =
      "<button class='toggle-button' id='toggle-" + escapeHtml(row.project_id) + "' onclick=\"toggleDetails('" + escapeHtml(row.project_id) + "')\">+</button>";

    const capacityBasisInfo = metrics.capacity_basis
      ? "<br><span class='muted'>" + escapeHtml(metrics.capacity_basis) + "</span>"
      : "";

    tr.innerHTML =
      "<td>" + detailButton + "</td>" +
      "<td class='project-cell'>" + escapeHtml(row.project_name) + "</td>" +
      "<td>" + escapeHtml(row.developer) + "</td>" +
      "<td>" + escapeHtml(countryLabel(row.country)) + "</td>" +
      "<td>" + escapeHtml(row.bidding_zone) + "</td>" +
      "<td>" + escapeHtml(row.type) + "</td>" +
      "<td>" + escapeHtml(row.project_status) + "</td>" +
      "<td>" + escapeHtml(row.investment_decision) + "</td>" +
      "<td class='number-cell capacity-cell'>" + round(metrics.reported_capacity_mw, 0) + capacityBasisInfo + "</td>" +
      "<td class='number-cell'>" + round(metrics.interpreted_it_load_mw, 0) + "</td>" +
      "<td class='number-cell'>" + round(metrics.estimated_grid_side_mw, 0) + "</td>" +
      "<td class='number-cell'>" + round(metrics.estimated_twh_year, 1) + "</td>" +
      "<td>" + escapeHtml(row.expected_operational_years) + "</td>" +
      "<td>" + escapeHtml(row.last_updated) + "</td>";

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

  updateCapacityHeaders(filters);
  renderSummary(filtered, filters);
  renderTable(filtered, filters);
}

async function initTracker() {
  const projects = await loadJson(DATA_PATHS.projects);
  const capacity = await loadJson(DATA_PATHS.capacity);

  const rows = buildProjectRows(projects, capacity);

  populateCheckboxGroup(
    "filter-country-group",
    uniqueSorted(rows.map(r => r.country)),
    countryLabel
  );

  populateCheckboxGroup(
    "filter-zone-group",
    uniqueSorted(rows.map(r => r.bidding_zone))
  );

  populateCheckboxGroup(
    "filter-status-group",
    uniqueSorted(rows.map(r => r.project_status))
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

---
layout: page
title: Nordic datacenter tracker
description: Public database with plans and electricity use estimates for new datacenters across the Nordics.
hide_description: true
img: /assets/images/project-sketches/datacenter-tracker.png
permalink: /projects/datacenter-tracker/
---

This page tracks publicly reported plans for new datacenter projects in Sweden, Norway and Finland. The dataset is being developed for an upcoming research article estimating the impact of datacenter load additions on electricity prices in Nordic bidding zones. The tracker compiles publicly reported project information from press releases, media reports, permitting documents and company material.

The Nordic countries are currently attracting substantial interest from datacenter developers due to cheap renewable electricity, climate conditions and land availability. I'm sharing the dataset here as a public resource and to open the project for comments and suggestions. The methodology is still under development. In particular, I am working on improving how heterogeneous reported MW figures should be interpreted, and how PUE and annual load factors should be assigned. Corrections, missing projects, better source material and methodological comments are very welcome, please send them to <fornborg@kth.se>.

Projects can be expanded with the **+** sign to show multiple project phases, capacity interpretations, key assumptions, and scenario inclusion.

<div id="dc-tracker" markdown="1" data-results="{{ '/assets/data/datacenters/results.json' | relative_url }}?v=3.4-ui">
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

<div id="summary-box" class="summary-box" role="status" aria-live="polite">Loading projects…</div>

<div class="table-wrapper" tabindex="0" aria-label="Project table; scroll horizontally for more columns">
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
        <th id="planned-mw-header">Planned capacity (MW)</th>
        <th id="grid-side-mw-header">Capacity in 2030 (MW)</th>
        <th id="twh-header">Est. TWh/year</th>
        <th>Expected operation</th>
        <th>Last checked</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>
</div>

<div class="after-table-space"></div>

## Scenario map

The map shows the same scenario and filters as the table. Capacity includes cooling and other site electricity use. Values are shown as ranges where the source or timing is uncertain; colours use the upper value. Grey means the upper value is unknown. Click a project marker for details.

<div class="after-table-space"></div>

<div id="dc-scenario-map"></div>

<div class="after-table-space"></div>

| Scenario | Includes |
| --- | --- |
| Low 2030 | Capacity with a confirmed implementation decision and a date, phased to 2030. |
| Stated 2030 | Dated plans, phased to 2030. |
| Stated 2035 | Dated plans, phased to 2035. |
| High 2035 | Active plans including those without dates, with timing uncertainty shown. |

<div class="after-table-space"></div>

## Capacity and electricity use

**Planned capacity (MW)** is the additional capacity of the full project, including cooling and other site electricity use. Existing operation and overlapping phases are accounted for. A missing date does not remove a known capacity figure.

**Capacity in the selected year** shows how much of that planned capacity the scenario brings into operation. **TWh/year** estimates annual electricity use at that level. Unknown capacity is shown as unknown, and totals cover the projects with usable MW figures.

Expand a project to see the source figures and whether they describe IT equipment, total site power or a grid connection, along with phase dates, decisions and sources. A decision to build one phase applies to that phase. It does not establish a decision for the entire campus. Backup generators and power generation are not counted as datacenter load.

The model normally phases capacity in over five years: 20, 40, 60, 80 and 100 percent from first operation. If only construction start is known, first operation is assumed two to three years later. A grid date is an earliest possible start, and undated plans have no invented start year. These are scenario assumptions, not delivery promises.

IT capacity is converted to total site capacity using PUE assumptions of 1.1–1.5, with a reported local design PUE used where available. Annual electricity use uses load factors of 0.75 for hyperscale, 0.57 for colocation, 0.60 for colocation with AI, and 0.80 for AI/HPC. These assumptions draw on [EPRI (2026)](https://powering-intelligence.epri.com/annual-peak-use.html), [IEA (2025)](https://www.iea.org/reports/energy-and-ai/energy-demand-from-ai) and the documented model method. They are not measurements of individual Nordic facilities.

## How the dataset is built

Projects are researched country by country using company announcements, public planning and permit documents, grid information and reporting. Sources are checked for project identity, capacity definitions, phases and dates. New projects are reviewed manually before inclusion.

</div>

<style>
@import url("{{ '/assets/css/datacenter-tracker-map.css?v=20260514-sigma-row-spacing' | relative_url }}");

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
#tracker-table td.number-cell { font-variant-numeric: tabular-nums; }
#tracker-table .toggle-button:focus-visible { outline: 2px solid #555; outline-offset: 2px; }
.filter-dropdown input[type="radio"] { margin-top: 0.05rem; }
#dc-scenario-map .dc-capacity-value, #dc-scenario-map .dc-capacity-total-value { font-size: 13.4px !important; }
.dc-map-note { max-width: 760px; margin: .4rem auto; font-size: 11px; color: #666; }
</style>
<script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
<script src="{{ '/assets/js/datacenter-tracker/scenario-map-d3.js' | relative_url }}?v=3.4-ui" defer></script>
<script src="{{ '/assets/js/datacenter-tracker.js' | relative_url }}?v=3.4-ui" defer></script>

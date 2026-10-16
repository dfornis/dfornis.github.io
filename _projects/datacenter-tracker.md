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

<div id="dc-tracker" markdown="1" data-results="{{ '/assets/data/datacenters/results.json' | relative_url }}?v=3.5.1">
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
    <summary>Scenario (summary &amp; map)</summary>
    <div id="filter-scenario-group" class="checkbox-filter-options"></div>
  </details>

</div>

<div id="summary-box" class="summary-box" role="status" aria-live="polite">Loading projects…</div>

<div class="table-wrapper" tabindex="0" aria-label="Project table. Scroll horizontally for more columns.">
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
        <th id="buildout-mw-header" title="Site power, including cooling, if everything announced is built. Capacity already in operation is not counted.">Full build-out (MW)</th>
        <th id="buildout-twh-header" title="Annual electricity use if everything announced is built. Not tied to a year.">Full build-out (TWh/yr)</th>
        <th id="dates-header" title="Years the sources give for operation of a part of the project. If none are available, a construction start or grid date is shown. That part can be much smaller than the full build-out. Expand the row to see which MW each date belongs to.">Announced dates</th>
        <th>Last checked</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>
</div>

<div class="after-table-space"></div>

## Scenario map

The map shows the same scenario and filters as the table. Capacity includes cooling and other site electricity use. Values are shown as ranges where the source or timing is uncertain. Colours use the upper value. Blue project markers contribute in the selected scenario. Pale markers do not. Blue-grey clusters contain both. Click a project marker for details.

<div class="after-table-space"></div>

<div id="dc-scenario-map"></div>

<div class="after-table-space"></div>

<div class="scenario-descriptions" markdown="1">

| Scenario | Includes |
| --- | --- |
| Low 2030 | Projects with a confirmed investment decision, phased to 2030. |
| Stated 2030 | Projects with announced dates, phased to 2030. |
| Stated 2035 | Projects with announced dates, phased to 2035. |
| High 2035 | All active plans, including projects without a completion date. |

</div>

<div class="after-table-space"></div>

## Capacity and electricity use

**Full build-out (MW)** is the total site power of the whole project if everything announced is built, including cooling and other site electricity use. Where the source states total site power or a grid connection, that figure is used as reported. IT capacity is converted to site power with PUE 1.1–1.5 (or a reported design PUE). When a source does not say what its MW figure measures, the value is shown as a range from reading it as site power to reading it as IT capacity. Overlapping phases are counted once and capacity already in operation is subtracted. A project that is part of a larger campus is counted there and shows "In campus" instead of a separate figure. Expand the row to see which campus.

**Electricity at full build-out (TWh/yr)** is full build-out × the annual load factor for the facility type × 8,760 hours. It expresses the project's full size as annual electricity use.

**Scenarios** are shown in the summary above the table and on the map. They show how much capacity could be in operation in the target year under each scenario. Each capacity figure is phased from the date given for that same figure. A date for the first building is not reused for a larger campus. When the size of a first phase under construction or with an investment decision is unknown, the campus is shown from zero to its phased full-build figure. Ranges reflect uncertainty in the MW measure, PUE, source range or timing.

Expand a project to see the source figures and whether they describe IT equipment, total site power or a grid connection, along with phase dates, decisions and sources. A decision to build one phase applies to that phase. It does not establish a decision for the entire campus. Backup generators and power generation are not counted as datacenter load.

In the scenarios, capacity is phased in over five years: 20, 40, 60, 80 and 100 percent from first operation. If only construction start is known, first operation is set two to three years later. A grid date sets the earliest possible start. Plans without dates remain undated.

IT capacity is converted to total site capacity using PUE assumptions of 1.1–1.5, with a reported local design PUE used where available. Annual electricity use uses load factors of 0.75 for hyperscale, 0.57 for colocation, 0.60 for colocation with AI, and 0.80 for AI/HPC. The assumptions draw on [EPRI (2026)](https://powering-intelligence.epri.com/annual-peak-use.html), [IEA (2025)](https://www.iea.org/reports/energy-and-ai/energy-demand-from-ai) and the documented model method.

## How the tracker is updated

Each country update follows the same sequence from initial lead to published scenario result. The steps below explain what information is collected, how separate projects and phases are identified, and how the source material becomes the figures shown in the table and map.

<div class="tracker-workflow">
  <details>
    <summary><span class="workflow-step">01</span><span>Search for new capacity</span></summary>
    <div class="workflow-body">
      <p>A rules-based search routine works through each country using a documented codebook. It combines operator and customer names with place names, capacity terms, construction stages and grid terminology. The search covers company announcements, planning and permit records, grid information, local reporting and other public sources.</p>
      <p>A lead moves forward when the sources connect a named datacenter operator or end customer to a specific location and a new capacity addition. The source trail and unresolved questions are retained for the next step.</p>
    </div>
  </details>
  <details>
    <summary><span class="workflow-step">02</span><span>Reconcile identity, phases and dates</span></summary>
    <div class="workflow-body">
      <p>The lead is compared with existing projects, candidate records and historic names. Addresses, municipalities, land parcels, company relationships and earlier announcements help determine whether it is a new project, a new phase or another name for an existing campus.</p>
      <p>Campus owners, operators, tenants and individual buildings are linked without merging their evidence. Each phase keeps the MW figure, date and investment decision stated for that phase. This prevents the timing of a first building from being applied to the whole campus and keeps tenant capacity from being counted twice.</p>
    </div>
  </details>
  <details>
    <summary><span class="workflow-step">03</span><span>Record what each source actually measures</span></summary>
    <div class="workflow-body">
      <p>Every capacity claim is recorded with its unit, scope and qualifier. IT equipment load, total site electricity use and grid connection capacity remain distinct. The record also keeps the source's range, project status, timing and investment decision, together with the part of the campus or phase to which they apply.</p>
      <p>Conflicting figures are represented as a range when the evidence supports one. Missing figures remain unknown. A statement such as “at least X MW” is preserved as source evidence but does not define the project's full size unless an upper figure is also available. A separately quantified phase can still be used.</p>
    </div>
  </details>
  <details>
    <summary><span class="workflow-step">04</span><span>Calculate and review the scenarios</span></summary>
    <div class="workflow-body">
      <p>The scenarios estimate how much new datacenter capacity is operating in the target year. For capacity with a first-operation date, the model counts 20 percent in the first year, then 40, 60, 80 and 100 percent.</p>
      <ul class="workflow-scenarios">
        <li><strong>Low 2030</strong> uses capacity with a confirmed investment decision and a date for that same phase.</li>
        <li><strong>Stated 2030</strong> uses the announced date for each capacity figure and calculates the share operating by 2030.</li>
        <li><strong>Stated 2035</strong> uses the same method with 2035 as the target year.</li>
        <li><strong>High 2035</strong> includes every active plan. Dated capacity follows its project date. Capacity without a date enters the upper estimate at full size.</li>
      </ul>
      <p>Sometimes sources confirm that a first phase is going ahead but give no MW figure for it. The model then shows a range. The lower end is 0 MW. The upper end uses the dated share of the campus total.</p>
      <p>New records enter as candidates. Their identity, evidence and scenario effect are reviewed before inclusion in the totals. One approved calculation feeds the data export, summary, table and map.</p>
    </div>
  </details>
</div>

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

.summary-grid {
  display: grid;
  grid-template-columns: minmax(190px, 0.8fr) repeat(2, minmax(250px, 1fr));
  gap: 0.45rem 0;
}

.summary-block {
  min-width: 0;
  padding: 0.08rem 0.7rem;
}

.summary-block:first-child {
  padding-left: 0;
}

.summary-block + .summary-block {
  border-left: 1px solid #ddd8cf;
}

#summary-box .summary-kicker {
  display: block;
  margin-bottom: 0.16rem;
  color: #6a6965;
  font-size: 9px !important;
  font-weight: 600;
  letter-spacing: 0.06em;
  line-height: 1 !important;
  text-transform: uppercase;
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
  text-align: left;
  white-space: nowrap;
}

#tracker-table td.capacity-cell {
  min-width: 92px;
}

#tracker-table td.capacity-cell .muted {
  display: block;
  margin-top: 0.08rem;
  text-align: left;
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
  text-align: left;
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
  text-align: left;
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

.scenario-descriptions table {
  border-collapse: separate;
  border-spacing: 0;
}

.scenario-descriptions th {
  padding: 0 1.4rem 0.5rem 0;
  vertical-align: top;
}

.scenario-descriptions td {
  padding: 0 0 0.65rem 0;
  vertical-align: top;
  line-height: 1.45;
}

.scenario-descriptions tbody tr:last-child td {
  padding-bottom: 0;
}

.scenario-descriptions th:first-child,
.scenario-descriptions td:first-child {
  width: 1%;
  white-space: nowrap;
  padding-right: 1.4rem;
}

.tracker-workflow {
  margin-top: 1.35rem;
  max-width: 78ch;
}

.tracker-workflow details {
  margin: 0;
  border-top: 1px solid #d8d2c8;
}

.tracker-workflow details:last-child {
  border-bottom: 1px solid #d8d2c8;
}

.tracker-workflow summary {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
  padding: 1rem 1.8rem 1rem 0;
  color: #2f383b;
  font-weight: 500;
  list-style: none;
  cursor: pointer;
}

.tracker-workflow summary::-webkit-details-marker {
  display: none;
}

.tracker-workflow summary::after {
  content: "+";
  position: absolute;
  right: 0;
  top: 0.85rem;
  color: #2f6687;
  font-size: 1.25rem;
  font-weight: 400;
}

.tracker-workflow details[open] > summary::after {
  content: "−";
}

.tracker-workflow .workflow-step {
  flex: 0 0 2rem;
  color: #747d7d;
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.06em;
}

.tracker-workflow .workflow-body {
  max-width: 72ch;
  margin-left: 2.45rem;
  padding: 0 1.8rem 1.1rem 0;
  color: #444;
}

.tracker-workflow .workflow-body p {
  margin: 0;
}

.tracker-workflow .workflow-body p + p {
  margin-top: 0.7rem;
}

.tracker-workflow .workflow-scenarios {
  margin: 0.7rem 0;
  padding-left: 1.15rem;
}

.tracker-workflow .workflow-scenarios li + li {
  margin-top: 0.35rem;
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

.dc-phase-point.scenario-active .dc-phase-dot {
  fill: #2f6687;
  fill-opacity: 1;
}

.dc-phase-point.scenario-mixed .dc-phase-dot {
  fill: #66879a;
  fill-opacity: 1;
}

.dc-phase-point.scenario-inactive .dc-phase-dot {
  fill: #fbf8f0;
  fill-opacity: 1;
  stroke: #7f8985;
}

.dc-phase-point:hover .dc-phase-dot,
.dc-phase-point:focus .dc-phase-dot {
  fill-opacity: 1;
  stroke-width: 1.6;
}

.dc-phase-count {
  fill: #fff;
  font-size: 9.5px;
  font-weight: 700;
  pointer-events: none;
}

.dc-phase-point.scenario-inactive .dc-phase-count {
  fill: #5f6966;
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
@media (max-width: 820px) {
  .summary-grid { grid-template-columns: 1fr; }
  .summary-block { padding: 0.35rem 0 0 0; }
  .summary-block:first-child { padding-top: 0; }
  .summary-block + .summary-block { border-left: 0; border-top: 1px solid #ddd8cf; }
}
</style>
<script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
<script src="{{ '/assets/js/datacenter-tracker/scenario-map-d3.js' | relative_url }}?v=3.5.2" defer></script>
<script src="{{ '/assets/js/datacenter-tracker.js' | relative_url }}?v=3.5.2" defer></script>

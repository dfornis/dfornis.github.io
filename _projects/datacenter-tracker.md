---
layout: page
title: Nordic datacenter tracker
description: Public database with plans and electricity use estimates for new datacenters across the Nordics.
hide_description: true
img: /assets/images/project-sketches/datacenter-tracker.png
permalink: /projects/datacenter-tracker/
---

<div class="tracker-intro">
  <img class="tracker-intro-illustration" src="{{ '/assets/images/policy-feasibility/datacenter-linework.png' | relative_url }}" alt="" width="1714" height="918" decoding="async">
  <p>This page tracks publicly reported plans for new datacenter projects in Sweden, Norway and Finland. The dataset is being developed for an upcoming research article estimating the impact of datacenter load additions on electricity prices in Nordic bidding zones. The tracker compiles publicly reported project information from press releases, media reports, permitting documents and company material.</p>
  <p>The Nordic countries are currently attracting substantial interest from datacenter developers due to cheap renewable electricity, climate conditions and land availability. I'm sharing the dataset here as a public resource and to open the project for comments and suggestions. The methodology is still under development. In particular, I am working on improving how heterogeneous reported MW figures should be interpreted, and how PUE and annual load factors should be assigned. Corrections, missing projects, better source material and methodological comments are very welcome, please send them to <a href="mailto:fornborg@kth.se">fornborg@kth.se</a>.</p>
</div>

<div id="dc-tracker" markdown="1" data-results="{{ '/assets/data/datacenters/results.json' | relative_url }}?v=4.1.1">

## Scenario map

Capacity includes cooling and other site electricity use. Values are shown as ranges where the source or timing is uncertain.

<div class="after-table-space"></div>

<div id="dc-scenario-map"></div>

<details id="scenario-explainer" class="scenario-explainer">
  <summary>
    <span>Scenario explainer</span>
    <span class="scenario-explainer-hint">What the four scenarios include and how to read them</span>
  </summary>
  <div class="scenario-explainer-body scenario-descriptions" markdown="1">

| Scenario           | What it includes                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Low 2030           | Plans with a confirmed investment decision and an announced timetable.                                                                                              |
| Stated 2030 / 2035 | Plans with an announced timetable. Larger sites may also be included when a phase has a timetable and is under construction or has a confirmed investment decision. |
| High 2035          | All announced capacity, assumed to be fully built by 2035.                                                                                                          |

**Reading the figures.** Each scenario shows how much new capacity could be operating in the selected year. Ranges reflect uncertainty in reported capacity and completion dates. An asterisk means that some projects have no MW estimate and are missing from the total. The [method below](#capacity-and-electricity-use) explains the calculations.

**Using the map.** Blue shading shows the upper estimate for each bidding zone. Click a point to see the project's contribution. The country, zone, status and type filters above the project table also apply to the map and chart.

**Developer headquarters.** HQ selects projects by their developers' global headquarters. **Domestic** means the project's own country, **Other Europe** means another European country, and **Outside Europe** means elsewhere. Matching projects turn orange and the map totals update. **All** restores the full selection.

Projects with several developers may appear in more than one HQ group. Each project is counted once within the selected group. A dash means headquarters have not been reviewed for that country. Developer and ownership details are available in the project table.

  </div>
</details>

<section id="dc-timeline" class="dc-timeline" aria-labelledby="dc-timeline-title" data-timeline="{{ '/assets/data/datacenters/timeline.json' | relative_url }}?v=4.1.1">
  <h2 id="dc-timeline-title">New capacity, year by year</h2>
  <div class="dc-timeline-content" hidden>
    <div class="dc-timeline-controls">
      <div class="dc-timeline-measure-control">
        <span id="dc-timeline-measure-label">Measure</span>
        <div class="dc-timeline-measure-switch" role="group" aria-labelledby="dc-timeline-measure-label">
          <label><input type="radio" name="timeline-measure" value="mw" checked><span>Cumulative</span></label>
          <label><input type="radio" name="timeline-measure" value="annual_addition_mw"><span>Added/year</span></label>
        </div>
      </div>
      <label>Scenario
        <select name="timeline-family" aria-label="Capacity scenario selection">
          <option value="low">Low — confirmed investment</option>
          <option value="stated" selected>Stated — plans with dates</option>
          <option value="high">High — all active plans</option>
        </select>
      </label>
      <label>HQ
        <select name="timeline-hq" aria-label="Chart developer headquarters">
          <option value="none">All actors</option>
          <option value="domestic">Domestic</option>
          <option value="other_europe">Other Europe</option>
          <option value="outside_europe">Outside Europe</option>
        </select>
      </label>
    </div>
    <div class="dc-timeline-paper">
      <div class="dc-timeline-chart"></div>
      <div class="dc-timeline-inspect">
        <span class="dc-timeline-year"></span>
        <div class="dc-timeline-readout" aria-live="polite" aria-atomic="true"></div>
      </div>
    </div>
    <details class="dc-timeline-data">
      <summary>Data &amp; assumptions</summary>
      <p class="dc-timeline-note dc-timeline-unknown" hidden>* Projects without assigned MW are not included in the quantified totals.</p>
      <p class="dc-timeline-note">Figures show capacity added from 2026 onwards, including cooling and other site electricity use. Cumulative totals include additions already completed during this period. Added/year shows the increase in each year.</p>
      <p class="dc-timeline-note">Lines show the upper estimates and shaded bands show the range. The scale stays fixed when you change the scenario or filters. Annual ranges should not be added together. Move over the chart or tap a year to see its values.</p>
      <p class="dc-timeline-note">The <a href="#scenario-explainer">scenario definitions</a> and <a href="#tracker-filters">project filters</a> are shared with the map. You can select a different scenario and HQ group in each view.</p>
      <div class="dc-timeline-table-wrap" tabindex="0" aria-label="Annual capacity data. Scroll horizontally for more columns."><table class="dc-timeline-table"></table></div>
    </details>
  </div>
  <p class="dc-timeline-status" role="status">Loading annual capacity…</p>
</section>

<div class="after-table-space"></div>

Projects can be expanded with the **+** sign to show multiple project phases, capacity interpretations, key assumptions, and scenario inclusion.

<div id="tracker-filters" class="tracker-controls">

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
        <th id="buildout-mw-header" title="Site power, including cooling, if everything announced is built. Capacity installed by the end of 2025 is excluded; later additions remain.">Full build-out (MW)</th>
        <th id="buildout-twh-header" title="Annual electricity use if everything announced is built. Not tied to a year.">Full build-out (TWh/yr)</th>
        <th id="dates-header" title="Years the sources give for operation of a part of the project. If none are available, a construction start or grid date is shown. That part can be much smaller than the full build-out. Expand the row to see which MW each date belongs to.">Announced dates</th>
        <th>Last checked</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>
</div>

<div class="after-table-space"></div>

## Capacity and electricity use

**Full build-out (MW)** is the additional site capacity if all announced plans are completed, including cooling and other site electricity use. Reported site power and grid connection figures are used as stated. IT capacity is converted to site power using a PUE of 1.1–1.5, or a reported design PUE. If a source does not say what its MW figure measures, the figure is retained without PUE conversion.

Overlapping phases are counted once. Capacity already operating at the end of 2025 is subtracted, while later additions remain in the annual figures after completion. A project included in a larger campus is counted there and shows "In campus" in the table. Expand the row to see the original figures, dates and sources. Backup generators and power generation are excluded from datacenter load.

**Electricity at full build-out (TWh/yr)** is full build-out multiplied by the annual load factor and 8,760 hours. The load factors are 0.75 for hyperscale, 0.57 for colocation, 0.60 for colocation with AI, and 0.80 for AI/HPC. These assumptions draw on [EPRI (2026)](https://powering-intelligence.epri.com/annual-peak-use.html), [IEA (2025)](https://www.iea.org/reports/energy-and-ai/energy-demand-from-ai) and the documented model method. This calculation estimates annual electricity use at that level of capacity.

**Opening dates and construction.** The model uses a reported opening date where one is available. Otherwise it estimates when the datacenter could open from the construction date or its current stage of development. Dates and investment decisions apply to the building or phase they describe. The first building's opening date does not tell us when the rest of the site will be ready.

A published timetable for individual phases takes precedence over general assumptions. Where the pace of expansion is unknown, capacity is normally added over five years from the first opening. A development completed in one phase is counted in its opening year. A reported completion target can shorten the assumed construction and expansion periods.

**Larger sites built in phases.** Stated can include a site without an overall timetable when one of its datacenter phases is under construction or has a confirmed investment decision, and a construction, opening or completion date is available for that phase. This can establish an estimated opening date for the site even when the first phase's MW is unknown.

For these sites, the model assumes that capacity increases by an equal amount each year from first operation until 2035. It calculates an earlier and a later opening date to allow for uncertainty. Completion in 2035 is an assumption. Individual phases with known capacity keep their announced schedules. Low still requires a date and an investment decision for the capacity being counted.

**Grid connections.** In Low and Stated, a later grid connection date delays the assumed opening. If the connection is still only requested or its status is unclear, the lower estimate can be zero. The reported connection capacity does not cap the model's estimate of datacenter capacity. High assumes all announced capacity is built by 2035, so it does not apply these grid restrictions and brings later completion dates forward to that year.

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
      <p>Campus owners, operators, tenants and individual buildings are linked without merging their evidence. Each phase keeps the MW figure, date and investment decision stated for that phase. This prevents double counting and keeps a building’s dates separate from those of the wider campus.</p>
      <p>A target omitted or replaced by a later source for the same or comparable scope is treated as undated until newly dated evidence appears. The original target is retained in the source detail and marked as superseded.</p>
    </div>
  </details>
  <details>
    <summary><span class="workflow-step">03</span><span>Record what each source actually measures</span></summary>
    <div class="workflow-body">
      <p>Every capacity claim is recorded with its unit, scope and qualifier. IT equipment load, total site electricity use and grid connection capacity remain distinct. The record also keeps the source's range, project status, timing and investment decision, together with the part of the campus or phase to which they apply.</p>
      <p>Conflicting figures are represented as a range when the evidence supports one. Missing figures remain unknown. A statement such as “at least X MW” is calculated using X in full build-out and eligible scenarios, with the normal conversion for its measure. Its qualifier is preserved beside the original source figure. If an included claim exceeds its parent campus after conversion, both sources go to follow-up. The largest applicable scope continues to determine the group’s capacity while the discrepancy is unresolved.</p>
    </div>
  </details>
  <details>
    <summary><span class="workflow-step">04</span><span>Calculate and review the scenarios</span></summary>
    <div class="workflow-body">
      <p>The <a href="#scenario-explainer">scenario definitions</a> apply to the map, chart and table. Results are checked for overlapping capacity, missing information and conflicts between sources before the site is updated.</p>
      <p>New records enter as candidates. Their identity, evidence and scenario effect are reviewed before inclusion in the totals. One approved calculation feeds the data export, annual chart, summary, table and map.</p>
    </div>
  </details>
  <details>
    <summary><span class="workflow-step">05</span><span>Identify actors and global headquarters</span></summary>
    <div class="workflow-body">
      <p>Project announcements and site-specific sources identify the developer, operator, named customer and, where relevant, property owner or project partner. Each actor is linked to the whole project, including its phases. Partnerships keep separate actors and roles.</p>
      <p>Global headquarters are checked against company reports, official contact pages and company announcements, with other reliable sources used when needed. A local subsidiary's registered address or a regional office does not establish the group's global HQ. Registration country, headquarters, fund manager and financial owners are recorded separately. The business type describes what the actor does.</p>
      <p>Ownership notes retain the source and date. They describe the documented ownership without assigning an owner nationality or tracing every investor. Unknown identities and HQ countries remain unknown and do not match any HQ group. A project can still match a known partner's HQ while another actor is unresolved. Expand the project for actors, roles, HQ, sources and the review date.</p>
      <p>The reviews cover 31 Swedish, 46 Finnish and 32 Norwegian projects as of 17 October 2026. Every relevant actor has a known HQ country for 30 Swedish, 42 Finnish and 30 Norwegian projects. The remaining cases include an anonymous operator, a company with two headquarters and actors that do not publish one global HQ. HQ selection filters the map and its totals without allocating capacity between actors.</p>
    </div>
  </details>
</div>

</div>

<style>
@import url("{{ '/assets/css/datacenter-tracker-map.css?v=4.1.1' | relative_url }}");

/* The illustration's slate blue anchors the controls and table surfaces. */
#dc-tracker {
  --dc-blue: #4c7088;
  --dc-ink: #303d43;
  --dc-muted: #657177;
  --dc-paper: var(--global-bg-color, #f4f0e9);
  --dc-surface: #f8f5ef;
  --dc-header: #e3e8e7;
  --dc-hover: #e1e7e7;
  --dc-rule: rgba(76, 112, 136, 0.19);
  --dc-control: rgba(76, 112, 136, 0.07);
}

html[data-theme="dark"] #dc-tracker {
  --dc-blue: #9eb9ca;
  --dc-ink: #e5eaec;
  --dc-muted: #b0bec5;
  --dc-surface: #283237;
  --dc-header: #34424a;
  --dc-hover: #3a4b54;
  --dc-rule: rgba(158, 185, 202, 0.24);
  --dc-control: rgba(158, 185, 202, 0.1);
}

.tracker-intro {
  margin-bottom: 1.1rem;
}

.tracker-intro::after {
  content: "";
  display: block;
  clear: both;
}

.tracker-intro-illustration {
  display: block;
  float: right;
  width: min(40%, 600px);
  height: auto;
  margin: 0.2rem 0 0.85rem 1.5rem;
  opacity: 0.82;
}

@media (max-width: 700px) {
  .tracker-intro-illustration {
    float: none;
    width: min(100%, 430px);
    margin: 0.25rem auto 0.8rem;
  }
}

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
  border: 1px solid var(--dc-rule);
  border-radius: 4px;
  background: var(--dc-surface);
  color: var(--dc-ink);
  user-select: none;
}

.filter-dropdown summary::-webkit-details-marker {
  display: none;
}

.filter-dropdown summary::after {
  content: "▾";
  float: right;
  color: var(--dc-muted);
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
  border: 1px solid var(--dc-rule);
  border-radius: 5px;
  background: var(--dc-surface);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.checkbox-filter-options {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 11px;
  color: var(--dc-ink);
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
  accent-color: var(--dc-blue);
}

.summary-box {
  margin: 0.75rem 0 1rem 0;
  padding: 0.4rem 0.6rem !important;
  border: 1px solid var(--dc-rule);
  border-radius: 6px;
  background: var(--dc-control);
  color: var(--dc-ink);
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
  border-left: 1px solid var(--dc-rule);
}

#summary-box .summary-kicker {
  display: block;
  margin-bottom: 0.16rem;
  color: var(--dc-muted);
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
  border: 1px solid var(--dc-rule);
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
  border-bottom: 1px solid var(--dc-rule);
  padding: 4px 6px !important;
  vertical-align: top;
  text-align: left;
}

#tracker-table th {
  white-space: nowrap;
  background: var(--dc-header);
  color: var(--dc-blue) !important;
  position: sticky;
  top: 0;
  z-index: 1;
  font-size: 11px !important;
  line-height: 1.12 !important;
  font-weight: 500 !important;
  letter-spacing: 0.01em;
}

#tracker-table tbody tr.project-row:nth-child(4n+1) {
  background: var(--dc-surface);
}

#tracker-table tbody tr.project-row:nth-child(4n+3) {
  background: var(--dc-paper);
}

#tracker-table tbody tr.project-row:hover {
  background: var(--dc-hover);
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
  color: var(--dc-blue);
  border: 1px solid var(--dc-rule);
  background: var(--dc-surface);
  border-radius: 4px;
  padding: 0.1rem 0.35rem;
  font-size: 0.72rem;
  cursor: pointer;
}

.toggle-button:hover {
  background: var(--dc-hover);
}

.detail-row {
  display: none;
  background: var(--dc-paper);
}

.detail-cell {
  padding: 0.65rem 0.75rem !important;
  border-bottom: 1px solid var(--dc-rule) !important;
}

.detail-title {
  font-size: 0.78rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
}

.detail-notes {
  margin: 0 0 0.65rem 0;
  padding: 0.45rem 0.55rem;
  border: 1px solid var(--dc-rule);
  background: var(--dc-surface);
  color: var(--dc-ink);
  font-size: 10px !important;
  line-height: 1.2 !important;
}

.entry-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--dc-surface);
  border: 1px solid var(--dc-rule);
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
  border-bottom: 1px solid var(--dc-rule);
  vertical-align: top;
}

.entry-table th {
  background: var(--dc-header);
  white-space: nowrap;
  color: var(--dc-ink) !important;
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
  color: var(--dc-ink);
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

.scenario-descriptions table th,
.scenario-descriptions table td {
  font-size: 13px;
  font-weight: 400;
  line-height: 1.45;
}

.scenario-descriptions table th {
  font-weight: 500;
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

.scenario-explainer {
  max-width: 760px;
  margin: -0.55rem auto 1.65rem auto;
  border-top: 1px solid #d8d2c8;
  border-bottom: 1px solid #d8d2c8;
}

.scenario-explainer summary {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.4rem 0.8rem;
  align-items: baseline;
  padding: 0.78rem 1.8rem 0.78rem 0;
  color: #2f383b;
  font-size: 0.84rem;
  font-weight: 500;
  list-style: none;
  cursor: pointer;
}

.scenario-explainer summary::-webkit-details-marker {
  display: none;
}

.scenario-explainer summary::after {
  content: "+";
  position: absolute;
  right: 0;
  top: 0.62rem;
  color: #2f6687;
  font-size: 1.2rem;
  font-weight: 400;
}

.scenario-explainer[open] > summary::after {
  content: "−";
}

.scenario-explainer-hint {
  color: #747d7d;
  font-size: 0.72rem;
  font-weight: 400;
}

.scenario-explainer-body {
  padding: 0.25rem 1.8rem 1rem 0;
  color: #444;
  font-size: 0.84rem;
}

.scenario-explainer-body table {
  margin-bottom: 0.85rem;
}

.scenario-explainer-body p {
  margin: 0;
  line-height: 1.55;
}

.scenario-explainer-body p + p {
  margin-top: 0.65rem;
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
  fill: #c6ccc6;
  fill-opacity: 1;
  stroke: #fbf8f0;
  stroke-width: 1.1;
  vector-effect: non-scaling-stroke;
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
#tracker-table .toggle-button:focus-visible { outline: 2px solid var(--dc-blue); outline-offset: 2px; }
.filter-dropdown input[type="radio"] { margin-top: 0.05rem; }
#dc-scenario-map .dc-capacity-value, #dc-scenario-map .dc-capacity-total-value { font-size: 13.4px !important; }
@media (max-width: 820px) {
  .summary-grid { grid-template-columns: 1fr; }
  .summary-block { padding: 0.35rem 0 0 0; }
  .summary-block:first-child { padding-top: 0; }
  .summary-block + .summary-block { border-left: 0; border-top: 1px solid var(--dc-rule); }
}
@media (max-width: 600px) {
  .scenario-explainer summary { grid-template-columns: 1fr; }
}
</style>
<link rel="stylesheet" href="{{ '/assets/css/datacenter-tracker-timeline.css' | relative_url }}?v=4.1.1">
<script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
<script src="{{ '/assets/js/datacenter-tracker/scenario-map-d3.js' | relative_url }}?v=4.1.1" defer></script>
<script src="{{ '/assets/js/datacenter-tracker/timeline.js' | relative_url }}?v=4.1.1" defer></script>
<script src="{{ '/assets/js/datacenter-tracker.js' | relative_url }}?v=4.1.1" defer></script>

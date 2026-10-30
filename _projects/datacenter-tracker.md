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
  <p>This page lists publicly reported plans for new datacenters in Sweden, Norway and Finland, and estimates how much electricity they would use. The data come from company announcements, news reports, planning and permit documents, and grid operators. I am building the dataset for a research article on how new datacenters could affect electricity prices in the Nordic bidding zones.</p>
  <p>The method is still being developed. Corrections, missing projects, better sources and comments on the method are very welcome. Please send them to <a href="mailto:fornborg@kth.se">fornborg@kth.se</a>.</p>
  <p class="dc-download-line"><a href="#" data-download-csv>Download data (CSV)</a><span aria-hidden="true"> · </span><span data-download-meta></span></p>
</div>

<div id="dc-tracker" markdown="1" data-results="{{ '/assets/data/datacenters/results.json' | relative_url }}?v=5.0.21">

<div id="dc-shared-controls" aria-label="Shared tracker controls"></div>

<p class="dc-map-intro">The map shows new datacenter capacity announced in each bidding zone, at its full announced size. It does not show when the capacity will be built. The tabs set how far a plan must have come to be counted. Confirmed counts only capacity with an investment decision or a construction start. Dated plans adds plans that have a date but no decision. All announced adds everything else.</p>

<div id="dc-scenario-map"></div>

<details id="scenario-explainer" class="scenario-explainer">
  <summary>
    <span>About the figures</span>
  </summary>
  <div class="scenario-explainer-body scenario-descriptions" markdown="1">

**Ranges.** Most values are shown as a range, for example 1.4–1.5 GW. The low and high values come from reading the same sources in two ways. For example, a MW figure that does not say what it measures is counted once as site power and once as IT power. Bars, areas and map colours show the high value.

**HQ.** HQ shows only projects whose developer has its global headquarters in the chosen region. Domestic means the same country as the project. Other Europe means another European country, and Outside Europe means the rest of the world. A project with several developers can appear in more than one group.

**Controls.** The tabs, Measure and HQ apply to the whole page. The project list also has its own filters.

  </div>
</details>

<section id="dc-timeline" class="dc-timeline" aria-labelledby="dc-timeline-title" data-timeline="{{ '/assets/data/datacenters/timeline.json' | relative_url }}?v=5.0.21">
  <h2 id="dc-timeline-title">When the capacity could be built</h2>
  <p class="dc-timeline-intro">The chart spreads the capacity in the selected tab over the years it could open. The dark area is capacity with an opening year given by the developer or a public document. The light area is capacity where no source gives an opening year. For that capacity, the opening year is estimated from the project's status, such as planned or permitted, or from a reported construction start, using fixed lead times described under <a href="#dc-method-timing">Opening dates and build-out</a>. Together the two areas show the total.</p>
  <div class="dc-timeline-content" hidden>
    <div class="dc-timeline-controls">
      <div class="dc-timeline-measure-control" data-timeline-capacity-view>
        <span id="dc-timeline-measure-label">View</span>
        <div class="dc-timeline-measure-switch" role="group" aria-labelledby="dc-timeline-measure-label">
          <label><input type="radio" name="timeline-measure" value="mw" checked><span>Cumulative</span></label>
          <label><input type="radio" name="timeline-measure" value="annual_addition_mw"><span>Added/year</span></label>
        </div>
      </div>
    </div>
    <div class="dc-timeline-paper">
      <div class="dc-timeline-chart"></div>
      <div class="dc-timeline-legend"><span><i></i>Opening year reported</span><span class="estimated"><i></i>Opening year estimated</span></div>
      <div class="dc-timeline-inspect">
        <span class="dc-timeline-year"></span>
        <div class="dc-timeline-readout" aria-live="polite" aria-atomic="true"></div>
      </div>
    </div>
    <details class="dc-timeline-data">
      <summary>Values and notes</summary>
      <p class="dc-timeline-note dc-timeline-unknown" hidden>An asterisk (*) means that at least one project has no MW figure, so the actual value is higher.</p>
      <p class="dc-timeline-note">The areas show the upper estimate. Hover over a panel to see the range for each year. The three countries share one y-axis. It changes with the tab but not with HQ, so an HQ selection shows its share of the tab.</p>
      <p class="dc-timeline-note">Cumulative shows all new capacity in operation since the end of 2025. Added/year shows how much opens in each year. TWh/year is the electricity a full year of operation would use at that year's capacity, not the use during the year the capacity opens.</p>
      <div class="dc-timeline-table-wrap" tabindex="0" aria-label="Annual capacity data. Scroll horizontally for more columns."><table class="dc-timeline-table"></table></div>
    </details>
  </div>
  <p class="dc-timeline-status" role="status">Loading annual capacity…</p>
</section>

<section id="tracker-projects" class="dc-projects" aria-labelledby="tracker-projects-title">
  <h2 id="tracker-projects-title">Projects</h2>
  <p class="dc-projects-intro">The largest projects are listed first. Click + for the developer, each phase with its MW figure and dates, and the sources.</p>
  <p class="dc-download-line"><a href="#" data-download-csv>Download all projects (CSV)</a><span aria-hidden="true"> · </span><a href="#" data-download-json>Full model output (JSON)</a></p>
  <p class="dc-cite">The project data in the CSV file are shared under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. You may reuse them if you credit the source. Suggested citation: Fornborg, D. (2026). <em>Nordic datacenter tracker</em>, data as of <span data-as-of></span>. https://dfornis.github.io/projects/datacenter-tracker/</p>

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
    <summary>Stage</summary>
    <div id="filter-stage-group" class="checkbox-filter-options"></div>
  </details>

  <details class="filter-dropdown">
    <summary>Type</summary>
    <div id="filter-type-group" class="checkbox-filter-options"></div>
  </details>

</div>

<div id="summary-box" class="summary-box" role="status" aria-live="polite">Loading projects…</div>

<div class="table-wrapper" tabindex="0" aria-label="Project table. Scroll horizontally for more columns.">
  <table id="tracker-table">
    <thead>
      <tr>
        <th class="toggle-cell"><span class="visually-hidden">Details</span></th>
        <th>Project</th>
        <th>Country</th>
        <th>Zone</th>
        <th title="How far each part of the project has come. The colours match the map.">Stage</th>
        <th id="size-header" title="Site power including cooling, if everything announced is built. Capacity already operating at the end of 2025 is not counted. The bar is coloured by stage.">Full announced size (GW)</th>
        <th id="dates-header" title="Years the sources give for when part of the project opens. If no opening year is given, a construction start or grid connection year is shown. The dated part can be much smaller than the full size. Expand the row to see which MW each date belongs to.">Announced dates</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>
</div>
<button type="button" id="tracker-show-all" class="dc-show-all" aria-controls="tracker-table" hidden>Show all projects</button>
</section>

## How the numbers are calculated

<figure id="dc-method-flow" class="dc-method-flow" aria-labelledby="dc-method-flow-title">
  <figcaption id="dc-method-flow-title">Calculation steps</figcaption>
  <p class="dc-method-flow-caption">Click a step for details.</p>
  <div class="dc-method-flow-canvas"></div>
</figure>

<section id="dc-method-reference" class="dc-method-reference" aria-labelledby="dc-method-reference-title">
  <h3 id="dc-method-reference-title">Parameters and assumptions</h3>
  <p>MW means the site's installed electrical capacity, including cooling and other supporting equipment. Full announced size is the announced total after subtracting existing capacity and overlaps.</p>

  <h4 id="dc-method-capacity">Capacity conversion</h4>
  <div data-method-table="capacity"></div>
  <p class="dc-method-note">The range is my own calculation from Nordic projects in the register that report both IT power and site power for the same part of the site. Ten such pairs, from five companies, give ratios between 1.20 and 1.44, with a median of 1.25. <a href="https://epoch.ai/data/data-centers-documentation/methodology">Epoch AI</a> uses 1.2 for hyperscale and 1.4 for other sites. <a href="https://www.energimyndigheten.se/492f27/contentassets/054d98cfdcd54cb5a802e24b53779452/energianvandning-i-datacenter-och-digitala-system.pdf">RISE (2023)</a> reports an annual PUE of 1.1–1.3 for efficient Swedish sites. Annual PUE is lower than the design ratio because cooling needs vary over the year.</p>

  <h4 id="dc-method-energy">Annual electricity use</h4>
  <p class="dc-method-formula">Annual TWh = site MW × annual load factor × 8,760 / 1,000,000</p>
  <p>The load factor is average electricity use over a year divided by installed capacity. A factor of 0.75 means that the site uses 75% of its capacity on average.</p>
  <div data-method-table="annual"></div>
  <p class="dc-method-note">Hyperscale and colocation values come from <a href="https://powering-intelligence.epri.com/annual-peak-use.html">EPRI's sample of US sites (2026)</a>. <a href="https://publikasjoner.nve.no/diverse/2026/Metode.for.framskriving.av.strombruk.i.datasentre2026.pdf">NVE (2026)</a> uses 0.70 for Norwegian datacenters. The AI/HPC value is my own assumption, based on how much of the time AI training servers run in <a href="https://bies.lbl.gov/publications/2024-lbnl-data-center-energy-usage-report">Shehabi et al. (2024)</a>. It is the least certain value in the table. Colocation with AI is my own assumption, between colocation and AI/HPC. None of these values have been checked against Nordic operating data.</p>

  <p id="dc-method-context">When Measure is set to annual electricity use, the summary above the map and the values under the chart also give the result as a share of electricity use in 2025. The comparison uses consumption per bidding zone from <a href="https://opendata.esett.com/">eSett Open Data</a>, summed over 2025: 126.7 TWh in Sweden, 139.2 TWh in Norway and 82.9 TWh in Finland. The share is only there to give a sense of scale. It is not part of the calculation.</p>

  <h4 id="dc-method-stages">Stages</h4>
  <p>Each MW figure is placed in one stage based on the investment decision, construction start and dates in its sources. The ticks show which tabs count each stage.</p>
  <div data-method-table="stages"></div>

  <h4 id="dc-method-timing">Opening dates and build-out</h4>
  <p>If a source gives a construction start but no opening date, operation is assumed to start <span data-method-value="construction_years"></span> years later. If neither is available, the opening year is estimated from the project's status:</p>
  <div data-method-table="timing"></div>
  <dl>
    <dt>Build-out</dt>
    <dd>Sites built in phases are assumed to reach full size in equal steps over <span data-method-value="expansion_years"></span> years, starting in the first operating year. A schedule or completion year from the source is used instead when available. A single-building project opens in one step.</dd>
    <dt>Rest of active site</dt>
    <dd>The rest of a site, where one building is under way, is assumed to start when that building opens and then follow the same build-out.</dd>
    <dt>Grid connection dates</dt>
    <dd>A reported grid connection year sets the earliest possible opening. If the connection has only been applied for, or its status is unclear, the low estimate in Confirmed and Dated plans assumes that the capacity is not yet running.</dd>
    <dt>After 2035</dt>
    <dd>Capacity estimated to open after 2035 is not in the chart, but it is included in the map's full announced size.</dd>
  </dl>
  <p class="dc-method-note">These lead times and the build-out period are my assumptions. <a href="https://www.iea.org/reports/energy-and-ai/energy-demand-from-ai">IEA (2025)</a> gives 2–3 years from construction start to operation. <a href="https://publikasjoner.nve.no/diverse/2026/Metode.for.framskriving.av.strombruk.i.datasentre2026.pdf">NVE (2026)</a> finds about five years from grid reservation to the first building in Norway, and three to five years from first to full operation.</p>
</section>

<section id="dc-data-coverage" class="dc-method-reference" aria-labelledby="dc-data-coverage-title">
  <h3 id="dc-data-coverage-title">Data coverage and country comparisons</h3>
  <p>Totals include only projects with a reported MW figure. <span data-coverage-missing>Several</span> projects have none, including several large ones. Country totals therefore partly reflect how much each country publishes.</p>
  <p>In Norway, <a href="https://www.statnett.no/om-statnett/nyheter-og-pressemeldinger/nyhetsarkiv-2025/storre-apenhet-om-reservert-nettkapasitet-og-hvem-som-star-i-ko/">Statnett</a> publishes project names and MW for grid reservations and its capacity queue. Sweden's <a href="https://www.svk.se/aktorsportalen/anslut-till-transmissionsnatet/information-om-pagaende-anslutningsarenden/">Svenska kraftnät</a> publishes aggregate queue figures. Finland's <a href="https://www.fingrid.fi/en/grid/grid-connection-agreement-phases/uusi-liityntakysely/connection-agreement-application/">Fingrid</a> treats connection applications as confidential. Planning and permit documents provide additional project-level information, though electrical capacity is not always disclosed.</p>
</section>

## How the tracker is updated

Country updates follow a common search and review process. The record keeps the sources and unresolved questions behind each project.

<div class="tracker-workflow">
  <details>
    <summary><span class="workflow-step">01</span><span>Search for new capacity</span></summary>
    <div class="workflow-body">
      <p>Searches are run country by country by an AI research agent that follows a fixed set of instructions and search terms in Swedish, Norwegian, Finnish and English. The searches cover company announcements, planning and permit records, grid information and local news.</p>
      <p>A project is added when sources link a named datacenter company or customer to a specific site and to new capacity. I review and approve every new project before it is counted.</p>
    </div>
  </details>
  <details>
    <summary><span class="workflow-step">02</span><span>Check project identity, phases and dates</span></summary>
    <div class="workflow-body">
      <p>The lead is compared with existing projects, candidate records and historic names. Addresses, municipalities, land parcels, company relationships and earlier announcements help determine whether it is a new project, a new phase or another name for an existing campus.</p>
      <p>Each source is kept with the building, phase or site it describes. Each phase keeps its own MW figure, date and investment decision. This prevents double counting and keeps a building's dates separate from those of the wider site.</p>
      <p>Historic names, superseded targets and earlier capacity claims are retained with their sources.</p>
    </div>
  </details>
  <details>
    <summary><span class="workflow-step">03</span><span>Record what each MW figure measures</span></summary>
    <div class="workflow-body">
      <p>Every MW figure is recorded with what it measures: IT equipment, the whole site or the grid connection. The record also keeps the source's range, the project status, dates and investment decision, and the part of the site they apply to.</p>
      <p>Source ranges and qualifications are retained. Conflicting figures and unresolved relationships are flagged for follow-up, with the questions linked to the relevant projects and sources. The calculations use the rules described above.</p>
    </div>
  </details>
  <details>
    <summary><span class="workflow-step">04</span><span>Calculate and review the totals</span></summary>
    <div class="workflow-body">
      <p>The map, chart, table and downloadable data all come from the same calculation. Results are checked for overlapping capacity, missing information and conflicts between sources before the site is updated.</p>
      <p>New projects are reviewed one by one before they are included in the totals.</p>
    </div>
  </details>
  <details>
    <summary><span class="workflow-step">05</span><span>Identify actors and global headquarters</span></summary>
    <div class="workflow-body">
      <p>Project announcements and site-specific sources identify the developer, operator, named customer and, where relevant, property owner or project partner. Each actor is linked to the whole project, including its phases. Partnerships keep separate actors and roles.</p>
      <p>Global headquarters are checked against company reports, official contact pages and company announcements, with other reliable sources used when needed. A local subsidiary's registered address or a regional office does not establish the group's global HQ. Registration country, headquarters, fund manager and financial owners are recorded separately. The business type describes what the actor does.</p>
      <p>Ownership notes retain the source and date. They describe the documented ownership without assigning an owner nationality or tracing every investor. Unknown identities and HQ countries remain unknown and do not match any HQ group. A project can still match a known partner's HQ while another actor is unresolved. Expand the project for actors, roles, HQ, sources and the review date.</p>
      <p data-actor-coverage>HQ selection filters the map and its totals without splitting capacity between actors.</p>
    </div>
  </details>
</div>

</div>

<style>
@import url("{{ '/assets/css/datacenter-tracker-map.css?v=5.0.21' | relative_url }}");

/* The illustration's slate blue anchors the controls and table surfaces. */
#dc-tracker {
  --dc-blue: #4c7088;
  --dc-country-SE: #9b6659;
  --dc-country-NO: #5f7968;
  --dc-country-FI: var(--dc-blue);
  --dc-map-0: #e5eae8;
  --dc-map-1: #c9d6da;
  --dc-map-2: #a7bdc7;
  --dc-map-3: #819fae;
  --dc-map-4: #5c7f94;
  --dc-map-5: #3f627b;
  --dc-class-confirmed: #24435a;
  --dc-class-dated_plan: #4f7a96;
  --dc-class-campus_continuation: #86a9bf;
  --dc-class-undated_announcement: #c3d4df;
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
  --dc-country-SE: #d49c8b;
  --dc-country-NO: #91b39c;
  --dc-country-FI: var(--dc-blue);
  --dc-map-0: #303d43;
  --dc-map-1: #3d5360;
  --dc-map-2: #557080;
  --dc-map-3: #7795a5;
  --dc-map-4: #9bb5c3;
  --dc-map-5: #c0d3dc;
  --dc-class-confirmed: #d6e5ef;
  --dc-class-dated_plan: #9dbdd2;
  --dc-class-campus_continuation: #6b91aa;
  --dc-class-undated_announcement: #45657a;
  --dc-ink: #e5eaec;
  --dc-muted: #b0bec5;
  --dc-paper: #1c1c1d;
  --dc-surface: #283237;
  --dc-header: #34424a;
  --dc-hover: #3a4b54;
  --dc-rule: rgba(158, 185, 202, 0.24);
  --dc-control: rgba(158, 185, 202, 0.1);
  color: var(--dc-ink);
  background: var(--dc-paper);
}

html[data-theme="dark"] #dc-tracker h2,
html[data-theme="dark"] #dc-tracker > p { color: var(--dc-ink); }
#summary-box :where(div, span, strong) { color: inherit; }
#tracker-table .project-row td { color: var(--dc-ink); }
#tracker-table .project-row span { color: inherit; }

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

/* Project list: same type, rules and colours as the map and chart. */
.dc-download-line {
  margin: 0.7rem 0 0;
  color: #657177;
  font: 13px/1.5 "Avenir Next", "Helvetica Neue", Arial, sans-serif;
}
.dc-download-line a {
  color: #4c7088;
  text-decoration: none;
  border-bottom: 1px solid rgba(76, 112, 136, 0.35);
}
.dc-download-line a:hover { border-bottom-color: currentColor; }
html[data-theme="dark"] .dc-download-line { color: #b0bec5; }
html[data-theme="dark"] .dc-download-line a { color: #9eb9ca; border-bottom-color: rgba(158, 185, 202, 0.4); }

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.dc-projects {
  margin: 2.4rem 0 2.6rem;
  color: var(--dc-ink);
  font-family: "Avenir Next", "Helvetica Neue", Arial, sans-serif;
}
.dc-projects h2 { margin-bottom: 0.5rem; }
.dc-projects .dc-projects-intro {
  max-width: 72ch;
  margin: 0;
  color: var(--dc-ink);
  font-size: 14px;
  line-height: 1.5;
}
.dc-projects .dc-download-line { margin-top: 0.35rem; }
.dc-projects .dc-cite { max-width: 72ch; margin: 0.35rem 0 0; color: var(--dc-muted); font-size: 12.5px; line-height: 1.5; }
.dc-projects .dc-cite a { color: var(--dc-blue); }

.tracker-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1.2rem 0 1rem;
  align-items: flex-start;
}

.filter-dropdown {
  position: relative;
  font: 12px/1.4 "Avenir Next", "Helvetica Neue", Arial, sans-serif;
}

.filter-dropdown summary {
  position: relative;
  list-style: none;
  cursor: pointer;
  padding: 0.34rem 1.9rem 0.34rem 0.85rem;
  border: 0;
  border-radius: 999px;
  background: var(--dc-control);
  color: var(--dc-ink);
  user-select: none;
}
.filter-dropdown summary:hover { color: var(--dc-ink); background: color-mix(in srgb, var(--dc-blue) 12%, transparent); }
.filter-dropdown summary:focus-visible { outline: 2px solid var(--dc-blue); outline-offset: 2px; }
.filter-dropdown summary::-webkit-details-marker { display: none; }
.filter-dropdown summary::after {
  content: "";
  position: absolute;
  right: 0.8rem;
  top: 50%;
  width: 5px;
  height: 5px;
  border-right: 1.3px solid var(--dc-muted);
  border-bottom: 1.3px solid var(--dc-muted);
  transform: translateY(-70%) rotate(45deg);
}
.filter-dropdown[open] summary::after { transform: translateY(-25%) rotate(-135deg); }

.filter-dropdown .checkbox-filter-options {
  position: absolute;
  z-index: 20;
  top: calc(100% + 0.3rem);
  left: 0;
  min-width: 220px;
  max-height: 280px;
  overflow-y: auto;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--dc-rule);
  border-radius: 10px;
  background: var(--dc-paper);
  box-shadow: 0 6px 18px rgba(20, 30, 35, 0.1);
}

.checkbox-filter-options {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 12px;
  color: var(--dc-ink);
}
.checkbox-filter-options label {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  line-height: 1.3;
  cursor: pointer;
}
.checkbox-filter-options input {
  margin-top: 0.1rem;
  accent-color: var(--dc-blue);
}

#summary-box.summary-box {
  margin: 0;
  padding: 0.75rem 0 0.8rem !important;
  border: 0;
  border-top: 1px solid var(--dc-rule);
  border-radius: 0;
  background: transparent;
  color: var(--dc-ink);
  font: 13px/1.4 "Avenir Next", "Helvetica Neue", Arial, sans-serif;
}
.summary-grid {
  display: grid;
  grid-template-columns: minmax(190px, 0.8fr) repeat(2, minmax(230px, 1fr));
  gap: 0.6rem 0;
}
.summary-block {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
  padding: 0 1rem;
  font-size: 13px;
}
.summary-block:first-child { padding-left: 0; }
.summary-block + .summary-block { border-left: 1px solid var(--dc-rule); }
#summary-box .summary-kicker {
  color: var(--dc-muted);
  font-size: 12px;
  line-height: 1.3;
}
#summary-box strong { font-size: 17px; font-weight: 500; }

.table-wrapper {
  overflow-x: auto;
  margin: 0 !important;
  border: 0;
  border-radius: 0;
}

#tracker-table {
  width: 100%;
  border-collapse: collapse;
  font-family: "Avenir Next", "Helvetica Neue", Arial, sans-serif;
}
#tracker-table > thead > tr > th,
#tracker-table > tbody > tr > td {
  padding: 9px 14px 9px 0 !important;
  border-bottom: 1px solid var(--dc-rule);
  vertical-align: top;
  text-align: left;
  font-size: 13.5px !important;
  line-height: 1.4 !important;
}
#tracker-table > thead > tr > th {
  padding-top: 6px !important;
  padding-bottom: 6px !important;
  border-bottom-color: color-mix(in srgb, var(--dc-ink) 35%, transparent);
  background: transparent;
  color: var(--dc-muted) !important;
  font-size: 12px !important;
  font-weight: 400 !important;
  white-space: nowrap;
  cursor: help;
}
#tracker-table > thead > tr > th.toggle-cell { cursor: default; }
#tracker-table tbody tr.project-row:hover { background: var(--dc-control); }
#tracker-table .toggle-cell { width: 26px; padding-right: 2px !important; padding-left: 2px !important; }
#tracker-table td.project-cell { min-width: 170px; font-weight: 500; }
#tracker-table td.stage-cell { min-width: 120px; font-size: 12.5px !important; white-space: nowrap; }
#tracker-table td.size-cell { width: 26%; min-width: 150px; }
.dc-stage-tag { display: flex; align-items: center; gap: 0.4rem; }
.dc-stage-tag + .dc-stage-tag { margin-top: 0.15rem; }
.dc-stage-tag i { flex: none; width: 9px; height: 9px; border-radius: 2px; }
.dc-stage-tag.dc-stage-unknown { color: var(--dc-muted); cursor: help; }
.dc-stage-tag.dc-stage-unknown i { box-sizing: border-box; border: 1.5px solid var(--dc-class-confirmed); background: transparent; }
.dc-size-value { display: block; font-variant-numeric: tabular-nums; }
.dc-size-bar { display: flex; height: 6px; margin-top: 5px; overflow: hidden; border-radius: 1px; }
.dc-size-bar i { display: block; min-width: 1px; height: 100%; }
.dc-row-muted { color: var(--dc-muted); }

.toggle-button {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--dc-blue);
  font: 400 17px/1 "Avenir Next", "Helvetica Neue", Arial, sans-serif;
  cursor: pointer;
}
.toggle-button:hover { background: var(--dc-control); }

.dc-show-all {
  display: block;
  margin: 1rem auto 0;
  padding: 0.45rem 1.1rem;
  border: 1px solid var(--dc-rule);
  border-radius: 999px;
  background: transparent;
  color: var(--dc-ink);
  font: 13px/1.4 "Avenir Next", "Helvetica Neue", Arial, sans-serif;
  cursor: pointer;
}
.dc-show-all:hover { background: var(--dc-control); }
.dc-show-all:focus-visible { outline: 2px solid var(--dc-blue); outline-offset: 2px; }
.dc-show-all[hidden] { display: none; }

.detail-row { display: none; }
#tracker-table > tbody > tr.detail-row > td.detail-cell {
  padding: 0.3rem 0 1.3rem 28px !important;
  font-size: 13px !important;
}
.dc-project-facts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.7rem 1.5rem;
  margin: 0.3rem 0 0.4rem;
}
.dc-project-facts div { min-width: 0; }
.dc-project-facts dt { margin: 0; color: var(--dc-muted); font-size: 12px; font-weight: 400; }
.dc-project-facts dd { margin: 0.1rem 0 0; color: var(--dc-ink); font-size: 13px; line-height: 1.4; }
#tracker-table .detail-title {
  margin: 1.1rem 0 0.35rem;
  color: var(--dc-ink);
  font-size: 13px;
  font-weight: 600;
}
#tracker-table .detail-summary {
  margin: 0.45rem 0 0;
  color: var(--dc-ink);
  font-size: 12.5px !important;
  line-height: 1.5 !important;
}
#tracker-table .entry-table {
  width: 100%;
  border-collapse: collapse;
  border: 0;
  background: transparent;
}
#tracker-table .entry-table th,
#tracker-table .entry-table td {
  padding: 6px 12px 6px 0 !important;
  border-bottom: 1px solid var(--dc-rule);
  vertical-align: top;
  text-align: left;
  color: var(--dc-ink);
  font-size: 12px !important;
  line-height: 1.45 !important;
}
#tracker-table .entry-table th {
  border-bottom-color: color-mix(in srgb, var(--dc-ink) 30%, transparent);
  background: transparent;
  color: var(--dc-muted) !important;
  font-size: 11.5px !important;
  font-weight: 400 !important;
  white-space: nowrap;
}
#tracker-table .entry-table a { color: var(--dc-blue); }
/* The wrapper adds no width to the project table; wide phase tables scroll inside it. */
.dc-entry-wrap { width: 0; min-width: 100%; overflow-x: auto; }
#tracker-table .entry-table { min-width: 700px; }
#tracker-table .entry-table td:last-child { min-width: 170px; }
#tracker-table .phase-table td:first-child { min-width: 100px; }
#tracker-table .phase-table td:nth-child(3) { min-width: 85px; }
#tracker-table .phase-table td:nth-child(4),
#tracker-table .phase-table td:nth-child(5) { min-width: 140px; }
#tracker-table .actor-table td:nth-child(5) { min-width: 200px; }

.muted {
  color: var(--dc-muted);
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
  max-width: none;
  margin: -0.55rem auto 1.65rem auto;
  border-top: 1px solid var(--dc-rule);
  border-bottom: 1px solid var(--dc-rule);
}

.scenario-explainer summary {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.4rem 0.8rem;
  align-items: baseline;
  padding: 0.78rem 1.8rem 0.78rem 0;
  color: var(--dc-ink);
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
  color: var(--dc-muted);
  font-size: 0.72rem;
  font-weight: 400;
}

.scenario-explainer summary > span:first-child,
.scenario-explainer-body p { color: var(--dc-ink); }

.scenario-explainer-body {
  padding: 0.25rem 1.8rem 1rem 0;
  color: var(--dc-ink);
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
  font-family: "Avenir Next", "Helvetica Neue", Arial, sans-serif;
}

.tracker-workflow details {
  margin: 0;
  border-top: 1px solid var(--dc-rule);
}

.tracker-workflow details:last-child {
  border-bottom: 1px solid var(--dc-rule);
}

.tracker-workflow summary {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
  padding: 0.95rem 1.8rem 0.95rem 0;
  color: var(--dc-ink);
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
  color: var(--dc-blue);
  font-size: 1.25rem;
  font-weight: 400;
}

.tracker-workflow details[open] > summary::after {
  content: "−";
}

.tracker-workflow .workflow-step {
  flex: 0 0 2rem;
  color: var(--dc-muted);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.06em;
}

.tracker-workflow .workflow-body {
  max-width: 72ch;
  margin-left: 2.45rem;
  padding: 0 1.8rem 1.1rem 0;
  color: var(--dc-ink);
  font-size: 14px;
  line-height: 1.55;
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
.filter-dropdown input[type="radio"] { margin-top: 0.1rem; }
.toggle-button:focus-visible { outline: 2px solid var(--dc-blue); outline-offset: 1px; }
#dc-scenario-map .dc-capacity-value, #dc-scenario-map .dc-capacity-total-value { font-size: 13.4px !important; }
@media (max-width: 820px) {
  .summary-grid { grid-template-columns: 1fr; }
  .summary-block { padding: 0.35rem 0 0 0; }
  .summary-block:first-child { padding-top: 0; }
  .summary-block + .summary-block { border-left: 0; border-top: 1px solid var(--dc-rule); }
}
@media (max-width: 600px) {
  .scenario-explainer summary { grid-template-columns: 1fr; }
  #tracker-table > thead > tr > th:nth-child(3),
  #tracker-table > tbody > tr.project-row > td:nth-child(3),
  #tracker-table > thead > tr > th:nth-child(5),
  #tracker-table > tbody > tr.project-row > td:nth-child(5) { display: none; }
  #tracker-table td.size-cell { min-width: 100px; }
  #tracker-table > thead > tr > th { white-space: normal; }
  #tracker-table > thead > tr > th,
  #tracker-table > tbody > tr > td { padding-right: 8px !important; font-size: 12.5px !important; }
  #tracker-table td.project-cell { min-width: 120px; }
  #tracker-table > tbody > tr.detail-row > td.detail-cell { padding-left: 0 !important; }
}
</style>
<link rel="stylesheet" href="{{ '/assets/css/datacenter-tracker-timeline.css' | relative_url }}?v=5.0.21">
<link rel="stylesheet" href="{{ '/assets/css/datacenter-tracker-method.css' | relative_url }}?v=5.0.21">
<script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
<script src="{{ '/assets/js/datacenter-tracker/method-flow.js' | relative_url }}?v=5.0.21" defer></script>
<script src="{{ '/assets/js/datacenter-tracker/scenario-map-d3.js' | relative_url }}?v=5.0.21" defer></script>
<script src="{{ '/assets/js/datacenter-tracker/timeline.js' | relative_url }}?v=5.0.21" defer></script>
<script src="{{ '/assets/js/datacenter-tracker.js' | relative_url }}?v=5.0.21" defer></script>

---
layout: page
title: Nordic datacenter tracker
description: Public database with plans and electricity use estimates for new datacenters across the Nordics.
hide_description: true
img: /assets/images/project-sketches/datacenter-tracker.png
permalink: /projects/datacenter-tracker/
---

<div class="tracker-intro">
  <div>
    <p class="tracker-lede">The method for this tracker is still being developed, so comments, corrections and tips about missing projects are welcome at <a href="mailto:fornborg@kth.se">fornborg@kth.se</a>.</p>
    <details class="tracker-about">
      <summary>About this page</summary>
      <p>This page tracks publicly reported plans for new datacenters in Sweden, Norway, Finland and Denmark, and estimates how much electricity they would use.</p>
      <p>I collect the plans from company announcements, news reports, planning and permit documents, and grid operators. Figures for future years are model results, explained in the <a href="#dc-method-flow">method section</a> further down.</p>
      <p><span data-download-meta></span>. The data are shared under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.</p>
    </details>
  </div>
</div>

<div id="dc-tracker" markdown="1" data-results="{{ '/assets/data/datacenters/results.json' | relative_url }}?v=5.4.13">

<div id="dc-shared-controls" aria-label="Shared tracker controls"></div>

<section id="dc-map" class="dc-map-section" aria-labelledby="dc-map-title">
  <h2 id="dc-map-title" class="visually-hidden">Planned datacenter sites</h2>
  <div id="dc-scenario-map" data-neighbours="{{ '/assets/data/maps/nordic-neighbours.geojson' | relative_url }}?v=5.4.4"></div>
  <p class="dc-map-footnote">Values are the upper end of each range. Power is for the whole site, including cooling. Full build-out means that all capacity in the selected scenario is built and in use. <a href="#dc-method-flow">Method below</a>.</p>
</section>

<section id="dc-timeline" class="dc-timeline" aria-labelledby="dc-timeline-title" data-timeline="{{ '/assets/data/datacenters/timeline.json' | relative_url }}?v=5.4.13" data-electricity="{{ '/assets/data/datacenters/electricity_use.json' | relative_url }}?v=5.4.13">
  <h2 id="dc-timeline-title" class="dc-timeline-heading" aria-live="polite"><span data-heading="mw" class="dc-heading-current">Modelled capacity in operation by year</span><span data-heading="annual_addition_mw" aria-hidden="true">Modelled capacity added by year</span><span data-heading="annual_twh" aria-hidden="true">Modelled electricity use by year</span></h2>
  <p class="dc-chart-subtitle" data-timeline-subtitle aria-live="polite"></p>
  <div class="dc-timeline-content" hidden>
    <div class="dc-timeline-paper">
      <div class="dc-timeline-chart"></div>
      <div class="dc-timeline-legend" data-band-legend><span class="band"><i></i><span data-timeline-family-label>Range</span></span><span class="baseline" data-use-visible><i></i>Existing sites, 2025 level</span></div>
      <div class="dc-timeline-legend dc-timeline-bar-legend" hidden><span><i></i>Low end of range</span><span class="upper"><i></i>Up to high end of range</span></div>
      <div class="dc-timeline-legend dc-electricity-history-key" data-use-visible><span data-history-symbol="measured">NVE</span><span data-history-symbol="measured_subset">Elhub</span><span data-history-symbol="reported">EU reports</span><span data-history-symbol="estimate">RISE estimates</span></div>
      <div class="dc-timeline-controls">
        <div class="dc-timeline-measure-control" data-timeline-capacity-view>
          <span id="dc-timeline-measure-label">View</span>
          <div class="dc-timeline-measure-switch" role="group" aria-labelledby="dc-timeline-measure-label">
            <label><input type="radio" name="timeline-measure" value="mw" checked><span>Cumulative</span></label>
            <label><input type="radio" name="timeline-measure" value="annual_addition_mw"><span>Added/year</span></label>
          </div>
        </div>
      </div>
      <div class="dc-timeline-inspect">
        <span class="dc-timeline-year"></span>
        <div class="dc-timeline-readout" aria-live="polite" aria-atomic="true"></div>
      </div>
      <p class="dc-timeline-note dc-timeline-context" data-timeline-context hidden></p>
    </div>
    <p class="dc-chart-footnote">Estimated electricity use in datacenters in each country, recorded up to 2025, and new capacity in operation from 2026. Values from 2026 are model results for the case that the projects in <strong data-timeline-family-name>Dated plans</strong> are built. They rest on assumptions about when projects come online, how fast their capacity comes into use and, for electricity use, the average share of capacity in use (the load factor), as described in the <a href="#dc-method-flow">method below</a>. Existing sites stay at their 2025 level. The shaded range reflects uncertain project sizes and start dates in the sources.</p>
  </div>
  <p class="dc-timeline-status" role="status">Loading annual data…</p>
</section>

<section id="tracker-projects" class="dc-projects" aria-labelledby="tracker-projects-title">
  <h2 id="tracker-projects-title">Projects</h2>
  <p class="dc-projects-intro">The list shows new site capacity at full build-out, including cooling. Capacity already operating at the end of 2025 is excluded. Click a project to see IT capacity, source figures, conversions, phases and sources. Values labelled “From source” come directly from the sources. Values labelled “Estimated” have been converted by the tracker.</p>
  <p class="dc-download-line"><a href="#" data-download-zip>Download data (ZIP)</a><span aria-hidden="true"> · </span><a href="#" data-download-json>Full model output (JSON)</a><span aria-hidden="true"> · </span><span data-download-meta></span></p>
  <p class="dc-cite">The data are shared under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. The ZIP file contains three CSV tables and a description of every column.</p>

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



</div>

<div id="summary-box" class="summary-box" role="status" aria-live="polite">Loading projects…</div>

<div class="table-wrapper" tabindex="0" aria-label="Project table. Scroll horizontally if needed.">
  <table id="tracker-table">
    <thead>
      <tr>
        <th class="toggle-cell"><span class="visually-hidden">Details</span></th>
        <th>
          <div id="project-search-header" class="project-search-header">
            <span class="project-heading">Project</span>
            <button id="project-search-open" class="project-search-button" type="button" aria-label="Search projects" aria-expanded="false" aria-controls="project-search-field"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/><path d="m12 12 5 5"/></svg></button>
            <div id="project-search-field" class="project-search-field" hidden>
              <input id="tracker-search" type="text" inputmode="search" placeholder="Search projects" aria-label="Search projects by name, company or location" autocomplete="off" spellcheck="false">
              <button id="project-search-close" class="project-search-button" type="button" aria-label="Clear and close search"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg></button>
            </div>
          </div>
        </th>
        <th>Country</th>
        <th>Zone</th>
        <th title="How far each part of the project has come. The colours match the map.">Stage</th>
        <th id="size-header" title="New site power at full build-out, including cooling. Existing capacity is excluded. Expand a project to compare source figures and estimates.">Site capacity (MW)</th>
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
  <p>Capacity is expressed as site power: the electrical capacity of the whole datacenter, including cooling. The tracker subtracts capacity already operating at the end of 2025 and counts overlapping figures once.</p>

  <h4 id="dc-method-ranges">Ranges</h4>
  <p>The tracker shows a range when project sizes, dates or operating conditions are uncertain.</p>
  <table class="dc-method-editorial-table" aria-labelledby="dc-method-ranges">
    <thead><tr><th scope="col">Source of uncertainty</th><th scope="col">How it affects the estimate</th></tr></thead>
    <tbody>
      <tr><th scope="row">Reported capacity</th><td>If a source reports 250–500 MW, the tracker uses 250 MW for the lower estimate and 500 MW for the upper estimate.</td></tr>
      <tr><th scope="row">Existing capacity</th><td>Some of the announced total may already be operating. If that amount is unknown, the estimate of new capacity runs from zero to the reported total.</td></tr>
      <tr><th scope="row">Load factor</th><td>Large campuses with several physical tenants, and campuses whose size or use is unclear, use a load factor of 0.57–0.75. This widens the electricity estimate without changing the capacity estimate.</td></tr>
      <tr><th scope="row">Peak demand</th><td>When a source reports peak demand, installed capacity is estimated by assuming that the peak is 62–80% of installed capacity.</td></tr>
      <tr><th scope="row">Opening date</th><td>In the chart, the lower estimate uses the later opening date and the upper estimate the earlier date.</td></tr>
    </tbody>
  </table>
  <p>The map circles, zone totals and capacity bars show the upper estimate. The chart below the map shows the full range. The ranges reflect the reported figures and the assumptions described below. They are not statistical confidence intervals.</p>

  <h4 id="dc-method-capacity">Capacity conversion</h4>
  <div data-method-table="capacity"></div>
  <p>PUE (power usage effectiveness) is the electricity used by the whole site divided by the electricity used by its IT equipment. The tracker uses 1.2 unless a source reports a value for the site. In the <a href="https://energy.ec.europa.eu/topics/energy-efficiency/energy-efficiency-targets-directive-and-rules/energy-efficiency-directive/energy-performance-data-centres_en">EU reporting scheme</a>, very large datacenters have an energy-weighted average PUE of 1.20. Country averages for 2025 were 1.23 in Sweden and 1.17 in Denmark. Finland reported 1.16 for 2024. Norway is outside the scheme. <a href="https://epoch.ai/data/data-centers-documentation/methodology">Epoch AI</a> also uses 1.2 for hyperscale sites, while <a href="https://www.energimyndigheten.se/492f27/contentassets/054d98cfdcd54cb5a802e24b53779452/energianvandning-i-datacenter-och-digitala-system.pdf">RISE (2023)</a> reports 1.1–1.3 for efficient Swedish sites.</p>
  <p>PUE is an annual average. Using it to convert power assumes a constant cooling share, so it can understate demand on the hottest days.</p>

  <p>When IT capacity is missing, the project details estimate it by dividing site power by PUE. A PUE given by the source takes precedence over the default of 1.2. Grid capacity and MW with no stated measure are treated as site power. Peak demand is first converted to installed capacity. Each estimate keeps the building, phase or campus named in the source.</p>

  <h4 id="dc-method-energy">Annual electricity use</h4>
  <p class="dc-method-formula">Annual electricity use (TWh) = site MW in use × load factor × 8,760 / 1,000,000</p>
  <p>A load factor of 0.75 means that average demand over the year is 75% of the site's installed capacity. One load profile applies to the whole physical campus, including its buildings and customer installations.</p>
  <div data-method-table="annual"></div>
  <p>The factors come from <a href="https://powering-intelligence.epri.com/annual-peak-use.html">EPRI's measurements at US sites (2026)</a>: one large facility with a single physical user and several smaller facilities with multiple tenants. Large campuses with multiple tenants were not measured. The tracker uses the range between the two observations for these campuses. For comparison, <a href="https://publikasjoner.nve.no/diverse/2026/Metode.for.framskriving.av.strombruk.i.datasentre2026.pdf">NVE (2026)</a> uses 0.70 of reserved grid capacity for Norwegian datacenters. The tracker factors have not been validated against Nordic operating data.</p>
  <p>Campus size is assessed from its planned capacity at full build-out. Site power is divided by PUE to estimate IT power where necessary. The load-profile rule uses 50 MW IT to distinguish large from small campuses. The datacenter types below are classified separately. Load factors follow the campus rules in the table above.</p>
  <p><strong>Electricity use at full build-out</strong>, shown on the map and in the project list, assumes that all announced capacity is built and in use. <strong>Annual electricity use</strong> in the chart follows the opening dates and ramp-up described below. It is added to the 2025 consumption of existing sites, which is held constant. In its first operating year, a project receives its first-year share for the whole year, regardless of the opening month.</p>

  <h4 id="dc-method-types">Datacenter types</h4>
  <p>The types describe how a site is used or what it is being built for. They can overlap. A hyperscale platform may rent space from a colocation operator, and any type of datacenter can run AI workloads.</p>
  <table class="dc-method-editorial-table" aria-labelledby="dc-method-types">
    <thead><tr><th scope="col">Type</th><th scope="col">Definition</th></tr></thead>
    <tbody>
      <tr><th scope="row">Hyperscale</th><td>Large datacenters used by cloud, internet or AI platforms, including campuses being built for these customers. The tracker uses project announcements and the operator's services to check the site's actual or intended customers. Planned projects can be classified as hyperscale before a customer is named or a contract is signed.</td></tr>
      <tr><th scope="row">Colocation</th><td>The operator provides space, power and cooling for customers' IT equipment. This includes racks, halls and entire buildings built for a customer.</td></tr>
      <tr><th scope="row">Enterprise</th><td>An organisation runs the facility for its own computing needs. This category also includes shared public research computing.</td></tr>
      <tr><th scope="row">AI / HPC</th><td>The site runs or is being built for artificial intelligence or high-performance computing. This describes what the computers do and can apply to any business model.</td></tr>
    </tbody>
  </table>
  <p>Hyperscale sites often exceed 50 MW IT, although smaller platform facilities are also included. Classification follows the site's actual or planned use. These campuses can serve a mix of customers. The category describes the campus as a whole. Contracts with hyperscalers may cover only part of its capacity.</p>
  <p>The definitions are based on <a href="https://powering-intelligence.epri.com/nominal-capacity.html">EPRI (2026, footnote 2)</a>, <a href="https://eepublicdownloads.blob.core.windows.net/public-cdn-container/clean-documents/Reports/2026/FINAL_ENTSO-E_Data_Centres_260430.pdf">ENTSO-E (2026, section 1.2)</a> and <a href="https://dso.nationalgrid.co.uk/downloads/15083/data-centre-impact-study2.pdf">Regen / National Grid (2025)</a>. Their definitions differ in how they treat ownership and rented facilities. The tracker records overlapping types and notes whether the use is planned, contracted or already operating.</p>

  <p id="dc-method-context">In the electricity view, the totals by bidding zone are also shown as a share of electricity consumption in 2025. The comparison uses <a href="https://opendata.esett.com/">eSett Open Data</a>, summed over the year: 126.7 TWh in Sweden, 139.2 TWh in Norway, 82.9 TWh in Finland and 39.8 TWh in Denmark. These shares show the scale of the proposed additions compared with current consumption. Project calculations use the capacity figures and load factors described above.</p>

  <h4 id="dc-method-stages">Stages</h4>
  <p>Each capacity figure is assigned a stage from the decisions, construction activity and dates in its sources. The ticks show which scenario includes each stage.</p>
  <div data-method-table="stages" tabindex="0" role="region" aria-label="Stages and scenarios. Scroll horizontally if needed."></div>

  <h4 id="dc-method-timing">Opening dates and ramp-up</h4>
  <p>Reported opening dates are used where available. If a source gives only a construction start, operation is assumed to begin <span data-method-value="construction_years"></span> years later. If neither date is available, the estimate depends on project status:</p>
  <div data-method-table="timing"></div>
  <dl>
    <dt>Gradual use of capacity</dt>
    <dd>Without a reported year of full operation, each building or phase reaches full use over <span data-method-value="expansion_years"></span> years, including its opening year. This applies even if the building itself opens all at once. A reported or observed year of full operation takes precedence.</dd>
    <dt>Remaining campus capacity</dt>
    <dd>Where a campus has a dated phase under construction or backed by an investment decision, the remaining undated capacity follows that phase's estimated opening date and the same ramp-up. Reported phase deliveries are used where available.</dd>
    <dt>Grid connection</dt>
    <dd>A reported connection year sets the earliest possible opening date. If the connection is only applied for or its status is unclear, the lower estimate in Confirmed and Dated plans counts no operating capacity.</dd>
    <dt>After 2035</dt>
    <dd>Capacity expected to come into use after 2035 falls outside the chart, but remains in the map's full announced size.</dd>
  </dl>
  <p>The lead times are modelling assumptions. <a href="https://www.iea.org/reports/energy-and-ai/energy-demand-from-ai">IEA (2025)</a> describes construction periods of two to three years. <a href="https://publikasjoner.nve.no/diverse/2026/Metode.for.framskriving.av.strombruk.i.datasentre2026.pdf">NVE (2026)</a> finds about five years from a grid reservation to the first building in Norway, followed by three to five years to full operation.</p>
  <p>The five-year ramp-up follows EPRI's calibration against US state-level data, including colocation. Its use for Nordic projects is an assumption. A source's full-capacity date may refer to completed buildings or a ready grid connection, with customers moving in later. Using that date for full operation can overstate electricity use in the early years.</p>
</section>

<section id="dc-data-coverage" class="dc-method-reference" aria-labelledby="dc-data-coverage-title">
  <h3 id="dc-data-coverage-title">Data coverage and country comparisons</h3>
  <p>Totals cover projects with a usable MW figure. <span data-coverage-missing>Several</span> projects have none, including some large developments. Differences between countries therefore reflect both their announced projects and the information available about them.</p>
  <p>Norway's <a href="https://www.statnett.no/om-statnett/nyheter-og-pressemeldinger/nyhetsarkiv-2025/storre-apenhet-om-reservert-nettkapasitet-og-hvem-som-star-i-ko/">Statnett</a> publishes project names and MW for reserved connections and its capacity queue. Sweden's <a href="https://www.svk.se/aktorsportalen/anslut-till-transmissionsnatet/information-om-pagaende-anslutningsarenden/">Svenska kraftnät</a> publishes aggregate queue figures. Finland's <a href="https://www.fingrid.fi/en/grid/grid-connection-agreement-phases/uusi-liityntakysely/connection-agreement-application/">Fingrid</a> treats connection applications as confidential. Planning and permit documents provide further site-level information, although they do not always disclose electrical capacity.</p>
</section>

## How the tracker is updated

Each country is reviewed using the same search instructions. Sources, earlier announcements and unresolved questions are kept with each project.

<div class="tracker-workflow">
  <details>
    <summary><span class="workflow-step">01</span><span>Search for new capacity</span></summary>
    <div class="workflow-body">
      <p>An AI research agent searches company announcements, planning and permit records, grid information and local news. It works country by country, following written instructions and search terms in Swedish, Norwegian, Finnish, Danish and English.</p>
      <p>A project is added when sources link a named datacenter company or customer to a specific site and to new capacity. I review and approve every new project before it is included.</p>
    </div>
  </details>
  <details>
    <summary><span class="workflow-step">02</span><span>Check project identity, phases and dates</span></summary>
    <div class="workflow-body">
      <p>Each announcement is checked against the projects and earlier names already recorded. Addresses, land parcels, company relationships and previous announcements help distinguish a new site from an expansion or a change of name.</p>
      <p>Capacity figures, dates and investment decisions are recorded for the building, phase or campus they describe. A date for one building is not applied to the entire campus. Overlapping announcements are counted once.</p>
      <p>Historic names, superseded targets and earlier capacity claims are retained with their sources.</p>
    </div>
  </details>
  <details>
    <summary><span class="workflow-step">03</span><span>Record what each MW figure measures</span></summary>
    <div class="workflow-body">
      <p>Every MW figure is recorded as IT power, site power, grid capacity or another stated measure. Its dates, project status and investment decision are kept with the part of the project they describe.</p>
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
      <p>Project announcements and site records identify the developer, operator, named customer and any property owner or project partner. Their roles are recorded separately. A partnership does not create extra capacity.</p>
      <p>Global headquarters are checked using company reports, official contact pages and announcements. Headquarters refers to the company group, so a local office or subsidiary may have a different address. Registration, headquarters and financial ownership are recorded separately.</p>
      <p>Ownership notes describe the ownership reported in each source and the date of that report. The HQ filter groups projects by where their companies are headquartered. Financial ownership is recorded separately. Unknown headquarters stay unknown. A project can match a known partner's HQ even when another partner is unidentified. Expand a project to see the companies, roles, headquarters and sources.</p>
      <p data-actor-coverage>HQ selection filters the map and its totals without splitting capacity between actors.</p>
    </div>
  </details>
</div>

</div>

<style>
@import url("{{ '/assets/css/datacenter-tracker-map.css?v=5.5.2' | relative_url }}");

/* A slate blue anchors the controls and table surfaces. */
#dc-tracker {
  --dc-blue: #4c7088;
  --dc-country-SE: #9b6659;
  --dc-country-NO: #5f7968;
  --dc-country-FI: var(--dc-blue);
  --dc-country-DK: #b18b5e;
  --dc-class-confirmed: #24435a;
  --dc-class-dated_plan: #4f7a96;
  --dc-class-campus_continuation: #86a9bf;
  --dc-class-undated_announcement: #c3d4df;
  --dc-ink: #303d43;
  --dc-muted: #56636a;
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
  --dc-country-DK: #d9ad77;
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

/* A one-sentence introduction. The rest sits behind "About this page", in the same type as the introduction. */
.tracker-intro { margin-bottom: 1.1rem; max-width: 760px; }
.tracker-intro p { margin: 0; }
.tracker-intro .tracker-lede { margin: -0.3rem 0 0; font-size: 0.95em; color: color-mix(in srgb, var(--dc-ink, #303d43) 85%, transparent); }
.tracker-intro .tracker-lede a { color: var(--dc-blue, #4c7088); }
.tracker-about { margin-top: 0.3rem; }
.tracker-about > summary { width: fit-content; cursor: pointer; list-style: none; color: var(--dc-blue, #4c7088); font-size: 0.9em; }
.tracker-about > summary::-webkit-details-marker { display: none; }
.tracker-about > summary::after { content: " +"; }
.tracker-about[open] > summary::after { content: " −"; }
.tracker-intro .tracker-about p { margin: 0.5rem 0 0; font-size: 0.9em; color: color-mix(in srgb, var(--dc-ink, #303d43) 85%, transparent); }
.tracker-intro .tracker-about a { color: var(--dc-blue, #4c7088); }

/* The chart heading follows the measure. All three headings share one grid cell, so the heading keeps the height
   of the longest and changing measure fades one into the next without moving the page. */
#dc-timeline .dc-timeline-heading { display: grid; }
#dc-timeline .dc-timeline-heading > span { grid-area: 1 / 1; opacity: 0; visibility: hidden; transition: opacity 260ms ease, visibility 0s linear 260ms; }
#dc-timeline .dc-timeline-heading > span.dc-heading-current { opacity: 1; visibility: visible; transition: opacity 260ms ease 80ms, visibility 0s; }
@media (prefers-reduced-motion: reduce) { #dc-timeline .dc-timeline-heading > span { transition: none !important; } }
/* A short grey line under the chart heading says what is shown for the current selection. A new text fades in. */
#dc-tracker .dc-chart-subtitle { max-width: 640px; margin: -0.35rem 0 0.6rem; color: var(--dc-muted);
  font: 13px/1.5 "Avenir Next", "Helvetica Neue", Arial, sans-serif !important; transition: opacity 180ms ease; }
#dc-tracker .dc-chart-subtitle.dc-fading { opacity: 0; }
#dc-tracker .dc-chart-subtitle:empty { min-height: 1.5em; }
@media (prefers-reduced-motion: reduce) { #dc-tracker .dc-chart-subtitle { transition: none; } }

/* The chart's view control sits under the chart, on one line like the year control under the map. */
#dc-timeline .dc-timeline-paper .dc-timeline-controls { display: flex; justify-content: center; max-width: none; margin: 0.5rem 0 0.9rem; }
#dc-timeline .dc-timeline-paper .dc-timeline-measure-control { flex-direction: row; align-items: center; gap: 0.6rem; }

/* The note under the chart, in the same quiet style as the notes under the map. */
#dc-tracker .dc-chart-footnote { max-width: 760px; margin: 1.2rem auto 0; text-align: center; color: var(--dc-muted);
  font: 12px/1.6 "Avenir Next", "Helvetica Neue", Arial, sans-serif !important; }
#dc-tracker .dc-chart-footnote strong { font-weight: 500; color: var(--dc-ink); }
#dc-tracker .dc-chart-footnote a { color: inherit; text-decoration: underline; }

/* A project opened from the map is marked briefly. */
#tracker-table tr.project-row.dc-row-flash { background: color-mix(in srgb, var(--dc-blue) 16%, transparent); transition: background 0.6s ease; }

/* Project list: same type, rules and colours as the map and chart. */
.dc-download-line {
  margin: 0.7rem 0 0;
  color: var(--dc-muted, #56636a);
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

/* The project section follows the map and timeline sections: the heading and intro use the page's own
   type, and the components inside set their own. The download and licence lines are small grey notes,
   like the footnote under the map. */
.dc-projects {
  margin: 2.4rem 0 2.6rem;
  color: var(--dc-ink);
}
.dc-projects h2 { margin-bottom: 0.5rem; }
.dc-projects > p { color: inherit; }
#dc-tracker .dc-projects .dc-download-line,
#dc-tracker .dc-projects .dc-cite {
  max-width: none;
  margin: 0.35rem 0 0;
  color: var(--dc-muted);
  font: 12.5px/1.5 "Avenir Next", "Helvetica Neue", Arial, sans-serif !important;
}
#dc-tracker .dc-projects .dc-download-line span { color: inherit; }
.dc-projects .dc-cite a { color: var(--dc-blue); }

.tracker-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1.2rem 0 1rem;
  align-items: flex-start;
}

.project-search-header { position: relative; height: 1.4em; display: flex; align-items: center; font: inherit; color: inherit; }
#tracker-table .project-search-header > .project-heading { font: inherit; color: inherit; line-height: inherit; }
.project-search-button { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 28px; height: 28px; padding: 5px; border: 0; background: transparent; color: var(--dc-muted); cursor: pointer; }
.project-search-button svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.3; }
.project-search-button:hover { color: var(--dc-blue); }
.project-search-button:focus-visible { outline: 1px solid var(--dc-blue); outline-offset: 1px; }
.project-search-field { position: absolute; inset: 0; display: flex; align-items: center; border-bottom: 1px solid var(--dc-rule); }
.project-search-field[hidden] { display: none; }
.project-search-field:focus-within { border-color: var(--dc-blue); }
#tracker-search { flex: 1; width: 0; min-width: 0; padding: 0; border: 0; border-radius: 0; background: transparent; color: var(--dc-ink); font: inherit; }
#tracker-search::placeholder { color: var(--dc-muted); opacity: 1; }
#tracker-search:focus { outline: none; }
.project-search-header.is-searching > .project-heading { visibility: hidden; }
.project-search-header.is-searching > #project-search-open { visibility: hidden; }
.dc-search-empty { padding: 1rem !important; color: var(--dc-muted); }
@media (max-width: 600px) { #tracker-search { font-size: 16px; } }

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
#summary-box .summary-context {
  margin-top: 0.25rem;
  font-size: 12px;
  line-height: 1.45;
  color: var(--dc-ink);
}

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
/* The page's body weight (300) is too thin in Avenir Next for table text. */
#tracker-table > tbody > tr > td { font-weight: 400; }
#tracker-table > thead > tr > th {
  padding-top: 6px !important;
  padding-bottom: 6px !important;
  border-bottom-color: color-mix(in srgb, var(--dc-ink) 35%, transparent);
  background: transparent;
  color: color-mix(in srgb, var(--dc-ink) 85%, var(--dc-muted)) !important;
  font-size: 13.5px !important;
  font-weight: 500 !important;
  vertical-align: middle;
  white-space: nowrap;
  cursor: default;
}
#tracker-table > thead > tr > th.toggle-cell { cursor: default; }
#tracker-table tbody tr.project-row:hover { background: var(--dc-control); }
#tracker-table tbody tr.project-row { cursor: pointer; }
#tracker-table .toggle-cell { width: 26px; padding-right: 2px !important; padding-left: 2px !important; }
#tracker-table td.project-cell { min-width: 170px; font-weight: 500; }
#tracker-table td.stage-cell { min-width: 120px; font-size: 12.5px !important; white-space: nowrap; }
#tracker-table td.size-cell { width: 30%; min-width: 150px; }
.dc-stage-tag { display: flex; align-items: center; gap: 0.4rem; }
.dc-stage-tag + .dc-stage-tag { margin-top: 0.15rem; }
.dc-stage-tag i { flex: none; width: 9px; height: 9px; border-radius: 2px; }
.dc-stage-tag.dc-stage-unknown { color: var(--dc-muted); cursor: help; }
.dc-stage-tag.dc-stage-unknown i { box-sizing: border-box; border: 1.5px solid var(--dc-class-confirmed); background: transparent; }
.dc-size-value { display: block; font-variant-numeric: tabular-nums; }
.dc-size-bar { display: flex; height: 6px; margin-top: 5px; overflow: hidden; border-radius: 1px; }
.dc-size-bar i { display: block; min-width: 1px; height: 100%; }
.dc-row-muted { color: var(--dc-muted); }
/* Scoped project summaries use the same quiet rules as the main list. */
.dc-summary-table { width: 100%; border-collapse: collapse; font: inherit; font-weight: 400; color: var(--dc-ink); }
.dc-summary-table th, .dc-summary-table td { text-align: left; vertical-align: top; padding: 0.6rem 1rem 0.6rem 0; border: 0; border-bottom: 1px solid var(--dc-rule); }
.dc-summary-table td { font-weight: 400 !important; color: var(--dc-ink); }
.dc-summary-table th { color: var(--dc-muted); font-size: 12px; font-weight: 400; }
.dc-summary-table td:first-child { width: 42%; }
.dc-summary-sources { font-size: 11px; margin-top: 0.25rem; }
.dc-project-meta { font-size: 12px !important; color: var(--dc-muted); }
.dc-project-section { border-top: 1px solid var(--dc-rule); padding: 0.75rem 0; margin-top: 0.6rem; }
.dc-project-section > summary { cursor: pointer; font-weight: 500; }
.dc-project-section[open] > summary { margin-bottom: 0.8rem; }
.dc-size-bar { overflow: visible; }
.dc-size-bar i { position: relative; }
.dc-size-bar i:is(:hover, :focus-visible)::after { content: attr(data-caption); position: absolute; z-index: 5; right: 0; bottom: 12px; width: max-content; max-width: 240px; padding: 0.4rem 0.6rem; color: var(--dc-ink); background: var(--dc-paper); border: 1px solid var(--dc-rule); font: 12px/1.4 "Avenir Next", sans-serif; }
.dc-size-bar i:focus-visible { outline: 2px solid var(--dc-blue); outline-offset: 2px; }
@media (max-width: 600px) { .dc-summary-table { font-size: 12px; } .dc-summary-table td { overflow-wrap: anywhere; } }
.dc-source-conversion {
  display: block;
  margin-top: 0.25rem;
  max-width: 165px;
  white-space: normal;
  font-size: 11.5px;
}

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
  font-size: 12px !important;
}
/* A single compact reading size throughout an expanded project. */
#tracker-table .detail-cell :is(p, li, td, summary) {
  font-size: 12px !important;
  line-height: 1.45 !important;
}
#tracker-table .detail-cell p { margin: 0.35rem 0 0.65rem; }
#tracker-table .detail-cell :is(ul, ol) { margin: 0.35rem 0 0.65rem; }
#tracker-table .detail-cell .dc-summary-table :is(th, td) { padding: 0.4rem 0.8rem 0.4rem 0; }
#tracker-table .detail-cell :is(.dc-project-meta, .dc-summary-sources, .dc-summary-sources a) { font-size: 11px !important; }
.dc-project-facts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.7rem 1.5rem;
  margin: 0.3rem 0 0.4rem;
}
.dc-project-facts div { min-width: 0; }
#tracker-table .dc-project-progress {
  margin: 0.35rem 0 1rem;
  padding-left: 1.15rem;
  color: var(--dc-ink);
  font-size: 13px;
  line-height: 1.5;
}
#tracker-table .dc-project-progress li + li { margin-top: 0.35rem; }
.dc-project-facts dt { margin: 0; color: var(--dc-muted); font-size: 12px; font-weight: 400; }
.dc-project-facts dd { margin: 0.1rem 0 0; color: var(--dc-ink); font-size: 13px; line-height: 1.4; }
#tracker-table .detail-title {
  margin: 0.8rem 0 0.3rem;
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
.dc-source-list { padding-left: 1.2rem; }
.dc-source-list li + li { margin-top: 0.3rem; }
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
  #tracker-table > thead > tr > th { font-size: 13px !important; }
  #tracker-table td.project-cell { min-width: 120px; }
  #tracker-table > tbody > tr.detail-row > td.detail-cell { padding-left: 0 !important; }
}
</style>
<link rel="stylesheet" href="{{ '/assets/css/datacenter-tracker-timeline.css' | relative_url }}?v=5.5.1">
<link rel="stylesheet" href="{{ '/assets/css/datacenter-tracker-method.css' | relative_url }}?v=5.4.4">
<script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
<script src="{{ '/assets/js/datacenter-tracker/method-flow.js' | relative_url }}?v=5.4.4" defer></script>
<script src="{{ '/assets/js/datacenter-tracker/scenario-map-d3.js' | relative_url }}?v=5.5.1" defer></script>
<script src="{{ '/assets/js/datacenter-tracker/timeline.js' | relative_url }}?v=5.5.1" defer></script>
<link rel="stylesheet" href="{{ '/assets/css/datacenter-tracker-electricity.css' | relative_url }}?v=5.5.1">
<script src="{{ '/assets/js/datacenter-tracker/electricity-use.js' | relative_url }}?v=5.4.4" defer></script>
<script src="{{ '/assets/js/datacenter-tracker.js' | relative_url }}?v=5.5.1" defer></script>

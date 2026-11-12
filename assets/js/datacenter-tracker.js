/* Render the shared model in the original tracker layout. No capacity model runs here. */
(function (global) {
  "use strict";
  const numeric = (value) => (value === null || value === undefined || value === "" ? null : Number.isFinite(Number(value)) ? Number(value) : null);
  // One rounding rule for every number on the page: no more precision than the sources carry.
  function rounded(value, kind = "mw") {
    const v = Math.abs(value);
    if (kind === "twh") return v === 0 ? 0 : v < 0.1 ? Math.round(value * 100) / 100 : v < 10 ? Math.round(value * 10) / 10 : Math.round(value);
    return v < 10 ? Math.round(value * 10) / 10 : v < 1000 ? Math.round(value) : Math.round(value / 10) * 10;
  }
  const format = (value, kind = "mw") =>
    numeric(value) === null
      ? "Unknown"
      : rounded(Number(value), kind).toLocaleString("en-US", {
          maximumFractionDigits: 2,
        });
  function range(low, high, kind = "mw") {
    low = numeric(low);
    high = numeric(high);
    if (low === null || high === null) return "Unknown";
    const a = format(low, kind),
      b = format(high, kind);
    return a === b ? a : a + "–" + b;
  }
  function sumBounds(rows, low, high) {
    const unknown = rows.filter(
      (row) =>
        (!row.capacity_known && !["operational", "cancelled", "dormant"].includes(row.indicator)) ||
        (row.partial_capacity && !/^(nameplate|buildout|remaining)/.test(low))
    ).length;
    const known = rows.some(
      (row) => numeric(row[low]) !== null && (row.capacity_known || ["operational", "cancelled", "dormant"].includes(row.indicator))
    );
    const total = (key) => rows.reduce((sum, row) => sum + (numeric(row[key]) ?? 0), 0);
    return {
      low: !known && unknown ? null : total(low),
      high: !known && unknown ? null : total(high),
      unknown,
    };
  }
  const totalRange = (t, kind = "mw") =>
    !t || t.low === null || (t.high === 0 && t.unknown) ? "Unknown" : range(t.low, t.high, kind);
  function createControls() {
    let state = { family: "dated", measure: "mw", hq: "none", type: [] };
    const listeners = new Set();
    return {
      get: () => ({ ...state, type: [...state.type] }),
      set(patch) {
        const next = { ...state, ...patch };
        if (Object.keys(state).every(key => key === "type" ? state.type.join("\0") === next.type.join("\0") : state[key] === next[key])) return;
        state = next;
        for (const listener of listeners) listener({ ...state, type: [...state.type] });
      },
      subscribe(listener) { listeners.add(listener); listener({ ...state, type: [...state.type] }); return () => listeners.delete(listener); },
    };
  }
  function assertContract(data) {
    if (data.scope !== "manually_approved_projects" || !Array.isArray(data.project_scenarios) || !Array.isArray(data.projects))
      throw new Error("Shared scenario result required.");
    if (data.projects.some((project) => project.record_type !== "existing") || data.project_scenarios.some((row) => !row.included_in_result))
      throw new Error("Unapproved project in public result.");
    for (const row of data.project_scenarios) {
      for (const measure of ["mw", "nameplate_mw", "annual_twh", "buildout_twh"]) {
        const low = row[measure + "_low"],
          high = row[measure + "_high"];
        if ((low === null) !== (high === null)) throw new Error("Incomplete capacity interval.");
      }
    }
    const keys = data.project_scenarios.map((row) => row.project_id + ":" + row.scenario);
    if (new Set(keys).size !== keys.length || keys.length !== data.projects.length * data.method.scenarios.length)
      throw new Error("Incomplete or duplicate project scenarios.");
    const projectIds = new Set(data.projects.map((project) => project.project_id));
    const actorKeys = (data.actors || []).map((actor) => actor.project_id + ":" + actor.actor_name.toLowerCase().trim());
    if (new Set(actorKeys).size !== actorKeys.length || (data.actors || []).some((actor) => !projectIds.has(actor.project_id)))
      throw new Error("Orphaned or duplicate project actors.");
    return data;
  }
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char]
    );
  const tags = (value) =>
    String(value || "")
      .split(";")
      .map((tag) => tag.trim())
      .filter(Boolean);
  const regionNames = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
  const hqCountryLabel = (country) => (country ? regionNames?.of(country) || country : "Unknown");
  const countryLabel = (value) => ({ SE: "Sweden", NO: "Norway", FI: "Finland", DK: "Denmark" })[value] || value;
  const basisLabel = (value) =>
    ({
      it_nameplate: "IT capacity",
      it_peak: "Peak IT load",
      it_unspecified: "IT power",
      facility_nameplate: "Total site capacity",
      facility_peak: "Peak site load",
      facility_unspecified: "Site power",
      grid: "Grid connection",
      unspecified: "Measure not specified",
      backup: "Backup generation",
      generation: "Power generation",
      density: "Rack density",
    })[value] || "Unknown";
  const decisionLabel = (value) =>
    ({
      yes: "Confirmed",
      no: "Not confirmed",
      unclear: "Unknown",
      not_applicable: "Not applicable",
    })[value] || "Unknown";
  function reported(claim) {
    if (!claim || numeric(claim.mw) === null) return "Unknown";
    const sourceNumber = (value) => Number(value).toLocaleString("en-US", { maximumFractionDigits: 10 });
    if (claim.qualifier === "at_least" && !claim.mw_max) return "≥ " + sourceNumber(claim.mw);
    if (claim.qualifier === "up_to" && !claim.mw_max) return "≤ " + sourceNumber(claim.mw);
    const low = sourceNumber(claim.mw), high = sourceNumber(claim.mw_max || claim.mw);
    return low === high ? low : low + "–" + high;
  }
  const sourceScope = (claim) => {
    const phase = claim.campus_total === "yes" ? "Full campus" : claim.phase || "Capacity figure";
    const unit = ["it_nameplate", "it_unspecified", "it_peak"].includes(claim.basis) ? " MW IT" : " MW";
    return phase + (numeric(claim.mw) === null ? " · capacity not stated"
      : phase.includes(reported(claim) + unit) ? "" : " · " + reported(claim) + unit);
  };
  const relevantClaim = (claim) => claim.issue !== "identity_conflict" && !["backup", "generation", "density"].includes(claim.basis);
  function publishedSchedule(claims, assessmentYear = null) {
    const rows = claims.filter(relevantClaim).map((claim) => {
      const dates = [];
      const completion = "Completion";
      const span = (first, last) => last && last !== first ? first + "–" + last : first;
      const inactive = ["Cancelled", "Dormant"].includes(claim.status);
      const historical = claim.timing_status === "superseded";
      const wording = (name, year, event) => {
        if (event === "actual") return ({"Construction start": "Construction started in ", "First operation": "Operation began in ", "Completion": "Completed in ", "Grid availability": "Grid became available in "}[name] || name + ": ") + year;
        if (event === "planned") return name + " planned for " + year +
          (assessmentYear && Number(String(year).slice(-4)) < assessmentYear ? " (not confirmed)" : "");
        return name + ": " + year + " (source date)";
      };
      if (claim.construction_year && (!historical || claim.construction_event === "actual") && (!inactive || claim.construction_event === "actual"))
        dates.push(wording("Construction start", claim.construction_year, claim.construction_event));
      if (claim.first_year && (!historical || claim.timing_event === "actual") && (!inactive || claim.timing_event === "actual")) {
        const label = { first_capacity: "First operation", full_capacity: completion, grid_availability: "Grid availability" }[claim.timing] || "Source date";
        dates.push(wording(label, span(claim.first_year, claim.last_year), claim.timing_event));
      }
      if (claim.full_capacity_year && !historical && !inactive)
        dates.push(completion + ": " + span(claim.full_capacity_year, claim.full_capacity_last_year) + " (source date)");
      if (claim.campus_total === "yes" && claim.timing !== "grid_availability" && !inactive &&
          !(claim.full_capacity_year && !historical) && !(claim.timing === "full_capacity" && claim.first_year && !historical))
        dates.push("No completion date stated");
      return { claim, scope: sourceScope(claim), dates: [...new Set(dates)] };
    }).filter((row) => row.dates.length);
    const unique = new Map();
    for (const row of rows) {
      const key = JSON.stringify([row.scope, row.dates]);
      if (!unique.has(key)) unique.set(key, row);
      else {
        const previous = unique.get(key);
        previous.claim = { ...previous.claim, source_ids: [...new Set([...tags(previous.claim.source_ids), ...tags(row.claim.source_ids)])].join(";") };
      }
    }
    return [...unique.values()];
  }
  function projectDecision(claims) {
    const active = claims.filter(
      (claim) =>
        !["Operational", "Cancelled", "Dormant"].includes(claim.status) &&
        claim.issue !== "identity_conflict" &&
        !["backup", "generation", "density"].includes(claim.basis)
    );
    if (!active.length) return "Unknown";
    const confirmed = active.filter((claim) => claim.decision === "yes");
    if (confirmed.length) return confirmed.length === active.length ? "Confirmed" : "Confirmed for part";
    return active.every((claim) => claim.decision === "no") ? "Not confirmed" : "Unknown";
  }
  function rowsFor(data, scenario, filters = {}) {
    const projects = new Map(data.projects.map((project) => [project.project_id, project]));
    const projectIds = filters.projectIds ? new Set(filters.projectIds) : null;
    const actors = new Map();
    for (const actor of data.actors || []) {
      if (!actors.has(actor.project_id)) actors.set(actor.project_id, []);
      actors.get(actor.project_id).push(actor);
    }
    const normalise = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const searchTerms = normalise(filters.search).trim().split(/\s+/).filter(Boolean);
    const match = (values, value) => !values?.length || values.includes(value);
    const anyTag = (values, value) => !values?.length || tags(value).some((tag) => values.includes(tag));
    return data.project_scenarios.filter((row) => {
      const project = projects.get(row.project_id);
      const own = actors.get(row.project_id) || [{ hq_facets: "unknown", actor_type: "unknown" }];
      // Country/region and actor type must be satisfied by the same actor in a partnership.
      const actorMatch = own.some((actor) => anyTag(filters.hqCountries, actor.hq_facets) && anyTag(filters.actorTypes, actor.actor_type));
      return (
        row.scenario === scenario &&
        searchTerms.every((term) => normalise([project.project_name, project.developer, project.municipality, countryLabel(project.country), project.bidding_zone].join(" ")).includes(term)) &&
        (!projectIds || projectIds.has(row.project_id)) &&
        match(filters.countries, project.country) &&
        match(filters.zones, row.bidding_zone) &&
        match(filters.statuses, project.status) &&
        anyTag(filters.types, project.type) &&
        (!filters.hq || filters.hq === "none" || global.DCTrackerMap.matchesHq(project, filters.hq)) &&
        match(filters.hqOrigins, project.actor_hq_origin || "unknown") &&
        actorMatch
      );
    });
  }
  function makeView(data, scenario, filters = {}, measure = "mw") {
    const rows = rowsFor(data, scenario, filters);
    const totals = (list) => ({
      mw: sumBounds(list, "mw_low", "mw_high"),
      twh: sumBounds(list, "annual_twh_low", "annual_twh_high"),
      planned: sumBounds(list, "nameplate_mw_low", "nameplate_mw_high"),
      buildout: sumBounds(list, "buildout_twh_low", "buildout_twh_high"),
    });
    const zones = {};
    for (const feature of data.bidding_zones.features) {
      const zone = feature.properties.bidding_zone || feature.id;
      const country = feature.properties.country || zone.slice(0, 2);
      const excluded = Boolean(
        (filters.countries?.length && !filters.countries.includes(country)) || (filters.zones?.length && !filters.zones.includes(zone))
      );
      const selected = rows.filter((row) => row.bidding_zone === zone);
      zones[zone] = {
        ...totals(selected)[measure],
        excluded,
        project_count: selected.length,
        country,
      };
    }
    const countries = {};
    for (const country of [...new Set(data.projects.map((project) => project.country))])
      countries[country] = {
        ...totals(rows.filter((row) => row.country === country))[measure],
        excluded: Boolean(
          (filters.countries?.length && !filters.countries.includes(country)) ||
          (filters.zones?.length && !Object.values(zones).some((zone) => zone.country === country && !zone.excluded))
        ),
      };
    return { scenario, rows, zones, countries, totals: totals(rows), filters, measure };
  }
  async function mount(document) {
    const root = document.getElementById("dc-tracker");
    if (!root) return;
    const status = document.getElementById("summary-box");
    try {
      // Revalidate generated data after each build, even when the page URL is unchanged.
      const response = await fetch(root.dataset.results, { cache: "no-cache" });
      if (!response.ok) throw new Error("Could not load project data.");
      const data = assertContract(await response.json());
      const controls = createControls();
      global.DCTrackerMap.mountControls(document.getElementById("dc-shared-controls"), controls, data);
      const missing = document.querySelector("[data-coverage-missing]");
      if (missing) missing.textContent = (data.coverage?.projects_without_mw?.length ?? 0) + " of " + data.projects.length;
      const actorNote = document.querySelector("[data-actor-coverage]");
      if (actorNote && Array.isArray(data.actor_coverage)) {
        const names = { SE: "Swedish", NO: "Norwegian", FI: "Finnish", DK: "Danish" };
        const parts = ["SE", "NO", "FI", "DK"].map((c) => data.actor_coverage.find((r) => r.country === c)).filter(Boolean);
        actorNote.textContent = "Headquarters have been reviewed for " + parts.map((r) => r.reviewed + " of " + r.projects + " " + names[r.country]).join(", ") +
          " projects. HQ selection filters the map and its totals without splitting capacity between actors.";
      }
      if (global.DCTrackerMethodFlow) global.DCTrackerMethodFlow.mount(document.getElementById("dc-method-flow"), data);
      const projects = new Map(data.projects.map((project) => [project.project_id, project]));
      const sources = new Map(data.sources.map((source) => [source.source_id, source]));
      const claims = new Map(
        data.projects.map((project) => [project.project_id, data.capacity.filter((claim) => claim.project_id === project.project_id)])
      );
      const actorRows = new Map(
        data.projects.map((project) => [project.project_id, (data.actors || []).filter((actor) => actor.project_id === project.project_id)])
      );
      const actorMethod = data.method.actor_classification;
      const sourceIds = (project) => [
        ...new Set([...tags(project.source_ids), ...claims.get(project.project_id).flatMap((claim) => tags(claim.source_ids))]),
      ];
      // Stage split per project comes from the exported ledger layers; the browser only groups them.
      const mapApi = global.DCTrackerMap || {};
      const stageIds = mapApi.CLASSES || ["confirmed", "dated_plan", "campus_continuation", "undated_announcement"];
      const stageNames = mapApi.CLASS_LABELS || ["Confirmed", "Dated plan", "Further campus plans", "Undated plan"];
      const stageRows = new Map();
      const firstScenario = data.method.scenarios[0].id;
      for (const row of data.ledger) {
        if (row.scenario !== firstScenario || !stageIds.includes(row.evidence_class)) continue;
        if (!stageRows.has(row.project_id)) stageRows.set(row.project_id, new Map());
        const own = stageRows.get(row.project_id);
        if (!own.has(row.evidence_class)) own.set(row.evidence_class, { mw_low: 0, mw_high: 0, twh_low: 0, twh_high: 0 });
        const value = own.get(row.evidence_class);
        for (const key of ["mw_low", "mw_high", "twh_low", "twh_high"]) value[key] += numeric(row["layer_" + key]) ?? 0;
      }
      const stagesOf = (projectId) => {
        const own = stageRows.get(projectId) || new Map();
        const list = stageIds.filter((id) => own.has(id)).map((id) => ({ id, label: stageNames[stageIds.indexOf(id)], ...own.get(id) }));
        const sized = list.filter((item) => item.mw_high > 0);
        return sized.length ? sized : list;
      };
      // A part with an investment decision or an observed construction start but no MW figure. It is
      // not counted in any total, but the list should show that part of the project is confirmed.
      const confirmedWithoutMw = (projectId) =>
        !["Operational", "Cancelled", "Dormant"].includes(projects.get(projectId)?.status) &&
        claims.get(projectId).some(
          (claim) =>
            numeric(claim.mw) === null &&
            !["Operational", "Cancelled", "Dormant"].includes(claim.status) &&
            claim.issue !== "identity_conflict" &&
            !["backup", "generation", "density"].includes(claim.basis) &&
            (claim.decision === "yes" || (claim.construction_event === "actual" && claim.construction_year))
        ) &&
        !stagesOf(projectId).some((item) => item.id === "confirmed" && item.mw_high > 0);
      const stageFilterIds = (projectId) => [
        ...stagesOf(projectId).map((item) => item.id),
        ...(confirmedWithoutMw(projectId) ? ["confirmed"] : []),
      ];
      const lastChecked = (project) =>
        sourceIds(project)
          .map((id) => sources.get(id)?.accessed)
          .filter(Boolean)
          .sort()
          .pop() || "Unknown";
      const longDate = (value) => {
        const date = new Date(value + "T00:00:00Z");
        return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
      };
      // The downloads are built by the pipeline next to results.json, so every reader gets the same files.
      const fileUrl = (name) => root.dataset.results.replace(/results\.json(\?.*)?$/, name + "$1");
      const downloads = { "data-download-zip": "nordic-datacenter-tracker-data.zip" };
      for (const [attribute, name] of Object.entries(downloads))
        document.querySelectorAll("[" + attribute + "]").forEach((link) => {
          link.setAttribute("href", fileUrl(name));
          link.setAttribute("download", name.replace(/\.(zip|csv|txt)$/, "-" + (data.as_of || "data") + ".$1"));
        });
      document.querySelectorAll("[data-download-json]").forEach((link) => link.setAttribute("href", root.dataset.results));
      document.querySelectorAll("[data-download-meta]").forEach((node) => {
        node.textContent = "Data as of " + longDate(data.as_of) + " · Updated monthly";
      });
      document.querySelectorAll("[data-as-of]").forEach((node) => {
        node.textContent = longDate(data.as_of);
      });
      // Table and summary are timeless like the map. Any scenario row carries the full announced size.
      const scenario = (data.method.scenarios.find((item) => item.family === "announced") || data.method.scenarios.at(-1)).id;
      let showAll = false;
      const expandedProjects = new Set();
      const TOP_ROWS = 15;
      const groupNames = {
        countries: "country",
        zones: "zone",
      };
      const searchInput = document.getElementById("tracker-search");
      const searchHeader = document.getElementById("project-search-header");
      const searchOpen = document.getElementById("project-search-open");
      const searchField = document.getElementById("project-search-field");
      const closeSearch = () => {
        searchInput.value = "";
        searchField.hidden = true;
        searchHeader.classList.remove("is-searching");
        searchOpen.setAttribute("aria-expanded", "false");
        render();
        searchOpen.focus();
      };
      searchOpen?.addEventListener("click", () => {
        searchField.hidden = false;
        searchHeader.classList.add("is-searching");
        searchOpen.setAttribute("aria-expanded", "true");
        searchInput.focus();
      });
      document.getElementById("project-search-close")?.addEventListener("click", closeSearch);
      searchInput?.addEventListener("input", render);
      searchInput?.addEventListener("keydown", (event) => {
        if (event.key === "Escape") { event.preventDefault(); closeSearch(); }
      });
      const filters = () =>
        Object.fromEntries(
          Object.entries(groupNames).map(([key, name]) => [
            key,
            Array.from(document.querySelectorAll("#filter-" + name + "-group input:checked")).map((input) => input.value),
          ])
        );
      function choices(name, values, label = (value) => value) {
        const parent = document.getElementById("filter-" + name + "-group");
        parent.replaceChildren();
        [...new Set(values.filter(Boolean))].sort().forEach((value) => {
          const wrapper = document.createElement("label");
          const input = document.createElement("input");
          input.type = "checkbox";
          input.value = value;
          input.addEventListener("change", render);
          wrapper.append(input, document.createTextNode(label(value)));
          parent.append(wrapper);
        });
      }
      choices(
        "country",
        data.projects.map((project) => project.country),
        countryLabel
      );
      choices(
        "zone",
        data.projects.map((project) => project.bidding_zone).filter((zone) => !zone.endsWith("-unassigned"))
      );
      const stageParent = document.getElementById("filter-stage-group");
      stageIds.forEach((id, index) => {
        const wrapper = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.value = id;
        input.addEventListener("change", render);
        wrapper.append(input, document.createTextNode(stageNames[index]));
        stageParent.append(wrapper);
      });
      // Projects with any part at a selected stage, as in the map.
      const stageSelection = () => {
        const chosen = Array.from(stageParent.querySelectorAll("input:checked")).map((input) => input.value);
        return chosen.length ? data.projects.filter((project) => stageFilterIds(project.project_id).some((id) => chosen.includes(id))).map((project) => project.project_id) : null;
      };
      function sourceLinks(refs) {
        return (
          refs
            .map((id) => sources.get(id))
            .filter(Boolean)
            .map((source) => '<a href="' + escape(source.url) + '" target="_blank" rel="noopener noreferrer">' + escape(source.title) + "</a>")
            .join("<br>") || "No source listed"
        );
      }
      function shortSourceLinks(refs) {
        return 'Sources: ' + refs.map((id) => sources.get(id)).filter(Boolean).map((source, i) =>
          '<a href="' + escape(source.url) + '" title="' + escape(source.title) + '" aria-label="' + escape(source.title) + '" target="_blank" rel="noopener noreferrer">' + (i + 1) + '</a>').join(', ');
      }
      function evidence(project) {
        // The project list is timeless like the map. Layers and reasons come from the All announced ledger,
        // where every stage counts and timing does not remove capacity.
        const timeless = (data.method.scenarios.find((item) => item.family === "announced") || data.method.scenarios.at(-1)).id;
        const own = claims.get(project.project_id);
        const estimatedItText = (claim) => {
          const qualifier = claim.qualifier === "up_to" ? "≤ " : claim.qualifier === "at_least" ? "≥ " : "";
          return qualifier + range(claim.estimated_it_mw_low, claim.estimated_it_mw_high) + " MW IT";
        };
        const ledger = new Map(
          data.ledger.filter((row) => row.scenario === timeless && row.project_id === project.project_id).map((row) => [row.claim_id, row])
        );
        const total = data.project_scenarios.find((row) => row.scenario === timeless && row.project_id === project.project_id);
        const overlap = own.some((claim) => ["included_in", "possibly_included_in"].includes(claim.relation));
        const actors = actorRows.get(project.project_id);
        const actorBody = actors
          .map(
            (actor) =>
              "<tr><td>" +
              escape(actor.actor_name) +
              "</td><td>" +
              escape(
                tags(actor.role)
                  .map((value) => actorMethod.roles[value])
                  .join("; ")
              ) +
              "</td><td>" +
              escape(
                tags(actor.actor_type)
                  .map((value) => actorMethod.types[value])
                  .join("; ")
              ) +
              "</td><td>" +
              escape([actor.hq_city, hqCountryLabel(actor.hq_country)].filter(Boolean).join(", ")) +
              "</td><td>" +
              escape(actor.ownership_notes || "Not verified") +
              "</td><td>" +
              escape(actor.checked_at) +
              "</td><td>" +
              sourceLinks(tags(actor.source_ids)) +
              "</td></tr>"
          )
          .join("");
        const actorInfo =
          (actors.length
            ? '<div class="dc-entry-wrap"><table class="entry-table actor-table"><thead><tr><th>Actor</th><th>Role</th><th>Actor type</th><th>Global HQ</th><th>Ownership</th><th>Checked</th><th>Sources</th></tr></thead><tbody>' +
              actorBody +
              "</tbody></table></div>"
            : '<div class="detail-summary">Actor headquarters have not been reviewed for this project.</div>');
        const projectSources = [...new Set([...own.flatMap((claim) => tags(claim.source_ids)), ...tags(project.source_ids)])];
        const uniqueSources = [...new Map(projectSources.map((id) => sources.get(id)).filter(Boolean).map((source) => [source.url, source])).values()];
        const sourceList = uniqueSources.map((source) =>
          '<li><a href="' + escape(source.url) + '" target="_blank" rel="noopener noreferrer">' + escape(source.title) + '</a></li>').join("");
        const anyRow = total || data.project_scenarios.find((row) => row.project_id === project.project_id) || {};
        const knownSize = (anyRow.capacity_known || ["operational", "cancelled", "dormant"].includes(anyRow.indicator)) && !containedIn(anyRow);
        const progress = own.filter(relevantClaim).map((claim) => {
          const state = [claim.status || "Status not stated"];
          if (claim.decision === "yes") state.push("Investment decision made");
          else if (claim.decision === "no") state.push("Investment decision not confirmed");
          if (numeric(claim.mw) === null) state.push("Capacity has not been published");
          return "<li><strong>" + escape(sourceScope(claim)) + "</strong><br>" + escape(state.join(". ") + ".") + "</li>";
        });
        const table = (headers, rows) => '<div class="dc-entry-wrap"><table class="dc-summary-table"><thead><tr>' +
          headers.map((h) => "<th>" + escape(h) + "</th>").join("") + "</tr></thead><tbody>" + rows + "</tbody></table></div>";
        const scheduleRows = publishedSchedule(own, Number(data.method.timeline.assessment_date.slice(0, 4)));
        const schedule = '<h3 class="detail-title">Published schedule</h3>' + (scheduleRows.length
          ? table(["Part of the project", "Published schedule"], scheduleRows.map(({claim, scope, dates}) =>
            "<tr><td>" + escape(scope) + "</td><td>" + dates.map(escape).join("<br>") +
            '<div class="dc-summary-sources">' + shortSourceLinks(tags(claim.source_ids)) + "</div></td></tr>").join(""))
          : '<p>No dates stated in the available sources.</p>');
        const rootOf = (claim) => {
          const seen = new Set();
          while (claim.parent_id && claim.relation === "included_in" && !seen.has(claim.claim_id)) {
            seen.add(claim.claim_id);
            const parent = own.find((other) => other.claim_id === claim.parent_id);
            if (!parent) break;
            claim = parent;
          }
          return claim.claim_id;
        };
        const hasCounterpart = (claim, isIt) => (claim.campus_total === "yes" || claim.claim_id === rootOf(claim)) && own.some((other) => other.claim_id !== claim.claim_id && relevantClaim(other) && numeric(other.mw) !== null &&
          rootOf(other) === rootOf(claim) && (other.campus_total === "yes" || other.claim_id === rootOf(claim)) &&
          (isIt ? ["facility_nameplate", "facility_unspecified"].includes(other.basis) : ["it_nameplate", "it_unspecified"].includes(other.basis)));
        const capacityRows = own.filter((claim) => relevantClaim(claim) && numeric(claim.mw) !== null).map((claim) => {
          const row = ledger.get(claim.claim_id);
          const isIt = ["it_nameplate", "it_unspecified"].includes(claim.basis);
          const estimate = isIt && numeric(row?.gross_mw_high) !== null
            ? "Estimated site power: " + range(row.gross_mw_low, row.gross_mw_high) + " MW"
            : numeric(claim.estimated_it_mw_high) !== null
              ? "Estimated IT capacity: " + estimatedItText(claim) + (claim.basis === "it_peak" ? " · peak demand adjusted" : "") : "";
          return "<tr><td>" + escape(sourceScope(claim)) +
            (["Cancelled", "Dormant"].includes(claim.status) ? "<br>" + escape(claim.status) : "") +
            '</td><td>From source: ' + escape(reported(claim) + (isIt ? " MW IT" : " MW") + " · " + basisLabel(claim.basis)) +
            (claim.baseline_scope === "existing_unknown" ? "<br>Existing capacity is unknown." : "") +
            (claim.basis === "grid" ? "<br>Connection: " + escape({requested: "Requested", reserved: "Reserved", contracted: "Contracted", available: "Available"}[claim.grid_status] || "Status not stated") : "") +
            (estimate && !hasCounterpart(claim, isIt) ? "<br>" + escape(estimate) : "") +
            '<div class="dc-summary-sources">' + shortSourceLinks(tags(claim.source_ids)) + "</div></td></tr>";
        }).join("");
        const breakdown = stagesOf(project.project_id).filter((item) => item.mw_high > 0).map((item) =>
          "<li>" + escape(item.label + " · " + range(item.mw_low, item.mw_high) + " MW · " + range(item.twh_low, item.twh_high, "twh") + " TWh/yr") + "</li>").join("");
        const capacityInfo = '<h3 class="detail-title">Capacity</h3><p>' +
          (knownSize ? "New site capacity at full build-out: " + escape(range(anyRow.nameplate_mw_low, anyRow.nameplate_mw_high) + " MW") +
            ". Estimated electricity use: " + escape(range(anyRow.buildout_twh_low, anyRow.buildout_twh_high, "twh") + " TWh/yr") + "."
            : containedIn(anyRow) ? "Included in " + escape(containedIn(anyRow)) + "." : "New site capacity is not fully quantified.") +
          (anyRow.partial_capacity ? ' Quantified part only. Some phases have no published capacity.' : '') + '</p>' + (breakdown ? '<ul class="dc-stage-breakdown">' + breakdown + '</ul>' : '') +
          (confirmedWithoutMw(project.project_id) ? '<p>A confirmed part has no published capacity figure.</p>' : '') +
          (overlap ? "<p>These source figures overlap. The site total counts each part once.</p>" : "") + (capacityRows ? table(["Part of the project", "Capacity and conversion"], capacityRows) : '<p>No capacity figures stated in the available sources.</p>');
        const factList = '<p class="dc-project-meta">' + escape("Type: " + (tags(project.type).join(", ") || "Not stated") + " · Last checked: " + lastChecked(project)) + '</p>';
        return (
          (project.description ? '<p class="dc-project-description">' + escape(project.description) + "</p>" : "") +
          factList + capacityInfo + schedule +
          '<h3 class="detail-title">Project progress</h3>' +
          (progress.length ? '<ul class="dc-project-progress">' + progress.join("") + '</ul>' : '<p>No phase-level progress information stated.</p>') +
          (sourceList ? '<details class="dc-project-section"><summary>Sources</summary><ul class="dc-source-list">' + sourceList + '</ul></details>' : '') +
          '<details class="dc-project-section"><summary>Companies and ownership</summary><p>' + escape('Developer: ' + (project.developer || 'Not stated')) + '<br>' + escape('IT equipment operated by: ' + ({dedicated: 'A single organisation', multi_tenant: 'Multiple customers'}[project.campus_it_use] || 'Not known')) + '</p>' + actorInfo + '</details>'
        );
      }
      // A project whose capacity is only part of another project's envelope is counted there, not here.
      const claimProject = new Map(data.capacity.map((claim) => [claim.claim_id, claim.project_id]));
      function containedIn(row) {
        const notes = String(row.note || "")
          .split(";")
          .filter(Boolean);
        if (!notes.length || !notes.every((note) => note.startsWith("included_in:"))) return null;
        const names = [...new Set(notes.map((note) => projects.get(claimProject.get(note.slice(12)))?.project_name).filter(Boolean))];
        return names.length && !names.includes(projects.get(row.project_id).project_name) ? names.join("; ") : null;
      }
      let map = null;
      let timeline = null;
      function render() {
        const shared = controls.get();
        const selectedStageIds = stageSelection();
        const selectedIds = !shared.type.length ? selectedStageIds : data.projects
          .filter((project) => (!selectedStageIds || selectedStageIds.includes(project.project_id)) && mapApi.matchesType(project, shared.type))
          .map((project) => project.project_id);
        const view = makeView(data, scenario, { ...filters(), search: searchInput?.value || "", hq: shared.hq, ...(selectedIds ? { projectIds: selectedIds } : {}) });
        const electricity = shared.measure === "twh";
        const [sortLow, sortHigh] = electricity ? ["buildout_twh_low", "buildout_twh_high"] : ["nameplate_mw_low", "nameplate_mw_high"];
        const sortValue = (row) => (row.capacity_known && !containedIn(row) ? numeric(row[sortHigh]) ?? numeric(row[sortLow]) ?? -1 : -1);
        const rows = [...view.rows].sort(
          (a, b) => sortValue(b) - sortValue(a) || projects.get(a.project_id).project_name.localeCompare(projects.get(b.project_id).project_name)
        );
        const { planned, buildout } = view.totals;
        const tab = (mapApi.TABS || []).find((item) => item.id === shared.family) || { label: "All announced", classes: stageIds };
        const tabTotal = { low: 0, high: 0, unknown: planned.unknown };
        for (const row of rows) {
          if (containedIn(row)) continue;
          for (const item of stagesOf(row.project_id))
            if (tab.classes.includes(item.id)) {
              tabTotal.low += electricity ? item.twh_low : item.mw_low;
              tabTotal.high += electricity ? item.twh_high : item.mw_high;
            }
        }
        // The project section uses MW throughout, like the table below it.
        const unit = electricity ? "TWh/year" : "MW";
        const displayTotal = total => totalRange(total, electricity ? "twh" : "mw");
        status.innerHTML =
          '<div class="summary-grid">' +
          '<div class="summary-block summary-selection"><span class="summary-kicker">Selection</span><span><strong>' +
          rows.length +
          "</strong> project" +
          (rows.length === 1 ? "" : "s") +
          "</span></div>" +
          '<div class="summary-block"><span class="summary-kicker">All listed plans</span><span><strong>' +
          displayTotal(electricity ? buildout : planned) + " " + unit +
          '</strong></span><span class="summary-context">' +
          (electricity ? "Annual electricity use if fully built and in use." : "New site power if fully built, including cooling.") +
          "</span></div>" +
          '<div class="summary-block"><span class="summary-kicker">Included in ' + escape(tab.label) + '</span><span><strong>' +
          displayTotal(tabTotal) + " " + unit +
          '</strong></span><span class="summary-context">Stages included in ' + escape(tab.label) + '.</span></div>' +
          "</div>";
        const sizeHeader = document.getElementById("size-header");
        if (sizeHeader) {
          sizeHeader.textContent = electricity ? "Estimated electricity use (TWh/yr)" : "Site capacity (MW)";
          sizeHeader.title = electricity
            ? "Estimated annual use if all announced capacity is built and in use. Existing capacity is excluded."
            : "New site power at full build-out, including cooling. Existing capacity is excluded. Expand a project to compare source figures and estimates.";
        }
        const sizeKey = electricity ? ["buildout_twh_low", "buildout_twh_high"] : ["nameplate_mw_low", "nameplate_mw_high"];
        const stageKey = electricity ? "twh_high" : "mw_high";
        const largest = Math.max(1e-9, ...rows.map((row) => (row.capacity_known && !containedIn(row) ? numeric(row[sizeKey[1]]) ?? 0 : 0)));
        const searching = Boolean(searchInput?.value.trim());
        const visible = showAll || searching ? rows : rows.slice(0, TOP_ROWS);
        const tbody = document.querySelector("#tracker-table tbody");
        tbody.innerHTML = visible
          .map((row) => {
            const project = projects.get(row.project_id);
            const expanded = expandedProjects.has(row.project_id);
            const parents = containedIn(row);
            const known = row.capacity_known || ["operational", "cancelled", "dormant"].includes(row.indicator);
            const stages = stagesOf(row.project_id);
            const size = parents
              ? '<span class="dc-row-muted" title="Included in ' + escape(parents) + '">Part of site total</span>'
              : known
                ? electricity
                  ? range(row[sizeKey[0]], row[sizeKey[1]], "twh")
                  : range(row[sizeKey[0]], row[sizeKey[1]])
                : '<span class="dc-row-muted">Unknown</span>';
            const total = stages.reduce((sum, item) => sum + item[stageKey], 0);
            const bar =
              known && !parents && total > 0
                ? '<span class="dc-size-bar" style="width:' +
                  Math.max(2, (100 * (numeric(row[sizeKey[1]]) ?? 0)) / largest).toFixed(1) +
                  '%">' +
                  stages
                    .filter((item) => item[stageKey] > 0)
                    .map(
                      (item) =>
                        '<i tabindex="0" role="img" aria-label="' + escape(item.label + ' · ' + range(item[electricity ? 'twh_low' : 'mw_low'], item[stageKey], electricity ? 'twh' : 'mw') + (electricity ? ' TWh/yr' : ' MW')) + '" data-caption="' + escape(item.label + ' · ' + range(item[electricity ? 'twh_low' : 'mw_low'], item[stageKey], electricity ? 'twh' : 'mw') + (electricity ? ' TWh/yr' : ' MW')) + '" style="flex-grow:' + item[stageKey].toFixed(3) + ';background:var(--dc-class-' + item.id + ')"></i>'
                    )
                    .join("") +
                  "</span>"
                : "";
            const unknownConfirmed = confirmedWithoutMw(row.project_id)
              ? '<span class="dc-stage-tag dc-stage-unknown" title="Part of the project has an investment decision or has started construction, but no MW figure is reported. It is not included in the totals."><i></i>Confirmed, MW unknown</span>'
              : "";
            const stageCell = stages.length || unknownConfirmed
              ? unknownConfirmed +
                stages
                  .map((item) => '<span class="dc-stage-tag"><i style="background:var(--dc-class-' + item.id + ')"></i>' + escape(item.label) + "</span>")
                  .join("")
              : '<span class="dc-row-muted">Not included</span>';
            return (
              '<tr class="project-row" data-project="' +
              escape(project.project_id) +
              '"><td class="toggle-cell"><button type="button" class="toggle-button" data-toggle="' +
              escape(project.project_id) +
              '" aria-expanded="' + String(expanded) + '" aria-controls="details-' +
              escape(project.project_id) +
              '" aria-label="' + (expanded ? "Hide details for " : "Show details for ") +
              escape(project.project_name) +
              '">' + (expanded ? "−" : "+") + '</button></td><td class="project-cell">' +
              escape(project.project_name) +
              "</td><td>" +
              escape(countryLabel(project.country)) +
              "</td><td>" +
              escape(project.bidding_zone || "Unknown") +
              '</td><td class="stage-cell">' +
              stageCell +
              '</td><td class="size-cell"><span class="dc-size-value">' +
              size +
              "</span>" +
              bar +
              '</td></tr><tr class="detail-row" id="details-' +
              escape(project.project_id) +
              '" style="display:' + (expanded ? "table-row" : "none") + '"><td class="detail-cell" colspan="6">' +
              (expanded ? evidence(project) : "") + '</td></tr>'
            );
          })
          .join("");
        tbody.querySelectorAll(".project-row").forEach((projectRow) => {
          const button = projectRow.querySelector("[data-toggle]");
          projectRow.addEventListener("click", (event) => {
            if (event.target.closest("a, input, select, textarea, .dc-size-bar")) return;
            const id = button.dataset.toggle,
              detail = document.getElementById("details-" + id),
              open = button.getAttribute("aria-expanded") !== "true";
            if (open) expandedProjects.add(id);
            else expandedProjects.delete(id);
            button.setAttribute("aria-expanded", String(open));
            button.textContent = open ? "−" : "+";
            button.setAttribute("aria-label", (open ? "Hide details for " : "Show details for ") + projects.get(id).project_name);
            detail.style.display = open ? "table-row" : "none";
            if (open && !detail.firstElementChild.innerHTML) detail.firstElementChild.innerHTML = evidence(projects.get(id));
          });
        });
        if (!rows.length) tbody.innerHTML = '<tr><td colspan="6" class="dc-search-empty">No projects match your search or filters.</td></tr>';
        const more = document.getElementById("tracker-show-all");
        if (more) {
          more.hidden = searching || rows.length <= TOP_ROWS;
          more.textContent = showAll ? "Show the " + TOP_ROWS + " largest" : "Show all " + rows.length + " projects";
          more.setAttribute("aria-expanded", String(showAll));
        }
        if (global.DCTrackerMap && global.d3) {
          if (!map) map = global.DCTrackerMap.mount(document.getElementById("dc-scenario-map"), data, controls);
        }
      }
      document.getElementById("tracker-show-all")?.addEventListener("click", () => {
        showAll = !showAll;
        render();
        if (!showAll) document.getElementById("tracker-projects")?.scrollIntoView({ block: "start" });
      });
      let previous = null;
      controls.subscribe(state => {
        root.dataset.measure = state.measure;
        root.dataset.family = state.family;
        root.dataset.hq = state.hq;
        if (!previous || state.measure !== previous.measure || state.hq !== previous.hq || state.family !== previous.family) render();
        previous = state;
      });
      if (global.DCTrackerTimeline) {
        timeline = await global.DCTrackerTimeline.mount(document.getElementById("dc-timeline"), data, controls);
      }
    } catch (error) {
      status.textContent = "Could not load tracker: " + error.message;
      status.setAttribute("role", "alert");
    }
  }
  const api = {
    numeric,
    createControls,
    range,
    totalRange,
    sumBounds,
    assertContract,
    rowsFor,
    makeView,
    reported,
    basisLabel,
    decisionLabel,
    publishedSchedule,
    sourceScope,
    projectDecision,
    hqCountryLabel,
    mount,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.DCTracker = api;
  if (global.document) {
    if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", () => mount(global.document));
    else mount(global.document);
  }
})(typeof window === "undefined" ? globalThis : window);

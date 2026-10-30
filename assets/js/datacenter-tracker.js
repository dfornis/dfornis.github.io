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
    !t || t.low === null || (t.high === 0 && t.unknown) ? "Unknown" : range(t.low, t.high, kind) + (t.unknown ? "*" : "");
  function powerRange(low, high) {
    if (numeric(low) === null || numeric(high) === null) return "Unknown";
    const format = value => (value / 1000).toLocaleString("en-US", { maximumFractionDigits: 2 });
    return format(low) === format(high) ? format(high) : `${format(low)}–${format(high)}`;
  }
  function createControls() {
    let state = { family: "dated", measure: "mw", hq: "none" };
    const listeners = new Set();
    return {
      get: () => ({ ...state }),
      set(patch) {
        const next = { ...state, ...patch };
        if (Object.keys(state).every(key => state[key] === next[key])) return;
        state = next;
        for (const listener of listeners) listener({ ...state });
      },
      subscribe(listener) { listeners.add(listener); listener({ ...state }); return () => listeners.delete(listener); },
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
  const countryLabel = (value) => ({ SE: "Sweden", NO: "Norway", FI: "Finland" })[value] || value;
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
  const timingLabel = (value) =>
    ({
      first_capacity: "First operation",
      full_capacity: "Full capacity",
      grid_availability: "Grid available",
      unknown: "Date unknown",
    })[value] || "Date unknown";
  function reported(claim) {
    if (!claim || numeric(claim.mw) === null) return "Unknown";
    if (claim.qualifier === "at_least" && !claim.mw_max) return "≥ " + format(claim.mw);
    if (claim.qualifier === "up_to" && !claim.mw_max) return "≤ " + format(claim.mw);
    return range(claim.mw, claim.mw_max || claim.mw);
  }
  // Operation years first; without one, a construction start or grid date, labelled as such.
  function operationYears(claims, projectStatus = "") {
    const active = claims.filter(
      (claim) =>
        !["Operational", "Cancelled", "Dormant"].includes(claim.status) && claim.issue !== "identity_conflict" && claim.timing_status !== "superseded"
    );
    const years = (list, field, prefix = "") =>
      [
        ...new Set(
          list.map(
            (claim) =>
              prefix +
              (field === "construction_year" || claim.first_year === claim.last_year || !claim.last_year
                ? claim[field]
                : claim.first_year + "–" + claim.last_year)
          )
        ),
      ]
        .sort()
        .join("; ");
    return (
      years(
        active.filter((claim) => ["first_capacity", "full_capacity"].includes(claim.timing) && claim.first_year),
        "first_year"
      ) ||
      (projectStatus === "Operational"
        ? ""
        : years(
            active.filter((claim) => claim.construction_year),
            "construction_year",
            "Construction "
          )) ||
      years(
        active.filter((claim) => claim.timing === "grid_availability" && claim.first_year),
        "first_year",
        "Grid "
      ) ||
      "Unknown"
    );
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
    const match = (values, value) => !values?.length || values.includes(value);
    const anyTag = (values, value) => !values?.length || tags(value).some((tag) => values.includes(tag));
    return data.project_scenarios.filter((row) => {
      const project = projects.get(row.project_id);
      const own = actors.get(row.project_id) || [{ hq_facets: "unknown", actor_type: "unknown" }];
      // Country/region and actor type must be satisfied by the same actor in a partnership.
      const actorMatch = own.some((actor) => anyTag(filters.hqCountries, actor.hq_facets) && anyTag(filters.actorTypes, actor.actor_type));
      return (
        row.scenario === scenario &&
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
    for (const country of ["NO", "SE", "FI"])
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
      const response = await fetch(root.dataset.results);
      if (!response.ok) throw new Error("Could not load project data.");
      const data = assertContract(await response.json());
      const controls = createControls();
      global.DCTrackerMap.mountControls(document.getElementById("dc-shared-controls"), controls);
      const missing = document.querySelector("[data-coverage-missing]");
      if (missing) missing.textContent = (data.coverage?.projects_without_mw?.length ?? 0) + " of " + data.projects.length;
      const actorNote = document.querySelector("[data-actor-coverage]");
      if (actorNote && Array.isArray(data.actor_coverage)) {
        const names = { SE: "Swedish", NO: "Norwegian", FI: "Finnish" };
        const parts = ["SE", "NO", "FI"].map((c) => data.actor_coverage.find((r) => r.country === c)).filter(Boolean);
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
      const stageNames = mapApi.CLASS_LABELS || ["Confirmed", "Dated plan", "Rest of active site", "Undated plan"];
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
      function csvText() {
        const cell = (value) => {
          const text = value === null || value === undefined ? "" : String(value);
          return /[",\n]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
        };
        const stageKeys = { confirmed: "confirmed", dated_plan: "dated_plan", campus_continuation: "rest_of_active_site", undated_announcement: "undated_plan" };
        const byScenario = new Map(data.project_scenarios.map((row) => [row.scenario + ":" + row.project_id, row]));
        const header = [
          "project_id", "project_name", "developer", "country", "bidding_zone", "municipality", "latitude", "longitude", "type", "status",
          "investment_decision", "announced_dates", "part_of_site",
          "full_size_mw_low", "full_size_mw_high", "full_size_twh_low", "full_size_twh_high",
          ...stageIds.flatMap((id) => [stageKeys[id] + "_mw_low", stageKeys[id] + "_mw_high"]),
          ...data.method.scenarios.flatMap((item) => ["mw_low", "mw_high", "twh_low", "twh_high"].map((key) => "counted_" + item.id + "_" + key)),
          "last_checked", "source_urls", "notes",
        ];
        const lines = data.projects.map((project) => {
          const own = claims.get(project.project_id);
          const any = byScenario.get(firstScenario + ":" + project.project_id) || {};
          const known = any.capacity_known || ["operational", "cancelled", "dormant"].includes(any.indicator);
          const parents = containedIn(any);
          const stages = stageRows.get(project.project_id) || new Map();
          const round = (value, digits) => (numeric(value) === null ? "" : Math.round(Number(value) * 10 ** digits) / 10 ** digits);
          return [
            project.project_id, project.project_name, project.developer, project.country, project.bidding_zone, project.municipality,
            project.latitude, project.longitude, project.type, project.status, projectDecision(own), operationYears(own, project.status), parents || "",
            ...(known && !parents
              ? [round(any.nameplate_mw_low, 1), round(any.nameplate_mw_high, 1), round(any.buildout_twh_low, 3), round(any.buildout_twh_high, 3)]
              : ["", "", "", ""]),
            ...stageIds.flatMap((id) => (known && stages.has(id) ? [round(stages.get(id).mw_low, 1), round(stages.get(id).mw_high, 1)] : ["", ""])),
            ...data.method.scenarios.flatMap((item) => {
              const row = byScenario.get(item.id + ":" + project.project_id) || {};
              return known ? [round(row.mw_low, 1), round(row.mw_high, 1), round(row.annual_twh_low, 3), round(row.annual_twh_high, 3)] : ["", "", "", ""];
            }),
            lastChecked(project),
            sourceIds(project).map((id) => sources.get(id)?.url).filter(Boolean).join(" "),
            project.notes,
          ].map(cell).join(",");
        });
        return [header.join(","), ...lines].join("\n") + "\n";
      }
      const csvFile = "nordic-datacenter-tracker-" + (data.as_of || "data") + ".csv";
      let csvUrl = null;
      document.querySelectorAll("[data-download-csv]").forEach((link) => {
        link.setAttribute("download", csvFile);
        link.addEventListener("click", () => {
          if (!csvUrl) csvUrl = URL.createObjectURL(new Blob(["﻿" + csvText()], { type: "text/csv;charset=utf-8" }));
          link.href = csvUrl;
        });
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
      const TOP_ROWS = 15;
      const groupNames = {
        countries: "country",
        zones: "zone",
        types: "type",
      };
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
      choices(
        "type",
        data.projects.flatMap((project) => tags(project.type))
      );
      function sourceLinks(refs) {
        return (
          refs
            .map((id) => sources.get(id))
            .filter(Boolean)
            .map((source) => '<a href="' + escape(source.url) + '" target="_blank" rel="noopener noreferrer">' + escape(source.title) + "</a>")
            .join("<br>") || "No source listed"
        );
      }
      function evidence(project) {
        // The project list is timeless like the map. Layers and reasons come from the All announced ledger,
        // where every stage counts and timing does not remove capacity.
        const timeless = (data.method.scenarios.find((item) => item.family === "announced") || data.method.scenarios.at(-1)).id;
        const countedLabel = "Adds to full size (MW)";
        const tabsFor = (stage) => (mapApi.TABS || []).filter((tab) => tab.classes.includes(stage)).map((tab) => tab.label);
        const stageLabel = { confirmed: "Confirmed", dated_plan: "Dated plan", campus_continuation: "Rest of active site", undated_announcement: "Undated plan" };
        const reasonLabel = {
          operational: "Already operating",
          cancelled: "Cancelled",
          dormant: "Dormant",
          identity_conflict: "Not attributed",
          related_identity: "Possible duplicate",
          no_datacenter_load: "Not datacenter load",
          capacity_unknown: "MW unknown",
          pending_approval: "Pending review",
        };
        // Each row shows what the figure adds to the full announced size after overlaps, as in the map.
        const contribution = (claim, row) => {
          if (!row) return "Unknown";
          if (reasonLabel[row.reason]) return escape(reasonLabel[row.reason]);
          if (numeric(row.layer_mw_high) > 0)
            return escape(range(row.layer_mw_low, row.layer_mw_high)) + '<br><span class="dc-row-muted">Counted in ' + escape(tabsFor(row.evidence_class).join(", ")) + "</span>";
          if (claim.baseline_scope === "existing_known") return "No addition to existing";
          return "Already in another figure";
        };
        const own = claims.get(project.project_id);
        const ledger = new Map(
          data.ledger.filter((row) => row.scenario === timeless && row.project_id === project.project_id).map((row) => [row.claim_id, row])
        );
        const body = own
          .map((claim) => {
            const row = ledger.get(claim.claim_id);
            const counted = contribution(claim, row);
            const timing = claim.first_year
              ? timingLabel(claim.timing) +
                ": " +
                (claim.last_year && claim.last_year !== claim.first_year ? claim.first_year + "–" + claim.last_year : claim.first_year)
              : "Unknown";
            return (
              "<tr><td>" +
              escape(claim.phase) +
              '</td><td class="number-cell">' +
              escape(reported(claim)) +
              "</td><td>" +
              escape(basisLabel(claim.basis)) +
              (claim.basis === "grid"
                ? "<br>" +
                  escape(
                    { requested: "Requested", reserved: "Reserved", contracted: "Contracted", available: "Available" }[claim.grid_status] ||
                      "Grid capacity status unknown"
                  )
                : "") +
              (claim.baseline_scope === "existing_unknown" ? "<br>Existing capacity unknown" : "") +
              "</td><td>" +
              escape(claim.status) +
              (row?.evidence_class && stageLabel[row.evidence_class] ? "<br>Stage: " + stageLabel[row.evidence_class] : "") +
              "<br>Investment decision: " +
              escape(decisionLabel(claim.decision)) +
              (claim.construction_year
                ? "<br>Construction start: " + escape(claim.construction_year + " (" + (claim.construction_event || "event type unknown") + ")")
                : "") +
              "</td><td>" +
              escape(timing + (claim.first_year && claim.timing_event ? " (" + claim.timing_event + ")" : "")) +
              (claim.timing_status === "superseded" ? "<br>An older target date was replaced by a later source and is no longer used." : "") +
              (row?.timing_rule === "executing_campus_derived_start"
                ? "<br>Timing estimated from the building under way, then built out over five years."
                : "") +
              (row && !["operational", "cancelled", "dormant", "no_datacenter_load", "identity_conflict", "related_identity"].includes(row.reason)
                ? "<br>Estimated first operation: " +
                  escape(row.first_early === row.first_late ? String(row.first_early) : row.first_early + "–" + row.first_late) +
                  ". Estimated full capacity: " +
                  escape(row.full_early === row.full_late ? String(row.full_early) : row.full_early + "–" + row.full_late) +
                  "." +
                  (row.timing_flags ? "<br>Open question: " + escape(row.timing_flags.replaceAll("_", " ").replaceAll(";", ", ")) : "")
                : "") +
              '</td><td class="number-cell">' +
              counted +
              "</td><td>" +
              sourceLinks(tags(claim.source_ids)) +
              "</td></tr>"
            );
          })
          .join("");
        const total = data.project_scenarios.find((row) => row.scenario === timeless && row.project_id === project.project_id);
        const parents = total && containedIn(total);
        const overlap = own.some((claim) => ["included_in", "possibly_included_in"].includes(claim.relation));
        const totalLine = !total
          ? ""
          : parents
            ? "Counted as part of " + escape(parents) + "."
            : [
                total.partial_capacity ? "Some phases have no MW figure." : "",
                overlap ? "Overlapping figures are counted once." : "",
              ].filter(Boolean).join(" ");
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
              (actor.notes ? "<br>" + escape(actor.notes) : "") +
              "</td><td>" +
              escape(actor.checked_at) +
              "</td><td>" +
              sourceLinks(tags(actor.source_ids)) +
              "</td></tr>"
          )
          .join("");
        const actorInfo =
          '<div class="detail-title">Project actors and headquarters</div>' +
          (actors.length
            ? '<div class="dc-entry-wrap"><table class="entry-table actor-table"><thead><tr><th>Actor</th><th>Role</th><th>Actor type</th><th>Global HQ</th><th>Ownership and notes</th><th>Checked</th><th>Sources</th></tr></thead><tbody>' +
              actorBody +
              "</tbody></table></div>"
            : '<div class="detail-summary">Actor headquarters have not been reviewed for this project.</div>');
        const listedSources = new Set([...own.flatMap((claim) => tags(claim.source_ids)), ...actors.flatMap((actor) => tags(actor.source_ids))]);
        const additionalSources = tags(project.source_ids).filter((id) => !listedSources.has(id));
        const anyRow = data.project_scenarios.find((row) => row.project_id === project.project_id) || {};
        const knownSize = (anyRow.capacity_known || ["operational", "cancelled", "dormant"].includes(anyRow.indicator)) && !containedIn(anyRow);
        const stageText = [
          ...(confirmedWithoutMw(project.project_id) ? ["Confirmed, MW unknown"] : []),
          ...stagesOf(project.project_id).map((item) => item.label + (knownSize && item.mw_high > 0 ? " " + powerRange(item.mw_low, item.mw_high) + " GW" : "")),
        ].join(", ");
        const facts = [
          ["Developer", escape(project.developer || "Unknown")],
          ["Type", escape(tags(project.type).join(", ") || "Unknown")],
          ["Project status", escape(project.status || "Unknown")],
          ["Investment decision", escape(projectDecision(own))],
          [
            "Full announced size",
            knownSize
              ? escape(powerRange(anyRow.nameplate_mw_low, anyRow.nameplate_mw_high) + " GW · " + range(anyRow.buildout_twh_low, anyRow.buildout_twh_high, "twh") + " TWh/yr")
              : containedIn(anyRow) ? "Part of " + escape(containedIn(anyRow)) : "Unknown",
          ],
          ["By stage", escape(stageText || "Not counted")],
          ["Last checked", escape(lastChecked(project))],
        ];
        const factList =
          '<dl class="dc-project-facts">' + facts.map(([term, value]) => "<div><dt>" + term + "</dt><dd>" + value + "</dd></div>").join("") + "</dl>";
        return (
          factList +
          actorInfo +
          '<div class="detail-title">Project phases and sources</div>' +
          (own.length
            ? '<div class="dc-entry-wrap"><table class="entry-table phase-table"><thead><tr><th>Phase</th><th>Reported MW</th><th>Measure</th><th>Status</th><th>Operation / grid date</th><th>' +
              escape(countedLabel) +
              "</th><th>Sources</th></tr></thead><tbody>" +
              body +
              "</tbody></table></div>" +
              (totalLine ? '<div class="detail-summary">' + totalLine + "</div>" : "")
            : '<div class="detail-summary">Capacity and dates have not been disclosed.</div>') +
          (additionalSources.length
            ? '<div class="detail-summary"><span class="detail-title">Other project sources</span><br>' + sourceLinks(additionalSources) + "</div>"
            : "")
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
        const selectedIds = stageSelection();
        const view = makeView(data, scenario, { ...filters(), hq: shared.hq, ...(selectedIds ? { projectIds: selectedIds } : {}) });
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
        const unit = electricity ? "TWh/year" : "GW";
        const displayTotal = total => electricity ? totalRange(total, "twh") :
          total.low === null || (total.high === 0 && total.unknown) ? "Unknown" : powerRange(total.low, total.high) + (total.unknown ? "*" : "");
        const notes = [];
        if (planned.unknown) notes.push(planned.unknown + " without a MW figure");
        status.innerHTML =
          '<div class="summary-grid">' +
          '<div class="summary-block summary-selection"><span class="summary-kicker">Selection</span><span><strong>' +
          rows.length +
          "</strong> project" +
          (rows.length === 1 ? "" : "s") +
          (notes.length ? " · " + notes.join(" · ") : "") +
          "</span></div>" +
          '<div class="summary-block"><span class="summary-kicker">Full announced size</span><span><strong>' +
          displayTotal(electricity ? buildout : planned) + " " + unit +
          "</strong></span></div>" +
          '<div class="summary-block"><span class="summary-kicker">Counted in ' + escape(tab.label) + '</span><span><strong>' +
          displayTotal(tabTotal) + " " + unit +
          "</strong></span></div>" +
          "</div>";
        const sizeHeader = document.getElementById("size-header");
        if (sizeHeader) sizeHeader.textContent = electricity ? "Full announced size (TWh/yr)" : "Full announced size (GW)";
        const sizeKey = electricity ? ["buildout_twh_low", "buildout_twh_high"] : ["nameplate_mw_low", "nameplate_mw_high"];
        const stageKey = electricity ? "twh_high" : "mw_high";
        const largest = Math.max(1e-9, ...rows.map((row) => (row.capacity_known && !containedIn(row) ? numeric(row[sizeKey[1]]) ?? 0 : 0)));
        const visible = showAll ? rows : rows.slice(0, TOP_ROWS);
        const tbody = document.querySelector("#tracker-table tbody");
        tbody.innerHTML = visible
          .map((row) => {
            const project = projects.get(row.project_id);
            const parents = containedIn(row);
            const known = row.capacity_known || ["operational", "cancelled", "dormant"].includes(row.indicator);
            const stages = stagesOf(row.project_id);
            const size = parents
              ? '<span class="dc-row-muted" title="Included in ' + escape(parents) + '">Part of site total</span>'
              : known
                ? electricity
                  ? range(row[sizeKey[0]], row[sizeKey[1]], "twh")
                  : powerRange(row[sizeKey[0]], row[sizeKey[1]])
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
                        '<i style="flex-grow:' + item[stageKey].toFixed(3) + ';background:var(--dc-class-' + item.id + ')"></i>'
                    )
                    .join("") +
                  "</span>"
                : "";
            const unknownConfirmed = confirmedWithoutMw(row.project_id)
              ? '<span class="dc-stage-tag dc-stage-unknown" title="Part of the project has an investment decision or has started construction, but no MW figure is reported. It is not counted in the totals."><i></i>Confirmed, MW unknown</span>'
              : "";
            const stageCell = stages.length || unknownConfirmed
              ? unknownConfirmed +
                stages
                  .map((item) => '<span class="dc-stage-tag"><i style="background:var(--dc-class-' + item.id + ')"></i>' + escape(item.label) + "</span>")
                  .join("")
              : '<span class="dc-row-muted">Not counted</span>';
            return (
              '<tr class="project-row" data-project="' +
              escape(project.project_id) +
              '"><td class="toggle-cell"><button type="button" class="toggle-button" data-toggle="' +
              escape(project.project_id) +
              '" aria-expanded="false" aria-controls="details-' +
              escape(project.project_id) +
              '" aria-label="Show details for ' +
              escape(project.project_name) +
              '">+</button></td><td class="project-cell">' +
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
              "</td><td>" +
              escape(operationYears(claims.get(row.project_id), project.status)) +
              '</td></tr><tr class="detail-row" id="details-' +
              escape(project.project_id) +
              '"><td class="detail-cell" colspan="7"></td></tr>'
            );
          })
          .join("");
        tbody.querySelectorAll("[data-toggle]").forEach((button) =>
          button.addEventListener("click", () => {
            const id = button.dataset.toggle,
              detail = document.getElementById("details-" + id),
              open = button.getAttribute("aria-expanded") !== "true";
            button.setAttribute("aria-expanded", String(open));
            button.textContent = open ? "−" : "+";
            detail.style.display = open ? "table-row" : "none";
            if (open && !detail.firstElementChild.innerHTML) detail.firstElementChild.innerHTML = evidence(projects.get(id));
          })
        );
        const more = document.getElementById("tracker-show-all");
        if (more) {
          more.hidden = rows.length <= TOP_ROWS;
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
    powerRange,
    range,
    totalRange,
    sumBounds,
    assertContract,
    rowsFor,
    makeView,
    reported,
    basisLabel,
    decisionLabel,
    operationYears,
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

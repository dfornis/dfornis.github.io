/* Original tracker map layout, supplied with precomputed project results. */

(function (global) {
  const DEFAULT_TAB = "announced";
  const DEFAULT_MEASURE = "twh";
  const MEASURES = [
    { id: "twh", label: "Annual electricity use", shortLabel: "TWh/year", unit: "TWh/year", field: "annual_twh" },
    { id: "mw", label: "Power", shortLabel: "GW", unit: "MW", field: "mw" },
  ];
  const HQ_HIGHLIGHTS = [
    { id: "none", label: "All" },
    { id: "domestic", label: "Domestic" },
    { id: "other_europe", label: "Other Europe" },
    { id: "outside_europe", label: "Outside Europe" },
  ];



  const BREAKS = {
    mw: [
      { max: 0, label: "0", color: "var(--dc-map-0)" },
      { max: 500, label: "<0.5", color: "var(--dc-map-1)" },
      { max: 1000, label: "0.5–1", color: "var(--dc-map-2)" },
      { max: 1500, label: "1–1.5", color: "var(--dc-map-3)" },
      { max: 2500, label: "1.5–2.5", color: "var(--dc-map-4)" },
      { max: Infinity, label: "2.5+", color: "var(--dc-map-5)" },
    ],
    twh: [
      { max: 0, label: "0", color: "var(--dc-map-0)" },
      { max: 3, label: "<3", color: "var(--dc-map-1)" },
      { max: 6, label: "3–6", color: "var(--dc-map-2)" },
      { max: 10, label: "6–10", color: "var(--dc-map-3)" },
      { max: 15, label: "10–15", color: "var(--dc-map-4)" },
      { max: Infinity, label: "15+", color: "var(--dc-map-5)" },
    ],
  };

  const COUNTRY_OFFSETS = {
    NO: [-82, -24],
    SE: [8, 8],
    FI: [109, 8],
  };

  const ZONE_LABEL_OFFSETS = {
    NO1: [62, 2],
    NO2: [-64, 12],
    NO3: [-68, -6],
    NO4: [-92, -20],
    NO5: [-64, 2],
    SE1: [78, -12],
    SE2: [78, 0],
    SE3: [78, 12],
    SE4: [-58, 12],
    FI: [-66, 0],
  };

  function num(value) {
    return value === null || value === undefined || value === "" ? null : Number.isFinite(Number(value)) ? Number(value) : null;
  }

  const CLASSES = ["confirmed", "dated_plan", "campus_continuation", "undated_announcement"];
  const CLASS_LABELS = ["Confirmed", "Dated plan", "Rest of active site", "Undated plan"];
  const CLASS_TEXT = [
    "Investment decision taken or construction started.",
    "No investment decision yet. The developer or a public document gives a date.",
    "One building on the site is under construction or has an investment decision. This is the rest of the announced site size, which has no date of its own.",
    "Announced, but with no date and no building started. Includes early ideas and feasibility studies.",
  ];
  const TABS = [
    { id: "confirmed", label: "Confirmed", classes: CLASSES.slice(0, 1) },
    { id: "dated", label: "Dated plans", classes: CLASSES.slice(0, 2) },
    { id: "announced", label: "All announced", classes: CLASSES },
  ];
  const classCache = new WeakMap();
  function projectClasses(data) {
    if (classCache.has(data)) return classCache.get(data);
    // Timeless layers repeat in each scenario ledger. Read one copy, then only sum.
    const scenario = data.method.scenarios[0].id;
    const grouped = new Map();
    for (const row of data.ledger) {
      if (row.scenario !== scenario || !CLASSES.includes(row.evidence_class)) continue;
      const key = `${row.project_id}:${row.evidence_class}`;
      if (!grouped.has(key)) grouped.set(key, { project_id: row.project_id, evidence_class: row.evidence_class, mw_low: 0, mw_high: 0, twh_low: 0, twh_high: 0 });
      const value = grouped.get(key);
      for (const bound of ["low", "high"]) {
        value[`mw_${bound}`] += row[`layer_mw_${bound}`] || 0;
        value[`twh_${bound}`] += row[`layer_twh_${bound}`] || 0;
      }
    }
    const values = [...grouped.values()];
    classCache.set(data, values);
    return values;
  }
  function trackerView(data, tab = DEFAULT_TAB, measure = DEFAULT_MEASURE, hq = "none") {
    const selected = TABS.find((item) => item.id === tab).classes;
    const values = projectClasses(data);
    const unknown = new Set(data.coverage.projects_without_mw);
    const metadata = new Map(data.project_scenarios.map((row) => [row.project_id, row]));
    const rows = data.projects.filter((project) => hq === "none" || matchesHq(project, hq)).map((project) => {
      const classes = values.filter((row) => row.project_id === project.project_id);
      const chosen = classes.filter((row) => selected.includes(row.evidence_class));
      const sum = (key) => chosen.reduce((total, row) => total + row[key], 0);
      return { ...project, bidding_zone: metadata.get(project.project_id).bidding_zone, classes,
        mw_low: sum("mw_low"), mw_high: sum("mw_high"), annual_twh_low: sum("twh_low"), annual_twh_high: sum("twh_high"),
        capacity_known: !unknown.has(project.project_id), participates: chosen.some((row) => row.mw_high > 0),
        indicator: metadata.get(project.project_id).indicator };
    });
    const summarize = (items) => {
      const field = measure === "mw" ? "mw" : "annual_twh";
      return { low: items.reduce((v, row) => v + row[`${field}_low`], 0), high: items.reduce((v, row) => v + row[`${field}_high`], 0),
        unknown: items.filter((row) => !row.capacity_known).length,
        classes: CLASSES.map((evidence_class) => ({ evidence_class,
          high: items.reduce((v, row) => v + row.classes.filter((c) => c.evidence_class === evidence_class).reduce((a, c) => a + c[`${measure}_high`], 0), 0) })) };
    };
    const zoneIds = [...new Set([...data.bidding_zones.features.map((f) => f.properties.bidding_zone), ...rows.map((row) => row.bidding_zone)])];
    const zones = Object.fromEntries(zoneIds.map((zone) => [zone, { ...summarize(rows.filter((row) => row.bidding_zone === zone)), country: zone.slice(0, 2) }]));
    const countries = Object.fromEntries(["NO", "SE", "FI"].map((country) => [country, summarize(rows.filter((row) => row.country === country))]));
    return { tab, measure, hq, rows, zones, countries, totals: summarize(rows) };
  }
  function capacityLabel(detail, measure = "mw") {
    const format = (value) => (measure === "mw" ? value / 1000 : value).toLocaleString("en-US", { maximumFractionDigits: 2 });
    const low = detail.low || 0, high = detail.high || 0;
    const amount = format(low) === format(high) ? format(high) : `${format(low)}–${format(high)}`;
    const unit = measure === "mw" ? "GW" : "TWh/year";
    if (!high && detail.unknown) return `0 ${unit} counted · ${detail.unknown} project${detail.unknown === 1 ? "" : "s"} without MW`;
    return `${amount} ${unit}${detail.unknown ? "*" : ""}`;
  }

  function fillForMeasure(detail, measure = "mw") {
    if (detail.excluded || detail.hq_unreviewed) return "#e8e5df";
    const value = detail.high;
    if (value === null) return BREAKS[measure][0].color;
    const breaks = BREAKS[measure];
    if (value === 0) return breaks[0].color;
    return breaks.slice(1).find((bin) => value < bin.max).color;
  }

  function splitTags(value) {
    if (!value) return [];
    return String(value)
      .split(";")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  function truncate(value, length = 44) {
    const text = String(value || "");
    return text.length > length ? text.slice(0, length - 1).trim() + "..." : text;
  }

  function matchesHq(project, mode) {
    const countries = splitTags(project.actor_hq_countries);
    if (mode === "domestic") return countries.includes(project.country);
    if (mode === "other_europe") return splitTags(project.actor_hq_groups).includes("other_europe");
    if (mode === "outside_europe") return splitTags(project.actor_hq_groups).includes("outside_europe");
    return false;
  }

  function mapState(row) {
    return row.participates ? "included" : !row.capacity_known ? "unquantified" : "excluded";
  }
  function mapRows(view, data) {
    const plotted = new Set(projectClasses(data).filter((row) => row.mw_high > 0).map((row) => row.project_id));
    for (const id of data.coverage.projects_without_mw) plotted.add(id);
    return view.rows.filter((row) => plotted.has(row.project_id));
  }
  function highlightGroups(groups, mode) {
    return groups.map((group) => ({ ...group, hq_mode: mode,
      hq_match_count: group.phases.filter((project) => matchesHq(project, mode)).length,
      selected_count: group.phases.filter((project) => project.participates && (mode === "none" || matchesHq(project, mode))).length }));
  }

  function phaseRadius(group) {
    if (group.phase_count <= 1) {
      return 4.9;
    }

    return Math.min(10.6, 6.5 + group.phase_count * 0.85);
  }

  function phaseCountFontSize(group) {
    const radius = markerRadius(group);
    const digits = String(markerCount(group)).length;
    return digits > 1 ? Math.min(10, radius * 0.98) : Math.min(10.4, radius * 1.18);
  }

  function markerCount(group) {
    return group.selected_count || group.project_count;
  }

  function markerRadius(group) {
    return phaseRadius({ ...group, phase_count: markerCount(group) });
  }

  function countryLabel(value) {
    const labels = {
      SE: "Sweden",
      NO: "Norway",
      FI: "Finland",
    };

    return labels[value] || value || "";
  }

  function countryOrder(value) {
    const order = { NO: 1, SE: 2, FI: 3 };
    return order[value] || 99;
  }

  function countryOffset(country) {
    return COUNTRY_OFFSETS[country] || [0, 0];
  }

  function translatedCentroid(feature, path) {
    const centroid = path.centroid(feature);
    const offset = countryOffset(feature.properties.country);
    return [centroid[0] + offset[0], centroid[1] + offset[1]];
  }

  function translatedBounds(feature, path) {
    const bounds = path.bounds(feature);
    const offset = countryOffset(feature.properties.country);
    return [
      [bounds[0][0] + offset[0], bounds[0][1] + offset[1]],
      [bounds[1][0] + offset[0], bounds[1][1] + offset[1]],
    ];
  }

  function zoneLabelOffset(zone) {
    return ZONE_LABEL_OFFSETS[zone] || [46, 0];
  }

  function pixelInsideFeature(feature, projection, point) {
    const offset = countryOffset(feature.properties.country);
    const lonLat = projection.invert([point[0] - offset[0], point[1] - offset[1]]);
    return lonLat ? d3.geoContains(feature, lonLat) : false;
  }

  function horizontalZoneLabelEdgeAnchor(feature, path, projection, label) {
    const centroid = translatedCentroid(feature, path);
    const bounds = translatedBounds(feature, path);
    const toLeft = label[0] < centroid[0];
    const y = Math.max(bounds[0][1] + 4, Math.min(bounds[1][1] - 4, label[1]));
    const outsideX = toLeft ? bounds[0][0] - 90 : bounds[1][0] + 90;
    const direction = toLeft ? 1 : -1;

    let outside = [outsideX, y];
    let inside = null;
    const maxSteps = Math.ceil((bounds[1][0] - bounds[0][0] + 180) / 4);

    for (let i = 0; i <= maxSteps; i += 1) {
      const candidate = [outsideX + direction * i * 4, y];

      if (pixelInsideFeature(feature, projection, candidate)) {
        inside = candidate;
        break;
      }

      outside = candidate;
    }

    if (!inside) {
      return [toLeft ? bounds[0][0] : bounds[1][0], y];
    }

    for (let i = 0; i < 18; i += 1) {
      const mid = [(inside[0] + outside[0]) / 2, (inside[1] + outside[1]) / 2];
      if (pixelInsideFeature(feature, projection, mid)) {
        inside = mid;
      } else {
        outside = mid;
      }
    }

    return inside;
  }

  function resolvePhaseOverlaps(points, width, height) {
    const nodes = points.map((point, index) => ({
      ...point,
      index,
      anchorX: point.xy[0],
      anchorY: point.xy[1],
      displayX: point.xy[0],
      displayY: point.xy[1],
      radius: phaseRadius(point),
    }));

    const minPadding = 5.5;
    const maxShift = 32;

    for (let step = 0; step < 90; step += 1) {
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = b.displayX - a.displayX;
          let dy = b.displayY - a.displayY;
          let distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = a.radius + b.radius + minPadding;

          if (distance >= minDistance) continue;

          if (distance < 0.01) {
            const angle = (a.index + b.index + 1) * 2.399;
            dx = Math.cos(angle);
            dy = Math.sin(angle);
            distance = 1;
          }

          const push = (minDistance - distance) / 2;
          const ux = dx / distance;
          const uy = dy / distance;

          a.displayX -= ux * push;
          a.displayY -= uy * push;
          b.displayX += ux * push;
          b.displayY += uy * push;
        }
      }

      nodes.forEach((node) => {
        node.displayX += (node.anchorX - node.displayX) * 0.035;
        node.displayY += (node.anchorY - node.displayY) * 0.035;

        const dx = node.displayX - node.anchorX;
        const dy = node.displayY - node.anchorY;
        const shift = Math.sqrt(dx * dx + dy * dy);

        if (shift > maxShift) {
          node.displayX = node.anchorX + (dx / shift) * maxShift;
          node.displayY = node.anchorY + (dy / shift) * maxShift;
        }

        node.displayX = Math.max(18, Math.min(width - 18, node.displayX));
        node.displayY = Math.max(18, Math.min(height - 18, node.displayY));
      });
    }

    return nodes.map((node) => ({
      ...node,
      xy: [node.displayX, node.displayY],
      hasOffset: Math.hypot(node.displayX - node.anchorX, node.displayY - node.anchorY) > 2.5,
    }));
  }

  function buildPhaseGroups(view, data) {
    const projects = new Map(data.projects.map((project) => [project.project_id, project]));
    const entries = mapRows(view, data)
      .map((row) => {
        const project = projects.get(row.project_id);
        return { ...project, ...row, phase: project.status, coordinate_note: "Approximate project locations" };
      })
      .filter((project) => num(project.latitude) !== null && num(project.longitude) !== null);
    const grouped = d3.group(entries, (project) => `${project.municipality}|${project.latitude}|${project.longitude}`);
    return Array.from(grouped, ([key, phases]) => {
      const ordered = phases.sort((a, b) => a.project_name.localeCompare(b.project_name));
      const activeCount = ordered.filter((phase) => phase.participates).length;
      return {
        ...ordered[0],
        key,
        phases: ordered,
        phase_count: ordered.length,
        project_count: ordered.length,
        active_count: activeCount,
        unknown_count: ordered.filter((phase) => mapState(phase) === "unquantified").length,
        excluded_count: ordered.filter((phase) => mapState(phase) === "excluded").length,
        scenario_state: activeCount === 0 ? "inactive" : activeCount === ordered.length ? "active" : "mixed",
      };
    });
  }

  function renderControls(container, scenarios, activeScenario, onScenarioChange, onMeasureChange, onHighlightChange, coverageNote) {
    const controls = d3.select(container).append("div").attr("class", "dc-map-controls");

    const scenarioControls = controls.append("div").attr("class", "dc-map-tabs");

    scenarioControls.classed("dc-view-tabs", true).attr("role", "group").attr("aria-label", "How far the plans have come");

    scenarios.forEach((scenario) => {
      scenarioControls
        .append("button")
        .attr("type", "button")
        .attr("class", "dc-view-tab" + (scenario.id === activeScenario ? " active" : ""))
        .attr("data-scenario", scenario.id)
        .attr("aria-pressed", String(scenario.id === activeScenario))
        .text(scenario.label)
        .on("click", function () {
          scenarioControls.selectAll("button").classed("active", false);
          d3.select(this).classed("active", true);
          scenarioControls.selectAll("button").attr("aria-pressed", function () { return String(this.dataset.scenario === scenario.id); });
          onScenarioChange(scenario.id);
        });
    });

    const options = controls.append("div").attr("class", "dc-map-options");
    const measureControl = options.append("div").attr("class", "dc-measure-control").attr("role", "group").attr("aria-label", "Measure for all views");
    measureControl.append("span").attr("class", "dc-measure-label").text("Measure");
    const measureButtons = measureControl
      .append("div")
      .attr("class", "dc-measure-segments")
      .selectAll("button")
      .data(MEASURES)
      .join("button")
      .attr("type", "button")
      .attr("class", "dc-measure-button")
      .attr("data-measure", (item) => item.id)
      .attr("aria-pressed", (item) => String(item.id === DEFAULT_MEASURE))
      .attr("aria-label", (item) => item.label)
      .on("click", (event, item) => {
        measureButtons.attr("aria-pressed", (option) => String(option.id === item.id));
        onMeasureChange(item.id);
      });
    measureButtons.append("span").attr("class", "dc-measure-long").text((item) => item.label);
    measureButtons.append("span").attr("class", "dc-measure-short").text((item) => item.shortLabel);

    const hqControl = options
      .append("div")
      .attr("class", "dc-hq-control")
      .attr("role", "group")
      .attr("aria-label", "Developer headquarters")
      .attr("title", "Global headquarters. Domestic is relative to the project's country. " + coverageNote);
    hqControl.append("label").attr("class", "dc-hq-label").attr("for", "dc-map-hq").text("HQ");
    const hqSelect = hqControl
      .append("select")
      .attr("id", "dc-map-hq")
      .attr("class", "dc-hq-select")
      .attr("aria-label", "Developer headquarters")
      .on("change", (event) => onHighlightChange(event.target.value));
    hqSelect.selectAll("option")
      .data(HQ_HIGHLIGHTS)
      .join("option")
      .attr("value", (item) => item.id)
      .text((item) => item.label);
    hqSelect.property("value", "none");
    return scenarioControls;
  }

  function mountControls(container, shared) {
    const state = shared.get();
    renderControls(container, TABS, state.family, value => shared.set({family:value}), value => shared.set({measure:value}), value => shared.set({hq:value}), "");
    const root = d3.select(container);
    const navbar = document.querySelector("#navbar");
    const observer = new ResizeObserver(() => root.style("--dc-navbar-offset", `${Math.ceil(navbar?.getBoundingClientRect().height || 0)}px`));
    if (navbar) observer.observe(navbar);
    // A single underline slides to the active tab.
    const tabs = root.select(".dc-view-tabs");
    const indicator = tabs.append("span").attr("class", "dc-view-tab-indicator").attr("aria-hidden", "true");
    const placeIndicator = () => {
      const active = tabs.select("button.active").node();
      if (!active) return;
      indicator.style("width", `${active.offsetWidth}px`).style("transform", `translateX(${active.offsetLeft}px)`);
    };
    const tabObserver = new ResizeObserver(placeIndicator);
    tabObserver.observe(tabs.node());
    document.fonts?.ready?.then(placeIndicator);
    const unsubscribe = shared.subscribe(state => {
      root.selectAll("[data-scenario]").classed("active", function() { return this.dataset.scenario === state.family; })
        .attr("aria-pressed", function() { return String(this.dataset.scenario === state.family); });
      placeIndicator();
      root.selectAll("[data-measure]").attr("aria-pressed", function() { return String(this.dataset.measure === state.measure); });
      root.select("select").property("value", state.hq);
    });
    return { disconnect() {unsubscribe();observer.disconnect();tabObserver.disconnect();} };
  }

  function renderZoneLabels(labelG, geojson, path, projection) {
    const labelData = geojson.features.map((feature) => {
      const zone = feature.properties.bidding_zone;
      const anchor = translatedCentroid(feature, path);
      const offset = zoneLabelOffset(zone);
      const label = [anchor[0] + offset[0], anchor[1] + offset[1]];
      const textAnchor = offset[0] < 0 ? "end" : "start";
      const linePad = offset[0] < 0 ? -7 : 7;
      const edgeAnchor = horizontalZoneLabelEdgeAnchor(feature, path, projection, label);

      return {
        zone,
        anchor: edgeAnchor,
        label,
        textAnchor,
        lineEnd: [label[0] - linePad, edgeAnchor[1]],
        labelY: edgeAnchor[1],
      };
    });

    const groups = labelG
      .selectAll("g.dc-zone-label-callout")
      .data(labelData, (d) => d.zone)
      .join(
        (enter) => {
          const g = enter
            .append("g")
            .attr("class", "dc-zone-label-callout")
            .attr("data-zone", (d) => d.zone);

          g.append("line").attr("class", "dc-zone-label-line");

          g.append("text").attr("class", "dc-zone-label").attr("dominant-baseline", "middle");

          return g;
        },
        (update) => update,
        (exit) => exit.remove()
      );

    groups
      .select("line.dc-zone-label-line")
      .attr("x1", (d) => d.anchor[0])
      .attr("y1", (d) => d.anchor[1])
      .attr("x2", (d) => d.lineEnd[0])
      .attr("y2", (d) => d.lineEnd[1]);

    groups
      .select("text.dc-zone-label")
      .attr("x", (d) => d.label[0])
      .attr("y", (d) => d.labelY)
      .attr("text-anchor", (d) => d.textAnchor)
      .text((d) => d.zone);
  }

  function renderPhaseLayer(phaseG, popupG, phaseGroups, projection, width, height, measure, tab) {
    const projectedPoints = phaseGroups
      .map((group) => {
        const xy = projection([group.longitude, group.latitude]);
        if (!xy) return { ...group, xy };

        const offset = countryOffset(group.country);
        return {
          ...group,
          xy: [xy[0] + offset[0], xy[1] + offset[1]],
        };
      })
      .filter((group) => group.xy && Number.isFinite(group.xy[0]) && Number.isFinite(group.xy[1]));

    const points = resolvePhaseOverlaps(projectedPoints, width, height);

    const groups = phaseG
      .selectAll("g.dc-phase-point")
      .data(points, (d) => d.key)
      .join(
        (enter) => {
          const g = enter
            .append("g")
            .attr("class", "dc-phase-point")
            .attr("tabindex", 0)
            .attr("role", "button")
            .attr("aria-label", (d) => `${d.project_count} project${d.project_count === 1 ? "" : "s"} in ${d.municipality}`);

          g.append("line").attr("class", "dc-phase-anchor");

          g.append("circle").attr("class", "dc-phase-hit").attr("fill", "transparent").attr("aria-hidden", "true");

          g.append("circle")
            .attr("class", "dc-phase-dot")
            .attr("fill", "#c6ccc6")
            .attr("fill-opacity", 1)
            .attr("stroke", "#fbf8f0")
            .attr("stroke-width", 1.1);

          g.append("text")
            .attr("class", "dc-phase-count")
            .attr("text-anchor", "middle")
            .attr("dy", "0.34em")
            .attr("fill", "#ffffff")
            .attr("font-size", phaseCountFontSize)
            .attr("font-weight", 700)
            .attr("pointer-events", "none");

          return g;
        },
        (update) => update,
        (exit) => exit.remove()
      );

    groups
      .attr("transform", (d) => `translate(${d.xy[0]},${d.xy[1]})`)
      .classed("scenario-active", (d) => d.scenario_state === "active")
      .classed("scenario-mixed", (d) => d.scenario_state === "mixed")
      .classed("scenario-inactive", (d) => d.scenario_state === "inactive")
      .classed("selection-active", (d) => d.selected_count > 0)
      .classed("selection-inactive", (d) => d.selected_count === 0)
      .classed("hq-match", (d) => d.hq_match_count > 0)
      .classed("hq-partial", (d) => d.hq_match_count > 0 && d.hq_match_count < d.project_count)
      .attr("data-hq-matches", (d) => d.hq_match_count)
      .attr("data-project-count", (d) => d.project_count)
      .attr("data-project-ids", (d) => d.phases.map((project) => project.project_id).join(" "))
      .attr("data-unknown-count", (d) => d.unknown_count)
      .attr("data-selected-count", (d) => d.selected_count)
      .attr(
        "aria-label",
        (d) =>
          `${d.project_count} project${d.project_count === 1 ? "" : "s"} in ${d.municipality}, ${d.active_count} with capacity in the selected classes${d.unknown_count ? `, ${d.unknown_count} without MW` : ""}${d.hq_mode === "none" ? "" : `, ${d.hq_match_count} match ${HQ_HIGHLIGHTS.find((item) => item.id === d.hq_mode).label} HQ`}`
      )
      .on("click", function (event, d) {
        event.stopPropagation();
        showPhasePopup(popupG, d, width, height, measure, tab, event);
      })
      .on("keydown", function (event, d) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          showPhasePopup(popupG, d, width, height, measure, tab, event);
        }
      });

    groups
      .select("line.dc-phase-anchor")
      .attr("x1", (d) => d.anchorX - d.xy[0])
      .attr("y1", (d) => d.anchorY - d.xy[1])
      .attr("x2", 0)
      .attr("y2", 0)
      .attr("opacity", (d) => (d.hasOffset ? 1 : 0));

    groups.select("circle.dc-phase-dot").attr("r", markerRadius);
    groups.select("circle.dc-phase-hit").attr("r", (d) => Math.max(12, phaseRadius(d) + 3));

    groups
      .select("text.dc-phase-count")
      .attr("font-size", phaseCountFontSize)
      .text((d) => (markerCount(d) > 1 ? markerCount(d) : ""));
  }

  function showPhasePopup(host, group, width, height, measure, tab, event) {
    host.selectAll("*").remove();
    host.attr("hidden", null);
    const box = host.append("div").attr("class", "dc-project-popup").attr("role", "dialog").attr("aria-label", group.municipality || group.zone);
    const header = box.append("div").attr("class", "dc-project-popup-heading");
    header.append("strong").text(group.municipality || group.zone);
    header.append("button").attr("type", "button").attr("aria-label", "Close project details").text("×").on("click", () => host.attr("hidden", true));
    box.append("p").attr("class", "dc-project-popup-meta").text([countryLabel(group.country), group.bidding_zone || group.zone].filter(Boolean).join(" · "));
    const selected = TABS.find((item) => item.id === tab).classes;
    for (const project of group.phases.filter((row) => !group.hq_mode || group.hq_mode === "none" || matchesHq(row, group.hq_mode))) {
      const item = box.append("section");
      item.append("strong").text(project.project_name);
      item.append("span").attr("class", "dc-project-popup-meta").text(project.status);
      if (!project.capacity_known) item.append("p").text("Project without MW");
      for (const klass of selected) {
        const value = project.classes.find((row) => row.evidence_class === klass);
        const line = item.append("div").attr("class", "dc-project-class-value");
        line.append("span").text(CLASS_LABELS[CLASSES.indexOf(klass)]);
        line.append("strong").text(capacityLabel({ low: value?.[`${measure}_low`] || 0, high: value?.[`${measure}_high`] || 0 }, measure));
      }
    }
    const node = box.node();
    const left = Math.min(global.innerWidth - node.offsetWidth - 12, Math.max(12, (event?.clientX || global.innerWidth / 2) + 12));
    const top = Math.min(global.innerHeight - node.offsetHeight - 12, Math.max(12, (event?.clientY || 80) + 12));
    box.style("left", `${left}px`).style("top", `${Math.max(12, top)}px`);
  }

  function renderMapLegend(root, measure, tab = DEFAULT_TAB) {
    const tabLabel = TABS.find((item) => item.id === tab).label;
    const legend = root.selectAll(".dc-map-scale").data([null]).join("div").attr("class", "dc-map-scale");
    legend.selectAll("*").remove();
    legend.append("span").attr("class", "dc-map-scale-label").text(`Map · upper estimate (${measure === "mw" ? "GW" : "TWh/year"})`);
    const bins = legend.append("div").attr("class", "dc-map-scale-bins");
    for (const bin of BREAKS[measure]) {
      const item = bins.append("span");
      item.append("i").style("background", bin.color);
      item.append("span").text(bin.label);
    }
    const points = legend.append("div").attr("class", "dc-point-key");
    const counted = points.append("span");
    counted.append("i").attr("class", "dc-point-key-selected");
    counted.append("span").text(`Counted in ${tabLabel}`);
    const other = points.append("span");
    other.append("i");
    other.append("span").text(`Not counted in ${tabLabel}`);
    points.append("span").text("Number in a dot: projects at the same location");
  }


  // Context only: shares of electricity consumption in a reference year, exported with the method.
  function consumptionFor(data, zoneOrCountry) {
    const zones = data?.method?.assumptions?.context_consumption?.zones;
    if (!zones) return null;
    const ids = Object.keys(zones).filter((zone) => zone === zoneOrCountry || (zoneOrCountry.length === 2 && zone.startsWith(zoneOrCountry)));
    return ids.length ? ids.reduce((sum, zone) => sum + Number(zones[zone]), 0) : null;
  }
  function shareLabel(detail, base) {
    if (!base || !(detail.high > 0)) return "";
    const pct = (value) => {
      const p = (100 * value) / base;
      return p > 0 && p < 1 ? "<1" : String(Math.round(p));
    };
    const low = pct(detail.low || 0), high = pct(detail.high);
    return (low === high ? high : `${low}–${high}`) + "%";
  }
  function amountLabel(detail, measure) {
    const format = (value) => (measure === "mw" ? value / 1000 : value).toLocaleString("en-US", { minimumFractionDigits: measure === "mw" ? 1 : 0, maximumFractionDigits: measure === "mw" ? 1 : 0 });
    const a = format(detail.low || 0), b = format(detail.high || 0);
    return `${a === b ? b : `${a}–${b}`}${detail.unknown ? "*" : ""} ${measure === "mw" ? "GW" : "TWh"}`;
  }
  // One plain sentence with the main figure for the current tab, measure and HQ selection.
  function headline(data, tab = DEFAULT_TAB, measure = DEFAULT_MEASURE, hq = "none") {
    const label = TABS.find((item) => item.id === tab).label;
    const view = trackerView(data, tab, measure, hq);
    const all = trackerView(data, "announced", measure, hq);
    const hqText = hq === "none" ? "" : ` from developers headquartered ${{ domestic: "in the project's own country", other_europe: "elsewhere in Europe", outside_europe: "outside Europe" }[hq]}`;
    const countries = "Sweden, Norway and Finland";
    if (measure === "mw") {
      return tab === "announced"
        ? `All publicly announced plans for new datacenters in ${countries}${hqText} add up to ${amountLabel(all.totals, measure)}.`
        : `${label} counts ${amountLabel(view.totals, measure)} of new datacenter capacity in ${countries}${hqText}, out of ${amountLabel(all.totals, measure)} in all publicly announced plans.`;
    }
    const base = consumptionFor(data, "SE") + consumptionFor(data, "NO") + consumptionFor(data, "FI");
    const year = data.method.assumptions.context_consumption?.year;
    const share = base ? ` That equals ${shareLabel(view.totals, base)} of the three countries' electricity use in ${year}.` : "";
    return `${tab === "announced" ? "All publicly announced datacenter capacity" : `The datacenter capacity counted in ${label}`} in ${countries}${hqText} would use ${amountLabel(view.totals, measure)} a year when fully built.${share}`;
  }
  function renderClassList(root, view, onZoneClick, onHighlight, data) {
    const selected = TABS.find((item) => item.id === view.tab).classes;
    // The scale is set by everything announced, so it stays the same when the selection changes and bars grow or shrink.
    const scaleRows = [...Object.entries(view.zones).filter(([id]) => !id.endsWith("-unassigned")).map(([, zone]) => zone), view.countries.NO, view.countries.SE];
    const maximum = Math.max(0, ...scaleRows.map(row => row.classes.reduce((v, layer) => v + layer.high, 0)));
    const divisor = view.measure === "mw" ? 1000 : 1;
    const scale = d3.scaleLinear().domain([0, maximum / divisor || 1]).nice(4).range([0, 100]);
    const percent = (value) => scale(value / divisor);
    const ticks = scale.ticks(4);
    const unit = view.measure === "mw" ? "GW" : "TWh/year";
    const tabLabel = TABS.find((item) => item.id === view.tab).label;
    // Rows are kept between renders, so CSS transitions can grow and shrink the bars when the selection changes.
    const list = root.selectAll(".dc-zone-class-list").data([null]).join("div").attr("class", "dc-zone-class-list")
      .attr("aria-label", `Capacity counted in ${tabLabel} by bidding zone`);
    list.style("--dc-grid-step", `${scale(ticks[1]) - scale(ticks[0])}%`);
    const heading = list.selectAll(".dc-class-chart-heading").data([null]).join("div").attr("class", "dc-class-chart-heading");
    heading.selectAll("span").data(["Bidding zone", `Counted capacity · ${unit}`, `Low–high · ${unit}`]).join("span").text((d) => d);
    const sections = list.selectAll("section.dc-country-classes").data(["NO", "SE", "FI"], (d) => d).join((enter) => {
      const section = enter.append("section").attr("class", "dc-country-classes").attr("aria-label", (d) => countryLabel(d));
      section.append("div").attr("class", "dc-country-class-heading").append("h3").text((d) => countryLabel(d));
      return section;
    });
    sections.each(function (country) {
      const zones = Object.entries(view.zones).filter(([zone, d]) => d.country === country && !zone.endsWith("-unassigned")).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
      if (country !== "FI") zones.unshift([country, view.countries[country]]);
      const rows = d3.select(this).selectAll("button.dc-zone-class-row").data(zones, (d) => d[0]).join((enter) => {
        const row = enter.append("button").attr("type", "button").attr("class", "dc-zone-class-row").attr("data-zone", (d) => d[0])
          .classed("dc-country-total-row", (d) => d[0] === country && country !== "FI")
          .on("click", (event, d) => onZoneClick(d[0], event))
          .on("mouseenter", (event, d) => onHighlight(d[0], true)).on("mouseleave", (event, d) => onHighlight(d[0], false));
        row.append("span").attr("class", "dc-zone-class-name");
        const track = row.append("span").attr("class", "dc-zone-class-track").attr("aria-hidden", true);
        track.append("span").attr("class", "dc-zone-class-bar");
        track.append("span").attr("class", "dc-zone-class-range");
        row.append("span").attr("class", "dc-zone-class-value");
        return row;
      });
      rows.each(function ([zone, detail]) {
        const row = d3.select(this);
        const label = capacityLabel(detail, view.measure);
        row.attr("aria-label", `${zone}: ${label}`).attr("title", label);
        row.select(".dc-zone-class-name").text((zone === country && country !== "FI" ? "Σ Total" : zone) + (detail.unknown ? "*" : ""));
        // Only the stages counted in the selection get a width. Colours are set inline because the site's CSS purge
        // cannot see class names built at run time.
        row.select(".dc-zone-class-bar").selectAll("span.dc-class-segment").data(detail.classes, (layer) => layer.evidence_class)
          .join("span").attr("class", "dc-class-segment")
          .style("background", (layer) => `var(--dc-class-${layer.evidence_class})`)
          .style("width", (layer) => `${selected.includes(layer.evidence_class) ? percent(layer.high) : 0}%`);
        row.select(".dc-zone-class-range").classed("dc-zone-class-range-empty", !(detail.high > 0))
          .style("left", `${percent(detail.low || 0)}%`).style("width", `${Math.max(0, percent(detail.high || 0) - percent(detail.low || 0))}%`);
        // The unit is in the column heading, so the rows show numbers only.
        row.select(".dc-zone-class-value").text(detail.high > 0 ? label.replace(` ${unit}`, "") : `0${detail.unknown ? "*" : ""}`);
      });
    });
    // The scale sits below the rows, where the bars end, as in an ordinary bar chart.
    const axis = list.selectAll(".dc-class-axis").data([null]).join("div").attr("class", "dc-class-axis").attr("aria-hidden", true);
    axis.raise();
    const axisTrack = axis.selectAll("div").data([null]).join("div");
    axisTrack.selectAll("span").data(ticks).join("span").style("left", (value) => `${scale(value)}%`).text((value) => value.toLocaleString("en-US"));
    const legend = root.selectAll(".dc-class-legend").data([null]).join("div").attr("class", "dc-class-legend").attr("aria-label", "How far the plans have come");
    legend.selectAll("*").remove();
    legend.append("div").attr("class", "dc-class-legend-title").text("How far the plans have come");
    CLASSES.forEach((klass, i) => {
      const item = legend.append("div").attr("class", "dc-class-legend-item");
      item.append("i").style("background", `var(--dc-class-${klass})`).attr("aria-hidden", true);
      item.append("strong").text(CLASS_LABELS[i]);
      item.append("span").text(CLASS_TEXT[i]);
    });
    root.selectAll(".dc-class-chart-note").data([null]).join("div").attr("class", "dc-class-chart-note")
      .text(`The bars show the capacity counted in ${tabLabel}, coloured by stage. Their length is the high value. The thin line and the figures on the right show the range from low to high. An asterisk (*) means that at least one project in the total has no MW figure, so the actual total is higher.`);
  }

  function mount(container, data, shared) {
    const geojson = data.bidding_zones;
    const width = 760, height = 570;
    let { family: tab, measure, hq } = shared.get();
    const root = d3.select(container).attr("class", "dc-scenario-map-root");
    // Every tab and measure variant is laid out in the same grid cell and only the current one is visible.
    // The block then keeps the height of the longest variant, so the page does not shift when the selection changes.
    const headlineNode = root.append("div").attr("class", "dc-map-headline").attr("aria-live", "polite");
    const figure = root.append("div").attr("class", "dc-scenario-svg-wrap");
    const svg = figure.append("svg").attr("class", "dc-scenario-svg").attr("viewBox", `0 0 ${width} ${height}`).attr("role", "img");
    const projection = d3.geoMercator();
    projection.fitExtent([[128, 58], [610, 536]], geojson);
    const path = d3.geoPath(projection);
    const mapG = svg.append("g").attr("class", "dc-map-zones");
    const zoneLabelG = svg.append("g").attr("class", "dc-zone-label-layer");
    const phaseG = svg.append("g").attr("class", "dc-phase-layer");
    const popup = root.append("div").attr("class", "dc-map-popup-host").attr("hidden", true);
    const zonePaths = mapG.selectAll("path").data(geojson.features).join("path").attr("class", "dc-zone")
      .attr("data-zone", (d) => d.properties.bidding_zone).attr("tabindex", 0).attr("role", "button")
      .attr("transform", (d) => `translate(${countryOffset(d.properties.country).join(",")})`).attr("d", path)
      .on("click", (event, d) => openZone(d.properties.bidding_zone, event))
      .on("keydown", (event, d) => {if (event.key === "Enter" || event.key === " ") {event.preventDefault();openZone(d.properties.bidding_zone, event);}});
    renderZoneLabels(zoneLabelG, geojson, path, projection);
    function highlightZone(zone, active) {
      svg.selectAll(".dc-zone").filter(d => ["NO", "SE"].includes(zone) ? d.properties.country === zone : d.properties.bidding_zone === zone).classed("highlight", active);
    }
    function openZone(zone, event) {
      const selected = trackerView(data, tab, measure, hq);
      const countryTotal = ["NO", "SE"].includes(zone);
      showPhasePopup(popup, {zone: countryTotal ? "" : zone, municipality: countryTotal ? countryLabel(zone) : "", country: zone.slice(0, 2), phases: selected.rows.filter((row) => countryTotal ? row.country === zone : row.bidding_zone === zone)}, width, height, measure, tab, event);
    }
    global.addEventListener("keydown", (event) => {if (event.key === "Escape") popup.attr("hidden", true);});
    root.on("click.close-popup", (event) => {if (!event.target.closest(".dc-phase-point, .dc-zone, .dc-zone-class-row, .dc-project-popup")) popup.attr("hidden", true);});
    function render() {
      popup.attr("hidden", true);
      zonePaths.classed("highlight", false);
      const view = trackerView(data, tab, measure, hq);
      root.attr("data-measure", measure).attr("data-tab", tab).attr("data-hq", hq);
      svg.attr("aria-label", `Full announced datacenter capacity by bidding zone: ${TABS.find((t) => t.id === tab).label}`);
      zonePaths.attr("fill", (d) => fillForMeasure(view.zones[d.properties.bidding_zone], measure))
        .attr("aria-label", (d) => `${d.properties.bidding_zone}: ${capacityLabel(view.zones[d.properties.bidding_zone], measure)}`);
      const groups = highlightGroups(buildPhaseGroups(trackerView(data, tab, measure), data), hq);
      renderPhaseLayer(phaseG, popup, groups, projection, width, height, measure, tab);
      root.classed("dc-hq-highlighting", hq !== "none");
      renderMapLegend(root, measure, tab);
      const variants = TABS.flatMap((item) => ["mw", "twh"].map((m) => ({ key: `${item.id}:${m}`, text: headline(data, item.id, m, hq) })));
      headlineNode.selectAll("p").data(variants, (d) => d.key).join("p").text((d) => d.text)
        .classed("dc-map-headline-current", (d) => d.key === `${tab}:${measure}`)
        .attr("aria-hidden", (d) => (d.key === `${tab}:${measure}` ? null : "true"));
      renderClassList(root, view, openZone, highlightZone, data);
    }
    const unsubscribe = shared.subscribe(state => { tab = state.family;measure = state.measure;hq = state.hq;render(); });
    return { disconnect() {unsubscribe();root.selectAll("*").remove();} };
  }
  const api = { mount, mountControls, matchesHq, highlightGroups, mapState, mapRows, projectClasses, trackerView, capacityLabel, headline, consumptionFor, shareLabel, fillForMeasure, CLASSES, CLASS_LABELS, CLASS_TEXT, TABS, DEFAULT_MEASURE };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.DCTrackerMap = api;
})(typeof window === "undefined" ? globalThis : window);

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



  // Circle radius grows with the square root of the site's high value, from a minimum size.
  // The minimum compresses the span, so area is not exactly proportional. The key uses the same function.
  // The scale is fixed so sizes compare across selections.
  const SITE_SCALE = {
    mw: { max: 2000, keys: [50, 250, 1000], unit: "MW" },
    twh: { max: 14, keys: [0.5, 2, 7], unit: "TWh" },
  };
  const SITE_MIN_RADIUS = 3;
  const SITE_MAX_RADIUS = 19;
  const SITE_RING_RADIUS = 2.6;
  function siteRadius(value, measure) {
    const scale = SITE_SCALE[measure];
    if (!(value > 0)) return SITE_RING_RADIUS;
    return SITE_MIN_RADIUS + (SITE_MAX_RADIUS - SITE_MIN_RADIUS) * Math.sqrt(Math.min(value, scale.max) / scale.max);
  }
  // All announced capacity at the site (every stage), for the outline. Follows the HQ filter like siteValue.
  function siteTotal(group, measure) {
    const field = measure === "mw" ? "mw_high" : "twh_high";
    return group.phases.filter((p) => !group.hq_mode || group.hq_mode === "none" || matchesHq(p, group.hq_mode))
      .reduce((total, p) => total + (p.classes || []).reduce((sum, c) => sum + (c[field] || 0), 0), 0);
  }
  function siteAmount(value, measure) {
    return measure === "mw" ? `${Math.round(value).toLocaleString("en-US")} MW` : `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} TWh/year`;
  }
  // The share of a site that is included in the selection, drawn as a sector from twelve o'clock.
  // d3 is looked up when drawing, so the module also loads without it, as in the tests.
  const sharePath = (r, share) => (r > 0 && share > 0
    ? d3.arc()({ innerRadius: 0, outerRadius: r, startAngle: 0, endAngle: Math.min(1, share) * 2 * Math.PI })
    : "");
  // The pale disc for a site, or a small dashed ring when the site has no stated size.
  function styleDisc(sel, noSize, opacity) {
    return sel.style("fill", noSize ? "none" : "var(--dc-blue)").style("fill-opacity", noSize ? 0 : opacity)
      .style("stroke", noSize ? "#8b969c" : "#fbf8f0").style("stroke-width", noSize ? 0.9 : 0.8)
      .style("stroke-dasharray", noSize ? "1.5 1.2" : null);
  }
  const siteShare = (d) => (d.no_size || !(d.site_total > 0) ? 0 : Math.min(1, d.site_value / d.site_total));
  const prefersReducedMotion = () => typeof global.matchMedia === "function" && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function siteValue(group, measure) {
    const field = measure === "mw" ? "mw_high" : "annual_twh_high";
    return group.phases.filter((p) => p.participates && (!group.hq_mode || group.hq_mode === "none" || matchesHq(p, group.hq_mode)))
      .reduce((total, p) => total + (p[field] || 0), 0);
  }

  const COUNTRY_OFFSETS = {
    NO: [-82, -24],
    SE: [8, 8],
    FI: [109, 8],
  };

  const ZONE_LABEL_OFFSETS = {
    NO1: [50, -6],
    NO2: [-64, 12],
    NO3: [-68, -6],
    NO4: [-92, -20],
    NO5: [-64, 2],
    SE1: [78, -12],
    SE2: [78, 0],
    SE3: [78, 12],
    SE4: [-58, 12],
    FI: [-66, 0],
    DK1: [-58, -5],
    DK2: [42, 6],
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
    const covered = [...new Set(data.projects.map((p) => p.country))].sort((a, b) => countryOrder(a) - countryOrder(b));
    const countries = Object.fromEntries(covered.map((country) => [country, summarize(rows.filter((row) => row.country === country))]));
    return { tab, measure, hq, rows, zones, countries, totals: summarize(rows) };
  }
  // One rule for every GW figure: one decimal from 1 GW, two below, the same on both sides of a range.
  function gwRange(lowMw, highMw) {
    const low = (lowMw || 0) / 1000, high = (highMw || 0) / 1000;
    const digits = Math.max(low, high) >= 1 ? 1 : 2;
    const smallest = 10 ** -digits;
    const format = (value) => value > 0 && value < smallest / 2 ? "<" + smallest.toFixed(digits)
      : value.toLocaleString("en-US", { minimumFractionDigits: value === 0 ? 0 : digits, maximumFractionDigits: digits });
    // A difference smaller than the last shown decimal is not shown as a range.
    const a = format(low), b = format(high);
    return a === b || high - low < smallest / 2 ? b : `${a}–${b}`;
  }
  function capacityLabel(detail, measure = "mw") {
    const format = (value) => value.toLocaleString("en-US", { maximumFractionDigits: 2 });
    const low = detail.low || 0, high = detail.high || 0;
    const amount = measure === "mw" ? gwRange(low, high) : format(low) === format(high) ? format(high) : `${format(low)}–${format(high)}`;
    const unit = measure === "mw" ? "GW" : "TWh/year";
    if (!high && detail.unknown) return `0 ${unit} included · ${detail.unknown} project${detail.unknown === 1 ? "" : "s"} without MW`;
    return `${amount} ${unit}`;
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

  function countryLabel(value) {
    const labels = {
      SE: "Sweden",
      NO: "Norway",
      FI: "Finland",
      DK: "Denmark",
    };

    return labels[value] || value || "";
  }

  function countryOrder(value) {
    const order = { NO: 1, SE: 2, FI: 3, DK: 4 };
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

  function resolvePhaseOverlaps(points, width, height, options = {}) {
    const nodes = points.map((point, index) => ({
      ...point,
      index,
      anchorX: point.xy[0],
      anchorY: point.xy[1],
      displayX: point.xy[0],
      displayY: point.xy[1],
      radius: point.radius,
    }));

    const minPadding = options.minPadding ?? 5.5;
    const maxShift = options.maxShift ?? 32;
    // overlap = 0 keeps circles apart. A higher value lets a smaller circle sit partly on a larger one.
    const overlap = options.overlap ?? 0;

    for (let step = 0; step < 90; step += 1) {
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = b.displayX - a.displayX;
          let dy = b.displayY - a.displayY;
          let distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = a.radius + b.radius + minPadding - overlap * Math.min(a.radius, b.radius);

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
      .attr("title", "The developer's global headquarters. Domestic means the same country as the project, Other Europe another European country and Outside Europe the rest of the world. A project with several developers can appear in more than one group. " + coverageNote);
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
      .each(function (d) {
        const text = d3.select(this);
        text.selectAll("tspan.dc-zone-label-name").data([null]).join("tspan").attr("class", "dc-zone-label-name")
          .attr("x", d.label[0]).attr("dy", "-0.55em").text(d.zone);
      });
  }

  // The zone total sits next to the zone name and follows the selection. Only the high value is shown.
  function zoneValueLabel(detail, measure) {
    const high = detail?.high || 0;
    if (measure === "mw") return `${gwRange(high, high)} GW`;
    const digits = high >= 10 ? 0 : 1;
    return `${high.toLocaleString("en-US", { minimumFractionDigits: high === 0 ? 0 : digits, maximumFractionDigits: digits })} TWh`;
  }
  function updateZoneLabelValues(labelG, view, measure) {
    labelG.selectAll("text.dc-zone-label").each(function (d) {
      const text = d3.select(this);
      text.selectAll("tspan.dc-zone-label-value").data([null]).join("tspan").attr("class", "dc-zone-label-value")
        .attr("x", d.label[0]).attr("dy", "1.2em").text(zoneValueLabel(view.zones[d.zone], measure));
    });
  }

  function renderPhaseLayer(phaseG, popupG, phaseGroups, projection, width, height, measure, tab, useOffsets = true, radiusScale = 1) {
    const projectedPoints = phaseGroups
      .map((group) => {
        const xy = projection([group.longitude, group.latitude]);
        if (!xy) return { ...group, xy };

        const offset = useOffsets ? countryOffset(group.country) : [0, 0];
        return {
          ...group,
          xy: [xy[0] + offset[0], xy[1] + offset[1]],
        };
      })
      .filter((group) => group.xy && Number.isFinite(group.xy[0]) && Number.isFinite(group.xy[1]));

    // Each site is a pale disc whose size shows all announced capacity at the site. The share included in
    // the selection is a darker sector from twelve o'clock. The disc does not change with the selection, so
    // positions stay put and only the sector grows or shrinks. A site without a stated size is a small dashed ring.
    // A small nudge only. Circles may still overlap. Smaller circles are drawn on top.
    const sized = projectedPoints.map((group) => {
      const value = siteValue(group, measure);
      const total = siteTotal(group, measure);
      return { ...group, site_value: value, site_total: total, no_size: !(total > 0),
        radius: siteRadius(total, measure) * radiusScale };
    });
    const points = resolvePhaseOverlaps(sized, width, height, { minPadding: 1, maxShift: 9, overlap: 1 })
      .sort((a, b) => b.radius - a.radius);
    const tabLabel = TABS.find((item) => item.id === tab).label;
    // The first drawing is immediate. Later changes of selection are animated.
    const duration = phaseG.attr("data-drawn") && !prefersReducedMotion() ? 520 : 0;
    phaseG.attr("data-drawn", "true");

    const groups = phaseG
      .selectAll("g.dc-phase-point")
      .data(points, (d) => d.key)
      .join(
        (enter) => {
          const g = enter.append("g").attr("class", "dc-phase-point").attr("tabindex", 0).attr("role", "button");
          g.append("line").attr("class", "dc-phase-anchor");
          g.append("circle").attr("class", "dc-phase-hit").attr("fill", "transparent").attr("aria-hidden", "true");
          g.append("circle").attr("class", "dc-phase-disc").attr("r", 0);
          g.append("path").attr("class", "dc-phase-share").style("fill", "var(--dc-blue)").style("fill-opacity", 0.8);
          return g;
        },
        (update) => update,
        (exit) => exit.remove()
      );

    const statusText = (d) => {
      if (d.no_size) return "No stated size";
      if (!(d.site_value > 0)) return `${siteAmount(d.site_total, measure)} announced, none in ${tabLabel}`;
      if (d.site_value >= d.site_total - 1e-6) return `${siteAmount(d.site_total, measure)} in ${tabLabel}`;
      return `${siteAmount(d.site_value, measure)} of ${siteAmount(d.site_total, measure)} in ${tabLabel}`;
    };

    // Hover: a copy of the site with a soft ring is drawn in a layer on top, with a short label.
    // The circles themselves never change order, so moving the pointer across a cluster does not
    // redraw the map. The styles are set inline so the layer also looks right while an older
    // stylesheet is cached.
    const hover = phaseG.selectAll("g.dc-hover-layer").data([null]).join((enter) => {
      const g = enter.append("g").attr("class", "dc-hover-layer").attr("pointer-events", "none").attr("aria-hidden", "true").style("opacity", 0);
      g.append("circle").attr("class", "dc-hover-halo").style("fill", "var(--dc-blue)").style("fill-opacity", 0.2).style("stroke", "none");
      g.append("circle").attr("class", "dc-hover-disc");
      g.append("path").attr("class", "dc-hover-share").style("fill", "var(--dc-blue)").style("fill-opacity", 0.9);
      return g;
    });
    const tipHost = d3.select(popupG.node().parentNode);
    const tip = tipHost.selectAll("div.dc-site-tip").data([null]).join("div").attr("class", "dc-site-tip").attr("aria-hidden", "true").style("opacity", 0);
    function hideHover() { hover.style("opacity", 0); tip.style("opacity", 0); }
    function showHover(event, d) {
      hover.attr("transform", `translate(${d.xy[0]},${d.xy[1]})`).style("opacity", 1);
      hover.select(".dc-hover-halo").attr("r", d.radius + Math.max(3.5, d.radius * 0.3));
      styleDisc(hover.select(".dc-hover-disc").attr("r", d.radius), d.no_size, 0.35);
      hover.select(".dc-hover-share").attr("d", sharePath(d.radius, siteShare(d)));
      tip.html("");
      tip.append("strong").text(d.municipality);
      tip.append("span").text(`${statusText(d)}${d.project_count > 1 ? ` · ${d.project_count} projects` : ""}`);
      const box = event.currentTarget.querySelector(".dc-phase-hit").getBoundingClientRect();
      const node = tip.node();
      const above = box.top - node.offsetHeight - 6 > 8;
      const left = Math.min(global.innerWidth - node.offsetWidth - 8, Math.max(8, box.left + box.width / 2 - node.offsetWidth / 2));
      tip.style("left", `${left}px`).style("top", `${above ? box.top - node.offsetHeight - 6 : box.bottom + 6}px`).style("opacity", 1);
    }

    groups
      .classed("scenario-active", (d) => d.scenario_state === "active")
      .classed("scenario-mixed", (d) => d.scenario_state === "mixed")
      .classed("scenario-inactive", (d) => d.scenario_state === "inactive")
      .classed("selection-active", (d) => d.site_value > 0)
      .classed("selection-inactive", (d) => !(d.site_value > 0))
      .classed("hq-match", (d) => d.hq_match_count > 0)
      .classed("hq-partial", (d) => d.hq_match_count > 0 && d.hq_match_count < d.project_count)
      .attr("data-hq-matches", (d) => d.hq_match_count)
      .attr("data-project-count", (d) => d.project_count)
      .attr("data-project-ids", (d) => d.phases.map((project) => project.project_id).join(" "))
      .attr("data-unknown-count", (d) => d.unknown_count)
      .attr("data-selected-count", (d) => d.selected_count)
      .attr("aria-label", (d) => `${d.municipality}, ${d.project_count} project${d.project_count === 1 ? "" : "s"}: ${statusText(d)}`)
      .on("click", function (event, d) {
        event.stopPropagation();
        hideHover();
        showPhasePopup(popupG, d, width, height, measure, tab, event);
      })
      .on("keydown", function (event, d) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          showPhasePopup(popupG, d, width, height, measure, tab, event);
        }
      })
      .on("mouseenter.hover focus.hover", showHover)
      .on("mouseleave.hover blur.hover", hideHover);
    groups.transition().duration(duration).ease(d3.easeCubicInOut).attr("transform", (d) => `translate(${d.xy[0]},${d.xy[1]})`);

    groups
      .select("line.dc-phase-anchor")
      .attr("x1", (d) => d.anchorX - d.xy[0])
      .attr("y1", (d) => d.anchorY - d.xy[1])
      .attr("x2", 0)
      .attr("y2", 0)
      .attr("opacity", (d) => (d.hasOffset ? 1 : 0));

    groups.order();
    hover.raise();
    groups.select("circle.dc-phase-disc").each(function (d) { styleDisc(d3.select(this), d.no_size, 0.25); })
      .transition().duration(duration).ease(d3.easeCubicInOut)
      .attr("r", (d) => d.radius);
    // The sector sweeps from its current angle and size to the new ones. The state is kept on each frame,
    // so an interrupted change continues from where it was.
    groups.select("path.dc-phase-share")
      .transition().duration(duration).ease(d3.easeCubicInOut)
      .attrTween("d", function (d) {
        const from = this.__share || { r: d.radius, share: 0 };
        const to = { r: d.no_size ? 0 : d.radius, share: siteShare(d) };
        const r = d3.interpolate(from.r, to.r), share = d3.interpolate(from.share, to.share);
        return (t) => {
          this.__share = { r: r(t), share: share(t) };
          return sharePath(this.__share.r, this.__share.share);
        };
      });
    // The click area covers the whole outline. Smaller sites lie on top, so they stay clickable in clusters.
    groups.select("circle.dc-phase-hit").attr("r", (d) => Math.max(d.no_size ? 4.5 : 7, d.radius + 2));
    hideHover();
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

  // Reference circles side by side, bottom-aligned, with the value below each.
  // k is the number of screen pixels per map unit, so the key matches the circles it explains.
  function drawSizeKey(container, measure, k) {
    const scale = SITE_SCALE[measure];
    const format = (value) => value.toLocaleString("en-US", { maximumFractionDigits: 2 });
    const radii = scale.keys.map((value) => siteRadius(value, measure) * k);
    const gap = 14, labelHeight = 16;
    const h = Math.max(...radii) * 2 + labelHeight + 4;
    let x = 2;
    const svg = container.append("svg").attr("class", "dc-site-key-sizes").attr("height", h).attr("aria-hidden", true);
    scale.keys.forEach((value, i) => {
      const r = radii[i], slot = Math.max(r * 2, 44);
      const cx = x + slot / 2;
      svg.append("circle").attr("cx", cx).attr("cy", h - labelHeight - r - 2).attr("r", r)
        .style("fill", "var(--dc-blue)").style("fill-opacity", 0.8).style("stroke", "#fbf8f0").style("stroke-width", 0.8);
      svg.append("text").attr("x", cx).attr("y", h - 3).attr("text-anchor", "middle").text(`${format(value)} ${scale.unit}`);
      x += slot + gap;
    });
    svg.attr("width", x - gap + 2);
    return svg;
  }

  // The share symbol and the no-size ring, after the size key. The same for every selection.
  // Each symbol's label sits on the same baseline as the size labels, with the symbol in front of it.
  // Each item is a separate SVG so it can wrap to its own line on a narrow screen.
  // The row is bottom-aligned, so the baselines match.
  function drawSymbolKey(container, k) {
    const item = (drawSymbol, symbolWidth, text) => {
      const h = 20;
      const svg = container.append("svg").attr("class", "dc-site-key-sizes dc-site-key-item").attr("height", h).attr("aria-hidden", true);
      drawSymbol(svg.append("g").attr("transform", `translate(${symbolWidth / 2 + 1},${h - 3 - 3.8})`));
      const label = svg.append("text").attr("x", symbolWidth + 7).attr("y", h - 3).text(text);
      const w = Math.ceil(label.node().getComputedTextLength ? label.node().getComputedTextLength() : 200);
      svg.attr("width", symbolWidth + 9 + w);
    };
    item((g) => {
      styleDisc(g.append("circle").attr("r", 7), false, 0.25);
      g.append("path").attr("d", sharePath(7, 0.4)).style("fill", "var(--dc-blue)").style("fill-opacity", 0.8);
    }, 14, "Dark part: included in the selection");
    const ring = SITE_RING_RADIUS * k;
    item((g) => g.append("circle").attr("r", ring).style("fill", "none").style("stroke", "#8b969c").style("stroke-width", 0.9).style("stroke-dasharray", "1.5 1.2"),
      2 * ring, "No stated size");
  }

  function renderMapLegend(root, measure, tab = DEFAULT_TAB) {
    const legend = root.selectAll(".dc-map-scale").data([null]).join("div").attr("class", "dc-map-scale dc-site-key");
    legend.selectAll("*").remove();
    // The map is drawn in a 760-unit viewBox and scaled to the page. The key uses the same scale.
    const mapSvg = root.select(".dc-scenario-svg").node();
    const k = mapSvg && mapSvg.getBoundingClientRect().width ? mapSvg.getBoundingClientRect().width / 760 : 1;
    drawSizeKey(legend, measure, k);
    drawSymbolKey(legend, k);
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

  // One plain sentence with the main figure for the current tab, measure and HQ selection.
  // What a circle on the map shows, for the current selection. It is the text above the map.
  function circleText(tab = DEFAULT_TAB, measure = DEFAULT_MEASURE, hq = "none") {
    const label = TABS.find((item) => item.id === tab).label;
    const hqText = hq === "none" ? "" : ` from developers headquartered ${{ domestic: "in the project's own country", other_europe: "elsewhere in Europe", outside_europe: "outside Europe" }[hq]}`;
    const use = measure === "mw" ? "" : "the yearly electricity use, once fully built, of ";
    const size = `Each circle is one site. Its size shows ${use}all announced capacity at the site${hqText}, at the high end of the range.`;
    return tab === "announced" ? size : `${size} The dark part is the share included in ${label}.`;
  }


  function renderClassList(root, view, onZoneClick, onHighlight, data) {
    const selected = TABS.find((item) => item.id === view.tab).classes;
    // The scale is set by everything announced, so it stays the same when the selection changes and bars grow or shrink.
    const scaleRows = [...Object.entries(view.zones).filter(([id]) => !id.endsWith("-unassigned")).map(([, zone]) => zone), ...Object.values(view.countries)];
    const maximum = Math.max(0, ...scaleRows.map(row => row.classes.reduce((v, layer) => v + layer.high, 0)));
    const divisor = view.measure === "mw" ? 1000 : 1;
    const scale = d3.scaleLinear().domain([0, maximum / divisor || 1]).nice(4).range([0, 100]);
    const percent = (value) => scale(value / divisor);
    const ticks = scale.ticks(4);
    const unit = view.measure === "mw" ? "GW" : "TWh/year";
    const tabLabel = TABS.find((item) => item.id === view.tab).label;
    // Rows are kept between renders, so CSS transitions can grow and shrink the bars when the selection changes.
    const list = root.selectAll(".dc-zone-class-list").data([null]).join("div").attr("class", "dc-zone-class-list")
      .attr("aria-label", `Capacity included in ${tabLabel} by bidding zone`);
    list.style("--dc-grid-step", `${scale(ticks[1]) - scale(ticks[0])}%`);
    const heading = list.selectAll(".dc-class-chart-heading").data([null]).join("div").attr("class", "dc-class-chart-heading");
    heading.selectAll("span").data(["Bidding zone", `Included capacity · ${unit}`, `Low–high · ${unit}`]).join("span").text((d) => d);
    const sections = list.selectAll("section.dc-country-classes").data(Object.keys(view.countries), (d) => d).join((enter) => {
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
        row.select(".dc-zone-class-name").text((zone === country && country !== "FI" ? "Σ Total" : zone));
        // Only the stages counted in the selection get a width. Colours are set inline because the site's CSS purge
        // cannot see class names built at run time.
        row.select(".dc-zone-class-bar").selectAll("span.dc-class-segment").data(detail.classes, (layer) => layer.evidence_class)
          .join("span").attr("class", "dc-class-segment")
          .style("background", (layer) => `var(--dc-class-${layer.evidence_class})`)
          .style("width", (layer) => `${selected.includes(layer.evidence_class) ? percent(layer.high) : 0}%`);
        row.select(".dc-zone-class-range").classed("dc-zone-class-range-empty", !(detail.high > 0))
          .style("left", `${percent(detail.low || 0)}%`).style("width", `${Math.max(0, percent(detail.high || 0) - percent(detail.low || 0))}%`);
        // The unit is in the column heading, so the rows show numbers only.
        row.select(".dc-zone-class-value").text(detail.high > 0 ? label.replace(` ${unit}`, "") : "0");
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
      .text(`The bars show the capacity included in ${tabLabel}, coloured by stage. Their length is the high value. The thin line and the figures on the right give the range from low to high.`);
  }

  // Finds a spot inside a zone for its label, as far as possible from the circles.
  // Candidates lie on a grid over the zone. The whole label box must fit inside the zone when possible.
  // If no spot inside is clear of circles, the label moves outside the zone with a line to it.
  // Both sides are tried. The chosen side keeps the label off land and off labels already placed.
  function focusLabelPosition(feature, box, focusPath, projection, circles, onLand, placed, screenWidth = Infinity) {
    const [[x0, y0], [x1, y1]] = focusPath.bounds(feature);
    const inside = (x, y) => { const p = projection.invert([x, y]); return p ? d3.geoContains(feature, p) : false; };
    const centroid = focusPath.centroid(feature);
    const hw = box.width / 2 + 3, top = box.y - 3, bottom = box.y + box.height + 3;
    const step = Math.max(x1 - x0, y1 - y0) / 28;
    let best = null;
    for (let x = x0 + step / 2; x < x1; x += step) {
      for (let y = y0 + step / 2; y < y1; y += step) {
        if (!inside(x, y)) continue;
        const corners = [[x - hw, y + top], [x + hw, y + top], [x - hw, y + bottom], [x + hw, y + bottom]];
        const fits = corners.every(([cx, cy]) => inside(cx, cy));
        let clearance = 60;
        for (const c of circles) {
          const dx = Math.max(x - hw - c.x, 0, c.x - (x + hw));
          const dy = Math.max(y + top - c.y, 0, c.y - (y + bottom));
          clearance = Math.min(clearance, Math.hypot(dx, dy) - c.r);
        }
        const score = (fits ? 1000 : 0) + Math.min(clearance, 24) - Math.hypot(x - centroid[0], y - centroid[1]) * 0.02;
        if (!best || score > best.score) best = { score, x, y, fits, clearance };
      }
    }
    if (best && best.fits && best.clearance >= 2) {
      const spot = { x: best.x, y: best.y, anchor: "middle", rect: [best.x - hw, best.y + top, best.x + hw, best.y + bottom] };
      placed.push(spot.rect);
      return spot;
    }
    const target = best ? [best.x, best.y] : centroid;
    const w = box.width + 6;
    // Each side is tried at a few distances, so the label can clear circles that reach past the coast.
    const hitsCircle = (rect) => circles.some((c) => {
      const dx = Math.max(rect[0] - c.x, 0, c.x - rect[2]), dy = Math.max(rect[1] - c.y, 0, c.y - rect[3]);
      return Math.hypot(dx, dy) < c.r + 3;
    });
    const options = [-1, 1].flatMap((side) => [16, 40, 70].map((gap) => {
      const x = side < 0 ? x0 - gap : x1 + gap;
      const rect = side < 0 ? [x - w, target[1] + top, x, target[1] + bottom] : [x, target[1] + top, x + w, target[1] + bottom];
      const samples = [];
      for (let i = 0; i <= 4; i += 1) for (const yy of [rect[1], (rect[1] + rect[3]) / 2, rect[3]]) samples.push([rect[0] + (i / 4) * (rect[2] - rect[0]), yy]);
      const land = samples.filter(([sx, sy]) => onLand(sx, sy)).length;
      const clash = placed.some((r) => !(rect[2] < r[0] || rect[0] > r[2] || rect[3] < r[1] || rect[1] > r[3]));
      const offscreen = rect[0] < 4 || rect[2] > screenWidth - 4;
      return { side, x, rect, cost: (offscreen ? 1000 : 0) + land * 10 + (clash ? 100 : 0) + (hitsCircle(rect) ? 50 : 0) + Math.abs(x - target[0]) * 0.05 };
    }));
    const pick = options.sort((a, b) => a.cost - b.cost)[0];
    // On a narrow screen there may be no room beside the country. The label then stays inside the zone.
    if (pick.cost >= 1000 && best) {
      const rect = [best.x - hw, best.y + top, best.x + hw, best.y + bottom];
      placed.push(rect);
      return { x: best.x, y: best.y, anchor: "middle", rect };
    }
    placed.push(pick.rect);
    return { x: pick.x, y: target[1], anchor: pick.side < 0 ? "end" : "start", line: [pick.x - pick.side * 4, target[1], target[0], target[1]] };
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
      .on("click", (event, d) => openCountry(d.properties.country, d.properties.bidding_zone))
      .on("keydown", (event, d) => {if (event.key === "Enter" || event.key === " ") {event.preventDefault();openCountry(d.properties.country, d.properties.bidding_zone);}});
    renderZoneLabels(zoneLabelG, geojson, path, projection);

    // Country focus: the clicked country is redrawn to fill the window, over a blurred page.
    // The focus SVG uses one unit per screen pixel. Circles are scaled to the same pixel size
    // as in the main map, so the size key still applies.
    const focus = root.append("div").attr("class", "dc-focus").attr("hidden", true).attr("role", "dialog");
    const focusTitle = focus.append("div").attr("class", "dc-focus-title");
    focus.append("button").attr("type", "button").attr("class", "dc-focus-close").attr("aria-label", "Close country view").text("×")
      .on("click", (event) => { event.stopPropagation(); closeCountry(); });
    const focusSvg = focus.append("svg").attr("class", "dc-focus-svg");
    const focusG = focusSvg.append("g").attr("class", "dc-focus-country");
    let focusCountry = null;
    const reduceMotion = () => global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // A click anywhere outside the country closes the view. Clicks on the main map are the ones that open it.
    const closeOnOutsideClick = (event) => {
      if (!focusCountry || event.target.closest(".dc-focus-country, .dc-project-popup, .dc-focus-title, .dc-scenario-svg")) return;
      closeCountry();
    };
    global.document.addEventListener("click", closeOnOutsideClick);
    const onResize = () => { if (focusCountry) drawCountry(focusCountry.country, focusCountry.zone, false); };
    global.addEventListener("resize", onResize);
    // Screen pixels per map unit in the main map.
    const mainScale = () => { const rect = svg.node().getBoundingClientRect(); return { k: rect.width / width, left: rect.left, top: rect.top }; };
    // The top margin leaves room for the country name and the key. It grows if the key wraps.
    let focusTop = 112;
    function focusSetup(country, top = focusTop) {
      const W = global.innerWidth, H = global.innerHeight;
      const features = geojson.features.filter((f) => f.properties.country === country);
      const collection = { type: "FeatureCollection", features };
      const margin = W < 600 ? 16 : 48;
      const focusProjection = d3.geoMercator().fitExtent([[margin, top], [W - margin, H - margin]], collection);
      return { W, H, features, collection, focusProjection, focusPath: d3.geoPath(focusProjection) };
    }
    // Circles grow with the square root of the enlargement, at most 1.8 times their size in the main map.
    function focusRadiusScale(setup) {
      const main = mainScale();
      const mainBounds = setup.features.map((f) => translatedBounds(f, path));
      const mainWidth = main.k * (d3.max(mainBounds, (b) => b[1][0]) - d3.min(mainBounds, (b) => b[0][0]));
      const focusBounds = setup.focusPath.bounds(setup.collection);
      return main.k * Math.max(1, Math.min(1.8, Math.sqrt((focusBounds[1][0] - focusBounds[0][0]) / mainWidth)));
    }
    // Places the large drawing over the country's position in the main map, so it can grow from there.
    function countryStartTransform(focusPath, features) {
      const target = focusPath.bounds({ type: "FeatureCollection", features });
      const main = mainScale();
      const bounds = features.map((f) => translatedBounds(f, path));
      const x0 = main.left + main.k * d3.min(bounds, (b) => b[0][0]), y0 = main.top + main.k * d3.min(bounds, (b) => b[0][1]);
      const x1 = main.left + main.k * d3.max(bounds, (b) => b[1][0]);
      const k = (x1 - x0) / (target[1][0] - target[0][0]);
      return `translate(${x0 - k * target[0][0]},${y0 - k * target[0][1]}) scale(${k})`;
    }
    function drawCountry(country, zone, animate) {
      const view = trackerView(data, tab, measure, hq);
      const drawHeader = (radiusScale) => {
        focusTitle.html("");
        const name = focusTitle.append("div").attr("class", "dc-focus-name");
        name.append("strong").text(countryLabel(country));
        name.append("span").text(zoneValueLabel(view.countries[country], measure));
        const focusKey = focusTitle.append("div").attr("class", "dc-focus-key");
        drawSizeKey(focusKey, measure, radiusScale);
        drawSymbolKey(focusKey, radiusScale);
      };
      // The header is drawn first. If it is taller than the default margin, the country starts below it.
      let setup = focusSetup(country, 112);
      let radiusScale = focusRadiusScale(setup);
      drawHeader(radiusScale);
      const headerBottom = Math.ceil(focusTitle.node().getBoundingClientRect().bottom) + 16;
      focusTop = Math.max(112, headerBottom);
      if (focusTop > 112) {
        setup = focusSetup(country, focusTop);
        radiusScale = focusRadiusScale(setup);
        drawHeader(radiusScale);
      }
      const { W, H, features, collection, focusProjection, focusPath } = setup;
      focusSvg.attr("viewBox", `0 0 ${W} ${H}`);
      focusG.selectAll("*").remove();
      focusG.append("g").selectAll("path").data(features).join("path").attr("class", "dc-zone dc-focus-zone")
        .attr("d", focusPath).attr("fill", "var(--dc-land)").attr("tabindex", 0).attr("role", "button")
        .attr("aria-label", (d) => `${d.properties.bidding_zone}: ${capacityLabel(view.zones[d.properties.bidding_zone], measure)}`)
        .on("click", (event, d) => { event.stopPropagation(); openZone(d.properties.bidding_zone, event); });
      const labelLayer = focusG.append("g").attr("class", "dc-focus-labels");
      const phases = focusG.append("g").attr("class", "dc-phase-layer");
      const groups = highlightGroups(buildPhaseGroups(trackerView(data, tab, measure), data), hq).filter((g) => g.country === country);
      renderPhaseLayer(phases, popup, groups, focusProjection, W, H, measure, tab, false, radiusScale);
      const circles = phases.selectAll("g.dc-phase-point").data().map((d) => ({ x: d.xy[0], y: d.xy[1], r: d.radius }));
      const labels = labelLayer.selectAll("text").data(features).join("text")
        .attr("class", "dc-focus-zone-label").attr("text-anchor", "middle");
      labels.append("tspan").attr("class", "dc-zone-label-name").attr("x", 0).attr("dy", "-0.2em").text((d) => d.properties.bidding_zone);
      labels.append("tspan").attr("class", "dc-zone-label-value").attr("x", 0).attr("dy", "1.2em").text((d) => zoneValueLabel(view.zones[d.properties.bidding_zone], measure));
      const onLand = (x, y) => { const p = focusProjection.invert([x, y]); return p ? features.some((f) => d3.geoContains(f, p)) : false; };
      const placed = [];
      labels.each(function (d) {
        const spot = focusLabelPosition(d, this.getBBox(), focusPath, focusProjection, circles, onLand, placed, W);
        d3.select(this).attr("transform", `translate(${spot.x},${spot.y})`).attr("text-anchor", spot.anchor);
        if (spot.line) labelLayer.insert("line", "text").attr("class", "dc-zone-label-line")
          .attr("x1", spot.line[0]).attr("y1", spot.line[1]).attr("x2", spot.line[2]).attr("y2", spot.line[3]);
      });
      focus.attr("aria-label", `${countryLabel(country)}, ${TABS.find((t) => t.id === tab).label}`);
      if (!animate) return;
      const start = countryStartTransform(focusPath, features);
      const duration = reduceMotion() ? 0 : 520;
      focus.classed("dc-focus-open", false);
      focusG.attr("transform", start);
      phases.style("opacity", 0);
      labels.style("opacity", 0);
      focus.node().offsetWidth;
      focus.classed("dc-focus-open", true);
      focusG.transition().duration(duration).ease(d3.easeCubicOut).attr("transform", "translate(0,0) scale(1)");
      phases.transition().delay(duration * 0.55).duration(duration * 0.6).style("opacity", 1);
      labels.transition().delay(duration * 0.55).duration(duration * 0.6).style("opacity", 1);
    }
    function openCountry(country, zone) {
      popup.attr("hidden", true);
      focusCountry = { country, zone };
      focus.attr("hidden", null);
      drawCountry(country, zone, true);
      focus.select(".dc-focus-close").node().focus({ preventScroll: true });
    }
    function closeCountry() {
      if (!focusCountry) return;
      const { country } = focusCountry;
      focusCountry = null;
      popup.attr("hidden", true);
      const { features, focusPath } = focusSetup(country);
      const duration = reduceMotion() ? 0 : 380;
      focusG.selectAll(".dc-phase-layer, .dc-focus-labels").transition().duration(duration * 0.4).style("opacity", 0);
      focus.classed("dc-focus-open", false);
      focusG.transition().duration(duration).ease(d3.easeCubicIn).attr("transform", countryStartTransform(focusPath, features))
        .on("end", () => { if (!focusCountry) focus.attr("hidden", true); });
    }
    function highlightZone(zone, active) {
      svg.selectAll(".dc-zone").filter(d => ["NO", "SE", "DK"].includes(zone) ? d.properties.country === zone : d.properties.bidding_zone === zone).classed("highlight", active);
    }
    function openZone(zone, event) {
      const selected = trackerView(data, tab, measure, hq);
      const countryTotal = ["NO", "SE", "DK"].includes(zone);
      showPhasePopup(popup, {zone: countryTotal ? "" : zone, municipality: countryTotal ? countryLabel(zone) : "", country: zone.slice(0, 2), phases: selected.rows.filter((row) => countryTotal ? row.country === zone : row.bidding_zone === zone)}, width, height, measure, tab, event);
    }
    global.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!popup.attr("hidden")) popup.attr("hidden", true);
      else closeCountry();
    });
    root.on("click.close-popup", (event) => {if (!event.target.closest(".dc-phase-point, .dc-zone, .dc-zone-class-row, .dc-project-popup")) popup.attr("hidden", true);});
    let zoneBody = null;
    function render() {
      popup.attr("hidden", true);
      zonePaths.classed("highlight", false);
      const view = trackerView(data, tab, measure, hq);
      root.attr("data-measure", measure).attr("data-tab", tab).attr("data-hq", hq);
      svg.attr("aria-label", `Planned datacenter sites: ${TABS.find((t) => t.id === tab).label}`);
      updateZoneLabelValues(zoneLabelG, view, measure);
      zonePaths.attr("fill", "var(--dc-land)")
        .attr("aria-label", (d) => `${d.properties.bidding_zone}: ${capacityLabel(view.zones[d.properties.bidding_zone], measure)}`);
      const groups = highlightGroups(buildPhaseGroups(trackerView(data, tab, measure), data), hq);
      renderPhaseLayer(phaseG, popup, groups, projection, width, height, measure, tab);
      root.classed("dc-hq-highlighting", hq !== "none");
      // The text above the map says what a circle shows.
      renderMapLegend(root, measure, tab);
      const variants = TABS.flatMap((item) => ["mw", "twh"].map((m) => ({ key: `${item.id}:${m}`, text: circleText(item.id, m, hq) })));
      headlineNode.selectAll("p").data(variants, (d) => d.key).join("p").text((d) => d.text)
        .classed("dc-map-headline-current", (d) => d.key === `${tab}:${measure}`)
        .attr("aria-hidden", (d) => (d.key === `${tab}:${measure}` ? null : "true"));
      // The values per bidding zone and stage sit in a collapsed section under the map.
      if (!zoneBody) {
        const details = root.append("details").attr("class", "dc-zone-details");
        details.append("summary").text("Breakdown by bidding zone and stage");
        zoneBody = details.append("div").attr("class", "dc-zone-details-body");
      }
      renderClassList(zoneBody, view, openZone, highlightZone, data);
      if (focusCountry) drawCountry(focusCountry.country, focusCountry.zone, false);
    }
    const unsubscribe = shared.subscribe(state => { tab = state.family;measure = state.measure;hq = state.hq;render(); });
    return { disconnect() {unsubscribe();global.document.removeEventListener("click", closeOnOutsideClick);global.removeEventListener("resize", onResize);root.selectAll("*").remove();} };
  }
  const api = { mount, mountControls, matchesHq, gwRange, highlightGroups, mapState, mapRows, projectClasses, trackerView, capacityLabel, circleText, consumptionFor, shareLabel, CLASSES, CLASS_LABELS, CLASS_TEXT, TABS, DEFAULT_MEASURE };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.DCTrackerMap = api;
})(typeof window === "undefined" ? globalThis : window);

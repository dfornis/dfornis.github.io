/* Original tracker map layout, supplied with precomputed project results. */

(function (global) {
  const DEFAULT_TAB = "announced";
  const DEFAULT_MEASURE = "twh";
  const MOBILE_SITE_SCALE = 1.4;
  const MEASURES = [
    { id: "twh", label: "Annual electricity", shortLabel: "TWh", unit: "TWh/year", field: "annual_twh" },
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
  const SITE_MAX_RADIUS = 15;
  // The included part of a site is a solid dark blue disc with a light edge, so sites in a cluster stay apart.
  const SITE_FILL = "var(--dc-site)";
  const SITE_EDGE = "var(--dc-site-edge)";
  const styleShare = (sel, width = 1.1) => sel.style("fill", SITE_FILL).style("fill-opacity", 1).style("stroke", SITE_EDGE).style("stroke-width", width);
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
  // Same format as the stage rows in the project card and the rest of the page.
  function siteAmount(value, measure) {
    return capacityLabel({ low: value, high: value }, measure);
  }
  // The part of a site that is included in the selection is a blue disc from the centre. Its size follows the
  // same scale as the grey circle and the size key, so a blue disc can be read on its own.
  const circlePath = (r) => (r > 0 ? `M${-r},0A${r},${r} 0 1,0 ${r},0A${r},${r} 0 1,0 ${-r},0Z` : "");
  // A short line on how much of a site is included in the selection, at the high end of the range.
  // Used by the hover label and the project card.
  function siteStatusText(group, measure, tabLabel) {
    const value = siteValue(group, measure), total = siteTotal(group, measure);
    const where = `in ${tabLabel}`;
    if (!(total > 0)) return "No stated size";
    if (!(value > 0)) return `${siteAmount(total, measure)} ${measure === "mw" ? "announced" : "estimated"}, none ${where}`;
    if (value >= total - 1e-6) return `${siteAmount(total, measure)} ${where}`;
    return `${siteAmount(value, measure)} of ${siteAmount(total, measure)} ${where}`;
  }
  // A ring shows all announced capacity at the site, and the blue disc inside it the part included in the selection.
  // A site with nothing included keeps its ring in grey. A site without a stated size is a small dashed ring.
  const RING_EMPTY = "#8b969c";
  const RING_NO_SIZE = "#8b969c";
  function styleRing(sel, d) {
    const noSize = d.no_size, empty = !noSize && d.empty;
    // A ring with a disc inside has a faint fill in the same blue. A ring with nothing inside is a grey outline only.
    return sel.style("fill", noSize || empty ? "none" : SITE_FILL).style("fill-opacity", noSize || empty ? 0 : 0.1)
      .style("stroke", noSize ? RING_NO_SIZE : empty ? RING_EMPTY : SITE_FILL)
      .style("stroke-opacity", noSize ? 1 : empty ? 0.55 : 0.45)
      .style("stroke-width", noSize ? 0.9 : 0.7).style("stroke-dasharray", noSize ? "1.5 1.2" : null);
  }
  const innerRadius = (d) => (d.no_size || !(d.site_value > 0) ? 0 : d.inner);
  const prefersReducedMotion = () => typeof global.matchMedia === "function" && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function siteValue(group, measure) {
    const field = measure === "mw" ? "mw_high" : "annual_twh_high";
    return group.phases.filter((p) => p.participates && (!group.hq_mode || group.hq_mode === "none" || matchesHq(p, group.hq_mode)))
      .reduce((total, p) => total + (p[field] || 0), 0);
  }

  const COUNTRY_OFFSETS = { NO: [0, 0], SE: [0, 0], FI: [0, 0], DK: [0, 0] };
  const ZONE_ANCHORS = {
    NO1: [10.4, 60.9], NO2: [7.9, 58.95], NO3: [10.6, 63.4], NO4: [14.6, 66.9], NO5: [6.6, 60.7],
    SE1: [20.3, 66.9], SE2: [16.2, 63.1], SE3: [14.6, 58.7], SE4: [13.9, 56.1],
    FI: [27.0, 64.2], DK1: [9.1, 56.25], DK2: [11.8, 55.45],
  };

  function num(value) {
    return value === null || value === undefined || value === "" ? null : Number.isFinite(Number(value)) ? Number(value) : null;
  }

  const CLASSES = ["confirmed", "dated_plan", "campus_continuation", "undated_announcement"];
  const CLASS_LABELS = ["Confirmed", "Dated plan", "Further campus plans", "Undated plan"];
  const CLASS_TEXT = [
    "Investment decision taken or construction started.",
    "No investment decision yet. The developer or a public document gives a date.",
    "Undated capacity at a campus where a phase is under construction or has an investment decision.",
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
  // year, when given, is a Map from project ID to that project's modelled row for one year in timeline.json.
  // The selection then counts capacity in operation in that year instead of the size at full build-out.
  function trackerView(data, tab = DEFAULT_TAB, measure = DEFAULT_MEASURE, hq = "none", type = "all", year = null) {
    const selectedType = Array.isArray(type) ? type : typeof type === "string" && type !== "all" ? [type] : [];
    const selected = TABS.find((item) => item.id === tab).classes;
    const values = projectClasses(data);
    const unknown = new Set(data.coverage.projects_without_mw);
    const metadata = new Map(data.project_scenarios.map((row) => [row.project_id, row]));
    const rows = data.projects.filter((project) => (hq === "none" || matchesHq(project, hq)) && matchesType(project, selectedType)).map((project) => {
      const classes = values.filter((row) => row.project_id === project.project_id);
      const chosen = classes.filter((row) => selected.includes(row.evidence_class));
      const sum = (key) => chosen.reduce((total, row) => total + row[key], 0);
      const modelled = year ? year.get(project.project_id) : null;
      const amounts = year
        ? { mw_low: modelled?.mw_low || 0, mw_high: modelled?.mw_high || 0, annual_twh_low: modelled?.annual_twh_low || 0, annual_twh_high: modelled?.annual_twh_high || 0 }
        : { mw_low: sum("mw_low"), mw_high: sum("mw_high"), annual_twh_low: sum("twh_low"), annual_twh_high: sum("twh_high") };
      return { ...project, bidding_zone: metadata.get(project.project_id).bidding_zone, classes, ...amounts,
        capacity_known: !unknown.has(project.project_id), participates: year ? amounts.mw_high > 0 : chosen.some((row) => row.mw_high > 0),
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
    return { tab, measure, hq, type: selectedType, rows, zones, countries, totals: summarize(rows) };
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

  function matchesType(project, type) {
    const selected = Array.isArray(type) ? type : typeof type === "string" && type !== "all" ? [type] : [];
    return !selected.length || selected.some((tag) => splitTags(project?.type).includes(tag));
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

  function translatedBounds(feature, path) {
    const bounds = path.bounds(feature);
    const offset = countryOffset(feature.properties.country);
    return [
      [bounds[0][0] + offset[0], bounds[0][1] + offset[1]],
      [bounds[1][0] + offset[0], bounds[1][1] + offset[1]],
    ];
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

  // Short descriptions of the project types, in order of how many projects have each type.
  const TYPE_INFO_INTRO = "Types follow how the sources describe each project. A project can have several types. Choosing several types shows projects that match any of them.";
  const TYPE_INFO = [
    { id: "hyperscale", label: "Hyperscale", text: "A large platform uses the site, or the site is planned for hyperscale services." },
    { id: "colocation", label: "Colocation", text: "Customers rent space for their IT equipment, from racks to an entire building or campus." },
    { id: "enterprise", label: "Enterprise", text: "An organisation operates the facility for its own computing." },
    { id: "AI/HPC", label: "AI/HPC", text: "The site hosts, plans or advertises AI or high-performance computing." },
  ];
  // Opens or closes the type descriptions. The box is kept inside the window on a narrow screen.
  function toggleTypeInfo(control, open) {
    const info = control.select(".dc-type-info");
    const show = open ?? info.attr("hidden") !== null;
    control.select(".dc-info-button").attr("aria-expanded", String(show));
    if (!show) { info.attr("hidden", true); return; }
    const menu = control.select(".dc-type-menu").node();
    if (menu) menu.open = false;
    info.attr("hidden", null).style("left", "0px");
    const rect = info.node().getBoundingClientRect();
    const shift = Math.min(0, global.innerWidth - 12 - rect.right) + Math.max(0, 12 - rect.left);
    info.style("left", `${shift}px`);
  }
  // idPrefix keeps element ids unique when the controls appear twice, on the page and in the enlarged country view.
  function renderControls(container, scenarios, activeScenario, onScenarioChange, onMeasureChange, onHighlightChange, onTypeChange, types, coverageNote, idPrefix = "dc-map") {
    const controls = d3.select(container).append("div").attr("class", "dc-map-controls");

    // The scenario tabs, with a small button that explains the three selections.
    const scenarioGroup = controls.append("div").attr("class", "dc-scenario-control");
    const scenarioControls = scenarioGroup.append("div").attr("class", "dc-map-tabs");
    const scenarioInfo = scenarioGroup.append("div").attr("class", "dc-type-info dc-scenario-info").attr("id", `${idPrefix}-scenario-info`)
      .attr("role", "dialog").attr("aria-label", "What the selections include").attr("hidden", true);
    scenarioGroup.append("button").attr("type", "button").attr("class", "dc-info-button dc-scenario-info-button")
      .attr("aria-label", "What Confirmed, Dated plans and All announced include").attr("aria-expanded", "false")
      .attr("aria-controls", `${idPrefix}-scenario-info`).text("i")
      .on("click", (event) => { event.stopPropagation(); toggleTypeInfo(scenarioGroup); });
    scenarioInfo.append("p").text("Each capacity figure is assigned a stage from the decisions, construction activity and dates in its sources. The selections add stages in turn.");
    const scenarioList = scenarioInfo.append("dl");
    for (const [label, text] of [
      ["Confirmed", "Capacity with an investment decision or a construction start."],
      ["Dated plans", "Adds plans with a date from the developer or a public document, but no decision."],
      ["All announced", "Adds undated capacity at campuses under way, and announced plans with no date, including early ideas."],
    ]) {
      scenarioList.append("dt").text(label);
      scenarioList.append("dd").text(text);
    }

    scenarioControls.classed("dc-view-tabs", true).attr("role", "group").attr("aria-label", "How far the plans have come");


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
      .attr("aria-label", (item) => item.id === "twh" ? "Annual electricity use" : item.label)
      .on("click", (event, item) => {
        measureButtons.attr("aria-pressed", (option) => String(option.id === item.id));
        onMeasureChange(item.id);
      });
    measureButtons.append("span").attr("class", "dc-measure-long").text((item) => item.label);
    measureButtons.append("span").attr("class", "dc-measure-short").text((item) => item.shortLabel);

    const typeControl = options.append("div").attr("class", "dc-type-control");
    const typeLabel = typeControl.append("span").attr("class", "dc-type-label").text("Type");
    // A small button beside the label opens a short description of each type.
    const typeInfo = typeControl.append("div").attr("class", "dc-type-info").attr("id", `${idPrefix}-type-info`).attr("role", "dialog")
      .attr("aria-label", "Data center types").attr("hidden", true);
    typeLabel.append("button").attr("type", "button").attr("class", "dc-info-button").attr("aria-label", "What the types mean")
      .attr("aria-expanded", "false").attr("aria-controls", `${idPrefix}-type-info`).text("i")
      .on("click", (event) => { event.stopPropagation(); toggleTypeInfo(typeControl); });
    typeInfo.append("p").text(TYPE_INFO_INTRO);
    const known = new Set(types.map((id) => id.toLowerCase()));
    const listed = TYPE_INFO.filter((item) => known.has(item.id.toLowerCase()));
    const unlisted = types.filter((id) => !TYPE_INFO.some((item) => item.id.toLowerCase() === id.toLowerCase()))
      .map((id) => ({ id, label: id.replace(/^./, (letter) => letter.toUpperCase()), text: "" }));
    const typeList = typeInfo.append("dl");
    for (const item of [...listed, ...unlisted]) {
      typeList.append("dt").text(item.label);
      typeList.append("dd").text(item.text);
    }
    const typeMenu = typeControl.append("details").attr("class", "dc-type-menu")
      .on("toggle", function () { if (this.open) toggleTypeInfo(typeControl, false); });
    typeMenu.append("summary").attr("aria-label", "Filter by data center type").text("All types");
    const typeOptions = typeMenu.append("div").attr("class", "dc-type-options");
    typeOptions.append("button").attr("type", "button").attr("class", "dc-type-clear").text("All types")
      .on("click", () => onTypeChange([]));
    const typeRows = typeOptions.selectAll("label").data(types).join("label").attr("class", "dc-type-option");
    typeRows.append("input").attr("type", "checkbox").attr("value", (id) => id)
      .on("change", () => onTypeChange(typeOptions.selectAll("input:checked").nodes().map((node) => node.value)));
    typeRows.append("span").text((id) => id.replace(/^./, (letter) => letter.toUpperCase()));
    const hqControl = options
      .append("div")
      .attr("class", "dc-hq-control")
      .attr("role", "group")
      .attr("aria-label", "Developer headquarters")
      .attr("title", "The developer's global headquarters. Domestic means the same country as the project, Other Europe another European country and Outside Europe the rest of the world. A project with several developers can appear in more than one group. " + coverageNote);
    const hqLabel = hqControl.append("label").attr("class", "dc-hq-label").attr("for", `${idPrefix}-hq`).text("HQ");
    // The same small info button as for Type, with what the HQ groups mean.
    hqControl.classed("dc-hq-control-info", true).style("position", "relative").attr("title", null);
    const hqInfo = hqControl.append("div").attr("class", "dc-type-info").attr("id", `${idPrefix}-hq-info`).attr("role", "dialog")
      .attr("aria-label", "Developer headquarters").attr("hidden", true);
    hqLabel.append("button").attr("type", "button").attr("class", "dc-info-button").attr("aria-label", "What the HQ groups mean")
      .attr("aria-expanded", "false").attr("aria-controls", `${idPrefix}-hq-info`).text("i")
      .on("click", (event) => { event.preventDefault(); event.stopPropagation(); toggleTypeInfo(hqControl); });
    hqInfo.append("p").text("Filters projects by where their developers have their global headquarters. A project with several developers can appear in more than one group. Unknown headquarters stay unknown." + (coverageNote ? " " + coverageNote : ""));
    const hqList = hqInfo.append("dl");
    for (const [label, text] of [["Domestic", "Headquarters in the project's own country."], ["Other Europe", "Headquarters in another European country."], ["Outside Europe", "Headquarters in the rest of the world."]]) {
      hqList.append("dt").text(label);
      hqList.append("dd").text(text);
    }
    const hqSelect = hqControl
      .append("select")
      .attr("id", `${idPrefix}-hq`)
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

  function mountControls(container, shared, data, idPrefix = "dc-map") {
    const state = shared.get();
    const types = [...new Set(data.projects.flatMap((project) => splitTags(project.type)))].sort((a, b) => a.localeCompare(b));
    renderControls(container, TABS, state.family, value => shared.set({family:value}), value => shared.set({measure:value}),
      value => shared.set({hq:value}), value => shared.set({type:value}), types, "", idPrefix);
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
    const closeTypeMenu = (event) => {
      for (const info of root.selectAll(".dc-type-info").nodes()) {
        if (info.hidden) continue;
        const control = d3.select(info.parentNode);
        if (event.type === "keydown" && event.key === "Escape") {
          event.stopPropagation();
          toggleTypeInfo(control, false);
          control.select(".dc-info-button").node().focus();
          return;
        }
        if (event.type === "click" && !info.contains(event.target)) toggleTypeInfo(control, false);
      }
      const menu = root.select(".dc-type-menu").node();
      if (event.type === "keydown" && event.key === "Escape" && menu?.open) {
        event.stopPropagation();
        menu.open = false;
        menu.querySelector("summary").focus();
      } else if (event.type === "click" && menu?.open && !menu.contains(event.target)) menu.open = false;
    };
    document.addEventListener("click", closeTypeMenu);
    root.node().addEventListener("keydown", closeTypeMenu, true);
    const unsubscribe = shared.subscribe(state => {
      root.selectAll("[data-scenario]").classed("active", function() { return this.dataset.scenario === state.family; })
        .attr("aria-pressed", function() { return String(this.dataset.scenario === state.family); });
      placeIndicator();
      root.selectAll("[data-measure]").attr("aria-pressed", function() { return String(this.dataset.measure === state.measure); });
      root.select(".dc-hq-select").property("value", state.hq);
      const selected = new Set(state.type);
      root.selectAll(".dc-type-option input").property("checked", function() { return selected.has(this.value); });
      root.select(".dc-type-menu summary").text(selected.size ? selected.size === 1 ? [...selected][0] : `${selected.size} types` : "All types");
      root.select(".dc-type-clear").property("disabled", !selected.size);
    });
    return { disconnect() {unsubscribe();observer.disconnect();tabObserver.disconnect();document.removeEventListener("click", closeTypeMenu);root.node().removeEventListener("keydown", closeTypeMenu, true);} };
  }

  function renderZoneLabels(labelG, geojson, projection) {
    labelG.selectAll("text.dc-zone-label").data(geojson.features, (f) => f.properties.bidding_zone).join("text")
      .attr("class", "dc-zone-label").attr("data-zone", (f) => f.properties.bidding_zone)
      .attr("text-anchor", "middle")
      .each(function (f) { this.__base = projection(ZONE_ANCHORS[f.properties.bidding_zone]); })
      .attr("transform", function () { return `translate(${this.__base.join(",")})`; })
      .each(function (f) {
        // The zone name, and under it the zone total for the current selection (filled in by render).
        const text = d3.select(this).text(null);
        text.append("tspan").attr("class", "dc-zone-label-name").attr("x", 0).text(f.properties.bidding_zone);
        text.append("tspan").attr("class", "dc-zone-label-value").attr("x", 0).attr("dy", "1.2em");
      });
  }

  // Circles grow gently with zoom. Names keep their screen size.
  function applyMapZoom(land, points, labels, t, smooth = false) {
    land.attr("transform", t);
    points.selectAll("g.dc-phase-point:not(.dc-phase-exiting)").each(function (d) {
      if (!d.base) d.base = { xy: d.xy.slice(), anchor: [d.anchorX, d.anchorY] };
      const ax = t.applyX(d.base.anchor[0]), ay = t.applyY(d.base.anchor[1]);
      d.xy = [ax + (d.base.xy[0] - d.base.anchor[0]) / t.k, ay + (d.base.xy[1] - d.base.anchor[1]) / t.k];
      d.anchorX = ax;
      d.anchorY = ay;
      d.zoomScale = Math.sqrt(t.k);
      const point = d3.select(this).interrupt();
      (smooth && !prefersReducedMotion() ? point.transition().duration(420).ease(d3.easeCubicInOut) : point)
        .attr("transform", `translate(${d.xy[0]},${d.xy[1]}) scale(${d.zoomScale})`);
      point.select("line.dc-phase-anchor").attr("x1", (ax - d.xy[0]) / d.zoomScale).attr("y1", (ay - d.xy[1]) / d.zoomScale);
    });
    points.selectAll("g.dc-hover-layer").style("opacity", 0);
    // Zone names grow a little with the zoom, like the circles, so they stay in proportion to the land.
    const grow = Math.min(1.8, Math.sqrt(t.k));
    labels.attr("transform", function () { return `translate(${t.apply(this.__base).join(",")}) scale(${grow})`; });
  }

  // The zone total sits next to the zone name and follows the selection. Only the high value is shown.
  function zoneValueLabel(detail, measure) {
    const high = detail?.high || 0;
    if (measure === "mw") return `${gwRange(high, high)} GW`;
    const digits = high >= 10 ? 0 : 1;
    return `${high.toLocaleString("en-US", { minimumFractionDigits: high === 0 ? 0 : digits, maximumFractionDigits: digits })} TWh`;
  }
  function renderPhaseLayer(phaseG, popupG, phaseGroups, projection, width, height, measure, tab, useOffsets = true, radiusScale = 1, year = null) {
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

    // Each site is a grey disc whose size shows all announced capacity at the site. The share included in
    // the selection fills the disc from the bottom. The disc does not change with the selection, so
    // positions stay put and only the level rises or falls. A site without a stated size is a small dashed ring.
    // A small nudge only. Circles may still overlap. Smaller circles are drawn on top.
    const sized = projectedPoints.map((group) => {
      const value = siteValue(group, measure);
      const total = siteTotal(group, measure);
      const empty = total > 0 && !(value > 0);
      return { ...group, site_value: value, site_total: total, no_size: !(total > 0), empty,
        radius: siteRadius(total, measure) * radiusScale,
        inner: value > 0 ? Math.min(siteRadius(total, measure), siteRadius(value, measure)) * radiusScale : 0 };
    });
    // r is the drawn size. radius is the full circle, used for the layout.
    const points = resolvePhaseOverlaps(sized, width, height, { minPadding: 1, maxShift: 9, overlap: 1 })
      .map((d) => ({ ...d, r: d.radius }))
      .sort((a, b) => b.r - a.r);
    // With a year, the hover text reads "… in operation in 2030, Dated plans".
    const tabLabel = (year ? `operation in ${year}, ` : "") + TABS.find((item) => item.id === tab).label;
    // The first drawing is immediate. Later changes of selection are animated.
    const duration = phaseG.attr("data-drawn") && !prefersReducedMotion() ? 520 : 0;
    phaseG.attr("data-drawn", "true");

    const groups = phaseG
      .selectAll("g.dc-phase-point")
      .data(points, (d) => d.key)
      .join(
        (enter) => {
          // A new site starts at its own place and fades in there, so it does not travel in from the corner.
          const g = enter.append("g").attr("class", "dc-phase-point").attr("tabindex", 0).attr("role", "button")
            .attr("transform", (d) => `translate(${d.xy[0]},${d.xy[1]})`);
          g.append("line").attr("class", "dc-phase-anchor");
          g.append("circle").attr("class", "dc-phase-hit").attr("fill", "transparent").attr("aria-hidden", "true");
          g.append("circle").attr("class", "dc-phase-disc").attr("r", 0);
          styleShare(g.append("path").attr("class", "dc-phase-share"));
          return g;
        },
        (update) => update.classed("dc-phase-exiting", false).interrupt("visibility").style("opacity", 1),
        (exit) => exit.classed("dc-phase-exiting", true).transition("visibility").duration(duration).style("opacity", 0).remove()
      );
    groups.filter(function () { return !this.__dcVisible; }).style("opacity", 0)
      .transition("visibility").duration(duration).style("opacity", 1);
    groups.each(function () { this.__dcVisible = true; });

    const statusText = (d) => siteStatusText(d, measure, tabLabel);

    // Hover: a copy of the site with a soft ring is drawn in a layer on top, with a short label.
    // The circles themselves never change order, so moving the pointer across a cluster does not
    // redraw the map. The styles are set inline so the layer also looks right while an older
    // stylesheet is cached.
    const hover = phaseG.selectAll("g.dc-hover-layer").data([null]).join((enter) => {
      const g = enter.append("g").attr("class", "dc-hover-layer").attr("pointer-events", "none").attr("aria-hidden", "true").style("opacity", 0);
      g.append("circle").attr("class", "dc-hover-halo").style("fill", SITE_FILL).style("fill-opacity", 0.16).style("stroke", "none");
      g.append("circle").attr("class", "dc-hover-disc");
      styleShare(g.append("path").attr("class", "dc-hover-share"));
      return g;
    });
    const tipHost = d3.select(popupG.node().parentNode);
    const tip = tipHost.selectAll("div.dc-site-tip").data([null]).join("div").attr("class", "dc-site-tip").attr("aria-hidden", "true").style("opacity", 0);
    function hideHover() { hover.style("opacity", 0); tip.style("opacity", 0); }
    function showHover(event, d) {
      hover.attr("transform", `translate(${d.xy[0]},${d.xy[1]}) scale(${d.zoomScale || 1})`).style("opacity", 1);
      hover.select(".dc-hover-halo").attr("r", d.r + Math.max(3.5, d.r * 0.3));
      styleRing(hover.select(".dc-hover-disc").attr("r", d.r), d).style("stroke-width", 1.6);
      hover.select(".dc-hover-share").attr("d", circlePath(innerRadius(d)));
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
    // The disc keeps its current opacity until the transition moves it, so a dot fades as it grows.
    groups.select("circle.dc-phase-disc").each(function (d) { styleRing(d3.select(this), d); })
      .transition().duration(duration).ease(d3.easeCubicInOut).attr("r", (d) => d.r);
    groups.select("path.dc-phase-share")
      .transition().duration(duration).ease(d3.easeCubicInOut)
      .attrTween("d", function (d) {
        // The disc grows or shrinks from its current size, so an interrupted change continues from where it was.
        const r = d3.interpolate(this.__inner ?? 0, innerRadius(d));
        return (t) => {
          this.__inner = r(t);
          return circlePath(this.__inner);
        };
      });
    // The click area covers the whole outline. Smaller sites lie on top, so they stay clickable in clusters.
    groups.select("circle.dc-phase-hit").attr("r", (d) => Math.max(d.no_size || d.empty ? 4.5 : 7, d.r + 2));
    hideHover();
  }

  function showPhasePopup(host, group, width, height, measure, tab, event) {
    host.selectAll("*").remove();
    host.attr("hidden", null);
    const box = host.append("div").attr("class", "dc-project-popup").attr("role", "dialog").attr("aria-label", group.municipality || group.zone);
    const header = box.append("div").attr("class", "dc-project-popup-heading");
    header.append("strong").text(group.municipality || group.zone);
    header.append("button").attr("type", "button").attr("aria-label", "Close project details").text("×").on("click", () => host.attr("hidden", true));
    // Divs, not paragraphs, so the site's paragraph styles do not change the card's text sizes.
    box.append("div").attr("class", "dc-project-popup-meta").text([countryLabel(group.country), group.bidding_zone || group.zone].filter(Boolean).join(" · "));
    // The card shows all announced capacity at the site, whatever the selection: the stages with their values,
    // and then each project with its total. Plain text only. Stages outside the selection are in grey text.
    const tabItem = TABS.find((item) => item.id === tab);
    const selected = tabItem.classes;
    const projects = group.phases.filter((row) => !group.hq_mode || group.hq_mode === "none" || matchesHq(row, group.hq_mode));
    const stageValue = (project, klass, bound) => (project.classes || []).find((row) => row.evidence_class === klass)?.[`${measure}_${bound}`] || 0;
    const stages = CLASSES.map((klass) => ({
      klass,
      low: projects.reduce((sum, p) => sum + stageValue(p, klass, "low"), 0),
      high: projects.reduce((sum, p) => sum + stageValue(p, klass, "high"), 0),
      included: selected.includes(klass),
    })).filter((stage) => stage.high > 0);
    const siteHigh = stages.reduce((sum, stage) => sum + stage.high, 0);
    box.append("div").attr("class", "dc-project-popup-summary").text(siteStatusText(group, measure, tabItem.label));
    if (siteHigh > 0) {
      const list = box.append("div").attr("class", "dc-project-class-list");
      for (const stage of stages) {
        const line = list.append("div").attr("class", "dc-project-class-value").classed("dc-project-class-out", !stage.included);
        line.append("span").text(CLASS_LABELS[CLASSES.indexOf(stage.klass)]);
        line.append("strong").text(capacityLabel({ low: stage.low, high: stage.high }, measure));
      }
    }
    for (const project of projects) {
      const item = box.append("section").attr("class", "dc-project-popup-project");
      const title = item.append("div").attr("class", "dc-project-popup-project-title");
      title.append("strong").text(project.project_name);
      const own = CLASSES.filter((klass) => stageValue(project, klass, "high") > 0);
      const low = own.reduce((sum, klass) => sum + stageValue(project, klass, "low"), 0);
      const high = own.reduce((sum, klass) => sum + stageValue(project, klass, "high"), 0);
      if (high > 0) title.append("span").text(capacityLabel({ low, high }, measure));
      const stageNames = own.map((klass) => CLASS_LABELS[CLASSES.indexOf(klass)]).join(", ");
      const note = project.capacity_known ? stageNames : "Project without MW";
      item.append("span").attr("class", "dc-project-popup-meta").text([project.status, note].filter(Boolean).join(" · "));
    }
    const node = box.node();
    const left = Math.min(global.innerWidth - node.offsetWidth - 12, Math.max(12, (event?.clientX || global.innerWidth / 2) + 12));
    const top = Math.min(global.innerHeight - node.offsetHeight - 12, Math.max(12, (event?.clientY || 80) + 12));
    box.style("left", `${left}px`).style("top", `${Math.max(12, top)}px`);
  }

  // The card for a selected site: what the site is, how much of it is included, the stages and each project.
  // A button on each project opens it in the project list below the map.
  function renderSiteCard(host, group, measure, tab, yearLabel, onClose) {
    host.selectAll("*").remove();
    const tabItem = TABS.find((item) => item.id === tab);
    const projects = group.phases.filter((row) => !group.hq_mode || group.hq_mode === "none" || matchesHq(row, group.hq_mode));
    const card = host.append("div").attr("class", "dc-site-card").attr("role", "region").attr("aria-label", `Selected site: ${group.municipality}`);
    const head = card.append("div").attr("class", "dc-site-card-head");
    const titles = head.append("div");
    titles.append("div").attr("class", "dc-site-card-kicker").text("Selected site");
    titles.append("div").attr("class", "dc-site-card-title").text(projects.length === 1 ? projects[0].project_name : group.municipality);
    titles.append("div").attr("class", "dc-site-card-meta").text([projects.length === 1 ? group.municipality : `${projects.length} projects`,
      countryLabel(group.country), group.bidding_zone].filter(Boolean).join(" · "));
    head.append("button").attr("type", "button").attr("class", "dc-site-card-close").attr("aria-label", "Close site details").text("×")
      .on("click", onClose);
    const types = [...new Set(projects.flatMap((project) => splitTags(project.type)))];
    if (types.length) titles.append("div").attr("class", "dc-site-card-meta").text(types.join(", "));
    const where = yearLabel ? `in operation in ${yearLabel}, ${tabItem.label}` : `in ${tabItem.label}`;
    const value = siteValue(group, measure), total = siteTotal(group, measure);
    // The included amount as a large figure, with what it is part of beside it.
    const summary = card.append("div").attr("class", "dc-site-card-summary");
    if (!(total > 0)) summary.append("strong").text("No stated size");
    else {
      summary.append("strong").text(value > 0 ? siteAmount(value, measure) : "None");
      summary.append("span").text(value >= total - 1e-6 ? ` ${where}` : ` of ${siteAmount(total, measure)} ${value > 0 ? where : `${measure === "mw" ? "announced" : "estimated"} is ${where}`}`);
    }
    if (yearLabel) summary.append("span").attr("class", "dc-site-card-note").text("Model result");
    // The stages at full build-out, whatever the selection. Stages outside the selection are grey.
    const stageValue = (project, klass, bound) => (project.classes || []).find((row) => row.evidence_class === klass)?.[`${measure}_${bound}`] || 0;
    const stages = CLASSES.map((klass) => ({ klass,
      low: projects.reduce((sum, p) => sum + stageValue(p, klass, "low"), 0),
      high: projects.reduce((sum, p) => sum + stageValue(p, klass, "high"), 0),
      included: tabItem.classes.includes(klass) })).filter((stage) => stage.high > 0);
    if (stages.length) {
      const list = card.append("div").attr("class", "dc-site-card-stages");
      list.append("div").attr("class", "dc-site-card-label").text("At full build-out, by stage");
      for (const stage of stages) {
        const line = list.append("div").attr("class", "dc-site-card-stage").classed("dc-site-card-out", !stage.included);
        line.append("i").style("background", `var(--dc-class-${stage.klass})`).attr("aria-hidden", true);
        line.append("span").text(CLASS_LABELS[CLASSES.indexOf(stage.klass)]);
        line.append("strong").text(capacityLabel({ low: stage.low, high: stage.high }, measure));
      }
    }
    // One project: its description from the project list. Several projects: each gets its own short row.
    if (projects.length === 1 && projects[0].description) card.append("p").attr("class", "dc-site-card-text").text(projects[0].description);
    for (const project of projects) {
      const item = card.append("div").attr("class", "dc-site-card-project");
      const own = CLASSES.filter((klass) => stageValue(project, klass, "high") > 0);
      const low = own.reduce((sum, klass) => sum + stageValue(project, klass, "low"), 0);
      const high = own.reduce((sum, klass) => sum + stageValue(project, klass, "high"), 0);
      if (projects.length > 1) {
        const title = item.append("div").attr("class", "dc-site-card-project-title");
        title.append("strong").text(project.project_name);
        if (high > 0) title.append("span").text(capacityLabel({ low, high }, measure));
      }
      item.append("div").attr("class", "dc-site-card-meta").text([project.status, project.capacity_known ? "" : "No MW figure"].filter(Boolean).join(" · "));
      item.append("button").attr("type", "button").attr("class", "dc-site-card-link")
        .attr("aria-label", `Show ${project.project_name} in the project list`).text("Show in project list")
        .on("click", () => global.document.dispatchEvent(new CustomEvent("dc:show-project", { detail: { id: project.project_id } })));
    }
  }

  // Reference circles side by side, bottom-aligned, with the value below each.
  // k is the number of screen pixels per map unit, so the key matches the circles it explains.
  function drawSizeKey(container, measure, k, vertical = false) {
    const scale = SITE_SCALE[measure];
    const format = (value) => value.toLocaleString("en-US", { maximumFractionDigits: 2 });
    const radii = scale.keys.map((value) => siteRadius(value, measure) * k);
    const gap = 14, labelHeight = 16;
    const largest = Math.max(...radii);
    const rowHeight = Math.max(22, largest * 2 + 8);
    const h = vertical ? rowHeight * radii.length : largest * 2 + labelHeight + 4;
    let x = 2;
    const svg = container.append("svg").attr("class", "dc-site-key-sizes").attr("height", h).attr("aria-hidden", true);
    scale.keys.forEach((value, i) => {
      // Each slot is as wide as its circle or its label, whichever is wider, so labels never touch.
      const probe = svg.append("text").text(`${format(value)} ${scale.unit}`);
      const textWidth = probe.node().getComputedTextLength ? probe.node().getComputedTextLength() : 44;
      probe.remove();
      const r = radii[i], slot = Math.max(r * 2, 44, textWidth + 6);
      const cx = vertical ? 2 + largest : x + slot / 2;
      const cy = vertical ? rowHeight * (i + 0.5) : h - labelHeight - r - 2;
      styleShare(svg.append("circle").attr("cx", cx).attr("cy", cy).attr("r", r), 0.8);
      const labelX = vertical ? 2 + largest * 2 + 8 : cx;
      svg.append("text").attr("x", labelX).attr("y", vertical ? cy + 4 : h - 3)
        .attr("text-anchor", vertical ? "start" : "middle").text(`${format(value)} ${scale.unit}`);
      x = vertical ? Math.max(x, labelX + textWidth + 2) : x + slot + gap;
    });
    svg.attr("width", vertical ? x : x - gap + 2);
    return svg;
  }

  // The share symbol and the no-size ring, after the size key. The same for every selection.
  // Each symbol's label sits on the same baseline as the size labels, with the symbol in front of it.
  // The two symbols share one group, so on a narrow screen they wrap together to a line below the sizes.
  // The row is bottom-aligned, so the baselines match.
  // The symbols, one per line, named for the current selection.
  function drawSymbolKey(container, k, iconRadius = 7, tab = DEFAULT_TAB, year = null) {
    const group = container.append("div").attr("class", "dc-site-key-symbols");
    const label = TABS.find((item) => item.id === tab).label;
    const where = year ? `in operation in ${year}, ${label}` : `included in ${label}`;
    const item = (drawSymbol, symbolWidth, text) => {
      const h = Math.max(20, iconRadius * 2 + 4);
      const svg = group.append("svg").attr("class", "dc-site-key-sizes dc-site-key-item").attr("height", h).attr("aria-hidden", true);
      drawSymbol(svg.append("g").attr("transform", `translate(${symbolWidth / 2 + 1},${h / 2})`));
      const text_ = svg.append("text").attr("x", symbolWidth + 8).attr("y", h / 2 + 4).text(text);
      const w = Math.ceil(text_.node().getComputedTextLength ? text_.node().getComputedTextLength() : 200);
      svg.attr("width", symbolWidth + 10 + w);
    };
    item((g) => styleShare(g.append("path").attr("d", circlePath(iconRadius * 0.62)), 0.8),
      iconRadius * 2, `Blue: ${where}`);
    item((g) => styleRing(g.append("circle").attr("r", iconRadius), {}), iconRadius * 2, "Ring: all announced at the site");
    item((g) => styleRing(g.append("circle").attr("r", SITE_RING_RADIUS * k), { no_size: true }), iconRadius * 2, "Dashed: no stated size");
  }



  // The zone totals are written on the map, so all land has one quiet colour.
  const LAND_FILL = "var(--dc-land-flat)";


  function renderMapLegend(root, measure, tab = DEFAULT_TAB, year = null) {
    // The key occupies the empty lower right corner, without a separate surface.
    const host = root.select(".dc-scenario-svg-wrap");
    const legend = (host.empty() ? root : host).selectAll(".dc-map-scale").data([null]).join("div").attr("class", "dc-map-scale dc-site-key");
    legend.selectAll("*").remove();
    // The map is drawn in a 760-unit viewBox and scaled to the page. The key uses the same scale.
    const mapSvg = root.select(".dc-scenario-svg").node();
    const k = mapSvg && mapSvg.getBoundingClientRect().width ? mapSvg.getBoundingClientRect().width / 760 : 1;
    const mobileScale = root.classed("dc-map-compact") ? MOBILE_SITE_SCALE : 1;
    drawSizeKey(legend, measure, k * mobileScale);
    drawSymbolKey(legend, k * mobileScale, 7 * mobileScale, tab, year);
  }


  // Context only: shares of electricity consumption in a reference year, exported with the method.
  // The share of 2025 electricity use in a zone or country, for annual electricity use only. Empty otherwise.
  function useShare(data, id, detail, measure) {
    return measure === "twh" ? shareLabel(detail || {}, consumptionFor(data, id)) : "";
  }
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

  // What a circle on the map shows, for the current selection. It is the short text above the map.
  function circleText(tab = DEFAULT_TAB, measure = DEFAULT_MEASURE, hq = "none", type = [], year = null) {
    const label = TABS.find((item) => item.id === tab).label;
    const hqText = hq === "none" ? "" : `, from developers headquartered ${{ domestic: "in the project's own country", other_europe: "elsewhere in Europe", outside_europe: "outside Europe" }[hq]}`;
    const what = measure === "mw" ? "power" : "yearly electricity use";
    const kind = measure === "mw" ? "Announced" : "Estimated";
    const selectedTypes = Array.isArray(type) ? type : type === "all" ? [] : [type];
    const typeText = selectedTypes.length ? ` for ${selectedTypes.join(" or ")} projects` : "";
    if (year) return `Modelled ${what} in operation in ${year} in ${label}${typeText}${hqText}, at the upper value. Grey shows all announced capacity at the site.`;
    const size = `${kind} ${what} per site${typeText}${hqText}, at the upper value.`;
    return tab === "announced" ? size : `${size} Blue shows how much is included in ${label}.`;
  }


  // An equal-area projection, so countries and zones keep their true relative sizes.
  const mapProjection = () => d3.geoConicEqualArea().parallels([57, 68]).rotate([-17, 0]);
  // The overview fits the Nordic zones. Neighbours do not change its scale.
  const mapLayout = () => global.innerWidth <= 600 ? "mobile" : global.innerWidth <= 900 ? "compact" : "wide";
  const MAP_LAYOUTS = {
    wide: { extent: [[150, 36], [610, 506]], bottom: 40 },
    compact: { extent: [[100, 28], [660, 720]], bottom: 40 },
    mobile: { extent: [[22, 24], [738, 990]], bottom: 35 },
  };

  function mount(container, data, shared) {
    const geojson = data.bidding_zones;
    const width = 760;
    let height = 570;
    let { family: tab, measure, hq, type } = shared.get();
    const root = d3.select(container).attr("class", "dc-scenario-map-root");
    // A failed earlier mount may have left a partial SVG behind.
    root.selectAll("*").remove();
    // Every tab and measure variant is laid out in the same grid cell and only the current one is visible.
    // The block then keeps the height of the longest variant, so the page does not shift when the selection changes.
    const headlineNode = root.append("div").attr("class", "dc-map-headline").attr("aria-live", "polite");
    const figure = root.append("div").attr("class", "dc-scenario-svg-wrap");
    const svg = figure.append("svg").attr("class", "dc-scenario-svg").attr("role", "img");
    let layoutName = mapLayout();
    let compact = layoutName !== "wide";
    const projection = mapProjection();
    const path = d3.geoPath(projection);
    // Fits the map to the layout. The height follows the lowest country, so there is no empty band below.
    function fitMap() {
      const layout = MAP_LAYOUTS[layoutName];
      projection.fitExtent(layout.extent, geojson);
      // On a narrow screen the width sets the scale, so the land would sit low with an empty band above it.
      // It is moved up to the top of the frame.
      if (compact) {
        const top = d3.min(geojson.features, (f) => translatedBounds(f, path)[0][1]);
        const [tx, ty] = projection.translate();
        projection.translate([tx, ty - (top - layout.extent[0][1])]);
      }
      height = Math.ceil(d3.max(geojson.features, (f) => translatedBounds(f, path)[1][1]) + layout.bottom);
      svg.attr("viewBox", `0 0 ${width} ${height}`);
      root.classed("dc-map-compact", compact);
    }
    fitMap();
    // Neighbouring countries are context only: thin outlines that fade out with distance from Nordic land and
    // near the edge of the map, so the map has no visible edge. The fade is worked out once in the script.
    // Each outline is cut into short pieces, each piece gets an opacity, and pieces with about the same opacity
    // share one path. The browser then draws a few plain lines, with no masks or filters, which keeps the map fast.
    // The width is in screen pixels, so the lines look the same on a phone and a wide screen.
    const NEIGHBOUR_STYLE = { stroke: "#c9bfae", width: 0.85 };
    const NEIGHBOUR_FADE = { near: 40, far: 110, edge: 36, levels: 8, step: 5 };
    let neighbourData = null;
    function drawNeighbours() {
      if (!neighbourData) return;
      const { near, far, edge, levels, step } = NEIGHBOUR_FADE;
      // Nordic outline points in a coarse grid, so the nearest one is found quickly.
      const cell = far, grid = new Map();
      const addPoint = (p) => {
        const key = `${Math.floor(p[0] / cell)},${Math.floor(p[1] / cell)}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(p);
      };
      const walk = (c, fn) => { if (typeof c[0] === "number") fn(c); else c.forEach((x) => walk(x, fn)); };
      geojson.features.forEach((f) => walk(f.geometry.coordinates, (c) => { const p = projection(c); if (p) addPoint(p); }));
      const nearest = (x, y) => {
        const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
        let best = Infinity;
        for (let i = gx - 1; i <= gx + 1; i++) for (let j = gy - 1; j <= gy + 1; j++) {
          for (const p of grid.get(`${i},${j}`) || []) best = Math.min(best, (p[0] - x) ** 2 + (p[1] - y) ** 2);
        }
        return Math.sqrt(best);
      };
      const smooth = (t) => { const v = Math.max(0, Math.min(1, t)); return v * v * (3 - 2 * v); };
      const fade = (x, y) => (1 - smooth((nearest(x, y) - near) / (far - near)))
        * smooth(Math.min(x, y, width - x, height - y) / edge);
      // One list of path pieces per opacity level. Pieces that follow each other at the same level are joined.
      const parts = Array.from({ length: levels }, () => []);
      const ring = (coordinates) => {
        const points = coordinates.map((c) => projection(c)).filter(Boolean);
        let open = -1;
        for (let n = 1; n < points.length; n++) {
          const [x0, y0] = points[n - 1], [x1, y1] = points[n];
          const pieces = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
          for (let m = 0; m < pieces; m++) {
            const t0 = m / pieces, t1 = (m + 1) / pieces;
            const ax = x0 + (x1 - x0) * t0, ay = y0 + (y1 - y0) * t0, bx = x0 + (x1 - x0) * t1, by = y0 + (y1 - y0) * t1;
            const level = Math.round(fade((ax + bx) / 2, (ay + by) / 2) * levels) - 1;
            if (level < 0) { open = -1; continue; }
            const list = parts[level];
            if (open === level) list.push(`L${bx.toFixed(1)},${by.toFixed(1)}`);
            else list.push(`M${ax.toFixed(1)},${ay.toFixed(1)}L${bx.toFixed(1)},${by.toFixed(1)}`);
            open = level;
          }
        }
      };
      neighbourData.features.forEach((f) => {
        const polygons = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [];
        polygons.forEach((polygon) => polygon.forEach(ring));
      });
      neighboursG.selectAll("path").data(parts).join("path")
        .attr("d", (d) => d.join(""))
        .attr("stroke-opacity", (d, i) => (i + 1) / levels)
        .style("fill", "none").style("stroke", NEIGHBOUR_STYLE.stroke).style("stroke-width", NEIGHBOUR_STYLE.width)
        .style("stroke-linejoin", "round").style("stroke-linecap", "round").style("vector-effect", "non-scaling-stroke");
    }
    // The map fills the text width on a wide screen, so the drawing is scaled up. The zone labels are scaled back,
    // so they keep the size they have at the former width of 640 px and match the other small text on the page.
    // The key is redrawn when the width changes, so its circles keep matching the circles on the map.
    let keyWidth = 0;
    const sizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
      const rendered = svg.node().getBoundingClientRect().width;
      if (!rendered) return;
      root.style("--dc-map-pixel", width / rendered).style("--dc-map-height", `${svg.node().getBoundingClientRect().height}px`);
      if (Math.abs(rendered - keyWidth) > 2 && keyWidth) renderMapLegend(root, measure, tab, year);
      keyWidth = rendered;
    }) : null;
    if (sizeObserver) sizeObserver.observe(svg.node());
    const neighboursG = svg.append("g").attr("class", "dc-map-neighbours").attr("aria-hidden", "true").attr("pointer-events", "none");
    const contentG = svg.append("g").attr("class", "dc-overview-content");
    const landG = contentG.append("g").attr("class", "dc-map-land");
    const mapG = landG.append("g").attr("class", "dc-map-zones");
    const phaseG = contentG.append("g").attr("class", "dc-phase-layer");
    const zoneLabelG = contentG.append("g").attr("class", "dc-zone-label-layer");
    const backgroundAbort = new AbortController();
    d3.json(container.dataset.neighbours, { signal: backgroundAbort.signal }).then((neighbours) => {
      neighbourData = neighbours;
      drawNeighbours();
      svg.attr("data-background", "ready");
    }).catch((error) => {
      if (error.name === "AbortError") return;
      root.append("p").attr("class", "dc-map-background-status").attr("role", "status")
        .text("Neighbouring country outlines could not be loaded.");
    });


    const popup = root.append("div").attr("class", "dc-map-popup-host").attr("hidden", true);
    const zonePaths = mapG.selectAll("path").data(geojson.features).join("path").attr("class", "dc-zone")
      .attr("data-zone", (d) => d.properties.bidding_zone).attr("tabindex", 0).attr("role", "button")
      .attr("d", path)
      .on("click", (event, d) => { if (!event.defaultPrevented) zoomToZone(d.properties.bidding_zone); })
      .on("mouseenter.country", (event, d) => hoverCountry(d.properties.country))
      .on("mouseleave.country", leaveCountry)
      .on("keydown", (event, d) => {if (event.key === "Enter" || event.key === " ") {event.preventDefault();zoomToZone(d.properties.bidding_zone);}});
    // Pointing at a zone or a circle darkens its whole country, as a hint that a click zooms to it.
    function hoverCountry(country) {
      zonePaths.classed("dc-country-hover", (d) => d.properties.country === country);
    }
    function leaveCountry(event) {
      // Moving onto a circle or another zone sets the country again, so only leaving the map clears it.
      const next = event.relatedTarget;
      if (next && next.closest && next.closest(".dc-phase-point, .dc-scenario-svg .dc-zone")) return;
      hoverCountry(null);
    }
    function drawZoneLabels() {
      zoneLabelG.selectAll("*").remove();
      renderZoneLabels(zoneLabelG, geojson, projection);
    }
    drawZoneLabels();

    // Zoom and pan in the map itself. The map opens as before, and a plain scroll wheel scrolls the page. The map
    // zooms with Ctrl + scroll, a trackpad or two-finger pinch, or the buttons. On a touch screen one finger scrolls
    // the page until the map is zoomed in. When zoomed in, the map's edges fade out, so it keeps no visible frame.
    let transform = d3.zoomIdentity;
    const zoomButtons = figure.append("div").attr("class", "dc-map-zoom");
    const hint = figure.append("div").attr("class", "dc-map-hint").attr("aria-hidden", "true").text("Ctrl + scroll or pinch to zoom");
    let hintTimer = null;
    const zoom = d3.zoom().scaleExtent([1, 8]).clickDistance(4)
      .filter((event) => {
        if (event.type === "wheel") {
          if (event.ctrlKey || event.metaKey) return true;
          hint.classed("dc-map-hint-on", true);
          clearTimeout(hintTimer);
          hintTimer = setTimeout(() => hint.classed("dc-map-hint-on", false), 1200);
          return false;
        }
        if (event.type === "touchstart") return event.touches.length > 1 || transform.k > 1.01;
        return !event.button;
      })
      .on("zoom", (event) => applyMainZoom(event.transform));
    svg.call(zoom).on("dblclick.zoom", null);
    function setZoomExtent() {
      zoom.extent([[0, 0], [width, height]]).translateExtent([[0, 0], [width, height]]);
    }
    setZoomExtent();
    function applyMainZoom(t) {
      transform = t;
      neighboursG.attr("transform", t);
      applyMapZoom(landG, phaseG, zoneLabelG.selectAll("text.dc-zone-label"), t);
      const zoomed = t.k > 1.01;
      root.classed("dc-map-zoomed", zoomed);
      svg.style("touch-action", zoomed ? "none" : null);
      resetButton.attr("hidden", zoomed ? null : true);
    }
    const moveZoom = (fn) => (prefersReducedMotion() ? svg : svg.transition().duration(450).ease(d3.easeCubicInOut)).call(fn);
    const zoomButton = (label, symbol, onClick) => zoomButtons.append("button").attr("type", "button").attr("aria-label", label)
      .html(`<svg viewBox="0 0 16 16" aria-hidden="true">${symbol}</svg>`).on("click", (event) => { event.stopPropagation(); onClick(); });
    zoomButton("Zoom in", '<path d="M8 3.5v9M3.5 8h9"/>', () => moveZoom((s) => zoom.scaleBy(s, 1.8)));
    zoomButton("Zoom out", '<path d="M3.5 8h9"/>', () => moveZoom((s) => zoom.scaleBy(s, 1 / 1.8)));
    const resetButton = zoomButton("Show the whole map", '<path d="M3 6V3h3M13 6V3h-3M3 10v3h3M13 10v3h-3"/>', () => moveZoom((s) => zoom.transform(s, d3.zoomIdentity)))
      .attr("hidden", true);
    // A click on a zone zooms to its country. A second click, once zoomed in, zooms to the zone.
    function zoomToZone(zone) {
      const feature = geojson.features.find((f) => f.properties.bidding_zone === zone);
      if (!feature) return;
      const countryFeatures = geojson.features.filter((f) => f.properties.country === feature.properties.country);
      const target = transform.k < 1.4 && countryFeatures.length > 1 ? { type: "FeatureCollection", features: countryFeatures } : feature;
      const [[x0, y0], [x1, y1]] = path.bounds(target);
      const k = Math.max(1, Math.min(6, 0.8 / Math.max((x1 - x0) / width, (y1 - y0) / height)));
      moveZoom((s) => zoom.transform(s, d3.zoomIdentity.translate(width / 2, height / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2)));
    }

    // The selected site. Beside the map it slides in from the right. On a phone it opens as a compact card
    // at the bottom of the map. The card replaces the small popup for sites.
    const card = figure.append("div").attr("class", "dc-site-panel").attr("aria-hidden", "true");
    let selectedKey = null;
    let lastGroups = [];
    function selectSite(key, fromClick = true) {
      selectedKey = key;
      phaseG.selectAll("g.dc-phase-point").classed("dc-site-selected", (d) => d.key === selectedKey);
      const group = lastGroups.find((g) => g.key === key);
      if (!group) { closeCard(); return; }
      renderSiteCard(card, group, measure, tab, year, closeCard);
      card.classed("dc-site-panel-open", true).attr("aria-hidden", null);
      if (!fromClick) return;
      card.select(".dc-site-card-close").node()?.focus({ preventScroll: true });
      // If the site lies under the panel, the map moves left so the site stays in view.
      const node = phaseG.selectAll("g.dc-phase-point").filter((d) => d.key === key).node();
      if (node && !compact) {
        const site = node.getBoundingClientRect(), panel = card.node().getBoundingClientRect();
        const k = svg.node().getBoundingClientRect().width / width;
        const overlap = site.right + 24 - panel.left;
        if (overlap > 0) moveZoom((s) => zoom.translateBy(s, -overlap / k / transform.k, 0));
      }
      if (compact) {
        const below = card.node().getBoundingClientRect().bottom + 12 - global.innerHeight;
        if (below > 0) global.scrollBy({ top: below, behavior: prefersReducedMotion() ? "auto" : "smooth" });
      }
    }
    function closeCard() {
      selectedKey = null;
      phaseG.selectAll("g.dc-phase-point").classed("dc-site-selected", false);
      card.classed("dc-site-panel-open", false).attr("aria-hidden", "true");
    }

    // Full build-out, or modelled capacity in operation in one year. Shown once the annual results have loaded.
    let year = null;
    let timeline = null;
    const yearsBar = root.append("div").attr("class", "dc-map-years").attr("hidden", true);
    function yearMap() {
      if (!year || !timeline) return null;
      const rows = new Map();
      for (const row of timeline.rows) if (row.year === year && row.family === tab) rows.set(row.project_id, row);
      return rows;
    }
    function setTimeline(value) {
      timeline = value;
      if (!timeline) return;
      const years = timeline.years;
      yearsBar.attr("hidden", null).selectAll("*").remove();
      yearsBar.append("span").attr("class", "dc-measure-label").text("Show");
      const segments = yearsBar.append("div").attr("class", "dc-measure-segments");
      const full = segments.append("button").attr("type", "button").attr("class", "dc-measure-button").text("Full build-out");
      const inYear = segments.append("button").attr("type", "button").attr("class", "dc-measure-button").text("By year");
      const slider = yearsBar.append("label").attr("class", "dc-map-year-range");
      const input = slider.append("input").attr("type", "range").attr("min", years[0]).attr("max", years.at(-1)).attr("step", 1)
        .attr("value", years.at(-1)).attr("aria-label", "Year for modelled capacity in operation");
      const shown = slider.append("output");
      const sync = () => {
        full.attr("aria-pressed", String(!year));
        inYear.attr("aria-pressed", String(Boolean(year)));
        slider.attr("hidden", year ? null : true);
        shown.text(year ? `${year} · model result` : "");
      };
      full.on("click", () => { year = null; sync(); render(); });
      inYear.on("click", () => { year = Number(input.property("value")); sync(); render(); });
      input.on("input", (event) => { year = Number(event.target.value); sync(); render(); });
      sync();
    }

    // Switching between the wide and the narrow layout redraws the map.
    const onResize = () => {
      const nextLayout = mapLayout();
      if (nextLayout !== layoutName) {
        layoutName = nextLayout;
        compact = layoutName !== "wide";
        fitMap();
        setZoomExtent();
        svg.call(zoom.transform, d3.zoomIdentity);
        closeCard();
        phaseG.attr("data-drawn", null);
        zonePaths.attr("d", path);
        drawNeighbours();
        drawZoneLabels();
        render();
        return;
      }
    };
    global.addEventListener("resize", onResize);
    global.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (selectedKey) closeCard();
    });
    function render() {
      popup.attr("hidden", true);
      zonePaths.classed("highlight", false);
      const view = trackerView(data, tab, measure, hq, type, yearMap());
      root.attr("data-measure", measure).attr("data-tab", tab).attr("data-hq", hq).attr("data-type", type);
      svg.attr("aria-label", `Planned datacenter sites: ${TABS.find((t) => t.id === tab).label}`);
      zonePaths.attr("fill", LAND_FILL)
        .attr("aria-label", (d) => `${d.properties.bidding_zone}: ${capacityLabel(view.zones[d.properties.bidding_zone], measure)}`);
      const groups = highlightGroups(buildPhaseGroups(trackerView(data, tab, measure, "none", type, yearMap()), data), hq);
      lastGroups = groups;
      renderPhaseLayer(phaseG, popup, groups, projection, width, height, measure, tab, true, compact ? MOBILE_SITE_SCALE : 1, year);
      phaseG.selectAll("g.dc-phase-point").on("mouseenter.country", (event, d) => hoverCountry(d.country)).on("mouseleave.country", leaveCountry)
        .on("click", (event, d) => { event.stopPropagation(); phaseG.select(".dc-hover-layer").style("opacity", 0); root.selectAll(".dc-site-tip").style("opacity", 0); selectSite(d.key); })
        .on("keydown", (event, d) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectSite(d.key); } })
        .classed("dc-site-selected", (d) => d.key === selectedKey);
      // A change of selection keeps the zoom. The circles are placed for the current zoom at once.
      if (transform.k > 1.01) applyMainZoom(transform);
      if (selectedKey) selectSite(selectedKey, false);
      root.classed("dc-hq-highlighting", hq !== "none");
      zoneLabelG.selectAll("text.dc-zone-label").style("stroke", LAND_FILL)
        .select(".dc-zone-label-value").each(function (d) {
          // A changed zone total fades out and the new one fades in, at the same pace as the circles.
          const detail = view.zones[d.properties.bidding_zone];
          const next = detail?.high > 0 ? zoneValueLabel(detail, measure) : "";
          const value = d3.select(this);
          if (this.__text === next) return;
          const first = this.__text === undefined;
          this.__text = next;
          if (first || prefersReducedMotion()) { value.interrupt().style("opacity", 1).text(next); return; }
          value.interrupt().transition().duration(200).style("opacity", 0)
            .on("end", () => value.text(next).transition().duration(320).style("opacity", 1));
        });
      // The text above the map says what a circle shows.
      renderMapLegend(root, measure, tab, year);
      const variants = TABS.flatMap((item) => ["mw", "twh"].map((m) => ({ key: `${item.id}:${m}`, text: circleText(item.id, m, hq, type, year) })));
      headlineNode.selectAll("p").data(variants, (d) => d.key).join("p").text((d) => d.text)
        .classed("dc-map-headline-current", (d) => d.key === `${tab}:${measure}`)
        .attr("aria-hidden", (d) => (d.key === `${tab}:${measure}` ? null : "true"));
    }
    const unsubscribe = shared.subscribe(state => { tab = state.family;measure = state.measure;hq = state.hq;type = state.type;render(); });
    return { setTimeline(value) { setTimeline(value); render(); }, disconnect() {backgroundAbort.abort();sizeObserver?.disconnect();unsubscribe();global.removeEventListener("resize", onResize);root.selectAll("*").remove();} };
  }
  const api = { COUNTRY_OFFSETS, ZONE_ANCHORS, mapProjection, applyMapZoom, mount, mountControls, matchesHq, matchesType, gwRange, highlightGroups, mapState, mapRows, projectClasses, trackerView, capacityLabel, circleText, consumptionFor, shareLabel, CLASSES, CLASS_LABELS, CLASS_TEXT, TABS, DEFAULT_MEASURE };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.DCTrackerMap = api;
})(typeof window === "undefined" ? globalThis : window);

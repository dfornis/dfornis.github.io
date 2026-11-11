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
  // The blue part of a circle is slightly see-through, so overlapping sites in a cluster can be told apart.
  const SHARE_OPACITY = 0.66;
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
  // The share of a site that is included in the selection, drawn as a level filled from the bottom.
  // The filled area is the share of the circle's area. The height is not, because the circle is narrower
  // at the bottom. At half the area the level is exactly in the middle.
  const circlePath = (r) => `M${-r},0A${r},${r} 0 1,0 ${r},0A${r},${r} 0 1,0 ${-r},0Z`;
  function levelHeight(r, share) {
    const target = share * Math.PI * r * r;
    let lo = 0, hi = 2 * r;
    for (let i = 0; i < 30; i++) {
      const h = (lo + hi) / 2, d = r - h;
      const area = r * r * Math.acos(Math.max(-1, Math.min(1, d / r))) - d * Math.sqrt(Math.max(0, r * r - d * d));
      if (area < target) lo = h; else hi = h;
    }
    return (lo + hi) / 2;
  }
  function sharePath(r, share) {
    if (!(r > 0 && share > 0)) return "";
    if (share >= 0.999) return circlePath(r);
    const h = levelHeight(r, share), y = r - h, x = Math.sqrt(Math.max(0, r * r - y * y));
    return `M${-x},${y}A${r},${r} 0 ${h > r ? 1 : 0},0 ${x},${y}Z`;
  }
  // A short line on how much of a site is included in the selection, at the high end of the range.
  // Used by the hover label and the project card.
  function siteStatusText(group, measure, tabLabel) {
    const value = siteValue(group, measure), total = siteTotal(group, measure);
    const where = `in ${tabLabel}`;
    if (!(total > 0)) return "No stated size";
    if (!(value > 0)) return `${siteAmount(total, measure)} announced, none ${where}`;
    if (value >= total - 1e-6) return `${siteAmount(total, measure)} ${where}`;
    return `${siteAmount(value, measure)} of ${siteAmount(total, measure)} ${where}`;
  }
  // Blue means included in the selection and grey means not included, on the map and in the project card.
  // The shades of blue in the card and the table only tell the stages apart.
  const OUT_COLOUR = "#8d8781";
  // A site with nothing in the selection is a small grey dot. It grows into a circle once the selection
  // includes some of it. Positions are set from the full circle, so the dot sits where the circle will be.
  const EMPTY_RADIUS = 2.2;
  const EMPTY_OPACITY = 0.72;
  const discOpacity = (d) => (d.no_size ? 0 : d.empty ? EMPTY_OPACITY : 0.38);
  // The grey disc for a site, or a small dashed ring when the site has no stated size.
  function styleDisc(sel, noSize, opacity) {
    return sel.style("fill", noSize ? "none" : OUT_COLOUR).style("fill-opacity", noSize ? 0 : opacity)
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
  function trackerView(data, tab = DEFAULT_TAB, measure = DEFAULT_MEASURE, hq = "none", type = "all") {
    const selectedType = Array.isArray(type) ? type : typeof type === "string" && type !== "all" ? [type] : [];
    const selected = TABS.find((item) => item.id === tab).classes;
    const values = projectClasses(data);
    const unknown = new Set(data.coverage.projects_without_mw);
    const metadata = new Map(data.project_scenarios.map((row) => [row.project_id, row]));
    const rows = data.projects.filter((project) => (hq === "none" || matchesHq(project, hq)) && matchesType(project, selectedType)).map((project) => {
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
    hqControl.append("label").attr("class", "dc-hq-label").attr("for", `${idPrefix}-hq`).text("HQ");
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
      const info = root.select(".dc-type-info").node();
      if (info && !info.hidden) {
        if (event.type === "keydown" && event.key === "Escape") {
          event.stopPropagation();
          toggleTypeInfo(root.select(".dc-type-control"), false);
          root.select(".dc-info-button").node().focus();
          return;
        }
        if (event.type === "click" && !info.contains(event.target)) toggleTypeInfo(root.select(".dc-type-control"), false);
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
      .text((f) => f.properties.bidding_zone);
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
    labels.attr("transform", function () { return `translate(${t.apply(this.__base).join(",")})`; });
  }

  // The zone total sits next to the zone name and follows the selection. Only the high value is shown.
  function zoneValueLabel(detail, measure) {
    const high = detail?.high || 0;
    if (measure === "mw") return `${gwRange(high, high)} GW`;
    const digits = high >= 10 ? 0 : 1;
    return `${high.toLocaleString("en-US", { minimumFractionDigits: high === 0 ? 0 : digits, maximumFractionDigits: digits })} TWh`;
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

    // Each site is a grey disc whose size shows all announced capacity at the site. The share included in
    // the selection fills the disc from the bottom. The disc does not change with the selection, so
    // positions stay put and only the level rises or falls. A site without a stated size is a small dashed ring.
    // A small nudge only. Circles may still overlap. Smaller circles are drawn on top.
    const sized = projectedPoints.map((group) => {
      const value = siteValue(group, measure);
      const total = siteTotal(group, measure);
      const empty = total > 0 && !(value > 0);
      return { ...group, site_value: value, site_total: total, no_size: !(total > 0), empty,
        radius: siteRadius(total, measure) * radiusScale };
    });
    // r is the drawn size. radius is the full circle, used for the layout.
    const points = resolvePhaseOverlaps(sized, width, height, { minPadding: 1, maxShift: 9, overlap: 1 })
      .map((d) => ({ ...d, r: d.empty ? EMPTY_RADIUS * radiusScale : d.radius }))
      .sort((a, b) => b.r - a.r);
    const tabLabel = TABS.find((item) => item.id === tab).label;
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
          g.append("path").attr("class", "dc-phase-share").style("fill", "var(--dc-blue)").style("fill-opacity", SHARE_OPACITY);
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
      g.append("circle").attr("class", "dc-hover-halo").style("fill", "var(--dc-blue)").style("fill-opacity", 0.2).style("stroke", "none");
      g.append("circle").attr("class", "dc-hover-disc");
      g.append("path").attr("class", "dc-hover-share").style("fill", "var(--dc-blue)").style("fill-opacity", 0.9);
      return g;
    });
    const tipHost = d3.select(popupG.node().parentNode);
    const tip = tipHost.selectAll("div.dc-site-tip").data([null]).join("div").attr("class", "dc-site-tip").attr("aria-hidden", "true").style("opacity", 0);
    function hideHover() { hover.style("opacity", 0); tip.style("opacity", 0); }
    function showHover(event, d) {
      hover.attr("transform", `translate(${d.xy[0]},${d.xy[1]}) scale(${d.zoomScale || 1})`).style("opacity", 1);
      hover.select(".dc-hover-halo").attr("r", d.r + Math.max(3.5, d.r * 0.3));
      styleDisc(hover.select(".dc-hover-disc").attr("r", d.r), d.no_size, d.empty ? 0.85 : 0.52);
      hover.select(".dc-hover-share").attr("d", sharePath(d.r, siteShare(d)));
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
    groups.select("circle.dc-phase-disc").each(function (d) {
      const current = this.style.fillOpacity;
      styleDisc(d3.select(this), d.no_size, discOpacity(d));
      if (current !== "" && !d.no_size) this.style.fillOpacity = current;
    })
      .transition().duration(duration).ease(d3.easeCubicInOut)
      .attr("r", (d) => d.r).style("fill-opacity", discOpacity);
    // The level moves from its current height and size to the new ones. The state is kept on each frame,
    // so an interrupted change continues from where it was.
    groups.select("path.dc-phase-share")
      .transition().duration(duration).ease(d3.easeCubicInOut)
      .attrTween("d", function (d) {
        const from = this.__share || { r: d.r, share: 0 };
        const to = { r: d.no_size ? 0 : d.r, share: siteShare(d) };
        const r = d3.interpolate(from.r, to.r), share = d3.interpolate(from.share, to.share);
        return (t) => {
          this.__share = { r: r(t), share: share(t) };
          return sharePath(this.__share.r, this.__share.share);
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
      // Each slot is as wide as its circle or its label, whichever is wider, so labels never touch.
      const probe = svg.append("text").text(`${format(value)} ${scale.unit}`);
      const textWidth = probe.node().getComputedTextLength ? probe.node().getComputedTextLength() : 44;
      probe.remove();
      const r = radii[i], slot = Math.max(r * 2, 44, textWidth + 6);
      const cx = x + slot / 2;
      svg.append("circle").attr("cx", cx).attr("cy", h - labelHeight - r - 2).attr("r", r)
        .style("fill", "var(--dc-blue)").style("fill-opacity", SHARE_OPACITY).style("stroke", "#fbf8f0").style("stroke-width", 0.8);
      svg.append("text").attr("x", cx).attr("y", h - 3).attr("text-anchor", "middle").text(`${format(value)} ${scale.unit}`);
      x += slot + gap;
    });
    svg.attr("width", x - gap + 2);
    return svg;
  }

  // The share symbol and the no-size ring, after the size key. The same for every selection.
  // Each symbol's label sits on the same baseline as the size labels, with the symbol in front of it.
  // The two symbols share one group, so on a narrow screen they wrap together to a line below the sizes.
  // The row is bottom-aligned, so the baselines match.
  function drawSymbolKey(container, k, iconRadius = 7, tab = DEFAULT_TAB) {
    const group = container.append("div").attr("class", "dc-site-key-symbols");
    const item = (drawSymbol, symbolWidth, text) => {
      const h = Math.max(20, iconRadius * 2 + 4);
      const svg = group.append("svg").attr("class", "dc-site-key-sizes dc-site-key-item").attr("height", h).attr("aria-hidden", true);
      drawSymbol(svg.append("g").attr("transform", `translate(${symbolWidth / 2 + 1},${h - 3 - Math.max(3.8, iconRadius - 3.2)})`));
      const label = svg.append("text").attr("x", symbolWidth + 7).attr("y", h - 3).text(text);
      const w = Math.ceil(label.node().getComputedTextLength ? label.node().getComputedTextLength() : 200);
      svg.attr("width", symbolWidth + 9 + w);
    };
    item((g) => {
      styleDisc(g.append("circle").attr("r", iconRadius), false, 0.38);
      g.append("path").attr("d", sharePath(iconRadius, 0.4)).style("fill", "var(--dc-blue)").style("fill-opacity", SHARE_OPACITY);
    }, iconRadius * 2, "Included in the selection");
    // Only a selection narrower than All announced can leave a site with nothing in it.
    if (tab !== "announced") {
      const dot = Math.max(1.6, EMPTY_RADIUS * k);
      item((g) => styleDisc(g.append("circle").attr("r", dot), false, EMPTY_OPACITY), 2 * dot, "None in the selection");
    }
    const ring = SITE_RING_RADIUS * k;
    item((g) => g.append("circle").attr("r", ring).style("fill", "none").style("stroke", "#8b969c").style("stroke-width", 0.9).style("stroke-dasharray", "1.5 1.2"),
      2 * ring, "No stated size");
  }


  // Fixed classes keep area colours comparable between stage, HQ and type selections.
  const ZONE_COLOURS = ["#e0d5c6", "#dbcebb", "#d5c6af", "#cebba1"];
  const ZONE_SCALES = {
    mw: { limits: [500, 2000, 5000], labels: ["0–0.5", "0.5–2", "2–5", "5+"], unit: "GW" },
    twh: { limits: [2, 10, 30], labels: ["0–2", "2–10", "10–30", "30+"], unit: "TWh/year" },
  };
  function zoneFill(detail, measure = DEFAULT_MEASURE) {
    if (!(detail?.high > 0)) return "var(--dc-land)";
    const index = ZONE_SCALES[measure].limits.findIndex((limit) => detail.high <= limit);
    return ZONE_COLOURS[index < 0 ? ZONE_COLOURS.length - 1 : index];
  }


  // Both map views share the same classes, labels and screen-sized key.
  function renderZoneKey(container, measure, { x, y, k = 1, barHeight = 132, focus = false }) {
    const barWidth = 7, scale = ZONE_SCALES[measure];
    const key = container.selectAll("g.dc-zone-key").data([null]).join("g")
      .attr("class", focus ? "dc-zone-key dc-focus-zone-key" : "dc-zone-key")
      .attr("role", "img").attr("aria-label", `Quantified zone totals in ${scale.unit}, upper estimate`)
      .attr("transform", `translate(${x},${y}) scale(${1 / k})`);
    key.selectAll("text.dc-zone-key-unit").data([null]).join("text").attr("class", "dc-zone-key-unit")
      .attr("x", barWidth).attr("y", -12).attr("text-anchor", "end").text(measure === "twh" ? "TWh" : scale.unit);
    const rows = key.selectAll("g.dc-zone-key-step").data(ZONE_COLOURS).join("g").attr("class", "dc-zone-key-step");
    rows.selectAll("rect").data((colour) => [colour]).join("rect")
      .attr("x", 0).attr("y", (d) => (3 - ZONE_COLOURS.indexOf(d)) * barHeight / 4)
      .attr("width", barWidth).attr("height", barHeight / 4 + 0.1).attr("fill", (d) => d);
    rows.selectAll("text").data((colour) => [colour]).join("text").attr("text-anchor", "end")
      .attr("x", -8).attr("y", (d) => (3 - ZONE_COLOURS.indexOf(d) + 0.5) * barHeight / 4 + 4)
      .text((d) => scale.labels[ZONE_COLOURS.indexOf(d)]);
    return key;
  }

  function renderMapLegend(root, measure, tab = DEFAULT_TAB) {
    // The key occupies the empty lower right corner, without a separate surface.
    const host = root.select(".dc-scenario-svg-wrap");
    const legend = (host.empty() ? root : host).selectAll(".dc-map-scale").data([null]).join("div").attr("class", "dc-map-scale dc-site-key");
    legend.selectAll("*").remove();
    // The map is drawn in a 760-unit viewBox and scaled to the page. The key uses the same scale.
    const mapSvg = root.select(".dc-scenario-svg").node();
    const k = mapSvg && mapSvg.getBoundingClientRect().width ? mapSvg.getBoundingClientRect().width / 760 : 1;
    const mobileScale = root.classed("dc-map-compact") ? MOBILE_SITE_SCALE : 1;
    drawSizeKey(legend, measure, k * mobileScale);
    drawSymbolKey(legend, k * mobileScale, 7 * mobileScale, tab);
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
  function circleText(tab = DEFAULT_TAB, measure = DEFAULT_MEASURE, hq = "none", type = []) {
    const label = TABS.find((item) => item.id === tab).label;
    const hqText = hq === "none" ? "" : `, from developers headquartered ${{ domestic: "in the project's own country", other_europe: "elsewhere in Europe", outside_europe: "outside Europe" }[hq]}`;
    const what = measure === "mw" ? "power" : "yearly electricity use";
    const selectedTypes = Array.isArray(type) ? type : type === "all" ? [] : [type];
    const typeText = selectedTypes.length ? ` for ${selectedTypes.join(" or ")} projects` : "";
    const size = `Announced ${what} per site${typeText}${hqText}, at the upper value.`;
    return tab === "announced" ? size : `${size} Blue shows how much is in ${label}.`;
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
    // With annual electricity use, a fourth column gives the share of each zone's electricity use in 2025.
    const withShare = view.measure === "twh" && consumptionFor(data, "SE") !== null;
    list.classed("dc-zone-class-list-share", withShare);
    const heading = list.selectAll(".dc-class-chart-heading").data([null]).join("div").attr("class", "dc-class-chart-heading");
    heading.selectAll("span").data(["Bidding zone", `Included capacity · ${unit}`, `Low–high · ${unit}`, ...(withShare ? ["Of 2025 use"] : [])])
      .join("span").text((d) => d);
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
        row.append("span").attr("class", "dc-zone-class-share");
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
        row.select(".dc-zone-class-share").text(withShare ? useShare(data, zone, detail, view.measure) || "0%" : "");
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

  // An equal-area projection, so countries and zones keep their true relative sizes.
  const mapProjection = () => d3.geoConicEqualArea().parallels([57, 68]).rotate([-17, 0]);
  // The overview fits the Nordic zones. Neighbours do not change its scale.
  const mapLayout = () => global.innerWidth <= 600 ? "mobile" : global.innerWidth <= 900 ? "compact" : "wide";
  const MAP_LAYOUTS = {
    wide: { extent: [[150, 36], [610, 506]], bottom: 84 },
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
      if (Math.abs(rendered - keyWidth) > 2 && keyWidth) renderMapLegend(root, measure, tab);
      drawZoneKey();
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

    function drawZoneKey() {
      const rendered = svg.node().getBoundingClientRect().width;
      if (!rendered) return;
      const k = rendered / width, barWidth = 7;
      const barHeight = compact ? (rendered < 340 ? 80 : 100) : 132;
      const pad = compact ? 12 : 22;
      const bounds = path.bounds(geojson);
      const centre = bounds[0][1] + (bounds[1][1] - bounds[0][1]) * (compact ? 0.80 : 0.72);
      const keyY = Math.max(24 / k, Math.min(height - (pad + barHeight) / k, centre - barHeight / (2 * k)));
      renderZoneKey(svg, measure, {
        x: width - (pad + barWidth) / k, y: keyY, k, barHeight,
      });
    }

    const popup = root.append("div").attr("class", "dc-map-popup-host").attr("hidden", true);
    const zonePaths = mapG.selectAll("path").data(geojson.features).join("path").attr("class", "dc-zone")
      .attr("data-zone", (d) => d.properties.bidding_zone).attr("tabindex", 0).attr("role", "button")
      .attr("d", path)
      .on("click", (event, d) => openCountry(d.properties.country, d.properties.bidding_zone))
      .on("mouseenter.country", (event, d) => hoverCountry(d.properties.country))
      .on("mouseleave.country", leaveCountry)
      .on("keydown", (event, d) => {if (event.key === "Enter" || event.key === " ") {event.preventDefault();openCountry(d.properties.country, d.properties.bidding_zone);}});
    // Pointing at a zone or a circle darkens its whole country, as a hint that a click enlarges it.
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

    // Country focus: the clicked country is redrawn to fill the window, over a blurred page.
    // The focus SVG uses one unit per screen pixel. Circles are scaled to the same pixel size
    // as in the main map, so the size key still applies.
    const focus = root.append("div").attr("class", "dc-focus").attr("hidden", true).attr("role", "dialog");
    // The same controls as on the page, in a bar at the top of the enlarged view. They share their state with the page.
    const focusControls = focus.append("div").attr("class", "dc-focus-controls");
    if (shared) mountControls(focusControls.node(), shared, data, "dc-focus");
    // A plain band behind the name and key. It shows only when zoomed in, so the land passes under it cleanly.
    const focusHeadband = focus.append("div").attr("class", "dc-focus-headband").attr("aria-hidden", "true");
    const focusTitle = focus.append("div").attr("class", "dc-focus-title");
    focus.append("button").attr("type", "button").attr("class", "dc-focus-close").attr("aria-label", "Close country view").text("×")
      .on("click", (event) => { event.stopPropagation(); closeCountry(); });
    const focusSvg = focus.append("svg").attr("class", "dc-focus-svg");
    const focusG = focusSvg.append("g").attr("class", "dc-focus-country");
    // Zoom in the enlarged view, by pinching, scrolling or a trackpad. The land grows, while circles and names
    // grow more slowly than the land and move apart. Double-click or the button resets it.
    let focusTransform = d3.zoomIdentity;
    const focusReset = focus.append("button").attr("type", "button").attr("class", "dc-focus-reset").attr("hidden", true).text("Reset zoom")
      .on("click", (event) => { event.stopPropagation(); resetFocusZoom(true); });
    const focusZoom = d3.zoom().scaleExtent([1, 8]).clickDistance(4).on("zoom", (event) => applyFocusZoom(event.transform));
    focusSvg.call(focusZoom).on("dblclick.zoom", null).on("dblclick.reset", () => resetFocusZoom(true));
    function resetFocusZoom(animate) {
      const target = animate && !reduceMotion() ? focusSvg.transition().duration(300) : focusSvg;
      target.call(focusZoom.transform, d3.zoomIdentity);
    }
    function applyFocusZoom(t, smooth = false) {
      focusTransform = t;
      applyMapZoom(focusG.select(".dc-focus-zone-layer"), focusG.select(".dc-phase-layer"),
        focusSvg.selectAll(".dc-focus-inside-label"), t, smooth);
      focusReset.attr("hidden", t.k > 1.01 ? null : true);
      focus.classed("dc-focus-zoomed", t.k > 1.01).classed("dc-focus-details-hidden", t.k >= 1.35);
      focus.style("--dc-focus-detail-opacity", Math.max(0, 1 - (t.k - 1) / 0.35));
    }
    let focusCountry = null;
    const reduceMotion = () => global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // A click anywhere outside the country closes the view. Clicks on the main map are the ones that open it.
    const closeOnOutsideClick = (event) => {
      if (!focusCountry || event.target.closest(".dc-focus-country, .dc-project-popup, .dc-focus-title, .dc-focus-zones, .dc-focus-controls, .dc-focus-close, .dc-scenario-svg")) return;
      closeCountry();
    };
    global.document.addEventListener("click", closeOnOutsideClick);
    // Switching between the wide and the narrow layout redraws the map. Otherwise only an open country view is redrawn.
    const onResize = () => {
      const nextLayout = mapLayout();
      if (nextLayout !== layoutName) {
        layoutName = nextLayout;
        compact = layoutName !== "wide";
        fitMap();
        phaseG.attr("data-drawn", null);
        zonePaths.attr("d", path);
        drawNeighbours();
        drawZoneLabels();
        render();
        return;
      }
      if (focusCountry) {
        // The layout changes with the window, so the zoom starts over.
        focusSvg.call(focusZoom.transform, d3.zoomIdentity);
        drawCountry(focusCountry.country, focusCountry.zone, false);
      }
    };
    global.addEventListener("resize", onResize);
    // Screen pixels per map unit in the main map.
    const mainScale = () => { const rect = svg.node().getBoundingClientRect(); return { k: rect.width / width, left: rect.left, top: rect.top }; };
    // The enlarged view has the page's controls on top, then the country name and the key.
    // The zone names are written on the map. On a wide screen the zones and their values form a small table
    // that floats beside the country. On a narrow screen they sit in a grid under the country.
    const focusNarrow = () => global.innerWidth < 600;
    // One unit for all sizes in the wide view, from the window size, so text, circles and key stay in proportion.
    const focusUnit = () => Math.max(1, Math.min(1.35, Math.min(global.innerWidth, global.innerHeight) / 900));
    // One circle scale for every country, so countries can be compared with each other.
    const focusRadiusScale = () => mainScale().k * (compact ? MOBILE_SITE_SCALE : 1);
    const focusZones = focus.append("div").attr("class", "dc-focus-zones").attr("hidden", true);
    // The space the header and the zone grid take, set when a country is drawn.
    // offset is the height of the site's menu bar. The enlarged view starts below it, so the menu stays usable.
    const focusFrame = { top: 112, bottom: 0, offset: 0 };
    function focusSetup(country) {
      const W = global.innerWidth, H = global.innerHeight - focusFrame.offset;
      const features = geojson.features.filter((f) => f.properties.country === country);
      const collection = { type: "FeatureCollection", features };
      // On a wide screen both sides leave room for the table, since it may go on either side.
      const side = focusNarrow() ? 16 : 190 * focusUnit();
      const extent = focusNarrow()
        ? [[side, focusFrame.top], [W - side, H - focusFrame.bottom - 20]]
        : [[side, focusFrame.top], [W - side, H - 40 * focusUnit()]];
      const focusProjection = mapProjection().fitExtent(extent, collection);
      return { W, H, features, collection, focusProjection, focusPath: d3.geoPath(focusProjection) };
    }
    // Places the large drawing over the country's position in the main map, so it can grow from there.
    function countryStartTransform(focusPath, features) {
      const target = focusPath.bounds({ type: "FeatureCollection", features });
      const main = mainScale();
      const bounds = features.map((f) => translatedBounds(f, path));
      const x0 = main.left + main.k * d3.min(bounds, (b) => b[0][0]), y0 = main.top + main.k * d3.min(bounds, (b) => b[0][1]);
      const x1 = main.left + main.k * d3.max(bounds, (b) => b[1][0]);
      const k = (x1 - x0) / (target[1][0] - target[0][0]);
      return `translate(${x0 - k * target[0][0]},${y0 - focusFrame.offset - k * target[0][1]}) scale(${k})`;
    }
    // A point for a zone: the centre of its largest piece of land, so Bornholm does not pull DK2 out to sea.
    function zoneAnchor(feature, focusPath) {
      if (feature.geometry.type !== "MultiPolygon") return focusPath.centroid(feature);
      const parts = feature.geometry.coordinates.map((coordinates) => ({ type: "Polygon", coordinates }));
      return focusPath.centroid(parts.reduce((a, b) => (focusPath.area(a) >= focusPath.area(b) ? a : b)));
    }
    const highlightFocusZone = (zone) => focusG.selectAll(".dc-focus-zone").classed("dc-focus-zone-highlight", (d) => d.properties.bidding_zone === zone);
    // The zone table for a wide screen. It floats beside the country, centred on the zones' mean height,
    // on the side nearest the zones. The rows go from north to south, and the country total comes last.
    function placeZoneTable(layer, features, focusPath, focusProjection, view, H, top, country) {
      const u = focusUnit();
      // With annual electricity use, a third column gives the share of the zone's electricity use in 2025.
      const withShare = measure === "twh" && consumptionFor(data, country) !== null;
      const rowHeight = 30 * u, nameWidth = 52 * u, tableWidth = (withShare ? 196 : 150) * u;
      const items = features.map((f) => ({ zone: f.properties.bidding_zone, anchor: zoneAnchor(f, focusPath) }))
        .sort((a, b) => a.anchor[1] - b.anchor[1]);
      const rowsHeight = rowHeight * (items.length - 1);
      const middle = d3.mean(items, (d) => d.anchor[1]);
      const first = Math.max(top + 12 * u, Math.min(H - 64 * u - rowsHeight - rowHeight, middle - rowsHeight / 2));
      items.forEach((d, k) => { d.y = first + k * rowHeight; });
      // The land the table must clear: the country's outline over the height of the table.
      const points = [];
      const walk = (c) => { if (typeof c[0] === "number") { const p = focusProjection(c); if (p) points.push(p); } else c.forEach(walk); };
      features.forEach((f) => walk(f.geometry.coordinates));
      const y0 = items[0].y - rowHeight, y1 = items[items.length - 1].y + 2 * rowHeight;
      const band = points.filter((p) => p[1] >= y0 && p[1] <= y1);
      const near = band.length ? band : points;
      const edge = (side) => (side > 0 ? d3.max(near, (p) => p[0]) + 48 * u : d3.min(near, (p) => p[0]) - 48 * u);
      const distance = (side) => d3.sum(items, (d) => Math.abs(edge(side) - d.anchor[0]));
      const side = items.length === 1 || distance(1) <= distance(-1) ? 1 : -1;
      const x = side > 0 ? edge(1) : edge(-1) - tableWidth;
      const table = layer.append("g").attr("class", "dc-focus-table").attr("data-side", side > 0 ? "right" : "left").attr("transform", `translate(${x},0)`);
      // A card behind the table. It shows only when zoomed in, so the table stays readable over the land.
      const cardTop = items[0].y - rowHeight * (withShare ? 1.15 : 0.62) - 10 * u;
      const cardBottom = items[items.length - 1].y + (items.length > 1 ? rowHeight + 8 * u : 0) + rowHeight * 0.38 + 10 * u;
      table.append("rect").attr("class", "dc-focus-table-card").attr("x", -16 * u).attr("y", cardTop)
        .attr("width", tableWidth + 32 * u).attr("height", cardBottom - cardTop).attr("rx", 10 * u);
      const rows = table.selectAll("g").data(items).join("g").attr("class", "dc-focus-table-row")
        .attr("transform", (d) => `translate(0,${d.y})`).attr("tabindex", 0).attr("role", "button")
        .attr("aria-label", (d) => `${d.zone}: ${zoneValueLabel(view.zones[d.zone], measure)}`)
        .on("mouseenter focus", (event, d) => highlightFocusZone(d.zone))
        .on("mouseleave blur", () => highlightFocusZone(null))
        .on("click", (event, d) => { event.stopPropagation(); openZone(d.zone, event); })
        .on("keydown", (event, d) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openZone(d.zone, event); } });
      // An invisible box makes the whole row easy to point at.
      rows.append("rect").attr("x", -4 * u).attr("y", -rowHeight * 0.62).attr("width", tableWidth + 8 * u).attr("height", rowHeight).attr("fill", "transparent");
      rows.append("text").attr("class", "dc-focus-table-name").text((d) => d.zone);
      rows.append("text").attr("class", "dc-focus-table-value").attr("x", nameWidth).text((d) => zoneValueLabel(view.zones[d.zone], measure));
      if (withShare) {
        rows.append("text").attr("class", "dc-focus-table-share").attr("x", tableWidth).attr("text-anchor", "end")
          .text((d) => useShare(data, d.zone, view.zones[d.zone], measure) || "0%");
        table.append("text").attr("class", "dc-focus-table-share-head").attr("x", tableWidth).attr("text-anchor", "end")
          .attr("y", items[0].y - rowHeight * 0.8).text("Share of 2025 use");
      }
      // The country total after a rule. A country with one zone needs no total.
      if (items.length > 1) {
        const total = table.append("g").attr("class", "dc-focus-table-total").attr("transform", `translate(0,${items[items.length - 1].y + rowHeight + 8 * u})`);
        total.append("line").attr("x1", 0).attr("x2", tableWidth).attr("y1", -21 * u).attr("y2", -21 * u);
        total.append("text").attr("class", "dc-focus-table-name").text("Total");
        total.append("text").attr("class", "dc-focus-table-value").attr("x", nameWidth).text(zoneValueLabel(view.countries[country], measure));
        if (withShare) total.append("text").attr("class", "dc-focus-table-share").attr("x", tableWidth).attr("text-anchor", "end")
          .text(useShare(data, country, view.countries[country], measure) || "0%");
      }
      return table;
    }
    function drawCountry(country, zone, animate) {
      const view = trackerView(data, tab, measure, hq, type);
      const narrow = focusNarrow();
      const u = focusUnit();
      const radiusScale = focusRadiusScale();
      const zones = geojson.features.filter((f) => f.properties.country === country).map((f) => f.properties.bidding_zone);
      focusSvg.selectAll(".dc-focus-labels").interrupt().style("opacity", null);
      focusZones.interrupt();
      focusTitle.interrupt();
      const navbar = document.querySelector("#navbar");
      focusFrame.offset = navbar ? Math.max(0, Math.ceil(navbar.getBoundingClientRect().bottom)) : 0;
      focus.classed("dc-focus-narrow", narrow).style("--dc-u", narrow ? null : u).style("top", `${focusFrame.offset}px`)
        .style("--dc-focus-bar", `${Math.ceil(focusControls.node().getBoundingClientRect().height)}px`);
      focusTitle.html("");
      const name = focusTitle.append("div").attr("class", "dc-focus-name");
      name.append("strong").text(countryLabel(country));
      // A country with one zone shows its total by the name. Otherwise the total sits under the zones.
      if (zones.length === 1) name.append("span").text(zoneValueLabel(view.countries[country], measure));
      const focusKey = focusTitle.append("div").attr("class", "dc-focus-key");
      drawSizeKey(focusKey, measure, radiusScale);
      // Narrow screen: the zones in a grid under the country, each with its value, and the total last.
      focusZones.attr("hidden", narrow ? null : true).selectAll("*").remove();
      if (narrow) {
        for (const z of zones) {
          const item = focusZones.append("button").attr("type", "button").attr("class", "dc-focus-zone-item")
            .on("click", (event) => { event.stopPropagation(); openZone(z, event); });
          item.append("strong").text(z);
          item.append("span").text(zoneValueLabel(view.zones[z], measure));
        }
        if (zones.length > 1) {
          const item = focusZones.append("div").attr("class", "dc-focus-zone-item dc-focus-zone-total");
          item.append("strong").text("Total");
          item.append("span").text(zoneValueLabel(view.countries[country], measure));
        }
      }
      // Fit the land below its name. Keys float over spare space and never shrink the country.
      focusFrame.top = Math.ceil(name.node().getBoundingClientRect().bottom) - focusFrame.offset + (narrow ? 24 : 32 * u);
      focusFrame.bottom = narrow ? Math.ceil(focusZones.node().getBoundingClientRect().height) + 20 : 0;
      focusHeadband.style("height", `${Math.ceil(focusTitle.node().getBoundingClientRect().bottom - focusControls.node().getBoundingClientRect().bottom) + (narrow ? 12 : 18 * u)}px`);
      const { W, H, features, focusProjection, focusPath } = focusSetup(country);
      focusSvg.attr("viewBox", `0 0 ${W} ${H}`);
      if (animate) focusG.selectAll("*").remove();
      focusZoom.extent([[0, 0], [W, H]]).translateExtent([[0, 0], [W, H]]);
      focusG.selectAll("g.dc-focus-zone-layer").data([null]).join("g").attr("class", "dc-focus-zone-layer")
        .selectAll("path").data(features, (d) => d.properties.bidding_zone).join("path").attr("class", "dc-zone dc-focus-zone")
        .attr("d", focusPath).attr("fill", (d) => zoneFill(view.zones[d.properties.bidding_zone], measure)).attr("tabindex", 0).attr("role", "button")
        .attr("aria-label", (d) => `${d.properties.bidding_zone}: ${capacityLabel(view.zones[d.properties.bidding_zone], measure)}`)
        .on("click", (event, d) => { event.stopPropagation(); openZone(d.properties.bidding_zone, event); });
      const phases = focusG.selectAll("g.dc-phase-layer").data([null]).join("g").attr("class", "dc-phase-layer");
      const groups = highlightGroups(buildPhaseGroups(trackerView(data, tab, measure, "none", type), data), hq).filter((g) => g.country === country);
      renderPhaseLayer(phases, popup, groups, focusProjection, W, H, measure, tab, false, radiusScale);
      // Text in its own layer, so it keeps its size while the country grows.
      const labelLayer = focusSvg.selectAll("g.dc-focus-labels").data([null]).join("g").attr("class", "dc-focus-labels");
      if (animate) labelLayer.selectAll("*").remove();
      // The zone names on the map. A country with one zone needs none.
      labelLayer.selectAll("text.dc-focus-inside-label").data(features.length > 1 ? features : []).join("text")
        .attr("class", "dc-focus-inside-label").attr("text-anchor", "middle")
        .style("stroke", (d) => zoneFill(view.zones[d.properties.bidding_zone], measure))
        .each(function (d) { this.__base = zoneAnchor(d, focusPath); })
        .attr("transform", function () { return `translate(${this.__base.join(",")})`; }).text((d) => d.properties.bidding_zone);
      if (!animate) labelLayer.selectAll("g.dc-focus-table").classed("dc-focus-table-current", false)
        .transition().duration(reduceMotion() ? 0 : 180).style("opacity", 0).remove();
      if (!narrow) {
        const table = placeZoneTable(labelLayer, features, focusPath, focusProjection, view, H, focusFrame.top, country)
          .classed("dc-focus-table-current", true);
        if (!animate && !reduceMotion()) table.style("opacity", 0).transition().duration(320).style("opacity", 1);
      }

      const tableOnRight = !narrow && labelLayer.select(".dc-focus-table-current").attr("data-side") === "right";
      const keyPad = narrow ? 18 : 30;
      const keyBottom = H - focusFrame.bottom - keyPad;
      const keyHeight = Math.min(narrow ? 100 : 132, Math.max(48, keyBottom - focusFrame.top - 24));
      const landBounds = focusPath.bounds({ type: "FeatureCollection", features });
      const landCentre = landBounds[0][1] + (landBounds[1][1] - landBounds[0][1]) * 0.72;
      const keyY = Math.max(focusFrame.top + 24, Math.min(keyBottom - keyHeight, landCentre - keyHeight / 2));
      renderZoneKey(labelLayer, measure, {
        x: tableOnRight ? keyPad + 52 : W - keyPad - 7,
        y: keyY, barHeight: keyHeight, focus: true,
      });
      focus.attr("aria-label", `${countryLabel(country)}, ${TABS.find((t) => t.id === tab).label}`);
      // A new country starts unzoomed. A change of selection keeps the zoom.
      if (animate) focusSvg.call(focusZoom.transform, d3.zoomIdentity);
      else applyFocusZoom(focusTransform, true);
      if (!animate) {
        labelLayer.style("opacity", null);
        focusTitle.interrupt().style("opacity", reduceMotion() ? 1 : 0.45).style("transform", null)
          .transition().duration(reduceMotion() ? 0 : 300).style("opacity", 1);
        focusZones.interrupt().style("opacity", reduceMotion() ? 1 : 0.45).style("transform", null)
          .transition().duration(reduceMotion() ? 0 : 300).style("opacity", 1);
        return;
      }
      const start = countryStartTransform(focusPath, features);
      const duration = reduceMotion() ? 0 : 520;
      focus.classed("dc-focus-open", false);
      focusG.attr("transform", start);
      phases.style("opacity", 0);
      labelLayer.style("opacity", 0);
      focusZones.style("opacity", 0).style("transform", "translateY(12px)");
      focusTitle.style("opacity", 0).style("transform", "translateY(8px)");
      focus.node().offsetWidth;
      focus.classed("dc-focus-open", true);
      focusG.transition().duration(duration).ease(d3.easeCubicOut).attr("transform", "translate(0,0) scale(1)");
      phases.transition().delay(duration * 0.55).duration(duration * 0.6).style("opacity", 1);
      labelLayer.transition().delay(duration * 0.7).duration(duration * 0.7).style("opacity", 1);
      focusTitle.transition().delay(duration * 0.3).duration(duration * 0.8).ease(d3.easeCubicOut).style("opacity", 1).style("transform", "translateY(0px)");
      focusZones.transition().delay(duration * 0.6).duration(duration * 0.7).ease(d3.easeCubicOut).style("opacity", 1).style("transform", "translateY(0px)");
    }
    function openCountry(country, zone) {
      popup.attr("hidden", true);
      focusCountry = { country, zone };
      focus.attr("hidden", null);
      drawCountry(country, zone, true);
      focus.select(".dc-focus-close").node().focus({ preventScroll: true });
    }
    // Closing runs the opening in reverse: the circles, names and table fade first, the country shrinks back
    // to its place on the map, and the blurred page fades out while it travels, so it lands on the real map.
    function closeCountry() {
      if (!focusCountry) return;
      const { country } = focusCountry;
      focusCountry = null;
      popup.attr("hidden", true);
      const { features, focusPath } = focusSetup(country);
      const duration = reduceMotion() ? 0 : 480;
      const fade = duration * 0.3;
      focusG.interrupt();
      focusG.selectAll(".dc-phase-layer").interrupt().transition().duration(fade).style("opacity", 0);
      focusSvg.selectAll(".dc-focus-labels").interrupt().transition().duration(fade).style("opacity", 0);
      focusTitle.interrupt().transition().duration(fade).style("opacity", 0).style("transform", "translateY(6px)");
      focusZones.interrupt().transition().duration(fade).style("opacity", 0);
      if (focusTransform.k > 1.01) focusSvg.transition().duration(duration).ease(d3.easeCubicInOut).call(focusZoom.transform, d3.zoomIdentity);
      d3.timeout(() => { if (!focusCountry) focus.classed("dc-focus-open", false); }, duration * 0.35);
      focusG.transition().duration(duration).ease(d3.easeCubicInOut).attr("transform", countryStartTransform(focusPath, features))
        .on("end", () => { if (!focusCountry) focus.classed("dc-focus-open", false).attr("hidden", true); });
    }
    function highlightZone(zone, active) {
      svg.selectAll(".dc-zone").filter(d => ["NO", "SE", "DK"].includes(zone) ? d.properties.country === zone : d.properties.bidding_zone === zone).classed("highlight", active);
    }
    function openZone(zone, event) {
      const selected = trackerView(data, tab, measure, hq, type);
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
      const view = trackerView(data, tab, measure, hq, type);
      root.attr("data-measure", measure).attr("data-tab", tab).attr("data-hq", hq).attr("data-type", type);
      svg.attr("aria-label", `Planned datacenter sites: ${TABS.find((t) => t.id === tab).label}`);
      zonePaths.attr("fill", (d) => zoneFill(view.zones[d.properties.bidding_zone], measure))
        .attr("aria-label", (d) => `${d.properties.bidding_zone}: ${capacityLabel(view.zones[d.properties.bidding_zone], measure)}`);
      const groups = highlightGroups(buildPhaseGroups(trackerView(data, tab, measure, "none", type), data), hq);
      renderPhaseLayer(phaseG, popup, groups, projection, width, height, measure, tab, true, compact ? MOBILE_SITE_SCALE : 1);
      phaseG.selectAll("g.dc-phase-point").on("mouseenter.country", (event, d) => hoverCountry(d.country)).on("mouseleave.country", leaveCountry);
      root.classed("dc-hq-highlighting", hq !== "none");
      zoneLabelG.selectAll("text.dc-zone-label").style("stroke", (d) => zoneFill(view.zones[d.properties.bidding_zone], measure));
      drawZoneKey();
      // The text above the map says what a circle shows.
      renderMapLegend(root, measure, tab);
      const variants = TABS.flatMap((item) => ["mw", "twh"].map((m) => ({ key: `${item.id}:${m}`, text: circleText(item.id, m, hq, type) })));
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
    const unsubscribe = shared.subscribe(state => { tab = state.family;measure = state.measure;hq = state.hq;type = state.type;render(); });
    return { disconnect() {backgroundAbort.abort();sizeObserver?.disconnect();unsubscribe();global.document.removeEventListener("click", closeOnOutsideClick);global.removeEventListener("resize", onResize);root.selectAll("*").remove();} };
  }
  const api = { ZONE_COLOURS, ZONE_SCALES, zoneFill, COUNTRY_OFFSETS, ZONE_ANCHORS, mapProjection, applyMapZoom, mount, mountControls, matchesHq, matchesType, gwRange, highlightGroups, mapState, mapRows, projectClasses, trackerView, capacityLabel, circleText, consumptionFor, shareLabel, CLASSES, CLASS_LABELS, CLASS_TEXT, TABS, DEFAULT_MEASURE };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.DCTrackerMap = api;
})(typeof window === "undefined" ? globalThis : window);

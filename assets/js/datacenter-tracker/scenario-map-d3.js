/* Original tracker map layout, supplied with precomputed project results. */

(function (global) {
  const DEFAULT_SCENARIO = "stated_2030";
  const HQ_HIGHLIGHTS = [
    { id: "none", label: "All" },
    { id: "domestic", label: "Domestic" },
    { id: "other_europe", label: "Other Europe" },
    { id: "outside_europe", label: "Outside Europe" },
  ];

  const SCENARIOS = [
    { id: "low_2030", label: "Low", year: "2030", fullLabel: "Low 2030" },
    { id: "stated_2030", label: "Stated", year: "2030", fullLabel: "Stated 2030" },
    { id: "stated_2035", label: "Stated", year: "2035", fullLabel: "Stated 2035" },
    { id: "high_2035", label: "High", year: "2035", fullLabel: "High 2035" },
  ];

  const BREAKS = [
    { min: 0, max: 0, label: "0", color: "#eef3ff" },
    { min: 1, max: 499, label: "1-499", color: "#c6dbef" },
    { min: 500, max: 999, label: "500-999", color: "#9ecae1" },
    { min: 1000, max: 1499, label: "1,000-1,499", color: "#6baed6" },
    { min: 1500, max: 2499, label: "1,500-2,499", color: "#3182bd" },
    { min: 2500, max: Infinity, label: "2,500+", color: "#08519c" },
  ];

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

  function fmtMw(value) {
    if (value && typeof value === "object") return value.excluded ? "—" : global.DCTracker.totalRange(value);
    return global.DCTracker.range(value, value);
  }

  function capacityLabel(detail) {
    if (detail.excluded || detail.hq_unreviewed) return "—";
    if (detail.low === null || (detail.unknown && detail.high === 0)) return "Unknown";
    return `${fmtMw({ ...detail, unknown: 0 })} MW${detail.unknown ? "*" : ""}`;
  }

  function fillForMw(detail) {
    if (detail.excluded || detail.hq_unreviewed) return "#e8e5df";
    const value = detail.high ?? detail.low;
    if (value === null || (detail.unknown && value === 0)) return "#bdbdbd";
    const bin = BREAKS.find((b) => value >= b.min && value <= b.max);
    return bin ? bin.color : BREAKS[0].color;
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
    if (row.participates) return "included";
    if (row.indicator === "unquantified" || row.partial_capacity) return "unknown";
    return "excluded";
  }

  function mapRows(view, data) {
    const plotted = new Set(data.project_scenarios.filter((row) => mapState(row) !== "excluded").map((row) => row.project_id));
    return view.rows.filter((row) => plotted.has(row.project_id));
  }

  function hqView(view, data, mode) {
    if (mode === "none") return view;
    const projects = new Map(data.projects.map((project) => [project.project_id, project]));
    const projectIds = view.rows.filter((row) => matchesHq(projects.get(row.project_id), mode)).map((row) => row.project_id);
    const selected = global.DCTracker.makeView(data, view.scenario, { ...view.filters, projectIds });
    const reviewedCountries = new Set(
      data.projects.filter((project) => splitTags(project.actor_hq_countries).length).map((project) => project.country)
    );
    for (const [country, detail] of Object.entries(selected.countries)) detail.hq_unreviewed = !reviewedCountries.has(country);
    for (const detail of Object.values(selected.zones)) detail.hq_unreviewed = !reviewedCountries.has(detail.country);
    return selected;
  }

  function highlightGroups(groups, mode) {
    return groups.map((group) => {
      const matching = (project) => mode === "none" || matchesHq(project, mode);
      return {
        ...group,
        hq_mode: mode,
        hq_match_count: group.phases.filter((project) => matchesHq(project, mode)).length,
        selected_count: group.phases.filter(
          (project) => matching(project) && (project.participates || (mode !== "none" && mapState(project) === "unknown"))
        ).length,
      };
    });
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
        unknown_count: ordered.filter((phase) => mapState(phase) === "unknown").length,
        excluded_count: ordered.filter((phase) => mapState(phase) === "excluded").length,
        scenario_state: activeCount === 0 ? "inactive" : activeCount === ordered.length ? "active" : "mixed",
      };
    });
  }

  function positionScenarioIndicator(scenarioControls) {
    const controlsNode = scenarioControls.node();
    const activeNode = scenarioControls.select("button.active").node();
    const indicator = scenarioControls.select(".dc-scenario-indicator");

    if (!controlsNode || !activeNode || indicator.empty()) return;

    const controlsBox = controlsNode.getBoundingClientRect();
    const activeBox = activeNode.getBoundingClientRect();

    indicator.style("width", `${activeBox.width}px`).style("transform", `translateX(${activeBox.left - controlsBox.left}px)`);
  }

  function renderControls(container, activeScenario, onScenarioChange, onHighlightChange, coverageNote) {
    const controls = d3.select(container).append("div").attr("class", "dc-map-controls");

    const scenarioControls = controls.append("div").attr("class", "dc-scenario-controls");

    scenarioControls.append("div").attr("class", "dc-scenario-indicator").attr("aria-hidden", "true");

    SCENARIOS.forEach((scenario) => {
      scenarioControls
        .append("button")
        .attr("type", "button")
        .attr("class", "dc-scenario-button" + (scenario.id === activeScenario ? " active" : ""))
        .attr("data-scenario", scenario.id)
        .html(`<span>${scenario.label}</span><small>${scenario.year}</small>`)
        .on("click", function () {
          scenarioControls.selectAll("button").classed("active", false);
          d3.select(this).classed("active", true);
          positionScenarioIndicator(scenarioControls);
          onScenarioChange(scenario.id);
        });
    });

    const hqControl = controls
      .append("div")
      .attr("class", "dc-hq-control")
      .attr("role", "group")
      .attr("aria-label", "Developer headquarters")
      .attr("title", "Global headquarters. Domestic is relative to the project's country. " + coverageNote);
    hqControl.append("span").attr("class", "dc-hq-label").text("HQ");
    const hqButtons = hqControl
      .append("div")
      .attr("class", "dc-hq-segments")
      .selectAll("button")
      .data(HQ_HIGHLIGHTS)
      .join("button")
      .attr("type", "button")
      .attr("class", "dc-hq-button")
      .attr("data-hq", (item) => item.id)
      .attr("aria-pressed", (item) => String(item.id === "none"))
      .text((item) => item.label)
      .on("click", (event, item) => {
        hqButtons.attr("aria-pressed", (option) => String(option.id === item.id));
        onHighlightChange(item.id);
      });

    requestAnimationFrame(() => positionScenarioIndicator(scenarioControls));
    window.addEventListener("resize", () => positionScenarioIndicator(scenarioControls));
  }

  function detailForZone(scenarioDetails, activeScenario, zone) {
    return (
      scenarioDetails[activeScenario]?.[zone] || {
        zone,
        low: 0,
        high: 0,
        project_count: 0,
      }
    );
  }

  function buildCountryCalloutData(geojson, path, activeScenario, scenarioDetails) {
    const countryX = {
      NO: 155,
      SE: 345,
      FI: 570,
    };
    const listY = 600;

    const groupedRows = d3.groups(
      geojson.features
        .map((feature) => ({
          feature,
          country: feature.properties.country,
          countryName: feature.properties.country_name || countryLabel(feature.properties.country),
          zone: feature.properties.bidding_zone,
          detail: detailForZone(scenarioDetails, activeScenario, feature.properties.bidding_zone),
        }))
        .sort((a, b) => {
          const countryCompare = countryOrder(a.country) - countryOrder(b.country);
          if (countryCompare !== 0) return countryCompare;
          return String(a.zone).localeCompare(String(b.zone), undefined, { numeric: true });
        }),
      (d) => d.country
    );
    const totalY = listY + 18 + (d3.max(groupedRows, ([, rows]) => rows.length) || 0) * 22 + 9;

    return groupedRows.map(([country, rows]) => {
      const bounds = rows.map((row) => translatedBounds(row.feature, path));
      const minX = d3.min(bounds, (d) => d[0][0]);
      const maxX = d3.max(bounds, (d) => d[1][0]);
      const maxY = d3.max(bounds, (d) => d[1][1]);
      const x = countryX[country] || (minX + maxX) / 2;

      return {
        country,
        countryName: rows[0]?.countryName || countryLabel(country),
        x,
        lineStartY: maxY + 8,
        lineEndY: listY - 34,
        totalMw: scenarioDetails[activeScenario]._countries[country],
        totalY,
        rows: rows.map((row, index) => ({
          ...row,
          x,
          y: listY + 18 + index * 22,
        })),
      };
    });
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

  function renderCountryCallouts(calloutG, geojson, path, activeScenario, scenarioDetails, onHighlight) {
    const countries = buildCountryCalloutData(geojson, path, activeScenario, scenarioDetails);
    const countryGroups = calloutG
      .selectAll("g.dc-country-callout")
      .data(countries, (d) => d.country)
      .join(
        (enter) => {
          const g = enter.append("g").attr("class", "dc-country-callout");

          g.append("text").attr("class", "dc-capacity-country-label").attr("text-anchor", "middle");

          return g;
        },
        (update) => update,
        (exit) => exit.remove()
      );

    countryGroups.select("line.dc-country-callout-line").remove();

    countryGroups
      .select("text.dc-capacity-country-label")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.lineEndY + 18)
      .text((d) => d.countryName);

    const rows = calloutG
      .selectAll("g.dc-capacity-row")
      .data(
        countries.flatMap((country) => country.rows),
        (d) => d.zone
      )
      .join(
        (enter) => {
          const g = enter.append("g").attr("class", "dc-capacity-row").attr("tabindex", 0).attr("role", "button");

          g.append("text").attr("class", "dc-capacity-zone").attr("text-anchor", "start").attr("dominant-baseline", "middle");

          g.append("text").attr("class", "dc-capacity-value").attr("text-anchor", "start").attr("dominant-baseline", "middle");

          return g;
        },
        (update) => update,
        (exit) => exit.remove()
      );

    rows
      .attr("data-zone", (d) => d.zone)
      .attr("aria-label", (d) => `${d.zone}, ${capacityLabel(d.detail)}`)
      .classed("empty", (d) => d.detail.excluded || d.detail.hq_unreviewed || (!d.detail.unknown && d.detail.low === 0 && d.detail.high === 0))
      .on("mouseenter", function (event, d) {
        onHighlight(d.zone, true);
      })
      .on("mouseleave", function (event, d) {
        onHighlight(d.zone, false);
      })
      .on("focus", function (event, d) {
        onHighlight(d.zone, true);
      })
      .on("blur", function (event, d) {
        onHighlight(d.zone, false);
      })
      .transition()
      .duration(160)
      .attr("transform", (d) => `translate(${d.x},${d.y})`);

    rows
      .select("text.dc-capacity-zone")
      .attr("x", -48)
      .text((d) => d.zone);

    rows
      .select("text.dc-capacity-value")
      .attr("x", 18)
      .text((d) => capacityLabel(d.detail));

    const totalRows = calloutG
      .selectAll("g.dc-capacity-total-row")
      .data(countries, (d) => d.country)
      .join(
        (enter) => {
          const g = enter.append("g").attr("class", "dc-capacity-total-row");

          g.append("text").attr("class", "dc-capacity-total-symbol").attr("text-anchor", "start").attr("dominant-baseline", "middle");

          g.append("text").attr("class", "dc-capacity-total-value").attr("text-anchor", "start").attr("dominant-baseline", "middle");

          return g;
        },
        (update) => update,
        (exit) => exit.remove()
      );

    totalRows
      .attr("data-country", (d) => d.country)
      .transition()
      .duration(160)
      .attr("transform", (d) => `translate(${d.x},${d.totalY})`);

    totalRows.select("text.dc-capacity-total-symbol").attr("x", -48).attr("y", 0).text("Σ");

    totalRows
      .select("text.dc-capacity-total-value")
      .attr("x", 18)
      .text((d) => capacityLabel(d.totalMw));
  }

  function renderPhaseLayer(phaseG, popupG, phaseGroups, projection, width, height) {
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
          `${d.project_count} project${d.project_count === 1 ? "" : "s"} in ${d.municipality}, ${d.active_count} included in the selected scenario${d.unknown_count ? `, ${d.unknown_count} with unknown contribution` : ""}${d.hq_mode === "none" ? "" : `, ${d.hq_match_count} match ${HQ_HIGHLIGHTS.find((item) => item.id === d.hq_mode).label} HQ`}`
      )
      .on("click", function (event, d) {
        event.stopPropagation();
        showPhasePopup(popupG, d, width, height);
      })
      .on("keydown", function (event, d) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          showPhasePopup(popupG, d, width, height);
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

  function showPhasePopup(popupG, group, width, height) {
    popupG.selectAll("*").remove();

    const lineHeight = 16;
    const maxPhases = 6;
    const phaseLines = group.phases.slice(0, maxPhases).map((phase) => {
      const inCampus = splitTags(phase.note).some((note) => note.startsWith("included_in:"));
      const mwText = ` · ${inCampus ? "In campus" : phase.partial_capacity && phase.mw_high === 0 ? "Contribution unknown" : phase.capacity_known ? global.DCTracker.range(phase.mw_low, phase.mw_high) + " MW" + (phase.partial_capacity ? "*" : "") : "Contribution unknown"}`;
      return `${truncate(phase.project_name, 24)} · ${truncate(phase.phase, 18)}${mwText}`;
    });

    if (group.phases.length > maxPhases) {
      phaseLines.push(`+${group.phases.length - maxPhases} more`);
    }

    const lines = [
      `${group.municipality}`,
      `${group.project_count} project${group.project_count === 1 ? "" : "s"} · ${countryLabel(group.country)} · ${group.bidding_zone}`,
      `Scenario: ${group.active_count} included, ${group.excluded_count} outside, ${group.unknown_count} unknown`,
      ...(group.hq_mode === "none"
        ? []
        : [`${HQ_HIGHLIGHTS.find((item) => item.id === group.hq_mode).label} HQ selection: ${group.selected_count} of ${group.project_count}`]),
      ...phaseLines,
    ];

    const boxWidth = 314;
    const boxHeight = 26 + lines.length * lineHeight;
    const pointX = group.xy[0];
    const pointY = group.xy[1];
    const x = Math.max(16, Math.min(width - boxWidth - 16, pointX + (pointX > width - 320 ? -boxWidth - 14 : 16)));
    const y = Math.max(16, Math.min(height - boxHeight - 16, pointY - boxHeight / 2));

    const popup = popupG.append("g").attr("class", "dc-phase-popup").attr("transform", `translate(${x},${y})`);

    popup
      .append("rect")
      .attr("class", "dc-phase-popup-bg")
      .attr("width", boxWidth)
      .attr("height", boxHeight)
      .attr("rx", 5)
      .attr("fill", "#fffdf8")
      .attr("stroke", "#d8d2c8")
      .attr("stroke-width", 1);

    const text = popup.append("text").attr("class", "dc-phase-popup-text").attr("x", 12).attr("y", 17).attr("fill", "#2f3331");

    lines.forEach((line, index) => {
      const tspan = text
        .append("tspan")
        .attr("x", 12)
        .attr("dy", index === 0 ? 0 : lineHeight)
        .attr("class", index === 0 ? "dc-phase-popup-title" : index === 1 ? "dc-phase-popup-meta" : "dc-phase-popup-line")
        .text(line);

      if (index === 0) {
        tspan.attr("font-weight", 700).attr("fill", "#2f3331").attr("font-size", 12.8);
      } else if (index === 1) {
        tspan.attr("fill", "#666").attr("font-size", 9.6);
      } else {
        tspan.attr("fill", "#333").attr("font-size", 9.4);
      }
    });
  }

  function mount(container, data, initialView, onScenarioChange) {
    const geojson = data.bidding_zones;
    let view = initialView;
    const scenarioDetails = {};
    scenarioDetails[view.scenario] = { ...view.zones, _countries: view.countries };
    const width = 760;
    const height = 765;
    let activeScenario = view.scenario;
    let hqHighlight = "none";
    const reviewed = (data.actor_coverage || []).filter((row) => row.reviewed > 0);
    const unreviewed = (data.actor_coverage || []).filter((row) => row.reviewed === 0);
    const coverageNote =
      "HQ reviewed: " +
      reviewed.map((row) => `${countryLabel(row.country)} (${row.reviewed}/${row.projects})`).join(", ") +
      (unreviewed.length ? ". Not yet reviewed: " + unreviewed.map((row) => countryLabel(row.country)).join(", ") : "") +
      ".";

    const root = d3.select(container).attr("class", "dc-scenario-map-root dc-scenario-map-offset");

    renderControls(
      container,
      activeScenario,
      onScenarioChange,
      (mode) => {
        hqHighlight = mode;
        renderHighlights();
      },
      coverageNote
    );

    const figure = root.append("div").attr("class", "dc-scenario-svg-wrap");

    const svg = figure
      .append("svg")
      .attr("class", "dc-scenario-svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img")
      .attr("aria-label", "Scenario map of Nordic datacenter grid-side capacity by bidding zone");

    const projection = d3.geoMercator();
    const path = d3.geoPath(projection);

    projection.fitExtent(
      [
        [128, 58],
        [610, 536],
      ],
      geojson
    );
    const displayGeojson = geojson;

    const mapG = svg.append("g").attr("class", "dc-map-zones");
    const zoneLabelG = svg.append("g").attr("class", "dc-zone-label-layer");
    const countryCalloutG = svg.append("g").attr("class", "dc-country-callout-layer");
    const phaseG = svg.append("g").attr("class", "dc-phase-layer");
    const popupG = svg.append("g").attr("class", "dc-phase-popup-layer");

    svg.on("click", () => popupG.selectAll("*").remove());

    const zonePaths = mapG
      .selectAll("path")
      .data(displayGeojson.features)
      .join("path")
      .attr("class", "dc-zone")
      .attr("data-zone", (d) => d.properties.bidding_zone)
      .attr("transform", (d) => {
        const offset = countryOffset(d.properties.country);
        return `translate(${offset[0]},${offset[1]})`;
      })
      .attr("d", path)
      .attr("fill", (d) => fillForMw(detailForZone(scenarioDetails, activeScenario, d.properties.bidding_zone)));

    renderZoneLabels(zoneLabelG, displayGeojson, path, projection);

    function highlightZone(zone, active) {
      svg.selectAll(`[data-zone='${zone}']`).classed("highlight", active);
    }

    function renderHighlights() {
      popupG.selectAll("*").remove();
      const selected = hqView(view, data, hqHighlight);
      scenarioDetails[activeScenario] = { ...selected.zones, _countries: selected.countries };
      zonePaths.attr("fill", (d) => fillForMw(detailForZone(scenarioDetails, activeScenario, d.properties.bidding_zone)));
      renderCountryCallouts(countryCalloutG, displayGeojson, path, activeScenario, scenarioDetails, highlightZone);
      const groups = highlightGroups(buildPhaseGroups(view, data), hqHighlight);
      root.classed("dc-hq-highlighting", hqHighlight !== "none");
      root.select(".dc-hq-control").classed("active", hqHighlight !== "none");
      renderPhaseLayer(phaseG, popupG, groups, projection, width, height);
    }

    function update(nextView) {
      view = nextView;
      activeScenario = view.scenario;
      popupG.selectAll("*").remove();
      root
        .selectAll(".dc-scenario-button")
        .classed("active", function () {
          return this.dataset.scenario === activeScenario;
        })
        .attr("aria-pressed", function () {
          return String(this.dataset.scenario === activeScenario);
        });
      positionScenarioIndicator(root.select(".dc-scenario-controls"));
      renderHighlights();
    }
    update(view);
    return { update };
  }
  const api = { mount, matchesHq, highlightGroups, mapState, mapRows, hqView, capacityLabel, fillForMw };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.DCTrackerMap = api;
})(typeof window === "undefined" ? globalThis : window);

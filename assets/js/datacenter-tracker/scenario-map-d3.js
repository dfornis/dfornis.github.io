/* D3/SVG scenario map for Nordic data centre tracker.
   Requires:
   - D3 v7 loaded before this script
   - window.DC_TRACKER_PATHS with biddingZones, scenarioZone, projects and capacity
   - <div id="dc-scenario-map"></div>
*/

(function () {
  const DEFAULT_SCENARIO = "stated_2030";

  const SCENARIOS = [
    { id: "low_2030", label: "Low", year: "2030", fullLabel: "Low 2030" },
    { id: "stated_2030", label: "Stated", year: "2030", fullLabel: "Stated 2030" },
    { id: "stated_2035", label: "Stated", year: "2035", fullLabel: "Stated 2035" },
    { id: "high_2035", label: "High", year: "2035", fullLabel: "High 2035" }
  ];

  const BREAKS = [
    { min: 0, max: 0, label: "0", color: "#eef3ff" },
    { min: 1, max: 499, label: "1-499", color: "#c6dbef" },
    { min: 500, max: 999, label: "500-999", color: "#9ecae1" },
    { min: 1000, max: 1499, label: "1,000-1,499", color: "#6baed6" },
    { min: 1500, max: 2499, label: "1,500-2,499", color: "#3182bd" },
    { min: 2500, max: Infinity, label: "2,500+", color: "#08519c" }
  ];

  const COUNTRY_OFFSETS = {
    NO: [-98, 50],
    SE: [8, -14],
    FI: [112, 24]
  };

  const ZONE_LABEL_OFFSETS = {
    NO1: [58, 2],
    NO2: [-58, 12],
    NO3: [-62, -6],
    NO4: [-58, -20],
    NO5: [-58, 2],
    SE1: [58, -12],
    SE2: [58, 0],
    SE3: [58, 12],
    SE4: [52, 12],
    FI: [-58, 0]
  };

  function num(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function fmtMw(value) {
    const parsed = num(value) || 0;
    return Math.round(parsed).toLocaleString("en-US");
  }

  function fillForMw(value) {
    const mw = num(value) || 0;
    const bin = BREAKS.find(b => mw >= b.min && mw <= b.max);
    return bin ? bin.color : BREAKS[0].color;
  }

  function splitTags(value) {
    if (!value) return [];
    return String(value).split(";").map(x => x.trim()).filter(Boolean);
  }

  function truncate(value, length = 44) {
    const text = String(value || "");
    return text.length > length ? text.slice(0, length - 1).trim() + "..." : text;
  }

  function phaseRadius(group) {
    if (group.phase_count <= 1) {
      return 4.9;
    }

    return Math.min(10.6, 6.5 + group.phase_count * 0.85);
  }

  function phaseCountFontSize(group) {
    const radius = phaseRadius(group);
    const digits = String(group.phase_count || "").length;
    return digits > 1 ? Math.min(10, radius * 0.98) : Math.min(10.4, radius * 1.18);
  }

  function countryLabel(value) {
    const labels = {
      SE: "Sweden",
      NO: "Norway",
      FI: "Finland"
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
      [bounds[1][0] + offset[0], bounds[1][1] + offset[1]]
    ];
  }

  function zoneLabelOffset(zone) {
    return ZONE_LABEL_OFFSETS[zone] || [46, 0];
  }

  function resolvePhaseOverlaps(points, width, height) {
    const nodes = points.map((point, index) => ({
      ...point,
      index,
      anchorX: point.xy[0],
      anchorY: point.xy[1],
      displayX: point.xy[0],
      displayY: point.xy[1],
      radius: phaseRadius(point)
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

      nodes.forEach(node => {
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

    return nodes.map(node => ({
      ...node,
      xy: [node.displayX, node.displayY],
      hasOffset: Math.hypot(node.displayX - node.anchorX, node.displayY - node.anchorY) > 2.5
    }));
  }

  function emptyScenarioZoneObject(scenarioZoneRows) {
    const out = {};
    SCENARIOS.forEach(s => {
      out[s.id] = {};
    });

    (scenarioZoneRows || []).forEach(row => {
      if (!out[row.scenario_id] || !row.bidding_zone) return;

      out[row.scenario_id][row.bidding_zone] = {
        zone: row.bidding_zone,
        country: row.country,
        mw: 0,
        project_count: 0
      };
    });

    return out;
  }

  function buildScenarioZoneDetails(scenarioZoneRows) {
    const out = emptyScenarioZoneObject(scenarioZoneRows);

    (scenarioZoneRows || []).forEach(row => {
      const scenario = row.scenario_id;
      const zone = row.bidding_zone;
      if (!out[scenario]) return;
      if (!out[scenario][zone]) {
        out[scenario][zone] = { zone, country: row.country, mw: 0, project_count: 0 };
      }

      out[scenario][zone].mw = num(row.grid_side_mw) ?? num(row.mw) ?? 0;
      out[scenario][zone].project_count = num(row.n_projects) || 0;
    });

    return out;
  }

  function buildPhaseGroups(capacityRows, activeScenario) {
    const grouped = d3.group(
      (capacityRows || []).filter(d =>
        num(d.latitude) !== null &&
        num(d.longitude) !== null &&
        splitTags(d.scenario_tag).includes(activeScenario)
      ),
      d => `${d.municipality}|${d.latitude}|${d.longitude}`
    );

    return Array.from(grouped, ([key, phases]) => {
      const first = phases[0];

      return {
        key,
        municipality: first.municipality,
        county: first.county,
        country: first.country,
        bidding_zone: first.bidding_zone,
        latitude: num(first.latitude),
        longitude: num(first.longitude),
        coordinate_note: first.coordinate_note,
        phases: phases.sort((a, b) => {
          const projectCompare = String(a.project_name).localeCompare(String(b.project_name));
          if (projectCompare !== 0) return projectCompare;
          return String(a.phase).localeCompare(String(b.phase));
        }),
        phase_count: phases.length,
        project_count: new Set(phases.map(phase => phase.project_id)).size
      };
    });
  }

  async function loadJson(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error("Could not load " + path);
    return response.json();
  }

  function positionScenarioIndicator(scenarioControls) {
    const controlsNode = scenarioControls.node();
    const activeNode = scenarioControls.select("button.active").node();
    const indicator = scenarioControls.select(".dc-scenario-indicator");

    if (!controlsNode || !activeNode || indicator.empty()) return;

    const controlsBox = controlsNode.getBoundingClientRect();
    const activeBox = activeNode.getBoundingClientRect();

    indicator
      .style("width", `${activeBox.width}px`)
      .style("transform", `translateX(${activeBox.left - controlsBox.left}px)`);
  }

  function renderControls(container, activeScenario, onScenarioChange) {
    const controls = d3.select(container)
      .append("div")
      .attr("class", "dc-map-controls");

    const scenarioControls = controls.append("div")
      .attr("class", "dc-scenario-controls");

    scenarioControls.append("div")
      .attr("class", "dc-scenario-indicator")
      .attr("aria-hidden", "true");

    SCENARIOS.forEach(scenario => {
      scenarioControls.append("button")
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

    requestAnimationFrame(() => positionScenarioIndicator(scenarioControls));
    window.addEventListener("resize", () => positionScenarioIndicator(scenarioControls));
  }

  function detailForZone(scenarioDetails, activeScenario, zone) {
    return scenarioDetails[activeScenario]?.[zone] || {
      zone,
      mw: 0,
      project_count: 0
    };
  }

  function buildCountryCalloutData(geojson, path, activeScenario, scenarioDetails) {
    const countryX = {
      NO: 155,
      SE: 380,
      FI: 605
    };
    const listY = 622;

    return d3.groups(
      geojson.features
        .map(feature => ({
          feature,
          country: feature.properties.country,
          countryName: feature.properties.country_name || countryLabel(feature.properties.country),
          zone: feature.properties.bidding_zone,
          detail: detailForZone(scenarioDetails, activeScenario, feature.properties.bidding_zone)
        }))
        .sort((a, b) => {
          const countryCompare = countryOrder(a.country) - countryOrder(b.country);
          if (countryCompare !== 0) return countryCompare;
          return String(a.zone).localeCompare(String(b.zone), undefined, { numeric: true });
        }),
      d => d.country
    ).map(([country, rows]) => {
      const bounds = rows.map(row => translatedBounds(row.feature, path));
      const minX = d3.min(bounds, d => d[0][0]);
      const maxX = d3.max(bounds, d => d[1][0]);
      const maxY = d3.max(bounds, d => d[1][1]);
      const x = countryX[country] || ((minX + maxX) / 2);

      return {
        country,
        countryName: rows[0]?.countryName || countryLabel(country),
        x,
        lineStartY: maxY + 8,
        lineEndY: listY - 34,
        rows: rows.map((row, index) => ({
          ...row,
          x,
          y: listY + 18 + index * 22
        }))
      };
    });
  }

  function renderZoneLabels(labelG, geojson, path) {
    const labelData = geojson.features.map(feature => {
      const zone = feature.properties.bidding_zone;
      const anchor = translatedCentroid(feature, path);
      const offset = zoneLabelOffset(zone);
      const label = [anchor[0] + offset[0], anchor[1] + offset[1]];
      const textAnchor = offset[0] < 0 ? "end" : "start";
      const linePad = offset[0] < 0 ? -7 : 7;

      return {
        zone,
        anchor,
        label,
        textAnchor,
        lineEnd: [label[0] - linePad, label[1]]
      };
    });

    const groups = labelG.selectAll("g.dc-zone-label-callout")
      .data(labelData, d => d.zone)
      .join(
        enter => {
          const g = enter.append("g")
            .attr("class", "dc-zone-label-callout")
            .attr("data-zone", d => d.zone);

          g.append("line")
            .attr("class", "dc-zone-label-line");

          g.append("text")
            .attr("class", "dc-zone-label")
            .attr("dominant-baseline", "middle");

          return g;
        },
        update => update,
        exit => exit.remove()
      );

    groups.select("line.dc-zone-label-line")
      .attr("x1", d => d.anchor[0])
      .attr("y1", d => d.anchor[1])
      .attr("x2", d => d.lineEnd[0])
      .attr("y2", d => d.lineEnd[1]);

    groups.select("text.dc-zone-label")
      .attr("x", d => d.label[0])
      .attr("y", d => d.label[1])
      .attr("text-anchor", d => d.textAnchor)
      .text(d => d.zone);
  }

  function renderCountryCallouts(calloutG, geojson, path, activeScenario, scenarioDetails, onHighlight) {
    const countries = buildCountryCalloutData(geojson, path, activeScenario, scenarioDetails);
    const countryGroups = calloutG.selectAll("g.dc-country-callout")
      .data(countries, d => d.country)
      .join(
        enter => {
          const g = enter.append("g")
            .attr("class", "dc-country-callout");

          g.append("line")
            .attr("class", "dc-country-callout-line");

          g.append("text")
            .attr("class", "dc-capacity-country-label")
            .attr("text-anchor", "middle");

          return g;
        },
        update => update,
        exit => exit.remove()
      );

    countryGroups.select("line.dc-country-callout-line")
      .transition()
      .duration(160)
      .attr("x1", d => d.x)
      .attr("x2", d => d.x)
      .attr("y1", d => d.lineStartY)
      .attr("y2", d => Math.max(d.lineStartY + 18, d.lineEndY));

    countryGroups.select("text.dc-capacity-country-label")
      .attr("x", d => d.x)
      .attr("y", d => d.lineEndY + 18)
      .text(d => d.countryName);

    const rows = calloutG.selectAll("g.dc-capacity-row")
      .data(countries.flatMap(country => country.rows), d => d.zone)
      .join(
        enter => {
          const g = enter.append("g")
            .attr("class", "dc-capacity-row")
            .attr("tabindex", 0)
            .attr("role", "button");

          g.append("text")
            .attr("class", "dc-capacity-zone")
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "middle");

          g.append("text")
            .attr("class", "dc-capacity-value")
            .attr("text-anchor", "end")
            .attr("dominant-baseline", "middle");

          return g;
        },
        update => update,
        exit => exit.remove()
      );

    rows
      .attr("data-zone", d => d.zone)
      .attr("aria-label", d => `${d.zone}, ${fmtMw(d.detail.mw)} MW`)
      .classed("empty", d => !d.detail || d.detail.mw === 0)
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
      .attr("transform", d => `translate(${d.x},${d.y})`);

    rows.select("text.dc-capacity-zone")
      .attr("x", -48)
      .text(d => d.zone);

    rows.select("text.dc-capacity-value")
      .attr("x", 48)
      .text(d => `${fmtMw(d.detail ? d.detail.mw : 0)} MW`);
  }

  function renderPhaseLayer(phaseG, popupG, phaseGroups, projection, width, height) {
    const projectedPoints = phaseGroups.map(group => {
      const xy = projection([group.longitude, group.latitude]);
      if (!xy) return { ...group, xy };

      const offset = countryOffset(group.country);
      return {
        ...group,
        xy: [xy[0] + offset[0], xy[1] + offset[1]]
      };
    }).filter(group => group.xy && Number.isFinite(group.xy[0]) && Number.isFinite(group.xy[1]));

    const points = resolvePhaseOverlaps(projectedPoints, width, height);

    const groups = phaseG.selectAll("g.dc-phase-point")
      .data(points, d => d.key)
      .join(
        enter => {
          const g = enter.append("g")
            .attr("class", "dc-phase-point")
            .attr("tabindex", 0)
            .attr("role", "button")
            .attr("aria-label", d => `${d.phase_count} phase${d.phase_count === 1 ? "" : "s"} in ${d.municipality}`);

          g.append("line")
            .attr("class", "dc-phase-anchor");

          g.append("circle")
            .attr("class", "dc-phase-dot")
            .attr("fill", "#6f7f76")
            .attr("fill-opacity", 0.72)
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
        update => update,
        exit => exit.remove()
      );

    groups
      .attr("transform", d => `translate(${d.xy[0]},${d.xy[1]})`)
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

    groups.select("line.dc-phase-anchor")
      .attr("x1", d => d.anchorX - d.xy[0])
      .attr("y1", d => d.anchorY - d.xy[1])
      .attr("x2", 0)
      .attr("y2", 0)
      .attr("opacity", d => d.hasOffset ? 1 : 0);

    groups.select("circle.dc-phase-dot")
      .attr("r", phaseRadius);

    groups.select("text.dc-phase-count")
      .attr("font-size", phaseCountFontSize)
      .text(d => d.phase_count > 1 ? d.phase_count : "");
  }

  function showPhasePopup(popupG, group, width, height) {
    popupG.selectAll("*").remove();

    const lineHeight = 16;
    const maxPhases = 6;
    const phaseLines = group.phases.slice(0, maxPhases).map(phase => {
      const mw = num(phase.estimated_grid_side_mw);
      const mwText = mw === null ? "" : ` · ${fmtMw(mw)} MW`;
      return `${truncate(phase.project_name, 24)} · ${truncate(phase.phase, 18)}${mwText}`;
    });

    if (group.phases.length > maxPhases) {
      phaseLines.push(`+${group.phases.length - maxPhases} more`);
    }

    const lines = [
      `${group.municipality}`,
      `${group.phase_count} phase${group.phase_count === 1 ? "" : "s"} · ${group.project_count} project${group.project_count === 1 ? "" : "s"} · ${countryLabel(group.country)} · ${group.bidding_zone}`,
      ...phaseLines
    ];

    const boxWidth = 314;
    const boxHeight = 26 + lines.length * lineHeight;
    const pointX = group.xy[0];
    const pointY = group.xy[1];
    const x = Math.max(16, Math.min(width - boxWidth - 16, pointX + (pointX > width - 320 ? -boxWidth - 14 : 16)));
    const y = Math.max(16, Math.min(height - boxHeight - 16, pointY - boxHeight / 2));

    const popup = popupG.append("g")
      .attr("class", "dc-phase-popup")
      .attr("transform", `translate(${x},${y})`);

    popup.append("rect")
      .attr("class", "dc-phase-popup-bg")
      .attr("width", boxWidth)
      .attr("height", boxHeight)
      .attr("rx", 5)
      .attr("fill", "#fffdf8")
      .attr("stroke", "#d8d2c8")
      .attr("stroke-width", 1);

    const text = popup.append("text")
      .attr("class", "dc-phase-popup-text")
      .attr("x", 12)
      .attr("y", 17)
      .attr("fill", "#2f3331");

    lines.forEach((line, index) => {
      const tspan = text.append("tspan")
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

  async function initScenarioMap() {
    const paths = window.DC_TRACKER_PATHS || window.DATA_PATHS;

    if (!paths) {
      throw new Error("Missing window.DC_TRACKER_PATHS");
    }

    const container = document.getElementById("dc-scenario-map");
    if (!container) return;

    const [geojson, scenarioZone, capacity] = await Promise.all([
      loadJson(paths.biddingZones || paths.bidding_zones || paths.zones),
      loadJson(paths.scenarioZone || paths.scenario_zone || paths.scenarios),
      loadJson(paths.capacity)
    ]);

    const scenarioDetails = buildScenarioZoneDetails(scenarioZone);

    const width = 760;
    const height = 705;
    let activeScenario = DEFAULT_SCENARIO;

    const root = d3.select(container)
      .attr("class", "dc-scenario-map-root dc-scenario-map-offset");

    renderControls(container, activeScenario, updateScenario);

    const figure = root.append("div")
      .attr("class", "dc-scenario-svg-wrap");

    const svg = figure.append("svg")
      .attr("class", "dc-scenario-svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img")
      .attr("aria-label", "Scenario map of Nordic data centre grid-side capacity by bidding zone");

    const projection = d3.geoMercator();
    const path = d3.geoPath(projection);

    projection.fitExtent([[128, 42], [610, 520]], geojson);

    const mapG = svg.append("g").attr("class", "dc-map-zones");
    const zoneLabelG = svg.append("g").attr("class", "dc-zone-label-layer");
    const countryCalloutG = svg.append("g").attr("class", "dc-country-callout-layer");
    const phaseG = svg.append("g").attr("class", "dc-phase-layer");
    const popupG = svg.append("g").attr("class", "dc-phase-popup-layer");

    svg.on("click", () => popupG.selectAll("*").remove());

    const zonePaths = mapG.selectAll("path")
      .data(geojson.features)
      .join("path")
      .attr("class", "dc-zone")
      .attr("data-zone", d => d.properties.bidding_zone)
      .attr("transform", d => {
        const offset = countryOffset(d.properties.country);
        return `translate(${offset[0]},${offset[1]})`;
      })
      .attr("d", path)
      .attr("fill", d => fillForMw(detailForZone(scenarioDetails, activeScenario, d.properties.bidding_zone).mw));

    renderZoneLabels(zoneLabelG, geojson, path);

    function highlightZone(zone, active) {
      svg.selectAll(`[data-zone='${zone}']`).classed("highlight", active);
    }

    renderCountryCallouts(countryCalloutG, geojson, path, activeScenario, scenarioDetails, highlightZone);
    renderPhaseLayer(phaseG, popupG, buildPhaseGroups(capacity, activeScenario), projection, width, height);

    function updateScenario(scenarioId) {
      activeScenario = scenarioId;
      popupG.selectAll("*").remove();

      zonePaths
        .transition()
        .duration(180)
        .attr("fill", d => fillForMw(
          detailForZone(scenarioDetails, activeScenario, d.properties.bidding_zone).mw
        ));

      renderCountryCallouts(countryCalloutG, geojson, path, activeScenario, scenarioDetails, highlightZone);
      renderPhaseLayer(phaseG, popupG, buildPhaseGroups(capacity, activeScenario), projection, width, height);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initScenarioMap().catch(console.error);
    });
  } else {
    initScenarioMap().catch(console.error);
  }
})();

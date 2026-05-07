/* D3/SVG scenario map for Swedish data centre tracker.
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

  const ZONES = ["SE1", "SE2", "SE3", "SE4"];

  const BREAKS = [
    { min: 0, max: 0, label: "0", color: "#eef3ff" },
    { min: 1, max: 499, label: "1-499", color: "#c6dbef" },
    { min: 500, max: 999, label: "500-999", color: "#9ecae1" },
    { min: 1000, max: 1499, label: "1,000-1,499", color: "#6baed6" },
    { min: 1500, max: 2499, label: "1,500-2,499", color: "#3182bd" },
    { min: 2500, max: Infinity, label: "2,500+", color: "#08519c" }
  ];

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

  function emptyScenarioZoneObject() {
    const out = {};
    SCENARIOS.forEach(s => {
      out[s.id] = {};
      ZONES.forEach(zone => {
        out[s.id][zone] = {
          zone,
          mw: 0,
          project_count: 0
        };
      });
    });
    return out;
  }

  function buildScenarioZoneDetails(scenarioZoneRows) {
    const out = emptyScenarioZoneObject();

    (scenarioZoneRows || []).forEach(row => {
      const scenario = row.scenario_id;
      const zone = row.bidding_zone;
      if (!out[scenario] || !out[scenario][zone]) return;

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

  function calloutY(zone, centroidY) {
    const offsets = { SE1: -12, SE2: 0, SE3: 4, SE4: 10 };
    return centroidY + (offsets[zone] || 0);
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

  function renderCallouts(calloutG, geojson, path, activeScenario, scenarioDetails) {
    const labelX = 585;
    const lineEndX = labelX - 20;

    const calloutData = geojson.features.map(feature => {
      const zone = feature.properties.bidding_zone;
      const centroid = path.centroid(feature);
      const bounds = path.bounds(feature);
      const y = calloutY(zone, centroid[1]);

      return {
        feature,
        zone,
        x0: bounds[1][0] + 12,
        y,
        x1: lineEndX,
        detail: scenarioDetails[activeScenario][zone]
      };
    });

    const groups = calloutG.selectAll("g.dc-callout")
      .data(calloutData, d => d.zone)
      .join(
        enter => {
          const g = enter.append("g")
            .attr("class", "dc-callout")
            .attr("data-zone", d => d.zone);

          g.append("line")
            .attr("class", "dc-callout-line");

          g.append("text")
            .attr("class", "dc-callout-value")
            .attr("x", labelX)
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "middle");

          return g;
        },
        update => update,
        exit => exit.remove()
      );

    groups.classed("empty", d => !d.detail || d.detail.mw === 0);

    groups.select("line.dc-callout-line")
      .transition()
      .duration(160)
      .attr("x1", d => d.x0)
      .attr("y1", d => d.y)
      .attr("x2", d => Math.max(d.x0 + 28, d.x1))
      .attr("y2", d => d.y);

    groups.select("text.dc-callout-value")
      .transition()
      .duration(160)
      .attr("y", d => d.y);

    groups.select("text.dc-callout-value")
      .text(d => `${fmtMw(d.detail ? d.detail.mw : 0)} MW`);
  }

  function renderPhaseLayer(phaseG, popupG, phaseGroups, projection, width, height) {
    const projectedPoints = phaseGroups.map(group => ({
      ...group,
      xy: projection([group.longitude, group.latitude])
    })).filter(group => group.xy && Number.isFinite(group.xy[0]) && Number.isFinite(group.xy[1]));

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
      `${group.phase_count} phase${group.phase_count === 1 ? "" : "s"} · ${group.project_count} project${group.project_count === 1 ? "" : "s"} · ${group.bidding_zone}`,
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
    const height = 680;
    let activeScenario = DEFAULT_SCENARIO;

    const root = d3.select(container)
      .attr("class", "dc-scenario-map-root dc-scenario-map-callouts");

    renderControls(container, activeScenario, updateScenario);

    const figure = root.append("div")
      .attr("class", "dc-scenario-svg-wrap");

    const svg = figure.append("svg")
      .attr("class", "dc-scenario-svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img")
      .attr("aria-label", "Scenario map of Swedish data centre grid-side capacity by bidding zone");

    const projection = d3.geoMercator();
    const path = d3.geoPath(projection);

    projection.fitExtent([[70, 35], [505, height - 35]], geojson);

    const mapG = svg.append("g").attr("class", "dc-map-zones");
    const calloutG = svg.append("g").attr("class", "dc-callout-layer");
    const phaseG = svg.append("g").attr("class", "dc-phase-layer");
    const popupG = svg.append("g").attr("class", "dc-phase-popup-layer");

    svg.on("click", () => popupG.selectAll("*").remove());

    const zonePaths = mapG.selectAll("path")
      .data(geojson.features)
      .join("path")
      .attr("class", "dc-zone")
      .attr("d", path)
      .attr("fill", d => fillForMw(scenarioDetails[activeScenario][d.properties.bidding_zone].mw));

    mapG.selectAll("text")
      .data(geojson.features)
      .join("text")
      .attr("class", "dc-zone-label")
      .attr("x", d => path.centroid(d)[0])
      .attr("y", d => path.centroid(d)[1])
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(d => d.properties.bidding_zone);

    renderCallouts(calloutG, geojson, path, activeScenario, scenarioDetails);
    renderPhaseLayer(phaseG, popupG, buildPhaseGroups(capacity, activeScenario), projection, width, height);

    function updateScenario(scenarioId) {
      activeScenario = scenarioId;
      popupG.selectAll("*").remove();

      zonePaths
        .transition()
        .duration(180)
        .attr("fill", d => fillForMw(
          scenarioDetails[activeScenario][d.properties.bidding_zone].mw
        ));

      renderCallouts(calloutG, geojson, path, activeScenario, scenarioDetails);
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

/* D3/SVG scenario map for Swedish data centre tracker.
   Requires:
   - D3 v7 loaded before this script
   - window.DC_TRACKER_PATHS with biddingZones, scenarioZone, projects and capacity
   - <div id="dc-scenario-map"></div>
*/

(function () {
  const DEFAULT_SCENARIO = "stated_2030";
  const DEFAULT_PROJECTS_VISIBLE = false;

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

  function projectRadius(group) {
    if (group.project_count <= 1) {
      return 4.1;
    }

    return Math.min(8.2, 5.6 + group.project_count * 0.8);
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

  function buildProjectGroups(projectRows, capacityRows) {
    const capacityByProject = d3.group(capacityRows || [], d => d.project_id);
    const grouped = d3.group(
      (projectRows || []).filter(d => num(d.latitude) !== null && num(d.longitude) !== null),
      d => `${d.municipality}|${d.latitude}|${d.longitude}`
    );

    return Array.from(grouped, ([key, projects]) => {
      const first = projects[0];
      const capacityEntries = projects.flatMap(project => capacityByProject.get(project.project_id) || []);
      const totalReportedMw = d3.sum(projects, project => num(project.max_reported_capacity_mw) || 0);
      const maxGridSideMw = d3.max(capacityEntries, entry => num(entry.estimated_grid_side_mw) || 0) || 0;

      return {
        key,
        municipality: first.municipality,
        county: first.county,
        bidding_zone: first.bidding_zone,
        latitude: num(first.latitude),
        longitude: num(first.longitude),
        coordinate_note: first.coordinate_note,
        projects: projects.sort((a, b) => String(a.project_name).localeCompare(String(b.project_name))),
        capacityEntries,
        project_count: projects.length,
        total_reported_mw: totalReportedMw,
        max_grid_side_mw: maxGridSideMw
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

  function renderControls(container, activeScenario, projectsVisible, onScenarioChange, onProjectsToggle) {
    const controls = d3.select(container)
      .append("div")
      .attr("class", "dc-map-controls");

    const scenarioControls = controls.append("div")
      .attr("class", "dc-scenario-controls");

    SCENARIOS.forEach(scenario => {
      scenarioControls.append("button")
        .attr("type", "button")
        .attr("class", "dc-scenario-button" + (scenario.id === activeScenario ? " active" : ""))
        .attr("data-scenario", scenario.id)
        .html(`<span>${scenario.label}</span><small>${scenario.year}</small>`)
        .on("click", function () {
          scenarioControls.selectAll("button").classed("active", false);
          d3.select(this).classed("active", true);
          onScenarioChange(scenario.id);
        });
    });

    const projectToggle = controls.append("button")
      .attr("type", "button")
      .attr("class", "dc-project-toggle" + (projectsVisible ? " active" : ""))
      .attr("aria-pressed", projectsVisible ? "true" : "false")
      .html("<span class=\"dc-project-toggle-dot\"></span><span>Projects</span>");

    projectToggle.on("click", function () {
      const nextVisible = d3.select(this).attr("aria-pressed") !== "true";
      d3.select(this)
        .classed("active", nextVisible)
        .attr("aria-pressed", nextVisible ? "true" : "false");
      onProjectsToggle(nextVisible);
    });
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

  function renderProjectLayer(projectG, popupG, projectGroups, projection, width, height) {
    const points = projectGroups.map(group => ({
      ...group,
      xy: projection([group.longitude, group.latitude])
    })).filter(group => group.xy && Number.isFinite(group.xy[0]) && Number.isFinite(group.xy[1]));

    const groups = projectG.selectAll("g.dc-project-point")
      .data(points, d => d.key)
      .join(
        enter => {
          const g = enter.append("g")
            .attr("class", "dc-project-point")
            .attr("tabindex", 0)
            .attr("role", "button")
            .attr("aria-label", d => `${d.project_count} project${d.project_count === 1 ? "" : "s"} in ${d.municipality}`);

          g.append("circle")
            .attr("class", "dc-project-dot")
            .attr("fill", "#6f7f76")
            .attr("fill-opacity", 0.72)
            .attr("stroke", "#fbf8f0")
            .attr("stroke-width", 1.1);

          g.append("text")
            .attr("class", "dc-project-count")
            .attr("text-anchor", "middle")
            .attr("dy", "0.34em");

          return g;
        },
        update => update,
        exit => exit.remove()
      );

    groups
      .attr("transform", d => `translate(${d.xy[0]},${d.xy[1]})`)
      .on("click", function (event, d) {
        event.stopPropagation();
        showProjectPopup(popupG, d, width, height);
      })
      .on("keydown", function (event, d) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          showProjectPopup(popupG, d, width, height);
        }
      });

    groups.select("circle.dc-project-dot")
      .attr("r", projectRadius);

    groups.select("text.dc-project-count")
      .text(d => d.project_count > 1 ? d.project_count : "");
  }

  function showProjectPopup(popupG, group, width, height) {
    popupG.selectAll("*").remove();

    const lineHeight = 15;
    const maxProjects = 6;
    const projectLines = group.projects.slice(0, maxProjects).map(project => {
      const mw = num(project.max_reported_capacity_mw);
      const mwText = mw === null ? "" : ` · ${fmtMw(mw)} MW`;
      return `${truncate(project.project_name, 39)}${mwText}`;
    });

    if (group.projects.length > maxProjects) {
      projectLines.push(`+${group.projects.length - maxProjects} more`);
    }

    const lines = [
      `${group.municipality}`,
      `${group.project_count} project${group.project_count === 1 ? "" : "s"} · ${group.bidding_zone}`,
      ...projectLines
    ];

    const boxWidth = 278;
    const boxHeight = 24 + lines.length * lineHeight;
    const pointX = group.xy[0];
    const pointY = group.xy[1];
    const x = Math.max(16, Math.min(width - boxWidth - 16, pointX + (pointX > width - 320 ? -boxWidth - 14 : 16)));
    const y = Math.max(16, Math.min(height - boxHeight - 16, pointY - boxHeight / 2));

    const popup = popupG.append("g")
      .attr("class", "dc-project-popup")
      .attr("transform", `translate(${x},${y})`);

    popup.append("rect")
      .attr("class", "dc-project-popup-bg")
      .attr("width", boxWidth)
      .attr("height", boxHeight)
      .attr("rx", 5)
      .attr("fill", "#fffdf8")
      .attr("stroke", "#d8d2c8")
      .attr("stroke-width", 1);

    const text = popup.append("text")
      .attr("class", "dc-project-popup-text")
      .attr("x", 12)
      .attr("y", 17)
      .attr("fill", "#2f3331");

    lines.forEach((line, index) => {
      text.append("tspan")
        .attr("x", 12)
        .attr("dy", index === 0 ? 0 : lineHeight)
        .attr("class", index === 0 ? "title" : index === 1 ? "meta" : "project")
        .text(line);
    });
  }

  async function initScenarioMap() {
    const paths = window.DC_TRACKER_PATHS || window.DATA_PATHS;

    if (!paths) {
      throw new Error("Missing window.DC_TRACKER_PATHS");
    }

    const container = document.getElementById("dc-scenario-map");
    if (!container) return;

    const [geojson, scenarioZone, projects, capacity] = await Promise.all([
      loadJson(paths.biddingZones || paths.bidding_zones || paths.zones),
      loadJson(paths.scenarioZone || paths.scenario_zone || paths.scenarios),
      loadJson(paths.projects),
      loadJson(paths.capacity)
    ]);

    const scenarioDetails = buildScenarioZoneDetails(scenarioZone);
    const projectGroups = buildProjectGroups(projects, capacity);

    const width = 760;
    const height = 680;
    let activeScenario = DEFAULT_SCENARIO;
    let projectsVisible = DEFAULT_PROJECTS_VISIBLE;

    const root = d3.select(container)
      .attr("class", "dc-scenario-map-root dc-scenario-map-callouts");

    renderControls(container, activeScenario, projectsVisible, updateScenario, updateProjects);

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
    const projectG = svg.append("g").attr("class", "dc-project-layer");
    const popupG = svg.append("g").attr("class", "dc-project-popup-layer");

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
    renderProjectLayer(projectG, popupG, projectGroups, projection, width, height);
    updateProjects(projectsVisible);

    function updateScenario(scenarioId) {
      activeScenario = scenarioId;

      zonePaths
        .transition()
        .duration(180)
        .attr("fill", d => fillForMw(
          scenarioDetails[activeScenario][d.properties.bidding_zone].mw
        ));

      renderCallouts(calloutG, geojson, path, activeScenario, scenarioDetails);
    }

    function updateProjects(visible) {
      projectsVisible = visible;
      popupG.selectAll("*").remove();
      root.classed("projects-visible", projectsVisible);
      projectG.classed("hidden", !projectsVisible);
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

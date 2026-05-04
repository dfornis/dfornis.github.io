/* D3/SVG scenario map for Swedish data centre tracker.
   Requires:
   - D3 v7 loaded before this script
   - window.DC_TRACKER_PATHS with projects, capacity, biddingZones, assumptions (assumptions optional)
   - <div id="dc-scenario-map"></div>
*/

(function () {
  const DEFAULT_SCENARIO = "stated_2030";

  // Use "it_load" to reproduce headline scenario MW values.
  // Use "grid_side" if you want PUE-adjusted grid-side MW and assumptions.json is available.
  const MAP_METRIC = "it_load";

  const SCENARIOS = [
    { id: "low_2030", label: "Low", year: "2030", fullLabel: "Low 2030" },
    { id: "stated_2030", label: "Stated", year: "2030", fullLabel: "Stated 2030" },
    { id: "stated_2035", label: "Stated", year: "2035", fullLabel: "Stated 2035" },
    { id: "high_2035", label: "High", year: "2035", fullLabel: "High 2035" }
  ];

  const BREAKS = [
    { min: 0, max: 0, label: "0", color: "#eef3ff" },
    { min: 1, max: 499, label: "1–499", color: "#c6dbef" },
    { min: 500, max: 999, label: "500–999", color: "#9ecae1" },
    { min: 1000, max: 1499, label: "1,000–1,499", color: "#6baed6" },
    { min: 1500, max: 2499, label: "1,500–2,499", color: "#3182bd" },
    { min: 2500, max: Infinity, label: "2,500+", color: "#08519c" }
  ];

  function isBlank(value) {
    return value === null || value === undefined || value === "";
  }

  function num(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function splitTags(value) {
    if (!value) return [];
    return String(value).split(";").map(x => x.trim()).filter(Boolean);
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

  function normalizeTypeTags(value) {
    return splitTags(value).map(tag => tag.toLowerCase());
  }

  function assumptionCategory(typeValue) {
    const tags = normalizeTypeTags(typeValue);
    const hasHyperscale = tags.includes("hyperscale");
    const hasAi = tags.includes("ai");
    const hasHpc = tags.includes("hpc");
    const hasColocation = tags.includes("colocation");
    const hasResearch = tags.includes("research") || tags.includes("smr-linked");

    if (hasResearch) return "Research_SMR";
    if (hasColocation && hasAi) return "Colocation_AI";
    if (hasColocation) return "Colocation";
    if (hasAi && hasHpc) return "AI_HPC";
    if (hasHyperscale && hasAi) return "Hyperscale_AI";
    if (hasHyperscale) return "Hyperscale";
    if (hasAi || hasHpc) return "AI_HPC";
    return "Hyperscale";
  }

  function buildAssumptionIndex(assumptions) {
    const index = {};
    (assumptions || []).forEach(item => {
      index[item.assumption_id] = item;
    });
    return index;
  }

  function assumptionValue(index, id) {
    const item = index[id];
    return item ? num(item.value) : null;
  }

  function pueForType(typeValue, assumptionIndex) {
    const category = assumptionCategory(typeValue);
    return assumptionValue(assumptionIndex, "PUE_" + category);
  }

  function isNonLoadCapacity(entry) {
    return ["permit_backup_power", "reactor_capacity"].includes(entry.capacity_type);
  }

  function estimatedGridSideMw(entry, assumptionIndex) {
    const explicitGrid = num(entry.estimated_grid_side_mw);
    if (explicitGrid !== null) return explicitGrid;

    const legacyGrid = num(entry.interpreted_grid_load_mw);
    if (legacyGrid !== null) return legacyGrid;

    const gridSide = num(entry.grid_side_capacity_mw);
    if (gridSide !== null) return gridSide;

    if (isNonLoadCapacity(entry) && num(entry.interpreted_it_load_mw) === null) return null;

    const itLoad = num(entry.interpreted_it_load_mw);
    const directPue = num(entry.pue);
    const pue = directPue !== null ? directPue : pueForType(entry.type, assumptionIndex);

    if (itLoad === null || pue === null) return null;
    return itLoad * pue;
  }

  function capacityValue(entry, assumptionIndex) {
    if (MAP_METRIC === "grid_side") {
      return estimatedGridSideMw(entry, assumptionIndex);
    }
    return num(entry.interpreted_it_load_mw);
  }

  function projectZoneIndex(projects) {
    const index = {};
    projects.forEach(project => {
      index[project.project_id] = project.bidding_zone;
    });
    return index;
  }

  function aggregateCapacityByScenarioZone(capacity, projects, assumptionIndex) {
    const zonesByProject = projectZoneIndex(projects);
    const out = {};

    SCENARIOS.forEach(s => {
      out[s.id] = { SE1: 0, SE2: 0, SE3: 0, SE4: 0 };
    });

    capacity.forEach(entry => {
      const zone = zonesByProject[entry.project_id];
      if (!zone || !out[SCENARIOS[0].id].hasOwnProperty(zone)) return;

      const value = capacityValue(entry, assumptionIndex);
      if (value === null) return;

      splitTags(entry.scenario_tag).forEach(scenario => {
        if (!out[scenario]) return;
        out[scenario][zone] += value;
      });
    });

    return out;
  }

  async function loadJson(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error("Could not load " + path);
    return response.json();
  }

  function createTooltip(container) {
    return d3.select(container)
      .append("div")
      .attr("class", "dc-map-tooltip")
      .style("opacity", 0);
  }

  function renderLegend(svg, width, height) {
    const legend = svg.append("g")
      .attr("class", "dc-map-legend")
      .attr("transform", `translate(${width - 175}, ${height - 190})`);

    legend.append("text")
      .attr("class", "dc-map-legend-title")
      .attr("x", 0)
      .attr("y", 0)
      .text("Load additions (MW)");

    BREAKS.forEach((bin, i) => {
      const y = 24 + i * 20;
      legend.append("rect")
        .attr("x", 0)
        .attr("y", y - 10)
        .attr("width", 22)
        .attr("height", 14)
        .attr("fill", bin.color);

      legend.append("text")
        .attr("x", 32)
        .attr("y", y + 2)
        .attr("class", "dc-map-legend-label")
        .text(bin.label);
    });
  }

  function renderScenarioControls(container, activeScenario, onChange) {
    const controls = d3.select(container)
      .append("div")
      .attr("class", "dc-scenario-controls");

    SCENARIOS.forEach(scenario => {
      controls.append("button")
        .attr("type", "button")
        .attr("class", "dc-scenario-button" + (scenario.id === activeScenario ? " active" : ""))
        .attr("data-scenario", scenario.id)
        .html(`<span>${scenario.label}</span><small>${scenario.year}</small>`)
        .on("click", function () {
          controls.selectAll("button").classed("active", false);
          d3.select(this).classed("active", true);
          onChange(scenario.id);
        });
    });
  }

  async function initScenarioMap() {
    const paths = window.DC_TRACKER_PATHS || window.DATA_PATHS;

    if (!paths) {
      throw new Error("Missing window.DC_TRACKER_PATHS");
    }

    const container = document.getElementById("dc-scenario-map");
    if (!container) return;

    const [geojson, projects, capacity, assumptions] = await Promise.all([
      loadJson(paths.biddingZones || paths.bidding_zones || paths.zones),
      loadJson(paths.projects),
      loadJson(paths.capacity),
      paths.assumptions ? loadJson(paths.assumptions) : Promise.resolve([])
    ]);

    const assumptionIndex = buildAssumptionIndex(assumptions);
    const scenarioZoneMw = aggregateCapacityByScenarioZone(capacity, projects, assumptionIndex);

    const width = 760;
    const height = 680;
    let activeScenario = DEFAULT_SCENARIO;

    const root = d3.select(container)
      .attr("class", "dc-scenario-map-root");

    renderScenarioControls(container, activeScenario, updateScenario);

    const figure = root.append("div")
      .attr("class", "dc-scenario-svg-wrap");

    const svg = figure.append("svg")
      .attr("class", "dc-scenario-svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img")
      .attr("aria-label", "Scenario map of Swedish data centre load additions by bidding zone");

    const tooltip = createTooltip(container);

    const projection = d3.geoMercator();
    const path = d3.geoPath(projection);

    // Fit Sweden to the left/centre, leaving room for the legend.
    projection.fitExtent([[70, 35], [555, height - 35]], geojson);

    const mapG = svg.append("g").attr("class", "dc-map-zones");

    const zonePaths = mapG.selectAll("path")
      .data(geojson.features)
      .join("path")
      .attr("class", "dc-zone")
      .attr("d", path)
      .attr("fill", d => fillForMw(scenarioZoneMw[activeScenario][d.properties.bidding_zone]))
      .on("mousemove", function (event, d) {
        const zone = d.properties.bidding_zone;
        const mw = scenarioZoneMw[activeScenario][zone] || 0;
        const scenario = SCENARIOS.find(s => s.id === activeScenario);

        tooltip
          .style("opacity", 1)
          .html(`<strong>${zone}</strong><br>${scenario.fullLabel}<br>${fmtMw(mw)} MW`)
          .style("left", (event.offsetX + 14) + "px")
          .style("top", (event.offsetY + 14) + "px");
      })
      .on("mouseleave", function () {
        tooltip.style("opacity", 0);
      });

    mapG.selectAll("text")
      .data(geojson.features)
      .join("text")
      .attr("class", "dc-zone-label")
      .attr("x", d => path.centroid(d)[0])
      .attr("y", d => path.centroid(d)[1])
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(d => d.properties.bidding_zone);

    renderLegend(svg, width, height);

    const title = svg.append("text")
      .attr("class", "dc-map-title")
      .attr("x", width / 2)
      .attr("y", 24)
      .attr("text-anchor", "middle")
      .text(SCENARIOS.find(s => s.id === activeScenario).fullLabel);

    function updateScenario(scenarioId) {
      activeScenario = scenarioId;

      zonePaths
        .transition()
        .duration(180)
        .attr("fill", d => fillForMw(scenarioZoneMw[activeScenario][d.properties.bidding_zone]));

      title.text(SCENARIOS.find(s => s.id === activeScenario).fullLabel);
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

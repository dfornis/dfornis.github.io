/* D3/SVG scenario map for Swedish data centre tracker, with clean direct MW callout labels.
   Requires:
   - D3 v7 loaded before this script
   - window.DC_TRACKER_PATHS with projects, capacity, biddingZones, assumptions (assumptions optional)
   - <div id="dc-scenario-map"></div>
*/

(function () {
  const DEFAULT_SCENARIO = "stated_2030";

  // Use "it_load" to reproduce headline scenario MW values.
  // Use "grid_side" if you want PUE-adjusted grid-side MW and assumptions.json is available.
  const MAP_METRIC = "grid-side";

  const SCENARIOS = [
    { id: "low_2030", label: "Low", year: "2030", fullLabel: "Low 2030" },
    { id: "stated_2030", label: "Stated", year: "2030", fullLabel: "Stated 2030" },
    { id: "stated_2035", label: "Stated", year: "2035", fullLabel: "Stated 2035" },
    { id: "high_2035", label: "High", year: "2035", fullLabel: "High 2035" }
  ];

  const ZONES = ["SE1", "SE2", "SE3", "SE4"];

  const BREAKS = [
    { min: 0, max: 0, label: "0", color: "#eef3ff" },
    { min: 1, max: 499, label: "1–499", color: "#c6dbef" },
    { min: 500, max: 999, label: "500–999", color: "#9ecae1" },
    { min: 1000, max: 1499, label: "1,000–1,499", color: "#6baed6" },
    { min: 1500, max: 2499, label: "1,500–2,499", color: "#3182bd" },
    { min: 2500, max: Infinity, label: "2,500+", color: "#08519c" }
  ];

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

  function projectIndex(projects) {
    const index = {};
    projects.forEach(project => {
      index[project.project_id] = project;
    });
    return index;
  }

  function emptyScenarioZoneObject() {
    const out = {};
    SCENARIOS.forEach(s => {
      out[s.id] = {};
      ZONES.forEach(zone => {
        out[s.id][zone] = {
          zone,
          mw: 0,
          entries: [],
          projectIds: new Set()
        };
      });
    });
    return out;
  }

  function aggregateCapacityDetails(capacity, projects, assumptionIndex) {
    const projectsById = projectIndex(projects);
    const out = emptyScenarioZoneObject();

    capacity.forEach(entry => {
      const project = projectsById[entry.project_id];
      const zone = project ? project.bidding_zone : null;
      if (!zone || !ZONES.includes(zone)) return;

      const value = capacityValue(entry, assumptionIndex);
      if (value === null) return;

      splitTags(entry.scenario_tag).forEach(scenario => {
        if (!out[scenario] || !out[scenario][zone]) return;

        out[scenario][zone].mw += value;
        out[scenario][zone].projectIds.add(entry.project_id);
        out[scenario][zone].entries.push({
          ...entry,
          value_mw: value,
          project_name: project.project_name,
          developer: project.developer
        });
      });
    });

    Object.values(out).forEach(zoneObj => {
      Object.values(zoneObj).forEach(detail => {
        detail.project_count = detail.projectIds.size;
        detail.phase_count = detail.entries.length;
        detail.entries.sort((a, b) => (b.value_mw || 0) - (a.value_mw || 0));
        delete detail.projectIds;
      });
    });

    return out;
  }

  async function loadJson(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error("Could not load " + path);
    return response.json();
  }

  function calloutY(zone, centroidY) {
    // Manual nudges keep labels balanced while preserving the geographic ordering.
    const offsets = { SE1: -12, SE2: 0, SE3: 4, SE4: 10 };
    return centroidY + (offsets[zone] || 0);
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
    const scenarioDetails = aggregateCapacityDetails(capacity, projects, assumptionIndex);

    const width = 760;
    const height = 680;
    let activeScenario = DEFAULT_SCENARIO;
    const root = d3.select(container)
      .attr("class", "dc-scenario-map-root dc-scenario-map-callouts");

    renderScenarioControls(container, activeScenario, updateScenario);

    const figure = root.append("div")
      .attr("class", "dc-scenario-svg-wrap");

    const svg = figure.append("svg")
      .attr("class", "dc-scenario-svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img")
      .attr("aria-label", "Scenario map of Swedish data centre load additions by bidding zone");

    const projection = d3.geoMercator();
    const path = d3.geoPath(projection);

    // Fit Sweden to the left/centre, leaving room for direct callout labels.
    projection.fitExtent([[70, 35], [505, height - 35]], geojson);

    const mapG = svg.append("g").attr("class", "dc-map-zones");
    const calloutG = svg.append("g").attr("class", "dc-callout-layer");

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

    function updateScenario(scenarioId) {
      activeScenario = scenarioId;
      zonePaths
        .transition()
        .duration(180)
        .attr("fill", d => fillForMw(scenarioDetails[activeScenario][d.properties.bidding_zone].mw));

      title.text(SCENARIOS.find(s => s.id === activeScenario).fullLabel);
      renderCallouts(calloutG, geojson, path, activeScenario, scenarioDetails);
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

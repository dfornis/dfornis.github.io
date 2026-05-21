(function () {
  const root = document.querySelector("[data-drivetrain-app]");
  if (!root) return;

  const paths = window.DRIVETRAIN_DEMAND_MODEL_PATHS || {};
  const status = root.querySelector("[data-status]");
  const shell = root.querySelector(".drivetrain-shell");
  const chartEl = root.querySelector("[data-chart]");
  const technologyCurveEl = root.querySelector("[data-technology-curve-chart]");

  const drivetrainKeys = ["bev", "phev", "hev", "gasoline", "diesel"];
  const detailYears = [2030, 2035];
  const elasticityDimension = "elasticity_set";
  const colors = {
    bev: "#2f7d6d",
    phev: "#3b6fb6",
    hev: "#8b6fb8",
    gasoline: "#c77c2f",
    diesel: "#6c757d"
  };
  const labels = {
    drivetrains: {
      bev: "BEV",
      phev: "PHEV",
      hev: "HEV",
      gasoline: "Gasoline",
      diesel: "Diesel"
    }
  };
  const technologyCurveColors = {
    conservative_technology: "#8b6f47",
    central_technology: "#2f7d6d",
    accelerated_technology: "#3b6fb6"
  };

  let dimensions = [
    "elasticity_set",
    "technology_scenario",
    "purchase_price_policy",
    "fossil_fuel_tax_base",
    "tax_indexation",
    "gdp_indexation",
    "electricity_tax",
    "ets2"
  ];

  let index = [];
  let technologyMeta = {};
  let technologySummary = [];
  let policyMeta = {};
  let active = {
    technology_scenario: "central_technology",
    purchase_price_policy: "adopted",
    fossil_fuel_tax_base: "adopted",
    tax_indexation: "adopted",
    gdp_indexation: "off",
    electricity_tax: "adopted",
    ets2: "adopted"
  };
  let currentScenario = null;
  let currentData = null;
  let detailYear = 2035;
  let resizeObserver = null;

  function valueFor(scenario, dimension) {
    return dimension === "technology_scenario"
      ? scenario.technology_scenario
      : scenario.policy_selection[dimension];
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function leverFor(dimension) {
    return policyMeta.levers && policyMeta.levers[dimension] ? policyMeta.levers[dimension] : {};
  }

  function labelFor(value, dimension) {
    const lever = leverFor(dimension);
    const option = lever.options && lever.options[value];
    return option && option.label ? option.label : String(value || "").replaceAll("_", " ");
  }

  function dimensionLabel(dimension) {
    return leverFor(dimension).label || String(dimension || "").replaceAll("_", " ");
  }

  function pct(value, digits = 1) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? `${(parsed * 100).toFixed(digits)}%` : "";
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];

      if (char === '"' && inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        row.push(cell);
        cell = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") index += 1;
        row.push(cell);
        if (row.some(value => value !== "")) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }

    if (cell || row.length) {
      row.push(cell);
      if (row.some(value => value !== "")) rows.push(row);
    }

    const headers = rows.shift() || [];
    return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
  }

  function pp(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return "";
    const sign = parsed > 0 ? "+" : "";
    return `${sign}${parsed.toFixed(1)}`;
  }

  function scenarioTitle(scenario) {
    return [
      labelFor(scenario.technology_scenario, "technology_scenario"),
      labelFor(scenario.policy_selection.purchase_price_policy, "purchase_price_policy"),
      labelFor(scenario.policy_selection.fossil_fuel_tax_base, "fossil_fuel_tax_base"),
      labelFor(scenario.policy_selection.tax_indexation, "tax_indexation"),
      labelFor(scenario.policy_selection.gdp_indexation, "gdp_indexation"),
      labelFor(scenario.policy_selection.electricity_tax, "electricity_tax"),
      `ETS2 ${labelFor(scenario.policy_selection.ets2, "ets2")}`,
      labelFor(scenario.policy_selection.elasticity_set, elasticityDimension)
    ].join(" · ");
  }

  function findScenarioFromActive() {
    return index.find(scenario =>
      dimensions.every(dimension => valueFor(scenario, dimension) === active[dimension])
    );
  }

  function setActiveFromScenario(scenario) {
    dimensions.forEach(dimension => {
      active[dimension] = valueFor(scenario, dimension);
    });
  }

  function controlGroups() {
    const visibleDimensions = dimensions.filter(dimension => dimension !== elasticityDimension);

    if (Array.isArray(policyMeta.groups) && policyMeta.groups.length) {
      const rawGroups = policyMeta.groups.map(group => ({
        ...group,
        levers: (group.levers || []).filter(dimension => visibleDimensions.includes(dimension))
      })).filter(group => group.levers.length);

      const modelGroup = rawGroups.find(group => group.id === "model_assumptions");
      const vehicleGroup = rawGroups.find(group => group.id === "vehicle_levers");
      if (modelGroup && vehicleGroup) {
        vehicleGroup.levers = [...modelGroup.levers, ...vehicleGroup.levers];
        return rawGroups.filter(group => group.id !== "model_assumptions");
      }

      return rawGroups;
    }

    return [{
      id: "scenario_levers",
      label: "Scenario levers",
      levers: visibleDimensions
    }];
  }

  function createControl(dimension) {
    const host = document.createElement("div");
    host.className = "drivetrain-control-group";
    host.dataset.control = dimension;

    const presentValues = [...new Set(index.map(scenario => valueFor(scenario, dimension)))].filter(Boolean);
    const lever = leverFor(dimension);
    const optionOrder = lever.options ? Object.keys(lever.options) : [];
    const values = [
      ...optionOrder.filter(value => presentValues.includes(value)),
      ...presentValues.filter(value => !optionOrder.includes(value))
    ];

    const labelRow = document.createElement("div");
    labelRow.className = "drivetrain-control-label-row";

    const label = document.createElement("div");
    label.className = "drivetrain-control-label";
    label.textContent = dimensionLabel(dimension);
    labelRow.appendChild(label);

    if (lever.description || lever.options) {
      const helpButton = document.createElement("button");
      helpButton.type = "button";
      helpButton.className = "drivetrain-help-button";
      helpButton.textContent = "?";
      helpButton.setAttribute("aria-label", `Explain ${dimensionLabel(dimension)}`);
      helpButton.setAttribute("aria-expanded", "false");
      helpButton.addEventListener("click", event => {
        event.stopPropagation();
        const wasOpen = host.classList.contains("help-open");
        closePolicyHelp();
        if (!wasOpen) {
          host.classList.add("help-open");
          helpButton.setAttribute("aria-expanded", "true");
        }
      });
      labelRow.appendChild(helpButton);
    }

    host.appendChild(labelRow);

    const row = document.createElement("div");
    row.className = "drivetrain-button-row";

    values.forEach(value => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "drivetrain-choice";
      button.textContent = labelFor(value, dimension);
      button.dataset.dimension = dimension;
      button.dataset.value = value;
      button.setAttribute("aria-pressed", value === active[dimension] ? "true" : "false");
      button.addEventListener("click", () => {
        active[dimension] = value;
        const scenario = findScenarioFromActive();
        if (scenario) selectScenario(scenario.scenario_id);
      });
      row.appendChild(button);
    });

    host.appendChild(row);

    if (lever.description || lever.options) {
      const info = document.createElement("div");
      info.className = "drivetrain-policy-help";
      info.innerHTML = policyHelpHtml(dimension, lever);
      host.appendChild(info);
    }

    return host;
  }

  function buildControls() {
    const toolbar = root.querySelector(".drivetrain-toolbar");
    toolbar.innerHTML = "";

    const groups = controlGroups();
    const totalLevers = groups.reduce((sum, group) => sum + group.levers.length, 0);
    toolbar.style.setProperty("--total-levers", totalLevers);
    toolbar.classList.toggle("compact", totalLevers >= 7);

    groups.forEach(group => {
      const cluster = document.createElement("div");
      cluster.className = "drivetrain-control-cluster";
      cluster.dataset.group = group.id || "";
      cluster.style.setProperty("--cluster-span", group.levers.length);

      const heading = document.createElement("div");
      heading.className = "drivetrain-group-label";
      heading.textContent = group.label || "Scenario levers";
      cluster.appendChild(heading);

      const controls = document.createElement("div");
      controls.className = "drivetrain-group-controls";
      controls.style.setProperty("--lever-count", group.levers.length);
      group.levers.forEach(dimension => {
        controls.appendChild(createControl(dimension));
      });
      cluster.appendChild(controls);

      toolbar.appendChild(cluster);
    });
  }

  function buildElasticityControl() {
    const host = root.querySelector("[data-elasticity-control]");
    const lever = leverFor(elasticityDimension);
    if (!host || !lever.options) {
      if (host) host.hidden = true;
      return;
    }

    host.hidden = false;
    const values = Object.keys(lever.options).filter(value =>
      index.some(scenario => valueFor(scenario, elasticityDimension) === value)
    );

    host.innerHTML = `
      <div class="drivetrain-elasticity-head">
        <div>
          <p class="drivetrain-kicker">${escapeHtml(lever.label || "Elasticities")}</p>
          <h3>${escapeHtml(lever.description || "Price-response assumptions used by the demand model.")}</h3>
        </div>
      </div>
      <div class="drivetrain-elasticity-buttons"></div>
      <p class="drivetrain-elasticity-description" data-elasticity-description></p>
    `;

    const buttons = host.querySelector(".drivetrain-elasticity-buttons");
    values.forEach(value => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "drivetrain-choice";
      button.textContent = labelFor(value, elasticityDimension);
      button.dataset.dimension = elasticityDimension;
      button.dataset.value = value;
      button.setAttribute("aria-pressed", value === active[elasticityDimension] ? "true" : "false");
      button.addEventListener("click", () => {
        active[elasticityDimension] = value;
        const scenario = findScenarioFromActive();
        if (scenario) selectScenario(scenario.scenario_id);
      });
      buttons.appendChild(button);
    });

    refreshElasticityDescription();
  }

  function refreshElasticityDescription() {
    const description = root.querySelector("[data-elasticity-description]");
    if (!description) return;
    const option = leverFor(elasticityDimension).options?.[active[elasticityDimension]];
    description.textContent = option?.description || "";
  }

  function policyHelpHtml(dimension, lever) {
    const optionRows = Object.keys(lever.options || {}).map(value => `
      <li>
        <strong>${escapeHtml(labelFor(value, dimension))}</strong>
        <span>${escapeHtml(lever.options[value].description || "")}</span>
      </li>
    `).join("");

    return `
      <div class="drivetrain-policy-help-title">${escapeHtml(dimensionLabel(dimension))}</div>
      ${lever.description ? `<p>${escapeHtml(lever.description)}</p>` : ""}
      ${optionRows ? `<ul>${optionRows}</ul>` : ""}
    `;
  }

  function closePolicyHelp() {
    root.querySelectorAll(".drivetrain-control-group.help-open").forEach(group => {
      group.classList.remove("help-open");
      const button = group.querySelector(".drivetrain-help-button");
      if (button) button.setAttribute("aria-expanded", "false");
    });
  }

  function refreshControlState() {
    root.querySelectorAll(".drivetrain-choice").forEach(button => {
      button.setAttribute(
        "aria-pressed",
        active[button.dataset.dimension] === button.dataset.value ? "true" : "false"
      );
    });
  }

  document.addEventListener("click", event => {
    if (!root.contains(event.target)) closePolicyHelp();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closePolicyHelp();
  });

  function buildLegend() {
    const legend = root.querySelector("[data-legend]");
    legend.innerHTML = drivetrainKeys
      .map(key => `
        <span class="drivetrain-legend-item">
          <span class="drivetrain-swatch" style="background:${colors[key]}"></span>
          ${labels.drivetrains[key]}
        </span>
      `)
      .join("");
  }

  function buildYearToggle() {
    const toggle = root.querySelector("[data-year-toggle]");
    toggle.innerHTML = detailYears.map(year => `
      <button
        type="button"
        class="drivetrain-year-choice"
        data-year="${year}"
        aria-pressed="${year === detailYear ? "true" : "false"}"
      >${year}</button>
    `).join("");

    toggle.querySelectorAll("button").forEach(button => {
      button.addEventListener("click", () => {
        detailYear = Number(button.dataset.year);
        renderComposition();
        renderDelta();
        refreshYearToggle();
      });
    });
  }

  function refreshYearToggle() {
    root.querySelectorAll(".drivetrain-year-choice").forEach(button => {
      button.setAttribute("aria-pressed", Number(button.dataset.year) === detailYear ? "true" : "false");
    });
  }

  function renderComposition() {
    const final = currentData.series.find(row => row.year === detailYear) || currentData.series.at(-1);
    root.querySelector("[data-composition-title]").textContent = `${final.year} drivetrain shares`;

    root.querySelector("[data-stack]").innerHTML = drivetrainKeys.map(key => `
      <div class="drivetrain-stack-row">
        <div class="drivetrain-stack-label">
          <span>${labels.drivetrains[key]}</span>
          <strong>${pct(final[key])}</strong>
        </div>
        <div class="drivetrain-bar">
          <span style="width:${Math.max(0, Math.min(100, final[key] * 100))}%; background:${colors[key]}"></span>
        </div>
      </div>
    `).join("");
  }

  function renderDelta() {
    const deltaRow = (currentData.delta_pp_series || []).find(row => row.year === detailYear);
    const deltaGrid = root.querySelector("[data-delta-grid]");
    root.querySelector("[data-delta-title]").textContent = `Percentage points in ${detailYear}`;

    if (!deltaRow) {
      deltaGrid.innerHTML = "<p>No adopted-policy delta available.</p>";
      return;
    }

    deltaGrid.innerHTML = drivetrainKeys.map(key => {
      const value = Number(deltaRow[key]);
      const tone = value > 0.05 ? "positive" : value < -0.05 ? "negative" : "";
      return `
        <div class="drivetrain-delta ${tone}">
          <b>${pp(value)}</b>
          <span>${labels.drivetrains[key]}</span>
        </div>
      `;
    }).join("");
  }

  function renderChart() {
    if (!currentData || !chartEl.clientWidth) return;

    const width = Math.max(620, chartEl.clientWidth);
    const height = 330;
    const margin = { top: 16, right: 20, bottom: 36, left: 48 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const chartSeries = currentData.series.filter(row => row.year >= 2024);
    const years = chartSeries.map(row => row.year);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    const x = year => margin.left + ((year - minYear) / (maxYear - minYear)) * innerWidth;
    const y = value => margin.top + (1 - value) * innerHeight;
    const line = key => chartSeries.map(row => `${x(row.year)},${y(row[key])}`).join(" ");
    const ticks = [0, 0.25, 0.5, 0.75, 1];
    const yearTicks = [2024, 2026, 2028, 2030, 2032, 2035];
    const highlightedYears = new Set([2024, 2030, 2035]);

    chartEl.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Projected new-car sales shares by drivetrain from 2024 to 2035">
        ${ticks.map(tick => `
          <line class="drivetrain-grid-line" x1="${margin.left}" x2="${width - margin.right}" y1="${y(tick)}" y2="${y(tick)}"></line>
          <text class="drivetrain-axis-label" x="${margin.left - 10}" y="${y(tick) + 4}" text-anchor="end">${Math.round(tick * 100)}%</text>
        `).join("")}
        ${yearTicks.map(year => `
          <text class="drivetrain-axis-label" x="${x(year)}" y="${height - 9}" text-anchor="middle">${year}</text>
        `).join("")}
        ${drivetrainKeys.map(key => `
          <polyline class="drivetrain-series-line" points="${line(key)}" style="stroke:${colors[key]}"></polyline>
          ${chartSeries.map(row => `
            <circle class="drivetrain-series-point" cx="${x(row.year)}" cy="${y(row[key])}" r="${highlightedYears.has(row.year) ? 3.4 : 0}" style="fill:${colors[key]}"></circle>
          `).join("")}
        `).join("")}
      </svg>
    `;
  }

  function smoothPath(points) {
    if (!points.length) return "";
    return points.slice(1).reduce((path, point, index) => {
      const previous = points[index];
      const midX = (previous.x + point.x) / 2;
      return `${path} C ${midX},${previous.y} ${midX},${point.y} ${point.x},${point.y}`;
    }, `M ${points[0].x},${points[0].y}`);
  }

  function renderTechnologyCurves() {
    const section = root.querySelector("[data-technology-curves]");
    if (!section || !technologyCurveEl || !technologySummary.length) {
      if (section) section.hidden = true;
      return;
    }

    const rows = technologySummary.filter(row => row.elasticity_set === active[elasticityDimension]);
    if (!rows.length) {
      section.hidden = true;
      return;
    }

    section.hidden = false;
    const width = Math.max(620, technologyCurveEl.clientWidth || section.clientWidth || root.clientWidth);
    const height = 190;
    const margin = { top: 14, right: 128, bottom: 28, left: 42 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const years = [2024, 2026, 2030, 2035];
    const maxValue = Math.max(...rows.flatMap(row => years.map(year => Number(row[`bev_${year}`]))));
    const yMax = Math.max(0.7, Math.min(1, Math.ceil(maxValue * 10) / 10));

    const x = year => margin.left + ((year - 2024) / (2035 - 2024)) * innerWidth;
    const y = value => margin.top + (1 - value / yMax) * innerHeight;
    const orderedRows = rows.slice().sort((a, b) =>
      ["conservative_technology", "central_technology", "accelerated_technology"]
        .indexOf(a.technology_scenario) -
      ["conservative_technology", "central_technology", "accelerated_technology"]
        .indexOf(b.technology_scenario)
    );
    const tickValues = [0, yMax / 2, yMax];

    technologyCurveEl.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="BEV technology S-curve checkpoints for selected elasticity assumption">
        ${tickValues.map(tick => `
          <line class="drivetrain-technology-grid-line" x1="${margin.left}" x2="${width - margin.right}" y1="${y(tick)}" y2="${y(tick)}"></line>
          <text class="drivetrain-technology-axis-label" x="${margin.left - 8}" y="${y(tick) + 4}" text-anchor="end">${Math.round(tick * 100)}%</text>
        `).join("")}
        ${years.map(year => `
          <text class="drivetrain-technology-axis-label" x="${x(year)}" y="${height - 8}" text-anchor="middle">${year}</text>
        `).join("")}
        ${orderedRows.map(row => {
          const points = years.map(year => ({
            x: x(year),
            y: y(Number(row[`bev_${year}`])),
            value: Number(row[`bev_${year}`])
          }));
          const lastPoint = points.at(-1);
          const color = technologyCurveColors[row.technology_scenario] || colors.bev;
          return `
            <path class="drivetrain-technology-curve-line" d="${smoothPath(points)}" style="stroke:${color}"></path>
            ${points.map(point => `
              <circle class="drivetrain-technology-curve-point" cx="${point.x}" cy="${point.y}" r="2.4" style="fill:${color}"></circle>
            `).join("")}
            <text class="drivetrain-technology-curve-label" x="${lastPoint.x + 9}" y="${lastPoint.y + 4}" style="fill:${color}">
              ${escapeHtml(labelFor(row.technology_scenario, "technology_scenario"))} ${pct(lastPoint.value, 0)}
            </text>
          `;
        }).join("")}
      </svg>
    `;
  }

  function renderAll() {
    refreshControlState();
    refreshElasticityDescription();
    refreshYearToggle();
    renderTechnologyCurves();
    renderComposition();
    renderDelta();
    renderChart();
  }

  async function selectScenario(scenarioId) {
    const scenario = index.find(item => item.scenario_id === scenarioId);
    if (!scenario) return;

    currentScenario = scenario;
    setActiveFromScenario(scenario);
    status.textContent = "Loading scenario...";

    try {
      const response = await fetch(`${paths.base}${scenario.file}`);
      if (!response.ok) throw new Error(`Scenario request failed: ${response.status}`);
      currentData = await response.json();
      status.hidden = true;
      shell.hidden = false;
      renderAll();
    } catch (error) {
      status.hidden = false;
      status.textContent = "Could not load scenario data.";
      console.error(error);
    }
  }

  async function init() {
    try {
      const [indexResponse, technologyResponse, technologySummaryResponse, policyResponse] = await Promise.all([
        fetch(paths.index),
        fetch(paths.technology),
        fetch(paths.technologySummary),
        fetch(paths.policyLevers)
      ]);
      if (!indexResponse.ok || !technologyResponse.ok || !technologySummaryResponse.ok || !policyResponse.ok) {
        throw new Error("Model metadata request failed");
      }

      index = await indexResponse.json();
      technologyMeta = await technologyResponse.json();
      technologySummary = parseCsv(await technologySummaryResponse.text());
      policyMeta = await policyResponse.json();

      if (policyMeta.levers) {
        dimensions = Object.keys(policyMeta.levers);
      }

      if (policyMeta.default_selection) {
        active = { ...active, ...policyMeta.default_selection };
      } else if (technologyMeta.default) {
        active = { ...active, technology_scenario: technologyMeta.default };
      }

      buildControls();
      buildElasticityControl();
      buildLegend();
      buildYearToggle();

      resizeObserver = new ResizeObserver(() => {
        renderTechnologyCurves();
        renderChart();
      });
      resizeObserver.observe(chartEl);
      if (technologyCurveEl) resizeObserver.observe(technologyCurveEl);

      const initialScenario = findScenarioFromActive() || index.find(scenario => scenario.is_baseline) || index[0];
      await selectScenario(initialScenario.scenario_id);
    } catch (error) {
      status.textContent = "Could not load drivetrain demand model data.";
      console.error(error);
    }
  }

  window.addEventListener("beforeunload", () => {
    if (resizeObserver) resizeObserver.disconnect();
  });

  init();
})();

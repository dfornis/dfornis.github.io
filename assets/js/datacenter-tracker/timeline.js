/* Display precomputed annual results from the shared R model. No phasing rules here. */
(function (global) {
  "use strict";
  const countryNames = { SE: "Sweden", NO: "Norway", FI: "Finland" };
  // Slate blue from the header illustration, with muted clay and sage companions.
  const countryColors = { FI: "#4c7088", SE: "#9b6659", NO: "#5f7968" };
  const familyIds = ["low", "stated", "high"];
  const gw = (value) => (value / 1000).toLocaleString("en-US", { maximumFractionDigits: 2 });
  const range = (point) =>
    point.low === null || point.high === null || (point.high === 0 && point.unknown)
      ? "Unknown"
      : (gw(point.low) === gw(point.high) ? gw(point.high) : gw(point.low) + "–" + gw(point.high)) + " GW" + (point.unknown ? "*" : "");
  const plottedValue = (point) => point.high;

  function assertTimeline(timeline, data) {
    if (timeline.version !== 3 || !Array.isArray(timeline.rows) || !Array.isArray(timeline.years) || timeline.years.length < 2)
      throw new Error("Annual capacity data is unavailable.");
    // Only data and model inputs affect capacity. Documentation edits do not stale the chart.
    const sourceKeys = ["projects", "capacity", "sources", "actors", "model", "method"];
    if (
      timeline.as_of !== data.as_of ||
      sourceKeys.some((key) => !data.input_hashes?.[key] || timeline.source_hashes?.[key] !== data.input_hashes[key])
    )
      throw new Error("The annual chart is awaiting a refresh for the latest project data.");
    const expected = new Set(
      data.projects.flatMap((project) => timeline.years.flatMap((year) => familyIds.map((family) => `${project.project_id}:${year}:${family}`)))
    );
    for (const row of timeline.rows) {
      if (!expected.delete(`${row.project_id}:${row.year}:${row.family}`)) throw new Error("Duplicate or unexpected annual capacity data.");
      for (const measure of ["mw", "annual_addition_mw", "future_addition_mw", "remaining_mw"]) {
        const low = row[measure + "_low"],
          high = row[measure + "_high"];
        if (
          (low === null) !== (high === null) ||
          [low, high].some((value) => value !== null && (!Number.isFinite(value) || value < 0)) ||
          (low !== null && high !== null && low > high)
        )
          throw new Error("Invalid annual capacity interval.");
      }
    }
    if (expected.size) throw new Error("Annual capacity data is incomplete.");
    return timeline;
  }

  function makeSeries(timeline, data, options, filters = {}) {
    // Reuse the table's project selection, then sum the exported annual intervals.
    const selected = new Set(global.DCTracker.rowsFor(data, "stated_2035", filters).map((row) => row.project_id));
    const projects = new Map(data.projects.map((project) => [project.project_id, project]));
    const rows = timeline.rows.filter(
      (row) =>
        selected.has(row.project_id) &&
        (options.hq === "none" || global.DCTrackerMap.matchesHq(projects.get(row.project_id), options.hq)) &&
        row.family === options.family
    );
    const keyFor = (row) => projects.get(row.project_id).country;
    const keys = [...new Set(rows.map(keyFor))].sort();
    return keys.map((key) => ({
      key,
      label: countryNames[key] || key,
      color: countryColors[key],
      points: timeline.years.map((year) => ({
        year,
        ...global.DCTracker.sumBounds(
          rows.filter((row) => keyFor(row) === key && row.year === year),
          (options.measure || "mw") + "_low",
          (options.measure || "mw") + "_high"
        ),
      })),
    }));
  }

  function capacityMax(timeline, data, measure = "mw") {
    // Keep a fixed axis covering every country, scenario and project selection.
    const totals = new Map();
    for (const row of timeline.rows) {
      const key = `${row.country}:${row.family}:${row.year}`;
      totals.set(key, (totals.get(key) || 0) + (row[measure + "_high"] ?? 0));
    }
    return Math.max(0, ...totals.values()) / 1000 || 1;
  }

  async function mount(container, data, initialView) {
    if (!container) return null;
    let view = initialView;
    const message = container.querySelector(".dc-timeline-status");
    try {
      if (!global.d3) throw new Error("The chart library could not be loaded. Please reload the page.");
      const response = await fetch(container.dataset.timeline);
      if (!response.ok) throw new Error("Annual capacity data could not be loaded.");
      const timeline = assertTimeline(await response.json(), data);
      const d3 = global.d3;
      const familySelect = container.querySelector("[name='timeline-family']");
      const hqSelect = container.querySelector("[name='timeline-hq']");
      const measureInputs = container.querySelectorAll("[name='timeline-measure']");
      const readout = container.querySelector(".dc-timeline-readout");
      const chart = container.querySelector(".dc-timeline-chart");
      const table = container.querySelector(".dc-timeline-table");
      const unknownNote = container.querySelector(".dc-timeline-unknown");
      const reducedMotion = global.matchMedia("(prefers-reduced-motion: reduce)");
      const svg = d3.select(chart).append("svg").attr("role", "img").attr("aria-labelledby", "dc-timeline-svg-title dc-timeline-svg-desc");
      svg.append("title").attr("id", "dc-timeline-svg-title").text("Additional datacenter capacity in operation by year");
      svg
        .append("desc")
        .attr("id", "dc-timeline-svg-desc")
        .text(
          "Cumulative additional site capacity in GW, from " +
            timeline.years[0] +
            " to " +
            timeline.years.at(-1) +
            ". Lines show the upper estimates and shaded bands show the range. The scale stays fixed across selections. All values are available in the data table."
        );
      const grid = svg.append("g").attr("class", "dc-timeline-grid");
      const unit = svg.append("text").attr("class", "dc-timeline-unit").text("Additional capacity (GW)");
      const axis = svg.append("g").attr("class", "dc-timeline-axis");
      const milestoneLine = svg.append("line").attr("class", "dc-timeline-milestone");
      const plots = svg.append("g");
      const endLabels = svg.append("g");
      const cursor = svg.append("g").attr("pointer-events", "none");
      cursor.append("line").attr("class", "dc-timeline-cursor");
      const overlay = svg.append("rect").attr("fill", "transparent");
      let rendered = false;
      let selectedYear = timeline.years.at(-1);
      const resizeObserver = new ResizeObserver(() => render());
      resizeObserver.observe(chart);
      [familySelect, hqSelect, ...measureInputs].forEach((control) => control.addEventListener("change", render));

      function render() {
        const options = {
          family: familySelect.value,
          hq: hqSelect.value,
          measure: container.querySelector("[name='timeline-measure']:checked").value,
        };
        const maxCapacity = capacityMax(timeline, data, options.measure);
        const measureLabels = {
          mw: "Cumulative additions (GW)",
          annual_addition_mw: "Added during year (GW)",
        };
        unit.text(measureLabels[options.measure]);
        svg.select("title").text(measureLabels[options.measure]);
        svg
          .select("desc")
          .text(
            timeline.measures[options.measure] +
              " Lines show the upper estimates and shaded bands show the range. The axis stays fixed across scenarios and filters for this measure."
          );
        const series = makeSeries(timeline, data, options, view.filters);
        const visible = series.filter((series) => series.points.some((point) => plottedValue(point) > 0));
        const unknown = series.some((series) => series.points.some((point) => point.unknown));
        const duration = rendered && !reducedMotion.matches ? 380 : 0;
        const animate = (selection) => {
          selection.interrupt();
          return duration ? selection.transition().duration(duration).ease(d3.easeCubicInOut) : selection;
        };
        message.textContent = !series.length
          ? "No projects match this selection."
          : !visible.length
            ? unknown
              ? "No quantified additions in this selection. Some capacity is unknown."
              : "No additions with a reported timeline through 2035 in this selection."
            : "";
        message.hidden = !message.textContent;
        unknownNote.hidden = !unknown;
        const width = Math.max(300, chart.clientWidth);
        const compact = width < 620;
        const height = compact ? 350 : 420;
        const margin = {
          left: compact ? 46 : 58,
          right: compact ? 24 : 150,
          top: 44,
          bottom: 46,
        };
        const right = width - margin.right,
          bottom = height - margin.bottom;
        const x = d3
          .scaleLinear()
          .domain([timeline.years[0], timeline.years.at(-1)])
          .range([margin.left, right]);
        const y = d3.scaleLinear().domain([0, maxCapacity]).nice(5).range([bottom, margin.top]);
        svg.attr("viewBox", `0 0 ${width} ${height}`);
        grid
          .attr("transform", `translate(${margin.left},0)`)
          .call(
            d3
              .axisLeft(y)
              .ticks(5)
              .tickSize(-(right - margin.left))
              .tickFormat((value) => value.toLocaleString("en-US"))
          )
          .call((group) => group.select(".domain").remove());
        unit.attr("x", margin.left).attr("y", 20);
        const ticks = compact
          ? timeline.years.filter((year, index) => (index % 2 === 0 && index < timeline.years.length - 2) || year === timeline.years.at(-1))
          : timeline.years;
        axis
          .attr("transform", `translate(0,${bottom})`)
          .call(d3.axisBottom(x).tickValues(ticks).tickFormat(d3.format("d")).tickSize(5).tickPadding(10));
        const milestone = timeline.years.includes(2030) ? 2030 : null;
        if (milestone) milestoneLine.attr("x1", x(milestone)).attr("x2", x(milestone)).attr("y1", margin.top).attr("y2", bottom);
        const defined = (point) => point.low !== null && point.high !== null;
        const area = d3
          .area()
          .defined(defined)
          .x((point) => x(point.year))
          .y0((point) => y(point.low / 1000))
          .y1((point) => y(point.high / 1000));
        const line = d3
          .line()
          .defined((point) => plottedValue(point) !== null)
          .x((point) => x(point.year))
          .y((point) => y(plottedValue(point) / 1000));
        const groups = plots
          .selectAll("g.dc-timeline-series")
          .data(visible, (series) => series.key)
          .join(
            (enter) => enter.append("g").attr("class", "dc-timeline-series").attr("opacity", 0),
            (update) => update,
            (exit) => animate(exit).attr("opacity", 0).remove()
          );
        animate(groups).attr("opacity", 1);
        groups.each(function (series) {
          const group = d3.select(this);
          const band = group
            .selectAll("path.dc-timeline-band")
            .data([series.points])
            .join((enter) => enter.append("path").attr("class", "dc-timeline-band").attr("d", area))
            .attr("fill", series.color)
            .attr("opacity", 0.09);
          animate(band).attr("d", area);
          const stroke = group
            .selectAll("path.dc-timeline-line")
            .data([series.points])
            .join((enter) => enter.append("path").attr("class", "dc-timeline-line").attr("d", line))
            .attr("fill", "none")
            .attr("stroke", series.color)
            .attr("stroke-width", 2.1)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round");
          animate(stroke).attr("d", line);
          const points = group
            .selectAll("circle")
            .data(
              series.points.filter((point) => plottedValue(point) !== null),
              (point) => point.year
            )
            .join((enter) => enter.append("circle").attr("cy", (point) => y(plottedValue(point) / 1000)))
            .attr("cx", (point) => x(point.year))
            .attr("r", 2.4)
            .attr("fill", series.color);
          animate(points).attr("cy", (point) => y(plottedValue(point) / 1000));
        });
        // Leave room for both the country name and its capacity range.
        const labels = compact
          ? []
          : visible
              .map((series) => ({
                ...series,
                end: series.points.at(-1),
                labelY: y(plottedValue(series.points.at(-1)) / 1000),
              }))
              .sort((a, b) => a.labelY - b.labelY);
        if (!compact) {
          const gap = 50;
          labels.forEach((label, index) => {
            label.labelY = Math.max(label.labelY, index ? labels[index - 1].labelY + gap : margin.top);
          });
          if (labels.length && labels.at(-1).labelY > bottom - 10) {
            labels.at(-1).labelY = bottom - 10;
            for (let index = labels.length - 2; index >= 0; index--)
              labels[index].labelY = Math.min(labels[index].labelY, labels[index + 1].labelY - gap);
          }
        }
        const labelGroups = endLabels
          .selectAll("g")
          .data(labels, (label) => label.key)
          .join(
            (enter) => enter.append("g").attr("opacity", 0),
            (update) => update,
            (exit) => animate(exit).attr("opacity", 0).remove()
          );
        animate(labelGroups).attr("opacity", 1);
        labelGroups.each(function (label) {
          const group = d3.select(this);
          const connector = `M${right + 5},${y(plottedValue(label.end) / 1000)}L${right + 17},${label.labelY - 4}`;
          const path = group
            .selectAll("path")
            .data([label])
            .join((enter) => enter.append("path").attr("d", connector))
            .attr("fill", "none")
            .attr("stroke", label.color)
            .attr("opacity", 0.5);
          animate(path).attr("d", connector);
          const text = group
            .selectAll("text")
            .data([label])
            .join((enter) => enter.append("text").attr("y", label.labelY - 4))
            .attr("class", "dc-timeline-end-label")
            .attr("x", right + 24)
            .attr("fill", label.color);
          animate(text).attr("y", label.labelY - 4);
          text.selectAll("tspan.dc-timeline-end-name").data([label]).join("tspan").attr("class", "dc-timeline-end-name").text(label.label);
          text
            .selectAll("tspan.dc-timeline-end-value")
            .data([label])
            .join("tspan")
            .attr("class", "dc-timeline-end-value")
            .attr("x", right + 24)
            .attr("dy", 20)
            .text(range(label.end));
        });
        cursor.select("line").attr("y1", margin.top).attr("y2", bottom);
        const dots = cursor
          .selectAll("circle")
          .data(visible, (series) => series.key)
          .join((enter) =>
            enter.append("circle").attr("cy", (series) => y(plottedValue(series.points.find((point) => point.year === selectedYear)) / 1000))
          )
          .attr("r", 4)
          .attr("fill", (series) => series.color)
          .attr("stroke", "var(--dc-chart-paper)")
          .attr("stroke-width", 2);
        const inspect = (year, transition = false) => {
          selectedYear = year;
          container.querySelector(".dc-timeline-year").textContent = year;
          cursor.select("line").attr("x1", x(year)).attr("x2", x(year));
          dots.interrupt().attr("cx", x(year));
          (transition ? animate(dots) : dots).attr("cy", (series) => y(plottedValue(series.points.find((point) => point.year === year)) / 1000));
          readout.replaceChildren();
          series.forEach((series) => {
            const item = document.createElement("span");
            item.className = "dc-timeline-value";
            const marker = document.createElement("i");
            marker.style.background = series.color;
            marker.setAttribute("aria-hidden", "true");
            const label = document.createElement("span");
            label.textContent = series.label;
            const value = document.createElement("strong");
            value.textContent = range(series.points.find((point) => point.year === year));
            item.append(marker, label, value);
            readout.append(item);
          });
        };
        const inspectPointer = (event) =>
          inspect(Math.max(timeline.years[0], Math.min(timeline.years.at(-1), Math.round(x.invert(d3.pointer(event)[0])))));
        overlay
          .attr("x", margin.left)
          .attr("y", margin.top)
          .attr("width", right - margin.left)
          .attr("height", bottom - margin.top)
          .on("pointermove", inspectPointer)
          .on("pointerdown", inspectPointer);
        inspect(selectedYear, true);
        rendered = true;
        // Text-based equivalent, also usable without pointer interaction.
        table.replaceChildren();
        const caption = document.createElement("caption");
        caption.textContent = measureLabels[options.measure] + ". Lower–upper estimates.";
        const head = document.createElement("thead"),
          header = document.createElement("tr");
        ["Year", ...series.map((series) => series.label)].forEach((label) => {
          const cell = document.createElement("th");
          cell.scope = "col";
          cell.textContent = label;
          header.append(cell);
        });
        head.append(header);
        const body = document.createElement("tbody");
        timeline.years.forEach((year) => {
          const row = document.createElement("tr"),
            label = document.createElement("th");
          label.scope = "row";
          label.textContent = year;
          row.append(label);
          series.forEach((series) => {
            const cell = document.createElement("td");
            cell.textContent = range(series.points.find((point) => point.year === year));
            row.append(cell);
          });
          body.append(row);
        });
        table.append(caption, head, body);
      }
      container.querySelector(".dc-timeline-content").hidden = false;
      render();
      return {
        update(nextView) {
          view = nextView;
          render();
        },
        disconnect() {
          resizeObserver.disconnect();
          svg.selectAll("*").interrupt();
        },
      };
    } catch (error) {
      message.hidden = false;
      message.textContent = error.message;
      message.setAttribute("role", "alert");
      return null;
    }
  }
  const api = { assertTimeline, makeSeries, capacityMax, range, mount };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.DCTrackerTimeline = api;
})(typeof window === "undefined" ? globalThis : window);

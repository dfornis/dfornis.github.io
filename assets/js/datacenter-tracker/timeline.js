/* Display precomputed annual results from the shared R model. No phasing rules here. */
(function (global) {
  "use strict";
  const countryNames = { SE: "Sweden", NO: "Norway", FI: "Finland" };
  const countryColors = { FI: "#397fc0", SE: "#cb537c", NO: "#4c8875" };
  const gw = (value) => (value / 1000).toLocaleString("en-US", { maximumFractionDigits: 2 });
  const range = (point) =>
    point.high === null
      ? "Unknown"
      : (gw(point.low) === gw(point.high) ? gw(point.high) : gw(point.low) + "–" + gw(point.high)) + " GW" + (point.unknown ? "*" : "");

  function assertTimeline(timeline, data) {
    if (timeline.version !== 1 || !Array.isArray(timeline.rows) || !Array.isArray(timeline.years) || timeline.years.length < 2)
      throw new Error("Annual capacity data is unavailable.");
    // Only data and model inputs affect capacity. Documentation edits do not stale the chart.
    const sourceKeys = ["projects", "capacity", "sources", "actors", "model", "method"];
    if (
      timeline.as_of !== data.as_of ||
      sourceKeys.some((key) => !data.input_hashes?.[key] || timeline.source_hashes?.[key] !== data.input_hashes[key])
    )
      throw new Error("The annual chart is awaiting a refresh for the latest project data.");
    const expected = new Set(
      data.projects.flatMap((project) =>
        timeline.years.flatMap((year) => ["low", "stated"].map((family) => `${project.project_id}:${year}:${family}`))
      )
    );
    for (const row of timeline.rows) {
      if (!expected.delete(`${row.project_id}:${row.year}:${row.family}`)) throw new Error("Duplicate or unexpected annual capacity data.");
      if (
        [row.mw_low, row.mw_high].some((value) => value !== null && (!Number.isFinite(value) || value < 0)) ||
        (row.mw_low !== null && row.mw_high !== null && row.mw_low > row.mw_high)
      )
        throw new Error("Invalid annual capacity interval.");
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
          "mw_low",
          "mw_high"
        ),
      })),
    }));
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
      const readout = container.querySelector(".dc-timeline-readout");
      const chart = container.querySelector(".dc-timeline-chart");
      const table = container.querySelector(".dc-timeline-table");
      const scope = container.querySelector(".dc-timeline-scope");
      const unknownNote = container.querySelector(".dc-timeline-unknown");
      let selectedYear = timeline.years.at(-1);
      const resizeObserver = new ResizeObserver(() => render());
      resizeObserver.observe(chart);
      [familySelect, hqSelect].forEach((select) => select.addEventListener("change", render));

      function render() {
        const options = { family: familySelect.value, hq: hqSelect.value };
        const series = makeSeries(timeline, data, options, view.filters);
        const visible = series.filter((series) => series.points.some((point) => point.high > 0));
        const unknown = series.some((series) => series.points.some((point) => point.unknown));
        const activeFilters = Object.values(view.filters).some((values) => values?.length);
        scope.textContent =
          (activeFilters ? "Table filters applied" : "Sweden, Norway & Finland") +
          " · " +
          familySelect.selectedOptions[0].textContent +
          (options.hq !== "none" ? " · HQ: " + hqSelect.selectedOptions[0].textContent : "");
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
        const margin = { left: compact ? 46 : 58, right: compact ? 24 : 200, top: 44, bottom: 46 };
        const right = width - margin.right,
          bottom = height - margin.bottom;
        const x = d3
          .scaleLinear()
          .domain([timeline.years[0], timeline.years.at(-1)])
          .range([margin.left, right]);
        const y = d3
          .scaleLinear()
          .domain([
            0,
            d3.max(
              visible.flatMap((series) => series.points),
              (point) => point.high / 1000
            ) || 1,
          ])
          .nice(5)
          .range([bottom, margin.top]);
        chart.replaceChildren();
        const svg = d3
          .select(chart)
          .append("svg")
          .attr("viewBox", `0 0 ${width} ${height}`)
          .attr("role", "img")
          .attr("aria-labelledby", "dc-timeline-svg-title dc-timeline-svg-desc");
        svg.append("title").attr("id", "dc-timeline-svg-title").text("Additional datacenter capacity in operation by year");
        svg
          .append("desc")
          .attr("id", "dc-timeline-svg-desc")
          .text(
            "Cumulative additional site capacity in GW, from " +
              timeline.years[0] +
              " to " +
              timeline.years.at(-1) +
              ". Lines show upper estimates and shaded bands show the range. All values are available in the data table."
          );
        svg
          .append("g")
          .attr("class", "dc-timeline-grid")
          .attr("transform", `translate(${margin.left},0)`)
          .call(
            d3
              .axisLeft(y)
              .ticks(5)
              .tickSize(-(right - margin.left))
              .tickFormat((value) => value.toLocaleString("en-US"))
          )
          .call((group) => group.select(".domain").remove());
        svg.append("text").attr("class", "dc-timeline-unit").attr("x", margin.left).attr("y", 20).text("Additional capacity (GW)");
        const ticks = compact
          ? timeline.years.filter((year, index) => (index % 2 === 0 && index < timeline.years.length - 2) || year === timeline.years.at(-1))
          : timeline.years;
        svg
          .append("g")
          .attr("class", "dc-timeline-axis")
          .attr("transform", `translate(0,${bottom})`)
          .call(d3.axisBottom(x).tickValues(ticks).tickFormat(d3.format("d")).tickSize(5).tickPadding(10));
        const milestone = timeline.years.includes(2030) ? 2030 : null;
        if (milestone)
          svg
            .append("line")
            .attr("class", "dc-timeline-milestone")
            .attr("x1", x(milestone))
            .attr("x2", x(milestone))
            .attr("y1", margin.top)
            .attr("y2", bottom);
        const defined = (point) => point.low !== null && point.high !== null;
        const area = d3
          .area()
          .defined(defined)
          .x((point) => x(point.year))
          .y0((point) => y(point.low / 1000))
          .y1((point) => y(point.high / 1000));
        const line = d3
          .line()
          .defined(defined)
          .x((point) => x(point.year))
          .y((point) => y(point.high / 1000));
        visible.forEach((series) => {
          svg.append("path").datum(series.points).attr("fill", series.color).attr("opacity", 0.09).attr("d", area);
          svg
            .append("path")
            .datum(series.points)
            .attr("fill", "none")
            .attr("stroke", series.color)
            .attr("stroke-width", 2.1)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("d", line);
          svg
            .append("g")
            .selectAll("circle")
            .data(series.points.filter(defined))
            .join("circle")
            .attr("cx", (point) => x(point.year))
            .attr("cy", (point) => y(point.high / 1000))
            .attr("r", 2.4)
            .attr("fill", series.color);
        });
        // Leave room for both the country name and its capacity range.
        if (!compact) {
          const labels = visible
            .map((series) => ({ ...series, end: series.points.at(-1), labelY: y(series.points.at(-1).high / 1000) }))
            .sort((a, b) => a.labelY - b.labelY);
          const gap = 50;
          labels.forEach((label, index) => {
            label.labelY = Math.max(label.labelY, index ? labels[index - 1].labelY + gap : margin.top);
          });
          if (labels.length && labels.at(-1).labelY > bottom - 10) {
            labels.at(-1).labelY = bottom - 10;
            for (let index = labels.length - 2; index >= 0; index--)
              labels[index].labelY = Math.min(labels[index].labelY, labels[index + 1].labelY - gap);
          }
          labels.forEach((label) => {
            svg
              .append("path")
              .attr("d", `M${right + 5},${y(label.end.high / 1000)}L${right + 17},${label.labelY - 4}`)
              .attr("fill", "none")
              .attr("stroke", label.color)
              .attr("opacity", 0.5);
            const text = svg
              .append("text")
              .attr("class", "dc-timeline-end-label")
              .attr("x", right + 24)
              .attr("y", label.labelY - 4)
              .attr("fill", label.color);
            text.append("tspan").text(label.label);
            text
              .append("tspan")
              .attr("class", "dc-timeline-end-value")
              .attr("x", right + 24)
              .attr("dy", 20)
              .text(range(label.end));
          });
        }
        const cursor = svg.append("g").attr("pointer-events", "none");
        cursor.append("line").attr("class", "dc-timeline-cursor").attr("y1", margin.top).attr("y2", bottom);
        const dots = cursor
          .selectAll("circle")
          .data(visible)
          .join("circle")
          .attr("r", 4)
          .attr("fill", (series) => series.color)
          .attr("stroke", "var(--dc-chart-paper)")
          .attr("stroke-width", 2);
        const inspect = (year) => {
          selectedYear = year;
          container.querySelector(".dc-timeline-year").textContent = year;
          cursor.select("line").attr("x1", x(year)).attr("x2", x(year));
          dots.attr("cx", x(year)).attr("cy", (series) => y(series.points.find((point) => point.year === year).high / 1000));
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
        svg
          .append("rect")
          .attr("x", margin.left)
          .attr("y", margin.top)
          .attr("width", right - margin.left)
          .attr("height", bottom - margin.top)
          .attr("fill", "transparent")
          .on("pointermove", inspectPointer)
          .on("pointerdown", inspectPointer);
        inspect(selectedYear);
        // Text-based equivalent, also usable without pointer interaction.
        table.replaceChildren();
        const caption = document.createElement("caption");
        caption.textContent = "Cumulative additional site capacity (GW). Lower–upper estimates.";
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
        },
      };
    } catch (error) {
      message.hidden = false;
      message.textContent = error.message;
      message.setAttribute("role", "alert");
      return null;
    }
  }
  const api = { assertTimeline, makeSeries, range, mount };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.DCTrackerTimeline = api;
})(typeof window === "undefined" ? globalThis : window);

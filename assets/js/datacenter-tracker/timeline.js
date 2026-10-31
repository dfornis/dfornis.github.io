/* Display precomputed annual results from the shared R model. No phasing rules here. */
(function (global) {
  "use strict";
  const countryNames = { SE: "Sweden", NO: "Norway", FI: "Finland" };
  const displayDivisor = (measure) => (measure === "annual_twh" ? 1 : 1000);
  const gw = (value) => (value / 1000).toLocaleString("en-US", { maximumFractionDigits: 2 });
  function range(point, measure = "mw") {
    if (point.low === null || point.high === null || (point.high === 0 && point.unknown)) return "Unknown";
    const value =
      measure === "annual_twh"
        ? global.DCTracker.range(point.low, point.high, "twh") + " TWh/year"
        : (gw(point.low) === gw(point.high) ? gw(point.high) : gw(point.low) + "–" + gw(point.high)) + " GW";
    return value + (point.unknown ? "*" : "");
  }
  const plottedValue = (point) => point.high;
  // Upper cumulative values whose opening year comes from a source. Exported by the R model.
  const reportedKey = { mw: "reported_mw_high", annual_twh: "reported_twh_high" };

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
      data.projects.flatMap((project) => timeline.years.flatMap((year) => timeline.families.map(({ id: family }) => `${project.project_id}:${year}:${family}`)))
    );
    for (const row of timeline.rows) {
      if (!expected.delete(`${row.project_id}:${row.year}:${row.family}`)) throw new Error("Duplicate or unexpected annual capacity data.");
      for (const measure of ["mw", "annual_twh", "annual_addition_mw", "future_addition_mw", "remaining_mw"]) {
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

  function makeSeries(timeline, data, options) {
    const projects = new Map(data.projects.map((project) => [project.project_id, project]));
    const rows = timeline.rows.filter((row) => row.family === options.family &&
      (options.hq === "none" || global.DCTrackerMap.matchesHq(projects.get(row.project_id), options.hq)));
    return ["SE", "NO", "FI"].map((country) => ({ key: country, label: countryNames[country], color: `var(--dc-country-${country})`,
      points: timeline.years.map((year) => {
        const yearRows = rows.filter((row) => row.country === country && row.year === year);
        const measure = options.measure || "mw";
        return { year,
          ...global.DCTracker.sumBounds(yearRows, `${measure}_low`, `${measure}_high`),
          reported: reportedKey[measure] ? yearRows.reduce((sum, row) => sum + (row[reportedKey[measure]] || 0), 0) : null };
      }) }));
  }
  function capacityMax(timeline, data, measure = "mw", family = "announced") {
    // The largest country's upper series in the selected tab sets the shared axis.
    // HQ selections do not rescale it, so a selection shows its share of the tab.
    const totals = new Map();
    for (const row of timeline.rows.filter((row) => row.family === family)) {
      const key = `${row.country}:${row.year}`;
      totals.set(key, (totals.get(key) || 0) + (row[`${measure}_high`] || 0));
    }
    return Math.max(0, ...totals.values()) / displayDivisor(measure) || 1;
  }

  async function mount(container, data, shared) {
    if (!container) return null;
    const message = container.querySelector(".dc-timeline-status");
    try {
      if (!global.d3) throw new Error("The chart library could not be loaded. Please reload the page.");
      const response = await fetch(container.dataset.timeline);
      if (!response.ok) throw new Error("Annual capacity data could not be loaded.");
      const timeline = assertTimeline(await response.json(), data);
      const d3 = global.d3;
      const measureInputs = container.querySelectorAll("[name='timeline-measure']");
      const capacityView = container.querySelector("[data-timeline-capacity-view]");
      const readout = container.querySelector(".dc-timeline-readout");
      const chart = container.querySelector(".dc-timeline-chart");
      const table = container.querySelector(".dc-timeline-table");
      const unknownNote = container.querySelector(".dc-timeline-unknown");
      const svg = d3.select(chart).append("svg").attr("role", "img").attr("aria-labelledby", "dc-timeline-svg-title dc-timeline-svg-desc");
      svg.append("title").attr("id", "dc-timeline-svg-title");
      svg.append("desc").attr("id", "dc-timeline-svg-desc");
      const panelsLayer = svg.append("g");
      let selectedYear = timeline.years.at(-1);
      let lastLayout = null;
      const resizeObserver = new ResizeObserver(() => render());
      resizeObserver.observe(chart);
      [...measureInputs].forEach((control) => control.addEventListener("change", render));
      const fmt = (value, measure) =>
        measure === "annual_twh"
          ? value.toLocaleString("en-US", { maximumFractionDigits: 1 }) + " TWh/year"
          : (value / 1000).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " GW";

      function render() {
        const state = shared.get();
        const electricity = state.measure === "twh";
        capacityView.setAttribute("aria-disabled", String(electricity));
        measureInputs.forEach((input) => {
          input.disabled = electricity;
        });
        const view = container.querySelector("[name='timeline-measure']:checked").value;
        const measure = electricity ? "annual_twh" : view;
        const added = measure === "annual_addition_mw";
        const divisor = displayDivisor(measure);
        const maxValue = capacityMax(timeline, data, measure, state.family);
        const measureLabels = {
          mw: "New capacity since 2025 (GW)",
          annual_addition_mw: "Capacity added during the year (GW)",
          annual_twh: "Annual electricity use of new capacity (TWh/year)",
        };
        svg.select("title").text(measureLabels[measure]);
        svg.select("desc").text("One panel per country. The dark area is capacity with an opening year reported by a source. The light area is capacity where the opening year is estimated. The two areas together show the upper estimate. Values are listed in the table below the chart.");
        // Cumulative split: reported part and estimated part of the upper value.
        const cumulative = makeSeries(timeline, data, { family: state.family, hq: state.hq, measure: electricity ? "annual_twh" : "mw" });
        const totals = added ? makeSeries(timeline, data, { family: state.family, hq: state.hq, measure: "annual_addition_mw" }) : cumulative;
        const series = totals.map((country, index) => ({
          ...country,
          points: country.points.map((point, i) => {
            const source = cumulative[index].points;
            let reported = source[i].reported ?? 0;
            if (added) reported = Math.max(0, reported - (i ? source[i - 1].reported ?? 0 : 0));
            const high = point.high ?? 0;
            reported = Math.min(reported, high);
            return { ...point, reported, estimated: Math.max(0, high - reported) };
          }),
        }));
        const unknown = series.some((country) => country.points.some((point) => point.unknown));
        unknownNote.hidden = !unknown;
        message.textContent = series.every((country) => country.points.every((point) => !point.high))
          ? unknown ? "No quantified additions in this selection. Some capacity has no MW figure." : "No additions in this selection."
          : "";
        message.hidden = !message.textContent;

        const width = Math.max(300, chart.clientWidth);
        const stacked = width < 620;
        const gap = 36, left = 44, panelHeight = stacked ? 190 : 300, top = 30, bottomPad = 28;
        const panelWidth = stacked ? width - left - 10 : (width - left - 10 - 2 * gap) / 3;
        const height = stacked ? 3 * (panelHeight + top + bottomPad) : panelHeight + top + bottomPad;
        svg.attr("viewBox", `0 0 ${width} ${height}`);
        const y = d3.scaleLinear().domain([0, maxValue]).nice(4).range([panelHeight, 0]);
        // Elements are kept between renders so that axis, areas and bars can move smoothly to new values.
        // A new width or a switch between areas and bars redraws without animation.
        const layout = `${width}:${added}`;
        const reduced = global.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        const animate = lastLayout === layout && !reduced;
        lastLayout = layout;
        const t = svg.transition().duration(animate ? 550 : 0).ease(d3.easeCubicInOut);
        const panels = panelsLayer.selectAll("g.dc-timeline-panel").data(series, (country) => country.key)
          .join((enter) => {
            const g = enter.append("g").attr("class", "dc-timeline-panel");
            g.append("text").attr("class", "dc-timeline-panel-title").attr("x", 0).attr("y", -12);
            g.append("g").attr("class", "dc-timeline-grid");
            g.append("g").attr("class", "dc-timeline-axis");
            g.append("path").attr("class", "dc-timeline-estimated dc-timeline-area-estimated");
            g.append("path").attr("class", "dc-timeline-reported dc-timeline-area-reported");
            g.append("g").attr("class", "dc-timeline-bars");
            g.append("line").attr("class", "dc-timeline-cursor");
            g.append("circle").attr("class", "dc-timeline-marker").attr("r", 3.5);
            g.append("text").attr("class", "dc-timeline-end-label");
            g.append("rect").attr("class", "dc-timeline-hit").attr("fill", "transparent");
            return g;
          });
        panels.each(function (country, index) {
          const g = d3.select(this);
          const x0 = stacked ? left : left + index * (panelWidth + gap);
          const y0 = stacked ? index * (panelHeight + top + bottomPad) + top : top;
          g.attr("transform", `translate(${x0},${y0})`);
          const x = d3.scaleLinear().domain([timeline.years[0], timeline.years.at(-1)]).range([0, panelWidth]);
          g.select(".dc-timeline-panel-title").text(country.label);
          g.select(".dc-timeline-grid").transition(t)
            .call(d3.axisLeft(y).ticks(4).tickSize(-panelWidth).tickFormat((value) => (index && !stacked ? "" : value.toLocaleString("en-US"))));
          const ticks = timeline.years.filter((year, i) => i === 0 || year === timeline.years.at(-1) || year === 2030);
          g.select(".dc-timeline-axis").attr("transform", `translate(0,${panelHeight})`)
            .call(d3.axisBottom(x).tickValues(ticks).tickFormat(d3.format("d")).tickSize(4).tickPadding(6))
            .call((axis) => axis.selectAll(".tick text").attr("text-anchor", (d, i, all) => (i === 0 ? "start" : i === all.length - 1 ? "end" : "middle")));
          const v = (value) => y((value || 0) / divisor);
          const estimatedArea = g.select(".dc-timeline-area-estimated").attr("display", added ? "none" : null);
          const reportedArea = g.select(".dc-timeline-area-reported").attr("display", added ? "none" : null);
          const band = panelWidth / timeline.years.length;
          const bars = g.select(".dc-timeline-bars").attr("display", added ? null : "none");
          if (added) {
            const groups = bars.selectAll("g").data(country.points, (point) => point.year).join((enter) => {
              const bar = enter.append("g");
              bar.append("rect").attr("class", "dc-timeline-estimated").attr("y", v(0)).attr("height", 0);
              bar.append("rect").attr("class", "dc-timeline-reported").attr("y", v(0)).attr("height", 0);
              return bar;
            });
            groups.select(".dc-timeline-estimated").attr("x", (p) => x(p.year) - band * 0.35).attr("width", band * 0.7).transition(t)
              .attr("y", (p) => v(p.reported + p.estimated)).attr("height", (p) => Math.max(0, v(p.reported) - v(p.reported + p.estimated)));
            groups.select(".dc-timeline-reported").attr("x", (p) => x(p.year) - band * 0.35).attr("width", band * 0.7).transition(t)
              .attr("y", (p) => v(p.reported)).attr("height", (p) => Math.max(0, v(0) - v(p.reported)));
          } else {
            estimatedArea.datum(country.points).transition(t)
              .attr("d", d3.area().x((p) => x(p.year)).y0((p) => v(p.reported)).y1((p) => v(p.reported + p.estimated)));
            reportedArea.datum(country.points).transition(t)
              .attr("d", d3.area().x((p) => x(p.year)).y0(v(0)).y1((p) => v(p.reported)));
          }
          const cursor = g.select(".dc-timeline-cursor").attr("y1", 0).attr("y2", panelHeight);
          // The value for the hovered year is written in the panel, next to the top of the area or bar.
          const marker = g.select(".dc-timeline-marker");
          const valueLabel = g.select(".dc-timeline-end-label");
          const setCursor = (year, transition = null) => {
            const point = country.points.find((p) => p.year === year);
            const top = v(point.reported + point.estimated);
            const at = x(year);
            cursor.attr("x1", at).attr("x2", at);
            marker.attr("hidden", point.high ? null : true);
            valueLabel.attr("text-anchor", at < 40 ? "start" : at > panelWidth - 40 ? "end" : "middle").text(range(point, measure));
            const move = (selection) => (transition ? selection.transition(transition) : selection.interrupt());
            move(marker).attr("cx", at).attr("cy", top);
            move(valueLabel).attr("x", at < 40 ? at + 4 : at > panelWidth - 40 ? at - 4 : at).attr("y", top < 20 ? top + 18 : top - 9);
          };
          setCursor(selectedYear, t);
          country.setCursor = setCursor;
          // Hovering moves only this panel's marker and value. The other panels and the summary below keep the last year.
          const pick = (event) => setCursor(Math.max(timeline.years[0], Math.min(timeline.years.at(-1), Math.round(x.invert(d3.pointer(event, this)[0])))));
          g.select(".dc-timeline-hit").raise().attr("width", panelWidth).attr("height", panelHeight)
            .on("pointermove", pick).on("pointerdown", pick)
            .on("pointerleave", (event) => {if (event.pointerType === "mouse") setCursor(selectedYear);});
        });
        function inspect(year, transition = null) {
          selectedYear = year;
          series.forEach((country) => country.setCursor && country.setCursor(year, transition));
          container.querySelector(".dc-timeline-year").textContent = year;
          readout.replaceChildren();
          series.forEach((country) => {
            const point = country.points.find((p) => p.year === year);
            const item = document.createElement("span");
            item.className = "dc-timeline-value";
            const label = document.createElement("span");
            label.textContent = country.label;
            const value = document.createElement("strong");
            value.textContent = range(point, measure);
            const detail = document.createElement("span");
            detail.className = "dc-timeline-value-detail";
            const mapApi = global.DCTrackerMap;
            const base = electricity && mapApi?.consumptionFor ? mapApi.consumptionFor(data, country.key) : null;
            const share = base ? mapApi.shareLabel(point, base) : "";
            const useYear = data.method.assumptions.context_consumption?.year;
            detail.textContent = point.high
              ? `${fmt(point.reported, measure)} with a reported opening year${share ? ` · ${share} of the country's electricity use in ${useYear}` : ""}`
              : "";
            item.append(label, value, detail);
            readout.append(item);
          });
        }
        inspect(selectedYear, t);
        table.replaceChildren();
        const caption = document.createElement("caption");
        caption.textContent = measureLabels[measure] + ". Range, and in brackets the part with a reported opening year (upper estimate).";
        const head = document.createElement("thead"), header = document.createElement("tr");
        ["Year", ...series.map((country) => country.label)].forEach((text) => {
          const cell = document.createElement("th");
          cell.scope = "col";
          cell.textContent = text;
          header.append(cell);
        });
        head.append(header);
        const body = document.createElement("tbody");
        timeline.years.forEach((year) => {
          const row = document.createElement("tr"), label = document.createElement("th");
          label.scope = "row";
          label.textContent = year;
          row.append(label);
          series.forEach((country) => {
            const point = country.points.find((p) => p.year === year);
            const cell = document.createElement("td");
            cell.textContent = range(point, measure) + (point.high ? ` (${fmt(point.reported, measure)})` : "");
            row.append(cell);
          });
          body.append(row);
        });
        table.append(caption, head, body);
      }
      container.querySelector(".dc-timeline-content").hidden = false;
      const unsubscribe = shared.subscribe(render);
      return {
        disconnect() {
          unsubscribe();
          resizeObserver.disconnect();
          svg.selectAll("*").remove();
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

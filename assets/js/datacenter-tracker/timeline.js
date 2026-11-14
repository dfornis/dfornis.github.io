/* Display precomputed annual results from the shared R model. No phasing rules here.
   One chart with two measures, following the shared measure control:
   - Power: modelled new capacity in operation since 2025 (cumulative or added per year), GW.
   - Annual electricity use: the 2025 starting level for existing sites, held constant, with the
     electricity use of new capacity stacked on top, and historical figures before 2026. TWh/year.
   Both measures use the same x-axis (2020–2035), so switching measure animates the new-capacity
   areas between units while the starting level and the historical figures fade in or out. */
(function (global) {
  "use strict";
  const countryOrder = ["SE", "NO", "FI", "DK"];
  const countryNames = { SE: "Sweden", NO: "Norway", FI: "Finland", DK: "Denmark" };
  const X_START = 2020;
  const SEAM = 2025.5;
  const displayDivisor = (measure) => (measure === "annual_twh" ? 1 : 1000);
  function range(point, measure = "mw") {
    if (point.low === null || point.high === null || (point.high === 0 && point.unknown)) return "Unknown";
    const value =
      measure === "annual_twh"
        ? global.DCTracker.range(point.low, point.high, "twh") + " TWh/year"
        : global.DCTrackerMap.gwRange(point.low, point.high) + " GW";
    return value;
  }
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
      throw new Error("The chart and project list have different data versions. Reload the page. If this continues, the site needs to be rebuilt.");
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

  // Countries in a fixed display order. A country appears when the timeline has rows for it.
  function countriesIn(timeline) {
    const present = new Set(timeline.rows.map((row) => row.country));
    return countryOrder.filter((country) => present.has(country));
  }

  function makeSeries(timeline, data, options) {
    const projects = new Map(data.projects.map((project) => [project.project_id, project]));
    const rows = timeline.rows.filter((row) => row.family === options.family &&
      (options.hq === "none" || global.DCTrackerMap.matchesHq(projects.get(row.project_id), options.hq)) &&
      global.DCTrackerMap.matchesType(projects.get(row.project_id), options.type));
    return (options.countries || countriesIn(timeline)).map((country) => ({ key: country, label: countryNames[country] || country, color: `var(--dc-country-${country})`,
      points: timeline.years.map((year) => {
        const yearRows = rows.filter((row) => row.country === country && row.year === year);
        const measure = options.measure || "mw";
        return { year,
          ...global.DCTracker.sumBounds(yearRows, `${measure}_low`, `${measure}_high`),
          reported: reportedKey[measure] ? yearRows.reduce((sum, row) => sum + (row[reportedKey[measure]] || 0), 0) : null };
      }) }));
  }
  // Sum the already modelled project values for the HQ selection. Historical
  // observations and the starting level have no project/HQ breakdown.
  function makeUseSeries(timeline, data, electricity, options) {
    return makeSeries(timeline, data, { ...options, measure: "annual_twh" }).map((country) => {
      const baseline = electricity.baseline.find((b) => b.country === country.key);
      const rows = electricity.rows.filter((r) => r.country === country.key && r.family === options.family);
      const points = [{ year: SEAM, base: baseline.low_twh, low: baseline.low_twh, high: baseline.high_twh, newLow: 0, newHigh: 0 },
        ...country.points.map((point) => {
          const saved = rows.find((r) => r.year === point.year);
          const all = options.hq === "none" && (!options.type || options.type === "all" || Array.isArray(options.type) && !options.type.length);
          return { year: point.year, base: baseline.low_twh,
            low: all ? saved?.total_use_twh_low ?? null : point.low === null ? null : baseline.low_twh + point.low,
            high: all ? saved?.total_use_twh_high ?? null : point.high === null ? null : baseline.high_twh + point.high,
            newLow: all ? saved?.annual_twh_low ?? null : point.low,
            newHigh: all ? saved?.annual_twh_high ?? null : point.high };
        })];
      return { ...country, baseline, history: electricity.history.filter((h) => h.country === country.key), points,
        unknown: country.points.some((p) => p.unknown) };
    });
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

  // Panel grid: one row when there is room, two by two for four countries on medium screens, one column on phones.
  function panelLayout(width, count) {
    const columns = width < 620 ? 1 : count === 4 && width < 900 ? 2 : count;
    return { columns, rows: Math.ceil(count / columns) };
  }

  async function mount(container, data, shared) {
    if (!container) return null;
    const message = container.querySelector(".dc-timeline-status");
    try {
      if (!global.d3) throw new Error("The chart library could not be loaded. Please reload the page.");
      const response = await fetch(container.dataset.timeline, { cache: "no-cache" });
      if (!response.ok) throw new Error("Annual capacity data could not be loaded.");
      const timeline = assertTimeline(await response.json(), data);
      // Electricity use, the 2025 starting levels and the historical figures, all precomputed in R.
      let electricity = null;
      if (container.dataset.electricity && global.DCTrackerElectricity) {
        const reply = await fetch(container.dataset.electricity, { cache: "no-cache" });
        if (!reply.ok) throw new Error("Electricity use data could not be loaded.");
        electricity = global.DCTrackerElectricity.assertData(await reply.json(), data);
      }
      const d3 = global.d3;
      const doc = container.ownerDocument;
      // One marker definition for the chart and its legend, so both look the same.
      const historySymbol = (kind) => d3.symbol()
        .type(kind === "reported" ? d3.symbolSquare : kind === "estimate" ? d3.symbolDiamond2 : d3.symbolCircle)
        .size(kind === "estimate" ? 40 : 45)();
      container.querySelectorAll("[data-history-symbol]").forEach((item) => {
        const kind = item.dataset.historySymbol;
        const icon = d3.create("svg").attr("viewBox", "-7 -7 14 14").attr("width", 14).attr("height", 14).attr("aria-hidden", true)
          .attr("class", "dc-history-legend-icon");
        icon.append("path").attr("class", "dc-electricity-history-point").attr("d", historySymbol(kind))
          .attr("fill", kind === "measured" ? "currentColor" : "var(--dc-chart-paper, #fff)");
        item.prepend(icon.node());
      });
      const countries = countriesIn(timeline);
      const measureInputs = container.querySelectorAll("[name='timeline-measure']");
      const capacityView = container.querySelector("[data-timeline-capacity-view]");
      const readout = container.querySelector(".dc-timeline-readout");
      const chart = container.querySelector(".dc-timeline-chart");
      const table = container.querySelector(".dc-timeline-table");
      const unknownNote = container.querySelector(".dc-timeline-unknown");
      const useOnly = container.querySelectorAll("[data-use-only]");
      const capacityOnly = container.querySelectorAll("[data-capacity-only]");
      if (electricity) fillElectricityNotes(container, electricity);
      const svg = d3.select(chart).append("svg").attr("role", "img").attr("aria-labelledby", "dc-timeline-svg-title dc-timeline-svg-desc");
      svg.append("title").attr("id", "dc-timeline-svg-title");
      svg.append("desc").attr("id", "dc-timeline-svg-desc");
      const panelsLayer = svg.append("g");
      let selectedYear = timeline.years.at(-1);
      let lastLayout = null;
      let lastMode = null;
      const resizeObserver = new ResizeObserver(() => render());
      resizeObserver.observe(chart);
      [...measureInputs].forEach((control) => control.addEventListener("change", render));
      const fmt = (value, measure) =>
        measure === "annual_twh"
          ? value.toLocaleString("en-US", { maximumFractionDigits: 1 }) + " TWh/year"
          : global.DCTrackerMap.gwRange(value, value) + " GW";
      const twh = (low, high) => global.DCTracker.range(low, high, "twh") + " TWh/year";
      const twhPlain = (low, high) => {
        const f = (n) => n.toLocaleString("en-US", { maximumFractionDigits: 3 });
        return low === null || high === null ? "Unknown" : `${f(low)}${low === high ? "" : "–" + f(high)} TWh`;
      };

      function render() {
        const state = shared.get();
        const use = state.measure === "twh" && Boolean(electricity);
        // The view control stays in place in both measures, so the layout does not jump.
        capacityView.classList.toggle("dc-timeline-control-off", use);
        capacityView.setAttribute("aria-disabled", String(use));
        measureInputs.forEach((input) => {
          input.disabled = use;
        });
        useOnly.forEach((element) => { element.hidden = !use; });
        container.querySelectorAll("[data-use-visible]").forEach((element) => { element.style.visibility = use ? "" : "hidden"; });
        capacityOnly.forEach((element) => { element.hidden = use; });
        const view = container.querySelector("[name='timeline-measure']:checked").value;
        const measure = use ? "annual_twh" : view;
        const added = !use && measure === "annual_addition_mw";
        container.querySelector("[data-band-legend]")?.toggleAttribute("hidden", added);
        container.querySelector(".dc-timeline-bar-legend")?.toggleAttribute("hidden", !added);
        const familyLabel = timeline.families.find((f) => f.id === state.family)?.label || state.family;
        const measureLabels = {
          mw: "Modelled new capacity in operation since 2025 (GW)",
          annual_addition_mw: "Annual increase in modelled capacity in operation (GW)",
          annual_twh: "Annual electricity use including existing sites (TWh/year)",
        };

        const hqNames = { domestic: "Domestic", other_europe: "Other Europe", outside_europe: "Outside Europe" };
        const hqNote = state.hq !== "none"
          ? ` HQ: ${hqNames[state.hq] || state.hq}.${use ? " Only new projects are filtered." : ""}` : "";
        svg.select("title").text(measureLabels[measure]);
        // The heading follows the measure. The note under the chart is only used when an HQ filter is on.
        container.querySelectorAll("[data-heading]").forEach((el) => {
          const current = el.dataset.heading === measure;
          el.classList.toggle("dc-heading-current", current);
          el.setAttribute("aria-hidden", String(!current));
        });
        const note = container.querySelector("[data-timeline-caption]");
        if (note) note.textContent = hqNote.trim();
        container.querySelectorAll("[data-timeline-family-label]").forEach((el) => { el.textContent = `${familyLabel}: range`; });
        container.querySelectorAll("[data-timeline-family-name]").forEach((el) => { el.textContent = familyLabel; });
        svg.select("desc").text(use
          ? "One panel per country. Grey shows the 2025 starting level for existing sites. The dark area adds the lower estimate for new capacity. The light area reaches the upper estimate. Points before 2026 are historical figures."
          : "One panel per country. The dark area is the lower estimate. The light area reaches up to the upper estimate. Values are listed in the table below the chart.");

        // New capacity, as in the tracker: cumulative or added per year, from timeline.json.
        const capacitySeries = makeSeries(timeline, data, { family: state.family, hq: state.hq, type: state.type, measure: "mw", countries });
        const cumulative = use ? null : capacitySeries;
        const totals = added ? makeSeries(timeline, data, { family: state.family, hq: state.hq, type: state.type, measure: "annual_addition_mw", countries }) : cumulative;
        const unknown = capacitySeries.some((country) => country.points.some((point) => point.unknown));
        if (unknownNote) unknownNote.hidden = !unknown;

        // Each panel gets a list of 11 points: the seam at the end of 2025 and the years 2026–2035.
        // The same list in both measures lets d3 interpolate the areas when the measure changes.
        const useSeries = use ? makeUseSeries(timeline, data, electricity, { family: state.family, hq: state.hq, type: state.type, countries }) : null;
        const series = countries.map((country, index) => {
          const label = countryNames[country] || country;
          if (use) {
            return useSeries[index];
          }
          const source = totals[index].points;
          const points = [{ year: SEAM, base: 0, low: 0, high: 0, reportedOpening: 0, unknown: false },
            ...source.map((point, i) => {
              let reported = cumulative[index].points[i].reported ?? 0;
              if (added) reported = Math.max(0, reported - (i ? cumulative[index].points[i - 1].reported ?? 0 : 0));
              const high = point.high ?? 0;
              const low = Math.min(point.low ?? 0, high);
              return { ...point, base: 0, low, high, reportedOpening: Math.min(reported, high), rawLow: point.low, rawHigh: point.high };
            })];
          return { key: country, label, history: [], points };
        });

        message.textContent = !use && series.every((country) => country.points.every((point) => !point.high))
          ? unknown ? "No quantified additions in this selection. Some capacity has no MW figure." : "No additions in this selection."
          : "";
        message.hidden = !message.textContent;

        const divisor = use ? 1 : displayDivisor(measure);
        const maxValue = use
          ? global.DCTrackerElectricity.maximum(global.DCTrackerElectricity.seriesFor(electricity, state.family))
          : capacityMax(timeline, data, measure, state.family);

        const panelsData = series;

        const width = Math.max(300, chart.clientWidth);
        const grid = panelLayout(width, countries.length);
        const single = grid.columns === 1;
        // The country name sits above each panel and the unit just above the y-axis labels.
        const gap = 40, left = 44, top = 46, bottomPad = 28;
        const panelHeight = single ? 190 : grid.columns === 2 ? 220 : 260;
        const panelWidth = (width - left - 10 - (grid.columns - 1) * gap) / grid.columns;
        const height = grid.rows * (panelHeight + top + bottomPad);
        svg.attr("viewBox", `0 0 ${width} ${height}`);
        const y = d3.scaleLinear().domain([0, maxValue]).nice(4).range([panelHeight, 0]);
        // Elements are kept between renders so that axis, areas and markers can move smoothly to new values.
        // A new width or a switch between areas and bars redraws without animation.
        const layout = `${width}:${added}:${countries.length}`;
        const reduced = global.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        const animate = lastLayout === layout && !reduced;
        const modeChanged = lastMode !== null && lastMode !== use;
        lastLayout = layout;
        lastMode = use;
        const t = svg.transition().duration(animate ? (modeChanged ? 750 : 550) : 0).ease(d3.easeCubicInOut);
        const firstYear = use ? X_START : timeline.years[0];
        // Capacity is tracked from 2026, so the power view starts at the end of 2025. Electricity use shows history from 2020.
        const xStart = use ? X_START : 2025;
        if (selectedYear < firstYear) selectedYear = timeline.years.at(-1);

        const panels = panelsLayer.selectAll("g.dc-timeline-panel").data(panelsData, (country) => country.key)
          .join((enter) => {
            const g = enter.append("g").attr("class", "dc-timeline-panel");
            g.append("text").attr("class", "dc-timeline-panel-title").attr("x", -38).attr("y", -28);
            g.append("text").attr("class", "dc-timeline-unit").attr("x", -38).attr("y", -10).attr("text-anchor", "start");
            g.append("g").attr("class", "dc-timeline-grid");
            g.append("g").attr("class", "dc-timeline-axis");
            g.append("line").attr("class", "dc-timeline-baseline").attr("opacity", 0);
            g.append("path").attr("class", "dc-timeline-band");
            g.append("g").attr("class", "dc-timeline-bars");
            g.append("line").attr("class", "dc-electricity-seam");
            g.append("g").attr("class", "dc-timeline-history").attr("opacity", 0);
            g.append("line").attr("class", "dc-timeline-cursor");
            g.append("line").attr("class", "dc-timeline-span");
            g.append("circle").attr("class", "dc-timeline-marker dc-timeline-marker-low").attr("r", 2.5);
            g.append("circle").attr("class", "dc-timeline-marker dc-timeline-marker-high").attr("r", 2.5);
            g.append("text").attr("class", "dc-timeline-end-label");
            g.append("rect").attr("class", "dc-timeline-hit").attr("fill", "transparent");
            return g;
          });
        panels.each(function (country, index) {
          const g = d3.select(this);
          // Every panel has its own axis labels and unit. The countries share one scale.
          const column = index % grid.columns, row = Math.floor(index / grid.columns);
          const x0 = left + column * (panelWidth + gap);
          const y0 = row * (panelHeight + top + bottomPad) + top;
          g.attr("transform", `translate(${x0},${y0})`);
          const x = d3.scaleLinear().domain([xStart, timeline.years.at(-1)]).range([0, panelWidth]);
          g.select(".dc-timeline-panel-title").text(country.label);
          g.select(".dc-timeline-unit").text(use ? "TWh/year" : added ? "GW per year" : "GW");
          g.select(".dc-timeline-grid").transition(t)
            .call(d3.axisLeft(y).ticks(4).tickSize(-panelWidth).tickFormat((value) => value.toLocaleString("en-US")));
          g.select(".dc-timeline-axis").attr("transform", `translate(0,${panelHeight})`)
            .call(d3.axisBottom(x).tickValues(use ? [2020, 2025, 2030, 2035] : [2025, 2030, 2035]).tickFormat(d3.format("d")).tickSize(4).tickPadding(6))
            .call((axis) => axis.selectAll(".tick text").attr("text-anchor", (d, i, all) => (i === 0 ? "start" : i === all.length - 1 ? "end" : "middle")));
          g.select(".dc-electricity-seam").attr("x1", x(SEAM)).attr("x2", x(SEAM)).attr("y1", 0).attr("y2", panelHeight);
          const v = (value) => y((value || 0) / divisor);
          const defined = (p) => p.low !== null && p.high !== null;
          const bandArea = g.select(".dc-timeline-band").attr("display", added ? "none" : null);
          // The 2025 starting level for existing sites, as a dotted line in the electricity view.
          const baseline = g.select(".dc-timeline-baseline").attr("x1", x(SEAM)).attr("x2", x(timeline.years.at(-1)));
          baseline.transition(t).attr("y1", v(use ? country.baseline.low_twh : 0)).attr("y2", v(use ? country.baseline.low_twh : 0)).attr("opacity", use && !added ? 1 : 0);
          const band = panelWidth / (timeline.years.at(-1) - xStart + 1);
          const bars = g.select(".dc-timeline-bars").attr("display", added ? null : "none");
          if (added) {
            const yearly = country.points.filter((p) => p.year !== SEAM);
            const groups = bars.selectAll("g").data(yearly, (point) => point.year).join((enter) => {
              const bar = enter.append("g");
              bar.append("rect").attr("class", "dc-timeline-upper").attr("y", v(0)).attr("height", 0);
              bar.append("rect").attr("class", "dc-timeline-lower").attr("y", v(0)).attr("height", 0);
              return bar;
            });
            groups.select(".dc-timeline-upper").attr("x", (p) => x(p.year) - band * 0.35).attr("width", band * 0.7).transition(t)
              .attr("y", (p) => v(p.high)).attr("height", (p) => Math.max(0, v(p.low) - v(p.high)));
            groups.select(".dc-timeline-lower").attr("x", (p) => x(p.year) - band * 0.35).attr("width", band * 0.7).transition(t)
              .attr("y", (p) => v(p.low)).attr("height", (p) => Math.max(0, v(0) - v(p.low)));
          } else {
            // One band from the low to the high end of the range. No midline, since there is no central estimate.
            bandArea.datum(country.points).transition(t)
              .attr("d", d3.area().defined(defined).x((p) => x(p.year)).y0((p) => v(p.low)).y1((p) => v(p.high)));
          }
          drawHistory(g.select(".dc-timeline-history"), country, x, y, use, t);
          g.select(".dc-timeline-history").raise();
          const cursor = g.select(".dc-timeline-cursor").attr("y1", 0).attr("y2", panelHeight).raise();
          // The value for the selected year is written in the panel, next to the top of the area or bar.
          const span = g.select(".dc-timeline-span").raise();
          const markerLow = g.select(".dc-timeline-marker-low").raise();
          const marker = g.select(".dc-timeline-marker-high").raise();
          const valueLabel = g.select(".dc-timeline-end-label").raise();
          const setCursor = (year, transition = null) => {
            const at = x(year);
            cursor.attr("x1", at).attr("x2", at);
            const point = country.points.find((p) => p.year === year);
            const show = point && point.high !== null && (use || point.high);
            const twoEnds = show && point.low !== point.high;
            marker.attr("display", show ? null : "none");
            markerLow.attr("display", twoEnds ? null : "none");
            span.attr("display", twoEnds ? null : "none");
            valueLabel.attr("display", show ? null : "none");
            if (!show) return;
            const topValue = v(point.high);
            const bottomValue = v(point.low);
            const text = use ? global.DCTracker.range(point.low, point.high, "twh") + " TWh" : range({ ...point, low: point.rawLow ?? point.low, high: point.rawHigh ?? point.high }, measure);
            valueLabel.attr("text-anchor", at < 40 ? "start" : at > panelWidth - 40 ? "end" : "middle").text(text);
            const move = (selection) => (transition ? selection.transition(transition) : selection.interrupt());
            move(marker).attr("cx", at).attr("cy", topValue);
            move(markerLow).attr("cx", at).attr("cy", bottomValue);
            move(span).attr("x1", at).attr("x2", at).attr("y1", bottomValue).attr("y2", topValue);
            move(valueLabel).attr("x", at < 40 ? at + 4 : at > panelWidth - 40 ? at - 4 : at).attr("y", topValue < 20 ? topValue + 18 : topValue - 9);
          };
          country.setCursor = setCursor;
          const pick = (event) => inspect(Math.max(Math.max(firstYear, Math.ceil(xStart)), Math.min(timeline.years.at(-1), Math.round(x.invert(d3.pointer(event, this)[0])))));
          g.select(".dc-timeline-hit").raise().attr("width", panelWidth).attr("height", panelHeight)
            .on("pointermove", pick).on("pointerdown", pick)
            // With a mouse, the chart returns to the last year when the pointer leaves. A tap keeps its year.
            .on("pointerleave", (event) => { if (event.pointerType === "mouse") inspect(timeline.years.at(-1)); });
        });

        function inspect(year, transition = null) {
          selectedYear = year;
          panelsData.forEach((country) => country.setCursor && country.setCursor(year, transition));
          container.querySelector(".dc-timeline-year").textContent = year;
          readout.replaceChildren();
          readout.classList.toggle("dc-timeline-readout-use", use);
          const context = container.querySelector("[data-timeline-context]");
          const shares = [];
          panelsData.forEach((country) => {
            const item = doc.createElement("span");
            item.className = "dc-timeline-value";
            const label = doc.createElement("span");
            label.textContent = country.label;
            item.append(label);
            if (use && year <= 2025) {
              const points = country.history.filter((h) => h.year === year);
              if (!points.length) {
                const none = doc.createElement("span");
                none.className = "dc-timeline-value-detail";
                none.textContent = "No figure for this year";
                item.append(none);
              }
              for (const h of points) {
                const line = doc.createElement("span");
                line.className = "dc-timeline-history-value";
                const amount = doc.createElement("strong");
                amount.textContent = twhPlain(h.low_twh ?? h.value_twh, h.high_twh ?? h.value_twh);
                const source = doc.createElement("a");
                source.href = h.url;
                source.textContent = h.source;
                line.append(amount, doc.createTextNode(" "), source);
                if (h.reporting_facilities) line.append(doc.createTextNode(`, reported by ${h.reporting_facilities} sites`));
                item.append(line);
              }
            } else if (use) {
              const point = country.points.find((p) => p.year === year);
              const total = doc.createElement("strong");
              total.textContent = twh(point.low, point.high);
              const detail = doc.createElement("span");
              detail.className = "dc-timeline-value-detail";
              detail.textContent = `${global.DCTracker.range(point.newLow, point.newHigh, "twh")} from new projects`;
              item.append(total, detail);
              const base = electricity.context_consumption?.countries?.[country.key];
              if (base && point.low !== null && point.high !== null) {
                const percent = (n) => Math.round((100 * n) / base).toLocaleString("en-US");
                const low = percent(point.low), high = percent(point.high);
                const share = doc.createElement("span");
                share.className = "dc-timeline-value-detail";
                share.textContent = `${low === high ? low : low + "–" + high}% of national use in ${electricity.context_consumption?.year ?? 2025}`;
                item.append(share);
              }
            } else {
              const point = country.points.find((p) => p.year === year);
              const value = doc.createElement("strong");
              value.textContent = range({ ...point, low: point.rawLow ?? point.low, high: point.rawHigh ?? point.high }, measure);
              item.append(value);
            }
            readout.append(item);
          });
          context.hidden = true;
        }
        inspect(selectedYear, t);

        if (table) {
        table.replaceChildren();
        const caption = doc.createElement("caption");
        caption.textContent = use
          ? `${measureLabels[measure]}. In brackets the part from new projects.`
          : measureLabels[measure] + ". Range, and in brackets the part with a reported start of operation (upper estimate).";
        const head = doc.createElement("thead"), header = doc.createElement("tr");
        ["Year", ...series.map((country) => country.label)].forEach((text) => {
          const cell = doc.createElement("th");
          cell.scope = "col";
          cell.textContent = text;
          header.append(cell);
        });
        head.append(header);
        const body = doc.createElement("tbody");
        timeline.years.forEach((year) => {
          const row = doc.createElement("tr"), label = doc.createElement("th");
          label.scope = "row";
          label.textContent = year;
          row.append(label);
          series.forEach((country) => {
            const point = country.points.find((p) => p.year === year);
            const cell = doc.createElement("td");
            cell.textContent = use
              ? `${twh(point.low, point.high)} (${twh(point.newLow, point.newHigh)})`
              : range({ ...point, low: point.rawLow ?? point.low, high: point.rawHigh ?? point.high }, measure) + (point.high ? ` (${fmt(point.reportedOpening, measure)})` : "");
            row.append(cell);
          });
          body.append(row);
        });
        table.append(caption, head, body);
        }
      }

      // Historical figures: thin lines per source series, interval lines and source-specific markers.
      // Elements are keyed by series and year, so they move smoothly when the axis changes.
      function drawHistory(layer, country, x, y, use, t) {
        layer.attr("pointer-events", use ? null : "none");
        layer.transition(t).attr("opacity", use ? 1 : 0);
        if (!use) return;
        const keyOf = (h) => `${h.series}:${h.year}`;
        const series = [...new Set(country.history.map((h) => h.series))]
          .map((key) => ({ key, points: country.history.filter((h) => h.series === key).sort((a, b) => a.year - b.year) }));
        const line = d3.line().x((d) => x(d.year)).y((d) => y(d.value_twh));
        layer.selectAll("path.dc-electricity-history-line").data(series, (d) => d.key)
          .join((enter) => enter.append("path").attr("class", "dc-electricity-history-line").attr("d", (d) => line(d.points)))
          .transition(t).attr("d", (d) => line(d.points));
        const ranged = country.history.filter((h) => h.low_twh !== null && h.low_twh !== undefined);
        layer.selectAll("line.dc-electricity-interval").data(ranged, keyOf)
          .join((enter) => enter.append("line").attr("class", "dc-electricity-interval")
            .attr("x1", (h) => x(h.year)).attr("x2", (h) => x(h.year)).attr("y1", (h) => y(h.low_twh)).attr("y2", (h) => y(h.high_twh)))
          .transition(t).attr("x1", (h) => x(h.year)).attr("x2", (h) => x(h.year)).attr("y1", (h) => y(h.low_twh)).attr("y2", (h) => y(h.high_twh));
        const at = (h) => `translate(${x(h.year)},${y(h.value_twh)})`;
        layer.selectAll("path.dc-electricity-history-point").data(country.history, keyOf)
          .join((enter) => {
            const marker = enter.append("path").attr("class", "dc-electricity-history-point")
              .attr("d", (h) => historySymbol(h.kind))
              .attr("fill", (h) => (h.kind === "measured" ? "currentColor" : "var(--dc-chart-paper, #fff)"))
              .attr("transform", at);
            marker.append("title").text((h) => `${h.year}: ${twhPlain(h.low_twh ?? h.value_twh, h.high_twh ?? h.value_twh)}. ${h.source}` +
              (h.reporting_facilities ? `. Reported by ${h.reporting_facilities} sites` : ""));
            return marker;
          })
          .raise()
          .transition(t).attr("transform", at);
      }

      container.querySelector(".dc-timeline-content").hidden = false;
      const unsubscribe = shared.subscribe(render);
      return {
        timeline,
        electricity,
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

  // Starting levels and a short list of historical sources, written once under "Values and notes".
  function fillElectricityNotes(container, value) {
    const doc = container.ownerDocument;
    const f = (n) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });
    const amount = (low, high) => `${f(low)}${low === high ? "" : "–" + f(high)} TWh`;
    const baselines = container.querySelector("[data-electricity-baselines]");
    if (baselines) value.baseline.forEach((b, i) => {
      // The amount links to its source, which keeps the sentence short.
      const link = doc.createElement("a");
      link.href = b.url;
      link.title = b.source;
      link.textContent = amount(b.low_twh, b.high_twh);
      const year = b.reference_year && b.reference_year !== 2025 ? ` for ${b.reference_year}, the latest year available` : "";
      const scope = b.lower_bound ? ", reporting sites only" : "";
      baselines.append(doc.createTextNode(`${i ? (i === value.baseline.length - 1 ? " and " : ", ") : ""}${countryNames[b.country] || b.country} `), link, doc.createTextNode(`${year}${scope}`));
    });
    if (baselines) baselines.append(doc.createTextNode("."));
    const sources = container.querySelector("[data-electricity-sources]");
    if (sources) {
      const seen = new Map();
      for (const h of value.history) if (!seen.has(h.source)) seen.set(h.source, h.url);
      sources.append(doc.createTextNode("Sources: "));
      [...seen].forEach(([name, url], i) => {
        const link = doc.createElement("a");
        link.href = url;
        link.textContent = name;
        if (i) sources.append(doc.createTextNode(", "));
        sources.append(link);
      });
      sources.append(doc.createTextNode(". Hovering over a point gives its value and source."));
    }
  }

  const api = { assertTimeline, makeSeries, makeUseSeries, capacityMax, countriesIn, panelLayout, range, mount };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.DCTrackerTimeline = api;
})(typeof window === "undefined" ? globalThis : window);

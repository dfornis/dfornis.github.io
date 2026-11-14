/* Display precomputed annual results from the shared R model. No phasing rules here.
   One chart for all four countries, with a band per country, and two measures following the shared measure control:
   - Power: modelled new capacity in operation since 2025 (cumulative or added per year), GW.
   - Annual electricity use: the 2025 starting level for existing sites, held constant, with the
     electricity use of new capacity stacked on top, and historical figures before 2026. TWh/year.
   Both measures use the same 11 points per country, so switching measure animates the bands between units while the starting level and the historical figures fade in or out. */
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
      // One chart for all countries. Each layer holds one element per country, so bands, lines, bars and points
      // keep their identity between renders and can move smoothly to new values.
      const plot = svg.append("g").attr("class", "dc-timeline-plot");
      const gridG = plot.append("g").attr("class", "dc-timeline-grid");
      const axisG = plot.append("g").attr("class", "dc-timeline-axis");
      const unitText = plot.append("text").attr("class", "dc-timeline-unit").attr("x", -36).attr("y", -14).attr("text-anchor", "start");
      const seam = plot.append("line").attr("class", "dc-electricity-seam").style("opacity", 0);
      const bandsG = plot.append("g").attr("class", "dc-timeline-bands");
      const barsG = plot.append("g").attr("class", "dc-timeline-bars").style("opacity", 0);
      const baselinesG = plot.append("g").attr("class", "dc-timeline-baselines-layer").style("opacity", 0);
      const linesG = plot.append("g").attr("class", "dc-timeline-lines");
      const historyG = plot.append("g").attr("class", "dc-timeline-history").style("opacity", 0);
      const cursor = plot.append("line").attr("class", "dc-timeline-cursor");
      const markersG = plot.append("g").attr("class", "dc-timeline-markers");
      const labelsG = plot.append("g").attr("class", "dc-timeline-labels");
      const hit = plot.append("rect").attr("class", "dc-timeline-hit").attr("fill", "transparent");
      const subtitle = container.querySelector("[data-timeline-subtitle]");
      let subtitleTimer = null;
      let selectedYear = timeline.years.at(-1);
      let lastWidth = null;
      const reducedMotion = () => Boolean(global.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
      const resizeObserver = new ResizeObserver(() => { if (chart.clientWidth !== lastWidth) render(); });
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
      // A short grey line under the heading says what the chart shows for the current selection.
      // A new text fades in over the old one, so the heading area does not flicker.
      function setSubtitle(text) {
        if (!subtitle || subtitle.textContent === text) return;
        clearTimeout(subtitleTimer);
        if (!subtitle.textContent || reducedMotion()) {
          subtitle.textContent = text;
          subtitle.classList.remove("dc-fading");
          return;
        }
        subtitle.classList.add("dc-fading");
        subtitleTimer = setTimeout(() => { subtitle.textContent = text; subtitle.classList.remove("dc-fading"); }, 180);
      }
      function subtitleText(state, use, added, familyLabel) {
        const hq = { domestic: "HQ in own country", other_europe: "HQ elsewhere in Europe", outside_europe: "HQ outside Europe" }[state.hq];
        const types = Array.isArray(state.type) ? state.type : state.type && state.type !== "all" ? [state.type] : [];
        const base = `${types.length ? `${types.join(" or ")} sites` : "Sites"} in ${familyLabel}${hq ? `, ${hq}` : ""}.`;
        if (use) return `${base} Existing sites stay at their 2025 level.${hq || types.length ? " The filter applies to new projects only." : ""}`;
        return `${base} ${added ? "The solid part is the lower estimate." : "Range from lower to upper estimate."}`;
      }

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
        container.querySelector("[data-band-legend] .band")?.toggleAttribute("hidden", added);
        container.querySelector(".dc-timeline-bar-legend")?.toggleAttribute("hidden", !added);
        const familyLabel = timeline.families.find((f) => f.id === state.family)?.label || state.family;
        const measureLabels = {
          mw: "Modelled new capacity in operation since 2025 (GW)",
          annual_addition_mw: "Annual increase in modelled capacity in operation (GW)",
          annual_twh: "Annual electricity use including existing sites (TWh/year)",
        };
        svg.select("title").text(measureLabels[measure]);
        // The heading follows the measure, and the line under it the selection.
        container.querySelectorAll("[data-heading]").forEach((el) => {
          const current = el.dataset.heading === measure;
          el.classList.toggle("dc-heading-current", current);
          el.setAttribute("aria-hidden", String(!current));
        });
        setSubtitle(subtitleText(state, use, added, familyLabel));
        container.querySelectorAll("[data-timeline-family-label]").forEach((el) => { el.textContent = `${familyLabel}: range`; });
        container.querySelectorAll("[data-timeline-family-name]").forEach((el) => { el.textContent = familyLabel; });
        svg.select("desc").text(use
          ? "One band per country. Each band starts at the 2025 level for existing sites and runs from the lower to the upper estimate with new capacity. Points before 2026 are historical figures."
          : "One band per country, from the lower to the upper estimate. Values are listed in the table below the chart.");

        // New capacity, as in the tracker: cumulative or added per year, from timeline.json.
        const capacitySeries = makeSeries(timeline, data, { family: state.family, hq: state.hq, type: state.type, measure: "mw", countries });
        const cumulative = use ? null : capacitySeries;
        const totals = added ? makeSeries(timeline, data, { family: state.family, hq: state.hq, type: state.type, measure: "annual_addition_mw", countries }) : cumulative;
        const unknown = capacitySeries.some((country) => country.points.some((point) => point.unknown));
        if (unknownNote) unknownNote.hidden = !unknown;

        // Each country gets a list of 11 points: the seam at the end of 2025 and the years 2026–2035.
        // The same list in both measures lets d3 interpolate the bands when the measure changes.
        const useSeries = use ? makeUseSeries(timeline, data, electricity, { family: state.family, hq: state.hq, type: state.type, countries }) : null;
        const series = countries.map((country, index) => {
          const label = countryNames[country] || country;
          const color = `var(--dc-country-${country})`;
          if (use) return { ...useSeries[index], color };
          const source = totals[index].points;
          const points = [{ year: SEAM, base: 0, low: 0, high: 0, reportedOpening: 0, unknown: false },
            ...source.map((point, i) => {
              let reported = cumulative[index].points[i].reported ?? 0;
              if (added) reported = Math.max(0, reported - (i ? cumulative[index].points[i - 1].reported ?? 0 : 0));
              const high = point.high ?? 0;
              const low = Math.min(point.low ?? 0, high);
              return { ...point, base: 0, low, high, reportedOpening: Math.min(reported, high), rawLow: point.low, rawHigh: point.high };
            })];
          return { key: country, label, color, history: [], points };
        });

        message.textContent = !use && series.every((country) => country.points.every((point) => !point.high))
          ? unknown ? "No quantified additions in this selection. Some capacity has no MW figure." : "No additions in this selection."
          : "";
        message.hidden = !message.textContent;

        const divisor = use ? 1 : displayDivisor(measure);
        const maxValue = use
          ? global.DCTrackerElectricity.maximum(global.DCTrackerElectricity.seriesFor(electricity, state.family))
          : capacityMax(timeline, data, measure, state.family);

        const width = Math.max(300, chart.clientWidth);
        const compact = width < 560;
        // Country names and their 2035 values are written at the right end of the bands, instead of a legend.
        const m = { left: 40, right: compact ? 100 : 136, top: 30, bottom: 28 };
        const plotW = width - m.left - m.right;
        const plotH = compact ? 240 : 300;
        svg.attr("viewBox", `0 0 ${width} ${plotH + m.top + m.bottom}`);
        plot.attr("transform", `translate(${m.left},${m.top})`);
        // A change of width redraws at once. Every other change moves smoothly.
        const animate = lastWidth === width && !reducedMotion();
        lastWidth = width;
        const t = svg.transition().duration(animate ? 650 : 0).ease(d3.easeCubicInOut);
        const lastYear = timeline.years.at(-1);
        const firstYear = use ? X_START : timeline.years[0];
        // Capacity is tracked from 2026, so the power view starts at the end of 2025. Electricity use shows history from 2020.
        const xStart = use ? X_START : 2025;
        if (selectedYear < firstYear) selectedYear = lastYear;
        // Bars sit centred on their year, so the bar view leaves half a year of room at both ends.
        const x = d3.scaleLinear().domain(added ? [timeline.years[0] - 0.5, lastYear + 0.5] : [xStart, lastYear]).range([0, plotW]);
        const y = d3.scaleLinear().domain([0, maxValue]).nice(compact ? 4 : 5).range([plotH, 0]);
        const v = (value) => y((value || 0) / divisor);
        const defined = (p) => p.low !== null && p.high !== null;

        gridG.transition(t).call(d3.axisLeft(y).ticks(compact ? 4 : 5).tickSize(-plotW).tickFormat((value) => value.toLocaleString("en-US")));
        axisG.attr("transform", `translate(0,${plotH})`).transition(t)
          .call(d3.axisBottom(x).tickValues(use ? [2020, 2025, 2030, 2035] : added ? [timeline.years[0], 2030, lastYear] : [2025, 2030, 2035]).tickFormat(d3.format("d")).tickSize(4).tickPadding(6));
        axisG.selectAll(".tick text").attr("text-anchor", (d) => (added ? "middle" : d === xStart ? "start" : d === lastYear ? "end" : "middle"));
        fadeText(unitText, use ? "TWh/year" : added ? "GW per year" : "GW", animate);
        seam.transition(t).attr("x1", x(SEAM)).attr("x2", x(SEAM)).attr("y1", 0).attr("y2", plotH).style("opacity", use ? 0.6 : 0);

        // Bands and lines: the range for each country. In the added-per-year view they fade out and bars grow in.
        const area = d3.area().defined(defined).x((p) => x(p.year)).y0((p) => v(p.low)).y1((p) => v(p.high));
        const lineAt = (key) => d3.line().defined(defined).x((p) => x(p.year)).y((p) => v(p[key]));
        bandsG.attr("pointer-events", "none").transition(t).style("opacity", added ? 0 : 1);
        linesG.attr("pointer-events", "none").transition(t).style("opacity", added ? 0 : 1);
        const bands = bandsG.selectAll("path.dc-timeline-band").data(series, (c) => c.key)
          .join((enter) => enter.append("path").attr("class", "dc-timeline-band").attr("d", (c) => area(c.points)))
          .style("fill", (c) => c.color);
        const highs = linesG.selectAll("path.dc-timeline-line-high").data(series, (c) => c.key)
          .join((enter) => enter.append("path").attr("class", "dc-timeline-line-high").attr("d", (c) => lineAt("high")(c.points)))
          .style("stroke", (c) => c.color);
        const lows = linesG.selectAll("path.dc-timeline-line-low").data(series, (c) => c.key)
          .join((enter) => enter.append("path").attr("class", "dc-timeline-line-low").attr("d", (c) => lineAt("low")(c.points)))
          .style("stroke", (c) => c.color);
        // While bars are shown the bands keep their last shape, and move to the new one when they come back.
        if (!added) {
          bands.transition(t).attr("d", (c) => area(c.points));
          highs.transition(t).attr("d", (c) => lineAt("high")(c.points));
          lows.transition(t).attr("d", (c) => lineAt("low")(c.points));
        }

        // Bars: one thin bar per country and year, side by side. The solid part is the lower estimate.
        const step = x(timeline.years[1]) - x(timeline.years[0]);
        const barW = (step * 0.76) / series.length;
        const barData = series.flatMap((c, ci) => c.points.filter((p) => p.year !== SEAM).map((p) => ({
          key: `${c.key}:${p.year}`, color: c.color, at: x(p.year) - (step * 0.76) / 2 + ci * barW,
          low: added ? p.low : 0, high: added ? p.high : 0 })));
        barsG.attr("pointer-events", "none").transition(t).style("opacity", added ? 1 : 0);
        for (const part of ["upper", "lower"]) {
          barsG.selectAll(`rect.dc-timeline-${part}`).data(barData, (b) => b.key)
            .join((enter) => enter.append("rect").attr("class", `dc-timeline-${part}`).attr("x", (b) => b.at).attr("width", Math.max(1, barW - 0.8))
              .attr("y", v(0)).attr("height", 0))
            .style("fill", (b) => b.color)
            .transition(t).attr("x", (b) => b.at).attr("width", Math.max(1, barW - 0.8))
            .attr("y", (b) => v(part === "upper" ? b.high : b.low))
            .attr("height", (b) => Math.max(0, part === "upper" ? v(b.low) - v(b.high) : v(0) - v(b.low)));
        }

        // The 2025 level for existing sites, as a dotted line per country in the electricity view.
        baselinesG.transition(t).style("opacity", use ? 1 : 0);
        baselinesG.selectAll("line.dc-timeline-baseline").data(series, (c) => c.key)
          .join((enter) => enter.append("line").attr("class", "dc-timeline-baseline").attr("y1", v(0)).attr("y2", v(0)))
          .style("stroke", (c) => c.color)
          .transition(t).attr("x1", x(SEAM)).attr("x2", x(lastYear))
          .attr("y1", (c) => v(use ? c.baseline.low_twh : 0)).attr("y2", (c) => v(use ? c.baseline.low_twh : 0));

        // Historical figures in the electricity view, in each country's colour.
        historyG.attr("pointer-events", use ? null : "none").transition(t).style("opacity", use ? 1 : 0);
        if (use) historyG.selectAll("g.dc-timeline-history-country").data(series, (c) => c.key)
          .join("g").attr("class", "dc-timeline-history-country")
          .each(function (c) { drawHistory(d3.select(this), c, x, y, t); });

        // Names at the right end, nudged apart so they never overlap. The value is the range in the last year.
        const gap = compact ? 28 : 31;
        const ends = series.map((c) => {
          const p = c.points.at(-1);
          const text = added ? ""
            : use ? `${global.DCTracker.range(p.low, p.high, "twh")} TWh`
            : range({ ...p, low: p.rawLow ?? p.low, high: p.rawHigh ?? p.high }, measure);
          return { key: c.key, label: c.label, color: c.color, text, y: added ? v(p.high) : (v(p.low) + v(p.high)) / 2 };
        }).sort((a, b) => a.y - b.y);
        ends.forEach((e, i) => { if (i && e.y - ends[i - 1].y < gap) e.y = ends[i - 1].y + gap; });
        const overflow = ends.at(-1).y - (plotH - 14);
        if (overflow > 0) ends.forEach((e) => { e.y -= overflow; });
        ends.forEach((e, i) => { if (e.y < 4 + i * gap) e.y = 4 + i * gap; });
        labelsG.selectAll("g.dc-timeline-end").data(ends, (e) => e.key)
          .join((enter) => {
            const g = enter.append("g").attr("class", "dc-timeline-end").attr("transform", (e) => `translate(${plotW + 10},${e.y})`);
            g.append("text").attr("class", "dc-timeline-end-name").attr("y", -2);
            g.append("text").attr("class", "dc-timeline-end-value").attr("y", 13);
            return g;
          })
          .each(function (e) {
            const g = d3.select(this);
            g.select(".dc-timeline-end-name").style("fill", e.color).text(e.label);
            fadeText(g.select(".dc-timeline-end-value"), e.text, animate);
          })
          .transition(t).attr("transform", (e) => `translate(${plotW + 10},${e.y})`);

        // The selected year: a thin vertical line, small markers at both ends of each range, and the values below.
        const markers = markersG.selectAll("g.dc-timeline-marker-pair").data(series, (c) => c.key)
          .join((enter) => {
            const g = enter.append("g").attr("class", "dc-timeline-marker-pair");
            g.append("circle").attr("class", "dc-timeline-marker dc-timeline-marker-low").attr("r", 2.6);
            g.append("circle").attr("class", "dc-timeline-marker dc-timeline-marker-high").attr("r", 2.6);
            return g;
          });
        markers.selectAll("circle").style("fill", function () { return this.parentNode.__data__.color; });
        cursor.attr("y1", 0).attr("y2", plotH);
        function placeCursor(year, transition) {
          const move = (selection) => (transition ? selection.transition(transition) : selection.interrupt());
          move(cursor).attr("x1", x(year)).attr("x2", x(year));
          markers.each(function (c) {
            const g = d3.select(this);
            const p = c.points.find((point) => point.year === year);
            const show = !added && p && p.high !== null && (use || p.high);
            g.attr("display", show ? null : "none");
            if (!show) return;
            move(g.select(".dc-timeline-marker-high")).attr("cx", x(year)).attr("cy", v(p.high));
            move(g.select(".dc-timeline-marker-low")).attr("cx", x(year)).attr("cy", v(p.low)).attr("display", p.low === p.high ? "none" : null);
          });
        }
        const pick = (event) => inspect(Math.max(Math.max(firstYear, Math.ceil(xStart)), Math.min(lastYear, Math.round(x.invert(d3.pointer(event, plot.node())[0])))));
        hit.raise().attr("width", plotW).attr("height", plotH)
          .on("pointermove", pick).on("pointerdown", pick)
          // With a mouse, the chart returns to the last year when the pointer leaves. A tap keeps its year.
          .on("pointerleave", (event) => { if (event.pointerType === "mouse") inspect(lastYear); });

        function inspect(year, transition = null) {
          selectedYear = year;
          placeCursor(year, transition);
          container.querySelector(".dc-timeline-year").textContent = year;
          readout.replaceChildren();
          readout.classList.toggle("dc-timeline-readout-use", use);
          const context = container.querySelector("[data-timeline-context]");
          series.forEach((country) => {
            const item = doc.createElement("span");
            item.className = "dc-timeline-value";
            const label = doc.createElement("span");
            label.className = "dc-timeline-value-name";
            const swatch = doc.createElement("i");
            swatch.style.background = country.color;
            label.append(swatch, doc.createTextNode(country.label));
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
        inspect(selectedYear, animate ? t : null);

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

      // A text in the chart that changes fades out and the new text fades in.
      function fadeText(selection, text, animate) {
        const node = selection.node();
        if (!node || node.__text === text) return;
        node.__text = text;
        if (!animate || !node.textContent) {
          selection.interrupt("fade").style("opacity", 1).text(text);
          return;
        }
        selection.interrupt("fade").transition("fade").duration(160).style("opacity", 0)
          .on("end", () => selection.text(text).transition("fade").duration(240).style("opacity", 1));
      }

      // Historical figures: thin lines per source series, interval lines and source-specific markers.
      // Elements are keyed by series and year, so they move smoothly when the axis changes.
      function drawHistory(layer, country, x, y, t) {
        const keyOf = (h) => `${h.series}:${h.year}`;
        const series = [...new Set(country.history.map((h) => h.series))]
          .map((key) => ({ key, points: country.history.filter((h) => h.series === key).sort((a, b) => a.year - b.year) }));
        const line = d3.line().x((d) => x(d.year)).y((d) => y(d.value_twh));
        layer.selectAll("path.dc-electricity-history-line").data(series, (d) => d.key)
          .join((enter) => enter.append("path").attr("class", "dc-electricity-history-line").attr("d", (d) => line(d.points)))
          .style("stroke", country.color)
          .transition(t).attr("d", (d) => line(d.points));
        const ranged = country.history.filter((h) => h.low_twh !== null && h.low_twh !== undefined);
        layer.selectAll("line.dc-electricity-interval").data(ranged, keyOf)
          .join((enter) => enter.append("line").attr("class", "dc-electricity-interval")
            .attr("x1", (h) => x(h.year)).attr("x2", (h) => x(h.year)).attr("y1", (h) => y(h.low_twh)).attr("y2", (h) => y(h.high_twh)))
          .style("stroke", country.color)
          .transition(t).attr("x1", (h) => x(h.year)).attr("x2", (h) => x(h.year)).attr("y1", (h) => y(h.low_twh)).attr("y2", (h) => y(h.high_twh));
        const at = (h) => `translate(${x(h.year)},${y(h.value_twh)})`;
        layer.selectAll("path.dc-electricity-history-point").data(country.history, keyOf)
          .join((enter) => {
            const marker = enter.append("path").attr("class", "dc-electricity-history-point")
              .attr("d", (h) => historySymbol(h.kind))
              .attr("transform", at);
            marker.append("title").text((h) => `${country.label} ${h.year}: ${twhPlain(h.low_twh ?? h.value_twh, h.high_twh ?? h.value_twh)}. ${h.source}` +
              (h.reporting_facilities ? `. Reported by ${h.reporting_facilities} sites` : ""));
            return marker;
          })
          .style("stroke", country.color)
          .style("fill", (h) => (h.kind === "measured" ? country.color : "var(--dc-chart-paper, #fff)"))
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

  const api = { assertTimeline, makeSeries, makeUseSeries, capacityMax, countriesIn, range, mount };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.DCTrackerTimeline = api;
})(typeof window === "undefined" ? globalThis : window);

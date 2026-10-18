const assert = require("node:assert/strict");
const test = require("node:test");
const data = require("../assets/data/datacenters/results.json");
const timeline = require("../assets/data/datacenters/timeline.json");
const tracker = require("../assets/js/datacenter-tracker.js");
const map = require("../assets/js/datacenter-tracker/scenario-map-d3.js");
const chart = require("../assets/js/datacenter-tracker/timeline.js");
const options = { family: "stated", hq: "none" };
const close = (a, b) => (a === null || b === null ? assert.equal(a, b) : assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`));
const sum = (points, key) => points.reduce((total, point) => total + (point[key] ?? 0), 0);
const exportedSum = (rows, measure, key) => rows.reduce((total, row) => total + (row[measure + "_" + key] ?? 0), 0);

test("annual export matches the approved inventory and every published endpoint", () => {
  chart.assertTimeline(timeline, data);
  for (const scenario of ["low_2030", "stated_2030", "stated_2035", "high_2035"]) {
    const [family, year] = scenario.split("_");
    for (const saved of data.project_scenarios.filter((row) => row.scenario === scenario)) {
      const annual = timeline.rows.find((row) => row.family === family && row.year === Number(year) && row.project_id === saved.project_id);
      for (const key of ["mw_low", "mw_high", "capacity_known", "indicator"]) assert.deepEqual(annual[key], saved[key]);
    }
  }
});

test("country totals preserve the exported capacity for every year", () => {
  const countries = chart.makeSeries(timeline, data, options);
  for (const year of timeline.years)
    for (const key of ["low", "high"]) {
      const total = sum(
        countries.map((series) => series.points.find((point) => point.year === year)),
        key
      );
      const exported = exportedSum(
        timeline.rows.filter((row) => row.family === "stated" && row.year === year),
        "mw",
        key
      );
      close(total, exported);
    }
});

test("country, zone, status and type selections agree with map totals", () => {
  for (const filters of [{ countries: ["SE"] }, { zones: ["NO2"] }, { statuses: ["Under construction"], types: ["AI"] }]) {
    const series = chart.makeSeries(timeline, data, options, filters);
    const expected = tracker.makeView(data, "stated_2035", filters).totals.mw;
    for (const key of ["low", "high"])
      close(
        sum(
          series.map((item) => item.points.at(-1)),
          key
        ),
        expected[key]
      );
  }
});

test("HQ selection counts each matching partnership once", () => {
  for (const hq of ["domestic", "other_europe", "outside_europe"]) {
    const series = chart.makeSeries(timeline, data, { ...options, hq });
    const ids = data.projects.filter((project) => map.matchesHq(project, hq)).map((project) => project.project_id);
    const expected = tracker.makeView(data, "stated_2035", { projectIds: ids }).totals.mw;
    for (const key of ["low", "high"])
      close(
        sum(
          series.map((item) => item.points.at(-1)),
          key
        ),
        expected[key]
      );
  }
});

test("scenario choices retain their respective map totals", () => {
  for (const family of ["low", "stated", "high"]) {
    const year = family === "high" ? 2035 : 2030;
    const series = chart.makeSeries(timeline, data, { ...options, family });
    const expected = tracker.makeView(data, family + "_" + year).totals.mw;
    for (const key of ["low", "high"]) {
      close(
        sum(
          series.map((item) => item.points.find((point) => point.year === year)),
          key
        ),
        expected[key]
      );
    }
  }
});

test("fixed capacity maximum covers every scenario and HQ selection", () => {
  const maximum = chart.capacityMax(timeline, data);
  let observedMaximum = 0;
  for (const family of ["low", "stated", "high"])
    for (const hq of ["none", "domestic", "other_europe", "outside_europe"])
      for (const series of chart.makeSeries(timeline, data, { family, hq }))
        for (const point of series.points) {
          assert.ok((point.high || 0) / 1000 <= maximum);
          observedMaximum = Math.max(observedMaximum, (point.high || 0) / 1000);
        }
  assert.ok(maximum >= observedMaximum);
  const statedMaximum = Math.max(...chart.makeSeries(timeline, data, options).flatMap((series) => series.points.map((point) => point.high / 1000)));
  assert.ok(maximum > statedMaximum, "The axis must include High, not just Stated.");
});

test("empty selections and wholly unknown capacity remain distinct", () => {
  assert.deepEqual(chart.makeSeries(timeline, data, options, { countries: ["missing"] }), []);
  const unknown = data.project_scenarios.find((row) => row.scenario === "stated_2035" && !row.capacity_known && row.indicator === "unquantified");
  const series = chart.makeSeries(timeline, data, options, {
    projectIds: [unknown.project_id],
  });
  assert.equal(series.length, 1);
  assert.equal(chart.range(series[0].points[0]), "Unknown");
});

test("stale, duplicate and incomplete exports fail visibly", () => {
  assert.throws(() => chart.assertTimeline({ ...timeline, as_of: "2000-01-01" }, data), /refresh/);
  for (const key of ["projects", "capacity", "sources", "actors", "model", "method"])
    assert.throws(
      () =>
        chart.assertTimeline(
          {
            ...timeline,
            source_hashes: { ...timeline.source_hashes, [key]: "stale" },
          },
          data
        ),
      /refresh/
    );
  assert.throws(() => chart.assertTimeline({ ...timeline, rows: [...timeline.rows, timeline.rows[0]] }, data), /Duplicate/);
  assert.throws(() => chart.assertTimeline({ ...timeline, rows: timeline.rows.slice(1) }, data), /incomplete/);
});

test("documentation-only provenance changes do not invalidate capacity data", () => {
  const input_hashes = {
    ...data.input_hashes,
    command: "changed",
    instructions: "changed",
    readme: "changed",
    prompt: "changed",
  };
  assert.equal(chart.assertTimeline(timeline, { ...data, input_hashes }), timeline);
});

test("all displayed measures sum the model's exported values", () => {
  for (const measure of ["mw", "annual_addition_mw", "remaining_mw"]) {
    const series = chart.makeSeries(timeline, data, { ...options, measure });
    for (const year of timeline.years)
      for (const key of ["low", "high"]) {
        const actual = sum(
          series.map((item) => item.points.find((p) => p.year === year)),
          key
        );
        const expected = exportedSum(
          timeline.rows.filter((row) => row.family === "stated" && row.year === year),
          measure,
          key
        );
        close(actual, expected);
      }
  }
});

test("source minima retain finite intervals in exported values and country curves", () => {
  const series = chart.makeSeries(timeline, data, { family: "high", hq: "none" }, { projectIds: ["P084"] })[0];
  close(series.points.at(-1).low, 605);
  close(series.points.at(-1).high, 825);
  assert.ok(!("open" in series));
  for (const family of ["low", "stated", "high"])
    for (const measure of ["mw", "annual_addition_mw"]) {
      for (const series of chart.makeSeries(timeline, data, {
        family,
        hq: "none",
        measure,
      })) {
        for (const point of series.points) {
          assert.equal(point.low === null, point.high === null);
          assert.ok(!chart.range(point).includes("≥"));
        }
      }
    }
  const invalid = structuredClone(timeline);
  invalid.rows[0].mw_low = 100;
  invalid.rows[0].mw_high = null;
  assert.throws(() => chart.assertTimeline(invalid, data), /Invalid annual capacity interval/);
});

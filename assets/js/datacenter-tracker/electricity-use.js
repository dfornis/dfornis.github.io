/* Electricity use data precomputed by scripts/model.R: starting levels, historical figures and
   country totals per family and year. The chart itself is drawn by timeline.js, in the
   timeline's annual electricity use view. This file only checks and selects the data. */
(function (global) {
  'use strict';
  const order = ['NO', 'SE', 'FI', 'DK'];
  const names = {NO: 'Norway', SE: 'Sweden', FI: 'Finland', DK: 'Denmark'};
  const sourceKeys = ['projects', 'capacity', 'sources', 'actors', 'model', 'method', 'electricity_history'];
  // Countries come from the starting levels, so a new country only needs data, not code.
  const countriesOf = value => order.filter(c => value.baseline.some(b => b.country === c));
  function assertData(value, data) {
    if (value.version !== 1 || sourceKeys.some(k => !data.input_hashes[k] || value.source_hashes[k] !== data.input_hashes[k]))
      throw new Error('Electricity use data is awaiting a refresh.');
    const countries = countriesOf(value);
    if (!countries.length || countries.length !== value.baseline.length || new Set(value.baseline.map(b => b.country)).size !== value.baseline.length)
      throw new Error('The starting levels are incomplete.');
    const expected = new Set(countries.flatMap(c => value.families.flatMap(f => value.years.map(y => `${c}:${f.id}:${y}`))));
    for (const r of value.rows) {
      if (!expected.delete(`${r.country}:${r.family}:${r.year}`)) throw new Error('Unexpected electricity use row.');
      for (const key of ['annual_twh', 'total_use_twh']) {
        const lo = r[key + '_low'], hi = r[key + '_high'];
        if ((lo === null) !== (hi === null) || [lo, hi].some(v => v !== null && (!Number.isFinite(v) || v < 0)) || (lo !== null && lo > hi))
          throw new Error('Invalid electricity use interval.');
      }
    }
    if (expected.size) throw new Error('Electricity use data is incomplete.');
    return value;
  }
  function seriesFor(value, family) {
    return countriesOf(value).map(country => ({country, label: names[country] || country, baseline: value.baseline.find(b => b.country === country),
      history: value.history.filter(h => h.country === country), rows: value.rows.filter(r => r.country === country && r.family === family)}));
  }
  function maximum(series) {
    return Math.max(1, ...series.flatMap(s => [s.baseline.high_twh, ...s.history.map(h => h.high_twh ?? h.value_twh), ...s.rows.map(r => r.total_use_twh_high ?? 0)]));
  }
  global.DCTrackerElectricity = {assertData, seriesFor, maximum, countriesOf};
  if (typeof module !== 'undefined') module.exports = global.DCTrackerElectricity;
})(typeof window !== 'undefined' ? window : globalThis);

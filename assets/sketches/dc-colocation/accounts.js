const colocationTerms = Object.freeze({
  pue: 1.15,
  // The hall's building cost is paid from the company's capital, outside these accounts: results are shown before it.
  // Set to true to charge the annuity on the building as a monthly cost.
  includeBuildingCost: false,
  // No customer leaves during the first four weeks of play.
  graceHours: 28 * 24,
  monthlyRentPerITkW: 100,
  electricityPerMWh: 90,
  buildUSDPerITMW: 13.92e6,
  usdPerEuro: 1.13,
  years: 25,
  discountRate: 0.06,
  annualOperationsPerITMW: 200000,
  exportShare: 0.2,
  // 20 racks in the picture, each standing for 25 MW of the site's power (about 22 MW of IT).
  // The hall has five modules of four racks, 100 MW each. Two stand from the start, 200 MW.
  // Three expansions of one module each take it to 500 MW.
  rackCount: 20,
  rackMW: 25,
  moduleRacks: 4,
  modules: 5,
  phaseModules: 2,
  // Racks rented when the year starts.
  startRented: 5,
  // The board approves the next module when you have made this much since the last expansion,
  // and public anger is below the limit. Building takes a week.
  expandProfit: 20e6,
  expandAngerMax: 50,
  buildHours: 7 * 24,
  reliabilityWindowHours: 28 * 24,
  throttleThresholdMW: 0.5,
  departureThreshold: 0.03,
  departureCooldownHours: 7 * 24,
  reletWindowHours: 7 * 24,
  reletThreshold: 0.02,
  // A new customer moves into an empty rack after this many hours without throttling.
  fillAfterHours: 12 * 24,
  recentVacancyHours: 21 * 24,
  newRackHours: 48,
  departureHistoryHours: 90 * 24,
  // Klewert's power lunch: one tenant replaces your customers, at a higher rent. After a bad week
  // it may give some racks back: half after a week with throttling, otherwise a quarter.
  anchorRentFactor: 1.1,
  anchorGraceHours: 14 * 24,
  anchorBaseLeaveChance: 0.01,
  anchorThrottleLeaveFactor: 3
});

// Three leases per module of four racks: 1 + 2 + 1 racks.
const leaseSizes = (() => {
  const sizes = [1, 2, 1];
  const leases = [];
  let remaining = colocationTerms.rackCount;
  while (remaining > 0) {
    const size = Math.min(remaining, sizes[leases.length % sizes.length]);
    leases.push(size);
    remaining -= size;
  }
  return leases;
})();
// First rack of each lease, and the module (row of 10 racks) it sits in.
const leaseStart = (() => {
  let start = 0;
  return leaseSizes.map((size) => { const s = start; start += size; return s; });
})();
const leaseModule = leaseStart.map((s) => Math.floor(s / colocationTerms.moduleRacks));

function colocationBudget(siteMW) {
  const terms = colocationTerms;
  const itMW = siteMW / terms.pue;
  const capital = itMW * terms.buildUSDPerITMW / terms.usdPerEuro;
  const annuity = terms.discountRate / (1 - (1 + terms.discountRate) ** -terms.years);
  return {
    itMW,
    monthlyRentPerRack: 1000 * terms.monthlyRentPerITkW * itMW / terms.rackCount,
    annualCapital: capital * annuity,
    annualOperations: itMW * terms.annualOperationsPerITMW
  };
}

function paidExportShare(volume, allowance) {
  return volume > allowance ? allowance / volume : 1;
}

function accountTotal(lines) {
  return Object.values(lines).reduce((total, amount) => total + amount, 0);
}

class ColocationAccounts {
  constructor() {
    const terms = colocationTerms;
    this.month = { revenue: {}, cost: {} };
    this.quarter = { revenue: {}, cost: {} };
    this.lastQuarter = null;
    this.export = { volume: 0, gross: 0, booked: 0 };
    this.builtModules = terms.phaseModules;
    // Empty racks: lease -> hour it became empty (-Infinity for never rented).
    this.vacancies = new Map();
    // Lease -> hour its customer moved in, for the arrival in the picture.
    this.joinedAt = new Map();
    let rented = 0;
    leaseSizes.forEach((size, lease) => {
      if (!this.isBuilt(lease)) return;
      if (rented + size <= terms.startRented) rented += size;
      else this.vacancies.set(lease, -Infinity);
    });
    this.departures = [];
    this.lastTenantChange = null;
    this.throttleHistory = new Uint8Array(terms.reliabilityWindowHours);
    this.throttledHours = 0;
    this.reletThrottledHours = 0;
    this.lastDepartureHour = -Infinity;
    this.reliableHours = 0;
    // A single tenant replacing your customers (Epistemic Noise), or null
    this.anchor = null;
    // This year's result so far, and what it was when the last expansion started.
    this.result = 0;
    this.resultAtExpansion = 0;
    // Racks rented over the year: [hour of play, racks], for the power the hall uses.
    this.rentLog = [];
    this.quarters = [];
    this.months = [];
    // What happened during the year, for the year-end review: hour of play and an icon.
    this.events = [];
    // money that follows the power since the last marks on the week chart, with the hour each flow was largest
    this.resetFlow();
    this.stats = { load: 0, served: 0, clean: 0, gas: 0, imported: 0, throttledHours: 0, departures: 0, joined: 0, builds: 0, oneTime: 0, fines: 0, shutdowns: 0, cookouts: 0, tweets: 0, ads: 0, busted: 0, fullAt: null };
  }

  isBuilt(lease) {
    return leaseModule[lease] < this.builtModules;
  }

  get builtRacks() {
    return this.builtModules * colocationTerms.moduleRacks;
  }

  get fullSize() {
    return this.builtModules >= colocationTerms.modules;
  }

  // Profit made since the last expansion started.
  get sinceExpansion() {
    return this.result - this.resultAtExpansion;
  }

  logEvent(elapsed, icon) {
    this.events.push({ t: elapsed, icon });
  }

  logRent(elapsed) {
    this.rentLog.push([elapsed, this.rentedRacks]);
  }

  // Racks the anchor tenant rents.
  get anchorRacks() {
    let n = 0;
    if (this.anchor) for (const lease of this.anchor.leases) n += leaseSizes[lease];
    return n;
  }

  // Rented racks, counting the anchor tenant's racks at its higher rent.
  get rentUnits() {
    return this.rentedRacks + (colocationTerms.anchorRentFactor - 1) * this.anchorRacks;
  }

  // Your current customers are thrown out and one tenant takes the racks they had.
  startAnchor(elapsed, name) {
    const leases = new Set();
    leaseSizes.forEach((_, lease) => { if (this.isBuilt(lease) && !this.vacancies.has(lease)) leases.add(lease); });
    this.reliableHours = 0;
    this.anchor = { since: elapsed, name, leases };
  }

  // The anchor tenant gives back part of what it rents: half after a week with throttling, otherwise
  // a quarter. The racks it gives back fill with new customers like any others. With nothing left, it is gone.
  shrinkAnchor(elapsed, date, throttled) {
    if (!this.anchor) return { racks: 0, gone: true };
    const held = [...this.anchor.leases].sort((a, b) => b - a);
    const cut = held.slice(0, Math.max(1, Math.ceil(held.length * (throttled ? 0.5 : 0.25))));
    let racks = 0;
    for (const lease of cut) { this.anchor.leases.delete(lease); this.vacancies.set(lease, elapsed); this.joinedAt.delete(lease); racks += leaseSizes[lease]; }
    this.departures.push({ elapsed, date, racks, hours: this.throttledHours, anchor: this.anchor.name });
    this.stats.departures += 1;
    this.lastDepartureHour = elapsed;
    this.logRent(elapsed);
    const gone = this.anchor.leases.size === 0;
    if (gone) this.anchor = null;
    return { racks, gone };
  }

  // Chance that the tenant cuts back this week: a small base chance, more with throttling last week.
  anchorLeaveChance() {
    const terms = colocationTerms;
    const share = this.reletThrottledHours / terms.reletWindowHours;
    return { share, chance: Math.min(0.9, terms.anchorBaseLeaveChance + terms.anchorThrottleLeaveFactor * share) };
  }

  // An expansion starts: the profit count starts over.
  startExpansion() {
    this.resultAtExpansion = this.result;
  }

  // A new module is finished: its racks stand empty and fill with customers one by one.
  addModule() {
    const k = this.builtModules;
    this.builtModules += 1;
    this.stats.builds += 1;
    leaseSizes.forEach((_, lease) => { if (leaseModule[lease] === k) this.vacancies.set(lease, -Infinity); });
  }

  resetFlow() {
    this.flow = { hours: 0, sold: { v: 0, peak: 0, at: null }, bought: { v: 0, peak: 0, at: null }, gas: { v: 0, peak: 0, at: null }, nuclear: { v: 0, peak: 0, at: null } };
  }

  addFlow(key, amount, hour) {
    const f = this.flow[key];
    if (!f) return;
    f.v += amount;
    if (Math.abs(amount) > f.peak) { f.peak = Math.abs(amount); f.at = hour; }
  }

  book(kind, lines) {
    if (kind === 'cost' && lines['One-time charges']) this.stats.oneTime += lines['One-time charges'];
    for (const [label, amount] of Object.entries(lines)) {
      this.month[kind][label] = (this.month[kind][label] || 0) + amount;
      this.quarter[kind][label] = (this.quarter[kind][label] || 0) + amount;
      this.result += kind === 'revenue' ? amount : -amount;
    }
  }

  recordHour({ month, monthHours, nextMonth, yearHours, date, elapsed, customerSensitivity, budget, load, unserved, exported, exportAllowance, exportForecast, price, cost, hourOfYear = null, flows = {} }) {
    const terms = colocationTerms;
    const unservedShare = load > 0 ? Math.min(1, Math.max(0, unserved / load)) : 0;
    const capacityFee = budget.monthlyRentPerRack * this.rentUnits / monthHours;
    const grossExport = exported * price;
    const exportRevenue = grossExport * paidExportShare(exportForecast, exportAllowance);
    this.export.volume += exported;
    this.export.gross += grossExport;
    this.export.booked += exportRevenue;
    this.book('revenue', {
      'Capacity rent': capacityFee,
      'Service credits': -capacityFee * unservedShare,
      'Electricity billed to customers': (load - unserved) * terms.electricityPerMWh,
      'Grid power sold': exportRevenue
    });
    this.addFlow('sold', exportRevenue, hourOfYear);
    for (const [k, v] of Object.entries(flows)) this.addFlow(k, v, hourOfYear);
    this.flow.hours += 1;
    this.book('cost', {
      ...(terms.includeBuildingCost ? { 'Datacenter capital': budget.annualCapital / yearHours } : {}),
      'Datacenter operations': budget.annualOperations / yearHours,
      ...cost
    });
    this.updateOccupancy(unserved > terms.throttleThresholdMW, elapsed, date, customerSensitivity);

    if (nextMonth === month) return;
    if (nextMonth === 0) {
      const settled = this.export.gross * paidExportShare(this.export.volume, exportAllowance);
      this.book('revenue', { 'Year-end export adjustment': settled - this.export.booked });
      this.export = { volume: 0, gross: 0, booked: 0 };
    }
    this.months.push({ month, result: accountTotal(this.month.revenue) - accountTotal(this.month.cost) });
    this.month = { revenue: {}, cost: {} };
    if (nextMonth % 3 === 0) {
      this.lastQuarter = { number: Math.floor(month / 3) + 1, ...this.quarter };
      this.quarters.push({ number: this.lastQuarter.number, revenue: accountTotal(this.quarter.revenue), cost: accountTotal(this.quarter.cost) });
      this.quarter = { revenue: {}, cost: {} };
    }
  }

  updateOccupancy(throttled, elapsed, date, sensitivity = 1) {
    const terms = colocationTerms;
    const historyIndex = (elapsed - 1) % terms.reliabilityWindowHours;
    const reletIndex = (historyIndex + terms.reliabilityWindowHours - terms.reletWindowHours) % terms.reliabilityWindowHours;
    const indicator = Number(throttled);
    this.throttledHours += indicator - this.throttleHistory[historyIndex];
    this.reletThrottledHours += indicator - this.throttleHistory[reletIndex];
    this.throttleHistory[historyIndex] = indicator;
    const rate = this.throttledHours / terms.reliabilityWindowHours;

    while (this.departures.length && elapsed - this.departures[0].elapsed >= terms.departureHistoryHours) {
      this.departures.shift();
    }
    if (throttled && elapsed > terms.graceHours && rate >= terms.departureThreshold / sensitivity && elapsed - this.lastDepartureHour >= terms.departureCooldownHours) {
      // The newest customer outside the anchor tenant leaves.
      let lease = -1;
      leaseSizes.forEach((_, index) => {
        if (this.isBuilt(index) && !this.vacancies.has(index) && !(this.anchor && this.anchor.leases.has(index))) lease = index;
      });
      if (lease >= 0) {
        this.vacancies.set(lease, elapsed);
        this.joinedAt.delete(lease);
        this.departures.push({ elapsed, date, racks: leaseSizes[lease], hours: this.throttledHours });
        this.lastDepartureHour = elapsed;
        this.lastTenantChange = { elapsed, joined: false };
        this.stats.departures += 1;
        this.logEvent(elapsed, '📦');
        this.logRent(elapsed);
      }
    }

    // Empty racks fill one customer at a time, after a stretch without throttling.
    const reletRate = this.reletThrottledHours / terms.reletWindowHours;
    const next = this.nextLease;
    this.reliableHours = next >= 0 && reletRate <= terms.reletThreshold ? this.reliableHours + 1 : 0;
    if (!throttled && next >= 0 && this.reliableHours >= terms.fillAfterHours) {
      this.vacancies.delete(next);
      this.joinedAt.set(next, elapsed);
      this.reliableHours = 0;
      this.lastTenantChange = { elapsed, joined: true, racks: leaseSizes[next] };
      this.stats.joined += 1;
      this.logRent(elapsed);
      if (this.rentedRacks >= terms.rackCount && !this.stats.fullAt) this.stats.fullAt = date;
    }
  }

  // The empty lease that fills next, or -1.
  get nextLease() {
    let next = -1;
    for (const lease of this.vacancies.keys()) if (this.isBuilt(lease) && (next < 0 || lease < next)) next = lease;
    return next;
  }

  // Hours until the next customer moves in, if you run without throttling.
  get hoursToNext() {
    return this.nextLease < 0 ? null : Math.max(0, colocationTerms.fillAfterHours - this.reliableHours);
  }

  get rentedRacks() {
    let rented = this.builtRacks;
    for (const lease of this.vacancies.keys()) if (this.isBuilt(lease)) rented -= leaseSizes[lease];
    return rented;
  }

  // State of each rack in the picture: 'off' (empty or not built), 'on', or 'new' (just moved in).
  rackStates(elapsed) {
    const out = new Array(colocationTerms.rackCount).fill('off');
    leaseSizes.forEach((size, lease) => {
      if (!this.isBuilt(lease) || this.vacancies.has(lease)) return;
      const joined = this.joinedAt.get(lease);
      const state = joined != null && elapsed - joined < colocationTerms.newRackHours ? 'new' : 'on';
      for (let i = 0; i < size; i++) out[leaseStart[lease] + i] = state;
    });
    return out;
  }

  racks(elapsed, unservedShare, building = -1) {
    const rented = this.rentedRacks;
    const throttled = Math.min(rented, Math.ceil(rented * unservedShare));
    let affected = throttled;
    let recent = 0;
    let empty = 0;
    const cells = leaseSizes.flatMap((size, index) => {
      if (!this.isBuilt(index)) {
        const cls = leaseModule[index] === building ? 'rack building' : 'rack unbuilt';
        return Array.from({ length: size }, () => ({ cls, style: '' }));
      }
      const since = this.vacancies.get(index);
      const age = elapsed - since;
      if (since != null && age < colocationTerms.recentVacancyHours) {
        const tint = Math.round(100 * (1 - age / colocationTerms.recentVacancyHours));
        recent += size;
        return Array.from({ length: size }, () => ({ cls: 'rack recent', style: '--rack-tint: ' + tint + '%' }));
      }
      if (since != null) {
        empty += size;
        return Array.from({ length: size }, () => ({ cls: 'rack empty', style: '' }));
      }
      const affectedInLease = Math.min(affected, size);
      affected -= affectedInLease;
      return Array.from({ length: size }, (_, rack) => ({ cls: rack < affectedInLease ? 'rack rented throttled' : 'rack rented', style: '' }));
    });
    return { rented, throttled, recent, empty, cells };
  }
}

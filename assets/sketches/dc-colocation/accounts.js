const colocationTerms = Object.freeze({
  pue: 1.15,
  // The hall is treated as built and paid for: results are shown before its building cost.
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
  // 80 racks in the picture, each standing for 5 MW of the site's power (about 4.3 MW of IT).
  // The hall is built in eight modules of ten racks, 50 MW each. The owner paid for the first three.
  rackCount: 80,
  moduleRacks: 10,
  modules: 8,
  startModules: 3,
  // New modules: the bank lends this share of the building cost, repaid as an annuity over 25 years.
  // The owner puts in the rest, and like the first two modules that money is not charged in the accounts.
  loanShare: 0.6,
  // The bank lends when the last four weeks' cash flow, plus rent from customers who sign up for
  // the new module, covers all loan payments, the new one included, by this factor.
  coverageRequired: 1.25,
  coverageWindowHours: 28 * 24,
  coverageMinHours: 14 * 24,
  buildHours: 7 * 24,
  minQueueToBuild: 8,
  // Customers waiting for space. One more every five days while you run without throttling.
  queueStart: 8,
  queueGrowthHours: 5 * 24,
  queueMax: 30,
  queueLossPerDeparture: 2,
  // Empty racks fill from the waiting list, one customer every four days of reliable running.
  fillAfterHours: 4 * 24,
  reliabilityWindowHours: 28 * 24,
  throttleThresholdMW: 0.5,
  departureThreshold: 0.03,
  departureCooldownHours: 7 * 24,
  reletWindowHours: 7 * 24,
  reletThreshold: 0.02,
  reletAfterHours: 7 * 24,
  recentVacancyHours: 21 * 24,
  departureHistoryHours: 90 * 24,
  // Klewert's power lunch: one tenant takes every rack built so far, at a higher rent. After a bad week
  // it may give some of them back: half after a week with throttling, otherwise a quarter.
  anchorRentFactor: 1.1,
  anchorGraceHours: 14 * 24,
  anchorBaseLeaveChance: 0.01,
  anchorThrottleLeaveFactor: 3
});

// Four leases per module: 2 + 3 + 1 + 4 racks.
const leaseSizes = (() => {
  const sizes = [2, 3, 1, 4];
  const leases = [];
  let remaining = colocationTerms.rackCount;
  while (remaining > 0) {
    const size = Math.min(remaining, sizes[leases.length % sizes.length]);
    leases.push(size);
    remaining -= size;
  }
  return leases;
})();
// The module each lease sits in.
const leaseModule = (() => {
  let start = 0;
  return leaseSizes.map((size) => { const m = Math.floor(start / colocationTerms.moduleRacks); start += size; return m; });
})();

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
    this.month = { revenue: {}, cost: {} };
    this.quarter = { revenue: {}, cost: {} };
    this.lastQuarter = null;
    this.export = { volume: 0, gross: 0, booked: 0 };
    this.vacancies = new Map();
    this.departures = [];
    this.lastTenantChange = null;
    this.throttleHistory = new Uint8Array(colocationTerms.reliabilityWindowHours);
    this.throttledHours = 0;
    this.reletThrottledHours = 0;
    this.lastDepartureHour = -Infinity;
    this.reliableHours = 0;
    // A single tenant renting every rack (Epistemic Noise), or null
    this.anchor = null;
    this.builtModules = colocationTerms.startModules;
    // Leases in modules that were just built and have never had a tenant.
    this.open = new Set();
    this.queue = colocationTerms.queueStart;
    this.queueClock = 0;
    this.loans = 0;
    // Cash flow before loan payments, hour by hour, for the bank.
    this.cashHistory = new Float64Array(colocationTerms.coverageWindowHours);
    this.cashHours = 0;
    this.pendingCash = 0;
    this.quarters = [];
    this.months = [];
    // What happened during the year, for the year-end review: hour of play and an icon.
    this.events = [];
    this.stats = { load: 0, served: 0, clean: 0, gas: 0, imported: 0, throttledHours: 0, departures: 0, joined: 0, builds: 0, oneTime: 0, fines: 0, shutdowns: 0, cookouts: 0, tweets: 0, ads: 0, busted: 0, fullAt: null };
  }

  logEvent(elapsed, icon) {
    this.events.push({ t: elapsed, icon });
  }

  isBuilt(lease) {
    return leaseModule[lease] < this.builtModules;
  }

  get builtRacks() {
    return this.builtModules * colocationTerms.moduleRacks;
  }

  // A module is finished. If the power is there, customers on the waiting list move in at once, as far
  // as the list goes. Otherwise its racks stand empty and fill one by one once you run without throttling.
  addModule(powered) {
    this.builtModules += 1;
    this.stats.builds += 1;
    let moved = 0;
    leaseSizes.forEach((size, lease) => {
      if (leaseModule[lease] !== this.builtModules - 1) return;
      if (powered && this.queue >= size) { this.queue -= size; moved += size; }
      else this.open.add(lease);
    });
    return moved;
  }

  // What the bank sees: cash flow before loan payments over the last four weeks, scaled to four weeks,
  // plus four weeks of rent from waiting customers who sign for the new module. Against all loan
  // payments over four weeks, the new one included.
  coverage(loanPerYear, rentPerRackMonth) {
    const terms = colocationTerms;
    const hours = Math.min(this.cashHours, terms.coverageWindowHours);
    if (hours < terms.coverageMinHours) return { ready: false, ratio: 0, daysLeft: Math.ceil((terms.coverageMinHours - hours) / 24) };
    let cash = 0;
    for (let i = 0; i < hours; i++) cash += this.cashHistory[i];
    const window = terms.coverageWindowHours;
    cash *= window / hours;
    const signed = Math.min(Math.floor(this.queue), terms.moduleRacks);
    const rent = signed * rentPerRackMonth * window / 730;
    const payments = (this.loans + 1) * loanPerYear * window / 8760;
    return { ready: true, ratio: (cash + rent) / payments, cash, rent, payments, signed };
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

  // All current customers are thrown out and one tenant takes every rack built so far.
  startAnchor(elapsed, name) {
    const leases = new Set();
    leaseSizes.forEach((_, index) => { if (this.isBuilt(index)) leases.add(index); });
    this.vacancies.clear();
    this.open.clear();
    this.reliableHours = 0;
    this.anchor = { since: elapsed, name, leases };
  }

  // The anchor tenant gives back part of the hall: half after a week with throttling, otherwise a quarter.
  // The racks it gives back fill from the waiting list like any others. With nothing left, it is gone.
  shrinkAnchor(elapsed, date, throttled) {
    if (!this.anchor) return { racks: 0, gone: true };
    const held = [...this.anchor.leases].sort((a, b) => b - a);
    const cut = held.slice(0, Math.max(1, Math.ceil(held.length * (throttled ? 0.5 : 0.25))));
    let racks = 0;
    for (const lease of cut) { this.anchor.leases.delete(lease); this.vacancies.set(lease, elapsed); racks += leaseSizes[lease]; }
    this.departures.push({ elapsed, date, racks, hours: this.throttledHours, anchor: this.anchor.name });
    this.stats.departures += 1;
    this.lastDepartureHour = elapsed;
    const gone = this.anchor.leases.size === 0;
    if (gone) this.anchor = null;
    return { racks, gone };
  }

  // Chance that the tenant leaves this week: a small base chance, more with throttling last week.
  anchorLeaveChance() {
    const terms = colocationTerms;
    const share = this.reletThrottledHours / terms.reletWindowHours;
    return { share, chance: Math.min(0.9, terms.anchorBaseLeaveChance + terms.anchorThrottleLeaveFactor * share) };
  }

  book(kind, lines) {
    // One-time charges count against the cash flow the bank looks at.
    if (kind === 'cost' && lines['One-time charges']) { this.pendingCash -= lines['One-time charges']; this.stats.oneTime += lines['One-time charges']; }
    for (const [label, amount] of Object.entries(lines)) {
      this.month[kind][label] = (this.month[kind][label] || 0) + amount;
      this.quarter[kind][label] = (this.quarter[kind][label] || 0) + amount;
    }
  }

  recordHour({ month, monthHours, nextMonth, yearHours, date, elapsed, customerSensitivity, budget, load, unserved, exported, exportAllowance, exportForecast, price, cost, loanCost = 0 }) {
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
    const costs = {
      ...(terms.includeBuildingCost ? { 'Datacenter capital': budget.annualCapital / yearHours } : {}),
      'Datacenter operations': budget.annualOperations / yearHours,
      ...cost,
      ...(loanCost > 0 ? { 'Hall loans': loanCost } : {})
    };
    this.book('cost', costs);
    {
      const revenue = capacityFee * (1 - unservedShare) + (load - unserved) * terms.electricityPerMWh + exportRevenue;
      const spent = accountTotal(costs) - loanCost;
      this.cashHistory[(elapsed - 1) % terms.coverageWindowHours] = revenue - spent + this.pendingCash;
      this.pendingCash = 0;
      this.cashHours += 1;
    }
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
      const lease = leaseSizes.findIndex((_, index) => this.isBuilt(index) && !this.vacancies.has(index) && !this.open.has(index) && !(this.anchor && this.anchor.leases.has(index)));
      if (lease >= 0) {
        this.vacancies.set(lease, elapsed);
        this.departures.push({ elapsed, date, racks: leaseSizes[lease], hours: this.throttledHours });
        this.lastDepartureHour = elapsed;
        this.lastTenantChange = { elapsed, joined: false };
        this.stats.departures += 1;
        this.logEvent(elapsed, '📦');
        // Word gets around: some of the waiting customers look elsewhere.
        this.queue = Math.max(0, this.queue - terms.queueLossPerDeparture);
      }
    }

    // The waiting list grows while you run reliably.
    const reletRate = this.reletThrottledHours / terms.reletWindowHours;
    if (reletRate <= terms.reletThreshold) {
      this.queueClock += 1;
      if (this.queueClock >= terms.queueGrowthHours) { this.queueClock = 0; this.queue = Math.min(terms.queueMax, this.queue + 1); }
    }

    // Empty racks fill from the waiting list: racks customers left first, then new ones.
    const empty = [...this.vacancies.keys(), ...this.open];
    const next = empty.find((lease) => leaseSizes[lease] <= this.queue);
    this.reliableHours = next != null && reletRate <= terms.reletThreshold ? this.reliableHours + 1 : 0;
    if (!throttled && next != null && this.reliableHours >= terms.fillAfterHours) {
      this.vacancies.delete(next);
      this.open.delete(next);
      this.queue -= leaseSizes[next];
      this.reliableHours = 0;
      this.lastTenantChange = { elapsed, joined: true };
      this.stats.joined += 1;
    }
  }

  // Extra customers on the waiting list, after a post or an ad that worked.
  addToQueue(racks) {
    this.queue = Math.max(0, Math.min(colocationTerms.queueMax, this.queue + racks));
  }

  get rentedRacks() {
    let rented = this.builtRacks;
    for (const lease of this.vacancies.keys()) rented -= leaseSizes[lease];
    for (const lease of this.open) rented -= leaseSizes[lease];
    return rented;
  }

  // Share of racks rented in each module, for the lamps on the hall.
  moduleOccupancy() {
    const rented = new Array(colocationTerms.modules).fill(0);
    leaseSizes.forEach((size, lease) => {
      if (this.isBuilt(lease) && !this.vacancies.has(lease) && !this.open.has(lease)) rented[leaseModule[lease]] += size;
    });
    return rented.map((r) => r / colocationTerms.moduleRacks);
  }

  racks(elapsed, unservedShare, building = -1) {
    const rented = this.rentedRacks;
    const throttled = Math.min(rented, Math.ceil(rented * unservedShare));
    let affected = throttled;
    let recent = 0;
    let empty = 0;
    let fresh = 0;
    const cells = leaseSizes.flatMap((size, index) => {
      if (!this.isBuilt(index)) {
        const cls = leaseModule[index] === building ? 'rack building' : 'rack unbuilt';
        return Array.from({ length: size }, () => ({ cls, style: '' }));
      }
      if (this.open.has(index)) {
        fresh += size;
        return Array.from({ length: size }, () => ({ cls: 'rack', style: '' }));
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
    return { rented, throttled, recent, empty: empty + fresh, cells };
  }
}

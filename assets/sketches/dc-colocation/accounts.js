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
  // 40 racks in the picture, each standing for about 6.5 MW of IT capacity
  rackCount: 40,
  reliabilityWindowHours: 28 * 24,
  throttleThresholdMW: 0.5,
  departureThreshold: 0.03,
  departureCooldownHours: 7 * 24,
  reletWindowHours: 7 * 24,
  reletThreshold: 0.02,
  reletAfterHours: 7 * 24,
  recentVacancyHours: 21 * 24,
  departureHistoryHours: 90 * 24,
  // Joe Solid's power lunch: one tenant takes the whole hall at a higher rent
  anchorRentFactor: 1.2,
  anchorGraceHours: 14 * 24,
  anchorBaseLeaveChance: 0.01,
  anchorThrottleLeaveFactor: 3
});

const leaseSizes = (() => {
  const sizes = [2, 3, 1, 4, 2, 3, 1, 2];
  const leases = [];
  let remaining = colocationTerms.rackCount;
  while (remaining > 0) {
    const size = Math.min(remaining, sizes[leases.length % sizes.length]);
    leases.push(size);
    remaining -= size;
  }
  return leases;
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
  }

  get rentFactor() {
    return this.anchor ? colocationTerms.anchorRentFactor : 1;
  }

  // All current customers are thrown out and one tenant takes every rack.
  startAnchor(elapsed, name) {
    this.vacancies.clear();
    this.reliableHours = 0;
    this.anchor = { since: elapsed, name };
  }

  // The tenant leaves: every rack is empty at once and is relet lease by lease.
  endAnchor(elapsed, date) {
    if (!this.anchor) return;
    leaseSizes.forEach((_, index) => this.vacancies.set(index, elapsed));
    this.departures.push({ elapsed, date, racks: colocationTerms.rackCount, hours: this.throttledHours, anchor: this.anchor.name });
    this.anchor = null;
    this.reliableHours = 0;
    this.lastDepartureHour = elapsed;
  }

  // Chance that the tenant leaves this week: a small base chance, more with throttling last week.
  anchorLeaveChance() {
    const terms = colocationTerms;
    const share = this.reletThrottledHours / terms.reletWindowHours;
    return { share, chance: Math.min(0.9, terms.anchorBaseLeaveChance + terms.anchorThrottleLeaveFactor * share) };
  }

  book(kind, lines) {
    for (const [label, amount] of Object.entries(lines)) {
      this.month[kind][label] = (this.month[kind][label] || 0) + amount;
      this.quarter[kind][label] = (this.quarter[kind][label] || 0) + amount;
    }
  }

  recordHour({ month, monthHours, nextMonth, yearHours, date, elapsed, customerSensitivity, budget, load, unserved, exported, exportAllowance, exportForecast, price, cost }) {
    const terms = colocationTerms;
    const unservedShare = load > 0 ? Math.min(1, Math.max(0, unserved / load)) : 0;
    const capacityFee = budget.monthlyRentPerRack * this.rentFactor * this.rentedRacks / monthHours;
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
    this.month = { revenue: {}, cost: {} };
    if (nextMonth % 3 === 0) {
      this.lastQuarter = { number: Math.floor(month / 3) + 1, ...this.quarter };
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
    if (!this.anchor && throttled && elapsed > terms.graceHours && rate >= terms.departureThreshold / sensitivity && elapsed - this.lastDepartureHour >= terms.departureCooldownHours) {
      const lease = leaseSizes.findIndex((_, index) => !this.vacancies.has(index));
      if (lease >= 0) {
        this.vacancies.set(lease, elapsed);
        this.departures.push({ elapsed, date, racks: leaseSizes[lease], hours: this.throttledHours });
        this.lastDepartureHour = elapsed;
        this.lastTenantChange = { elapsed, joined: false };
      }
    }

    const reletRate = this.reletThrottledHours / terms.reletWindowHours;
    this.reliableHours = this.vacancies.size && reletRate <= terms.reletThreshold ? this.reliableHours + 1 : 0;
    if (!throttled && this.reliableHours >= terms.reletAfterHours) {
      this.vacancies.delete(this.vacancies.keys().next().value);
      this.reliableHours = 0;
      this.lastTenantChange = { elapsed, joined: true };
    }
  }

  get rentedRacks() {
    let rented = colocationTerms.rackCount;
    for (const lease of this.vacancies.keys()) rented -= leaseSizes[lease];
    return rented;
  }

  racks(elapsed, unservedShare) {
    const rented = this.rentedRacks;
    const throttled = Math.min(rented, Math.ceil(rented * unservedShare));
    let affected = throttled;
    let recent = 0;
    let empty = 0;
    const cells = leaseSizes.flatMap((size, index) => {
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

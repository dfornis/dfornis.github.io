/* Method overview only: labels use the exported configuration; no project values are calculated here. */
(function (global) {
  "use strict";
  const REVIEWED_METHOD = "4.1.1";
  const number = (value) => Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
  const interval = (values) => values.map(number).join("–");

  function buildFlow(data) {
    const method = data.method;
    if (data.version !== REVIEWED_METHOD) throw new Error(`The overview needs review for method ${data.version}.`);
    const a = method.assumptions;
    const base = method.timeline.base_year;
    const horizon = method.timeline.end_year;
    const scenarios = (selection) => method.scenarios.filter((scenario) => scenario.selection === selection);
    const title = (selection) => {
      const group = scenarios(selection);
      if (!group.length) throw new Error("The overview needs review for the scenario definitions.");
      return `${group[0].label} ${group.map((scenario) => scenario.year).join(" / ")}`;
    };
    const nodes = [
      {
        id: "scope",
        stage: "scope",
        title: "Reported capacity",
        subtitle: `Capacity operating at the end of ${base} is excluded.`,
        detail: [
          "Each figure is linked to the building, phase or campus it describes. Dates and investment decisions stay with that part of the project.",
          `Capacity operating at the end of ${base} is deducted in the source's unit before conversion. Where this earlier capacity is unknown, the estimate ranges from zero to the reported total. Known new phases provide a minimum.`,
        ],
      },
      {
        id: "it",
        stage: "measure",
        title: "IT power",
        subtitle: `PUE ${interval(a.pue)} is applied.`,
        basis: ["it_nameplate", "it_unspecified"],
        detail: [
          "PUE is the ratio of total site electricity use to IT equipment use. Multiplying IT MW by PUE adds cooling and other site loads. A reported design PUE replaces the upper value in the standard range.",
        ],
      },
      {
        id: "site",
        stage: "measure",
        title: "Site or grid power",
        subtitle: "The full reported MW is used.",
        basis: ["facility_nameplate", "facility_unspecified", "grid", "unspecified"],
        detail: [
          "Site and grid figures are treated as total datacenter power, including cooling and other site loads. Assigning the whole connection to datacenter use is a conservative estimate of potential load. The same reported-MW treatment applies when the source leaves the measure unspecified.",
          "Site and grid reports are linked so that each capacity is counted once. A separately reported datacenter figure is retained even if it exceeds the connection figure.",
        ],
      },
      {
        id: "peak",
        stage: "measure",
        title: "Peak power",
        subtitle: "Capacity is estimated from peak power.",
        basis: ["it_peak", "facility_peak"],
        detail: [
          `Peak power is the highest electricity draw reported by a source. Installed capacity is usually higher. In EPRI's sample, peaks were ${interval(a.peak_to_nameplate_fraction.map((value) => value * 100))}% of installed capacity. The model divides the reported peak by this ratio to estimate capacity.`,
          "An IT peak is first converted to total site power using PUE. Annual electricity use is calculated from the original peak with a peak-based load factor.",
        ],
      },
      {
        id: "unknown",
        stage: "measure",
        title: "No usable MW",
        subtitle: "Capacity remains unquantified.",
        terminal: true,
        basis: ["backup", "generation", "density"],
        detail: [
          "Projects without a usable MW figure remain visible and are omitted from capacity totals. Generator ratings and rack density are recorded separately. Thermal backup power supports a load estimate only where an authority has published the conversion.",
          "A phase without MW can still establish timing for a campus with its own capacity figure.",
        ],
      },
      {
        id: "overlap",
        stage: "overlap",
        title: "Campus and phases",
        subtitle: "Overlapping capacity is counted once.",
        detail: [
          "A campus and its included phases are combined using the largest applicable capacity figure for each scenario and year. Tenants within the campus are counted there. Independent additions are summed separately.",
          "Known phases can contribute when the campus total is missing and set a minimum as the site expands. A phase larger than its reported campus total triggers a source review while the larger figure remains in the calculation.",
        ],
      },
      {
        id: "low",
        stage: "scenario",
        title: title("decided_dated"),
        subtitle: "Dated capacity with an investment decision.",
        detail: [
          "The capacity being counted needs a current reported date and a confirmed investment decision. Observed construction qualifies as evidence of a decision. A permit alone leaves the decision unconfirmed. A phase's decision applies to that phase.",
        ],
      },
      {
        id: "stated",
        stage: "scenario",
        title: title("dated"),
        subtitle: "Dated capacity, plus sites with a phase under way.",
        detail: [
          "Capacity with a current reported date is included. A campus without an overall timetable also qualifies through an included datacenter phase in the same project. That phase needs observed construction or an investment decision, plus its own construction, opening or completion date. Its MW may be undisclosed.",
          `These campuses expand from an earlier or later estimated opening to full capacity in ${horizon}. Known phases keep their schedules and set a minimum. Grid works and backup generators are excluded from the qualifying evidence.`,
        ],
      },
      {
        id: "high",
        stage: "scenario",
        title: title("all"),
        subtitle: `All announced capacity, fully built by ${horizon}.`,
        detail: [
          `All active announced capacity is treated as fully built by ${horizon}, after deductions for overlaps and existing capacity. Later schedules are brought forward and grid restrictions are set aside. This gives the same endpoint as full build-out. Cancelled and dormant plans are excluded.`,
        ],
      },
      {
        id: "timing",
        stage: "timing",
        title: "Construction and opening dates",
        subtitle: "Reported and estimated opening dates.",
        detail: [
          "Reported opening dates and phase schedules take precedence. Missing dates are estimated from construction starts or the project's development stage. Elapsed, unconfirmed targets are reassessed. Targets dropped or replaced by a later source are treated as undated. Actual openings are retained.",
          "Capacity is added along an earlier and a later delivery path. A single-phase project enters in its opening year. Multi-phase projects follow a reported schedule or the expansion assumptions listed below.",
        ],
      },
      {
        id: "mw",
        stage: "result",
        title: "Capacity · MW",
        subtitle: "New capacity in place by the selected year.",
        detail: [
          `The range combines earlier and later delivery with lower and higher capacity estimates. It covers new installed site capacity after ${base}. Full build-out includes all active announced capacity regardless of whether a completion date is available.`,
        ],
      },
      {
        id: "energy",
        stage: "result",
        title: "Electricity use · TWh/year",
        subtitle: "Annual use at that level of capacity.",
        detail: [
          "Annual electricity use is calculated from installed capacity and the load factor for the datacenter type. Explicit peak figures use the original peak and a peak-based load factor. The factors and equations are listed below.",
          "The result represents a full year of operation at the selected level of capacity. Consumption during a partial opening year can differ.",
        ],
      },
    ];
    const covered = nodes.flatMap((node) => node.basis || []).sort();
    if (data.capacity.some((claim) => !covered.includes(claim.basis))) throw new Error("The overview needs review for the capacity measures.");
    const stages = [
      { id: "scope", label: "Reported and existing capacity" },
      { id: "measure", label: "What does the source measure?" },
      { id: "overlap", label: "Campus and phase relationships" },
      { id: "scenario", label: "Scenario selection" },
      { id: "timing", label: "Timing and build-out" },
      { id: "result", label: "Results" },
    ].map((stage) => ({ ...stage, nodes: nodes.filter((node) => node.stage === stage.id) }));
    const links = [
      ...["it", "site", "peak", "unknown"].map((target) => ({ source: "scope", target })),
      ...["it", "site", "peak"].map((source) => ({ source, target: "overlap" })),
      ...["low", "stated", "high"].flatMap((id) => [
        { source: "overlap", target: id },
        { source: id, target: "timing" },
      ]),
      ...["mw", "energy"].map((target) => ({ source: "timing", target })),
    ];
    return { version: data.version, stages, nodes, links };
  }

  function buildReference(data) {
    const { assumptions: a, timeline, type_assumptions: types } = data.method;
    const range = (values, format = number) => [...new Set(values.map(format))].join("–");
    const factor = (value) => Number(value).toFixed(2);
    const labels = {
      Hyperscale: "Hyperscale",
      Hyperscale_AI: "Hyperscale with AI",
      AI_HPC: "AI / HPC",
      Colocation_AI: "Colocation with AI",
      Colocation: "Colocation",
      Research_SMR: "Research / SMR-linked",
    };
    return {
      values: {
        construction_years: range(a.construction_to_first_years),
        expansion_years: number(a.first_to_full_years),
        horizon_year: String(timeline.end_year),
      },
      tables: [
        {
          id: "capacity",
          headers: ["Parameter", "Value", "Application"],
          rows: [
            [
              "Operating baseline",
              `End of ${timeline.base_year}`,
              "Comparable operating capacity is deducted in the source's unit before conversion. An unknown baseline gives a range from zero to the reported total, subject to known new phases.",
            ],
            [
              "PUE",
              range(a.pue),
              "Site MW = IT MW × PUE. The range applies to all datacenter types. A reported design PUE replaces the upper value and can lower the minimum.",
            ],
            [
              "Peak / installed capacity",
              range(a.peak_to_nameplate_fraction, factor),
              "Installed MW = site peak MW ÷ ratio. An IT peak is first converted to site power with PUE.",
            ],
            [
              "Source minimum",
              "Reported MW",
              "For ‘at least X MW’, X enters the calculation with the usual conversion. The source qualification stays beside the original figure.",
            ],
          ],
        },
        {
          id: "annual",
          headers: ["Datacenter type", "Annual / installed capacity", "Annual / peak power"],
          rows: [
            ...Object.entries(types.categories).map(([id, item]) => [
              labels[id] || id.replaceAll("_", " "),
              factor(item.load_factor),
              range(item.peak_load_factor, factor),
            ]),
            ["Unknown type", range(a.nameplate_annual_fraction, factor), range(a.peak_annual_fraction, factor)],
          ],
        },
        {
          id: "timing",
          headers: ["Development stage", "To build start (years)", "Build time left (years)"],
          rows: ["Concept study", "Planned", "Permitted", "Under construction", "Unclear", "Operational"].map((status) => [
            status,
            range(a.stage_lead_times[status].to_construction),
            range(a.stage_lead_times[status].remaining_construction),
          ]),
        },
      ],
    };
  }

  function renderReference(element, reference) {
    if (!element) return;
    const doc = element.ownerDocument;
    for (const { id, headers, rows } of reference.tables) {
      const host = element.querySelector(`[data-method-table="${id}"]`);
      if (!host) continue;
      const table = doc.createElement("table");
      const head = table.createTHead().insertRow();
      for (const label of headers) {
        const cell = doc.createElement("th");
        cell.scope = "col";
        cell.textContent = label;
        head.append(cell);
      }
      const body = table.createTBody();
      for (const values of rows) {
        const row = body.insertRow();
        values.forEach((value, index) => {
          const cell = doc.createElement(index ? "td" : "th");
          if (!index) cell.scope = "row";
          cell.dataset.label = headers[index];
          cell.textContent = value;
          row.append(cell);
        });
      }
      host.replaceChildren(table);
    }
    element.querySelectorAll("[data-method-value]").forEach((node) => {
      node.textContent = reference.values[node.dataset.methodValue];
    });
  }

  // Each row shares a straight joining line, with small bends only at its ends.
  function layoutLinks(flow, positions, width, compact) {
    const nodeById = new Map(flow.nodes.map((node) => [node.id, node]));
    const links = [],
      trunks = [];
    const r = 4;
    const cx = (p) => (p.left + p.right) / 2;
    const cy = (p) => (p.top + p.bottom) / 2;
    for (const stage of flow.stages) {
      const group = flow.links.filter((link) => nodeById.get(link.source).stage === stage.id);
      if (!group.length) continue;
      const fork = new Set(group.map((link) => link.source)).size === 1;
      const ordered = group.sort((a, b) => {
        const p = positions.get(fork ? a.target : a.source),
          q = positions.get(fork ? b.target : b.source);
        return compact ? cy(p) - cy(q) : cx(p) - cx(q);
      });
      const single = positions.get(fork ? ordered[0].source : ordered[0].target);
      const first = positions.get(fork ? ordered[0].target : ordered[0].source);
      const last = positions.get(fork ? ordered.at(-1).target : ordered.at(-1).source);
      const tone = stage.id === "scenario" ? "scenario" : nodeById.get(ordered[0].target).stage;
      let d;
      if (compact) {
        const rail = fork ? 5 : width - 5;
        if (fork) {
          const y = single.bottom + 14;
          d = `M${cx(single)},${single.bottom + 2}V${y - r}Q${cx(single)},${y} ${cx(single) - r},${y}H${rail + r}Q${rail},${y} ${rail},${y + r}V${cy(last) - r}`;
        } else {
          const y = cy(single);
          d = `M${rail},${cy(first) + r}V${y - r}Q${rail},${y} ${rail - r},${y}H${single.right + 3}`;
        }
        ordered.forEach((link, index) => {
          const p = positions.get(fork ? link.target : link.source),
            y = cy(p);
          const branch = fork
            ? index === ordered.length - 1
              ? `M${rail},${y - r}Q${rail},${y} ${rail + r},${y}H${p.left - 3}`
              : `M${rail},${y}H${p.left - 3}`
            : index === 0
              ? `M${p.right + 2},${y}H${rail - r}Q${rail},${y} ${rail},${y + r}`
              : `M${p.right + 2},${y}H${rail}`;
          links.push({ ...link, d: branch, arrow: fork, tone: link.target === "unknown" ? "unknown" : tone });
        });
      } else {
        const y = fork ? (single.bottom + first.top) / 2 : (first.stageBottom + single.top) / 2;
        const left = cx(first),
          right = cx(last);
        d = `M${left + r},${y}H${right - r}`;
        d += fork ? `M${cx(single)},${single.bottom + 2}V${y}` : `M${cx(single)},${y}V${single.top - 4}`;
        ordered.forEach((link, index) => {
          const p = positions.get(fork ? link.target : link.source),
            x = cx(p);
          const direction = index === 0 ? 1 : index === ordered.length - 1 ? -1 : 0;
          const branch = fork
            ? direction
              ? `M${x + direction * r},${y}Q${x},${y} ${x},${y + r}V${p.top - 4}`
              : `M${x},${y}V${p.top - 4}`
            : direction
              ? `M${x},${p.bottom + 2}V${y - r}Q${x},${y} ${x + direction * r},${y}`
              : `M${x},${p.bottom + 2}V${y}`;
          links.push({ ...link, d: branch, arrow: fork, tone: link.target === "unknown" ? "unknown" : tone });
        });
      }
      trunks.push({ id: stage.id, d, arrow: !fork, tone });
    }
    return { links, trunks };
  }

  function mount(container, data) {
    if (!container) return null;
    let flow;
    try {
      flow = buildFlow(data);
    } catch (error) {
      container.setAttribute?.("data-flow-state", "needs-review");
      const message = container.querySelector?.(".dc-method-flow-canvas");
      if (message) message.textContent = error.message;
      return null;
    }
    renderReference(container.ownerDocument?.getElementById("dc-method-reference"), buildReference(data));
    if (!global.d3) return null;
    const root = global.d3.select(container);
    const canvas = root.select(".dc-method-flow-canvas");
    root.attr("data-flow-state", "ready").attr("data-method-version", flow.version);
    root.select(".dc-method-flow-caption").text("Each step opens a short explanation.");
    canvas.selectAll("*").remove();
    const svg = canvas.append("svg").attr("class", "dc-method-links").attr("aria-hidden", "true");
    svg
      .append("defs")
      .append("marker")
      .attr("id", "dc-method-arrow")
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 7)
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-3 L7,0 L0,3");
    const stages = canvas
      .append("ol")
      .attr("class", "dc-method-stages")
      .selectAll("li")
      .data(flow.stages)
      .join("li")
      .attr("class", "dc-method-stage")
      .attr("data-stage", (stage) => stage.id);
    stages
      .append("div")
      .attr("class", "dc-method-stage-label")
      .text((stage) => stage.label);
    const nodes = stages
      .append("div")
      .attr("class", "dc-method-nodes")
      .attr("data-columns", (stage) => stage.nodes.length)
      .selectAll("div.dc-method-node")
      .data((stage) => stage.nodes)
      .join("div")
      .attr("class", (node) => `dc-method-node${node.terminal ? " dc-method-terminal" : ""}`)
      .attr("data-node", (node) => node.id);
    const summaries = nodes
      .append("button")
      .attr("type", "button")
      .attr("class", "dc-method-node-summary")
      .attr("aria-expanded", "false")
      .attr("aria-controls", "dc-method-popover")
      .attr("aria-haspopup", "dialog");
    summaries
      .append("span")
      .attr("class", "dc-method-node-title")
      .text((node) => node.title);
    summaries
      .append("span")
      .attr("class", "dc-method-node-subtitle")
      .text((node) => node.subtitle);
    root.selectAll(".dc-method-popover").remove();
    const popup = root
      .append("div")
      .attr("id", "dc-method-popover")
      .attr("class", "dc-method-popover")
      .attr("popover", "auto")
      .attr("role", "dialog")
      .attr("aria-modal", "false")
      .attr("aria-labelledby", "dc-method-popover-title");
    const heading = popup.append("div").attr("class", "dc-method-popover-heading");
    const popupTitle = heading.append("span").attr("id", "dc-method-popover-title");
    const closeButton = heading
      .append("button")
      .attr("type", "button")
      .attr("class", "dc-method-popover-close")
      .attr("aria-label", "Close explanation")
      .text("×");
    const popupBody = popup.append("div").attr("class", "dc-method-node-detail");
    popup.append("a").attr("href", "#dc-method-reference").attr("class", "dc-method-popover-reference").text("Parameters and assumptions");
    const panel = popup.node(),
      doc = container.ownerDocument;
    const nativePopover = typeof panel.showPopover === "function";
    if (!nativePopover) {
      panel.removeAttribute("popover");
      panel.hidden = true;
    }
    let activeButton = null;
    const resetPopup = () => {
      if (activeButton) activeButton.setAttribute("aria-expanded", "false");
      activeButton = null;
    };
    const closePopup = (restoreFocus = false) => {
      const trigger = activeButton;
      if (nativePopover && panel.matches(":popover-open")) panel.hidePopover();
      if (!nativePopover) panel.hidden = true;
      resetPopup();
      if (restoreFocus) trigger?.focus({ preventScroll: true });
    };
    const positionPopup = () => {
      if (!activeButton) return;
      const anchor = activeButton.getBoundingClientRect(),
        box = panel.getBoundingClientRect();
      const margin = 12;
      const left = Math.max(margin, Math.min(anchor.left, global.innerWidth - box.width - margin));
      const top = Math.max(margin, Math.min(anchor.top, global.innerHeight - box.height - margin));
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
    };
    summaries.on("click", function (event, node) {
      if (activeButton === this) {
        closePopup();
        return;
      }
      resetPopup();
      activeButton = this;
      this.setAttribute("aria-expanded", "true");
      panel.style.setProperty("--dc-method-accent", getComputedStyle(this.parentElement).getPropertyValue("--dc-method-accent"));
      popupTitle.text(node.title);
      popupBody
        .selectAll("p")
        .data(node.detail)
        .join("p")
        .text((text) => text);
      if (nativePopover) {
        if (!panel.matches(":popover-open")) panel.showPopover();
      } else panel.hidden = false;
      positionPopup();
      closeButton.node().focus({ preventScroll: true });
    });
    closeButton.on("click", () => closePopup(true));
    popup.select("a").on("click", () => closePopup());
    popup.on("toggle", (event) => {
      if (event.newState === "closed") resetPopup();
    });
    const outsideClick = (event) => {
      if (activeButton && !panel.contains(event.target) && !activeButton.contains(event.target)) closePopup();
    };
    const escape = (event) => {
      if (activeButton && event.key === "Escape") {
        event.preventDefault();
        closePopup(true);
      }
    };
    const scroll = (event) => {
      if (activeButton && !panel.contains(event.target)) closePopup();
    };
    doc.addEventListener("pointerdown", outsideClick);
    doc.addEventListener("keydown", escape);
    global.addEventListener("scroll", scroll, true);

    function draw() {
      root.attr("data-compact", String(canvas.node().getBoundingClientRect().width < 640));
      const box = canvas.node().getBoundingClientRect();
      if (!box.width || !box.height) return;
      const compact = box.width < 640;
      svg.attr("viewBox", `0 0 ${box.width} ${box.height}`);
      const positions = new Map();
      nodes.each(function (node) {
        const r = this.getBoundingClientRect();
        positions.set(node.id, {
          left: r.left - box.left,
          right: r.right - box.left,
          top: r.top - box.top,
          bottom: r.bottom - box.top,
          stageBottom: this.closest(".dc-method-stage").getBoundingClientRect().bottom - box.top,
        });
      });
      const routes = layoutLinks(flow, positions, box.width, compact);
      for (const [kind, values] of [
        ["trunk", routes.trunks],
        ["link", routes.links],
      ]) {
        svg
          .selectAll(`path.dc-method-${kind}`)
          .data(values)
          .join("path")
          .attr("class", `dc-method-connector dc-method-${kind}`)
          .attr("marker-end", (route) => (route.arrow ? "url(#dc-method-arrow)" : null))
          .attr("data-source", (route) => route.source || null)
          .attr("data-target", (route) => route.target || null)
          .attr("data-tone", (route) => route.tone)
          .attr("d", (route) => route.d);
      }
      positionPopup();
    }
    let frame;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(canvas.node());
    global.addEventListener("resize", schedule);
    document.fonts?.ready.then(schedule);
    schedule();
    return {
      destroy() {
        observer.disconnect();
        cancelAnimationFrame(frame);
        doc.removeEventListener("pointerdown", outsideClick);
        doc.removeEventListener("keydown", escape);
        global.removeEventListener("scroll", scroll, true);
        global.removeEventListener("resize", schedule);
        closePopup();
        popup.remove();
      },
    };
  }

  const api = { buildFlow, buildReference, layoutLinks, mount, REVIEWED_METHOD };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.DCTrackerMethodFlow = api;
})(typeof window === "undefined" ? globalThis : window);

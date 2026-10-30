/* Method overview only: labels use the exported configuration; no project values are calculated here. */
(function (global) {
  "use strict";
  const REVIEWED_METHOD = "5.0";
  const number = (value) => Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
  const interval = (values) => values.map(number).join("–");

  function buildFlow(data) {
    const method = data.method;
    if (data.version !== REVIEWED_METHOD) throw new Error(`The overview needs review for method ${data.version}.`);
    const a = method.assumptions;
    const base = method.timeline.base_year;
    const ratio = interval(a.pue);
    const nodes = [
      {
        id: "scope",
        stage: "scope",
        title: "Reported capacity",
        subtitle: "Only new capacity counts.",
        detail: [
          "Each MW figure is linked to the building, phase or site it describes. Dates and investment decisions stay with that part of the project.",
          `Capacity already operating at the end of ${base} is subtracted. If the existing amount is unknown, new capacity is shown as a range from zero to the reported total.`,
        ],
      },
      {
        id: "it",
        stage: "measure",
        title: "IT power",
        subtitle: `Multiplied by ${ratio}.`,
        basis: ["it_nameplate", "it_unspecified"],
        detail: [
          "IT power is what the servers and network equipment can draw. Cooling and other equipment come on top.",
          "In the ten projects in the register that report both, the whole site is 1.20 to 1.44 times the IT power. A project's own reported ratio is used when there is one.",
        ],
      },
      {
        id: "site",
        stage: "measure",
        title: "Site or grid power",
        subtitle: "Used as reported.",
        basis: ["facility_nameplate", "facility_unspecified", "grid", "unspecified"],
        detail: [
          "A figure for the whole site or for the grid connection is used as it is. Counting the whole grid connection as datacenter load leans high, because connections are often larger than the load that is eventually used.",
          `A figure that does not say what it measures is shown as a range: from the figure itself, if it is the whole site, to ${number(a.pue[1])} times the figure, if it is IT power.`,
        ],
      },
      {
        id: "unknown",
        stage: "measure",
        title: "No usable MW",
        subtitle: "Not counted in totals.",
        terminal: true,
        basis: ["backup", "generation", "density"],
        detail: [
          "Projects without a usable MW figure stay visible but are left out of the totals. Backup generators and rack density are recorded but not turned into a load figure.",
        ],
      },
      {
        id: "overlap",
        stage: "overlap",
        title: "Sites and buildings",
        subtitle: "Overlaps counted once.",
        detail: [
          "When a site total and its buildings are both reported, the larger figure is used, not the sum. A building that reports more than its site total is flagged for review.",
        ],
      },
      {
        id: "stage",
        stage: "scenario",
        title: "Stage",
        subtitle: "Four stages, from confirmed to undated plan.",
        detail: [
          "Each MW figure is placed in one of four stages, from confirmed to undated plan, based on the investment decision, construction start and dates in the sources.",
          "When a site and a building on it are at different stages, the building's MW counts at its own stage and the rest of the site at the site's stage. The tabs Confirmed, Dated plans and All announced add stages in that order.",
        ],
      },
      {
        id: "timing",
        stage: "timing",
        title: "Opening year",
        subtitle: "Reported or estimated.",
        detail: [
          "A reported opening year is used. Without one, the opening is estimated from a reported construction start or from the project's status, such as planned or permitted. The chart shows the two parts in different shades.",
          `Sites built in phases then grow in equal steps over ${number(a.first_to_full_years)} years, unless the source gives a schedule.`,
        ],
      },
      {
        id: "mw",
        stage: "result",
        title: "Capacity · GW",
        subtitle: "New capacity in place by a given year.",
        detail: [
          `Site capacity including cooling, added after ${base}. The range combines the low and high capacity readings with early and late timing.`,
        ],
      },
      {
        id: "energy",
        stage: "result",
        title: "Electricity use · TWh/year",
        subtitle: "Annual use at that capacity.",
        detail: [
          "Capacity multiplied by a load factor for the type of datacenter. The result is a full year of use at that capacity, not the use during the year it opens.",
        ],
      },
    ];
    const covered = nodes.flatMap((node) => node.basis || []).sort();
    if (data.capacity.some((claim) => !covered.includes(claim.basis))) throw new Error("The overview needs review for the capacity measures.");
    const stages = [
      { id: "scope", label: "1. New capacity" },
      { id: "measure", label: "2. What the figure measures" },
      { id: "overlap", label: "3. Overlaps" },
      { id: "scenario", label: "4. How far the plan has come" },
      { id: "timing", label: "5. When it could open" },
      { id: "result", label: "6. Results" },
    ].map((stage) => ({ ...stage, nodes: nodes.filter((node) => node.stage === stage.id) }));
    const links = [
      ...["it", "site", "unknown"].map((target) => ({ source: "scope", target })),
      ...["it", "site"].map((source) => ({ source, target: "overlap" })),
      { source: "overlap", target: "stage" },
      { source: "stage", target: "timing" },
      ...["mw", "energy"].map((target) => ({ source: "timing", target })),
    ];
    return { version: data.version, stages, nodes, links };
  }

  function buildReference(data) {
    const { assumptions: a, timeline, type_assumptions: types } = data.method;
    // Stage names and meanings are shared with the map legend.
    const shared = global.DCTrackerMap || {};
    const STAGES = (shared.CLASSES || []).map((id, index) => ({ id, label: shared.CLASS_LABELS[index], text: shared.CLASS_TEXT[index] }));
    const range = (values, format = number) => [...new Set(values.map(format))].join("–");
    const factor = (value) => Number(value).toFixed(2);
    const labels = {
      Hyperscale: "Hyperscale",
      Hyperscale_AI: "Hyperscale with AI",
      AI_HPC: "AI / HPC",
      Colocation_AI: "Colocation with AI",
      Colocation: "Colocation",
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
              "Existing capacity",
              `End of ${timeline.base_year}`,
              `Capacity already operating at the end of ${timeline.base_year} is subtracted before conversion. If the amount is unknown, new capacity ranges from zero to the reported total.`,
            ],
            [
              "Site / IT power ratio",
              range(a.pue),
              "Site MW = IT MW × ratio. This is a design ratio for capacity, not the annual PUE. A project's own reported ratio replaces the standard range.",
            ],
            [
              "MW figure without a stated measure",
              `1–${number(a.pue[1])} × MW`,
              "The low value reads the figure as site power, the high value as IT power.",
            ],
            ["At least X MW", "X", "Counted as X, with the usual conversion."],
          ],
        },
        {
          id: "annual",
          headers: ["Datacenter type", "Load factor"],
          rows: [
            ...Object.entries(types.categories)
              .filter(([id]) => labels[id])
              .map(([id, item]) => [labels[id], factor(item.load_factor)]),
            ["Unknown type", range(a.nameplate_annual_fraction, factor)],
          ],
        },
        {
          id: "stages",
          headers: ["Stage", "Meaning", ...timeline.families.map((family) => family.label)],
          swatches: STAGES.map((stage) => stage.id),
          rows: STAGES.map((stage) => [
            stage.label,
            stage.text,
            ...timeline.families.map((family) => (Number(family.weights[stage.id]) > 0 ? "✓" : "–")),
          ]),
        },
        {
          id: "timing",
          headers: ["Project status", "Years until construction starts", "Years of construction left"],
          rows: ["Concept study", "Planned", "Permitted", "Under construction", "Unclear"].map((status) => [
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
    for (const { id, headers, rows, swatches } of reference.tables) {
      const host = element.querySelector(`[data-method-table="${id}"]`);
      if (!host) continue;
      if (!rows.length) {
        host.replaceChildren();
        continue;
      }
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
          if (!index && swatches) {
            const swatch = doc.createElement("i");
            swatch.className = "dc-method-swatch";
            swatch.style.background = `var(--dc-class-${swatches[body.rows.length - 1]})`;
            cell.prepend(swatch);
          }
          if (index > 1 && swatches) cell.className = "dc-method-check";
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
    const referenceLink = popup.append("a").attr("href", "#dc-method-reference").attr("class", "dc-method-popover-reference");
    // Each step points to the part of the reference that holds its numbers.
    const references = {
      scope: ["dc-method-capacity", "Capacity conversion"],
      it: ["dc-method-capacity", "Capacity conversion"],
      site: ["dc-method-capacity", "Capacity conversion"],
      unknown: ["dc-data-coverage", "Data coverage"],
      overlap: ["dc-method-reference", "Parameters and assumptions"],
      stage: ["dc-method-stages", "Stages"],
      timing: ["dc-method-timing", "Opening dates and build-out"],
      mw: ["dc-method-capacity", "Capacity conversion"],
      energy: ["dc-method-energy", "Annual electricity use"],
    };
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
      const [target, label] = references[node.id] || ["dc-method-reference", "Parameters and assumptions"];
      referenceLink.attr("href", "#" + target).text(label);
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

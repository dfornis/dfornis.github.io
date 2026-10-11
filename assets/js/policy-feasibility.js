/* Progressive enhancement: every reading and comparison is present in the HTML. */
(() => {
  "use strict";
  const root = document.getElementById("policy-feasibility");
  if (!root) return;
  const data = JSON.parse(root.querySelector("#pf-case-data").textContent);
  const sourceData = JSON.parse(root.querySelector("#pf-source-data").textContent);
  const sources = new Map([...sourceData.evidence, ...sourceData.literature].map((s) => [s.id, s]));
  const sourceBase = root.querySelector("[data-pf-source]").getAttribute("href").split("#")[0];
  const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const pairSelect = root.querySelector("#pf-pair-select");
  const params = new URLSearchParams(location.search);
  if (data.pairs.some((pair) => pair.id === params.get("pair"))) pairSelect.value = params.get("pair");
  // Earlier links remain readable; a mixed old setting falls back to the constrained base case.
  const previousExpanded =
    params.get("development") === "keep-pace" || (params.get("generation") === "keeps-pace" && params.get("grid") === "on-schedule");
  const assumptions = {
    supply: data.sensitivity_inputs[0].options.some((option) => option.id === params.get("supply"))
      ? params.get("supply")
      : previousExpanded
        ? "expanded"
        : "constrained",
  };
  function updateComparison(announce = false) {
    const pair = data.pairs.find((item) => item.id === pairSelect.value);
    const development = data.developments.find((item) => data.sensitivity_inputs.every((input) => item.inputs[input.id] === assumptions[input.id]));
    const developmentId = development.id;
    const trajectories = pair.id.split("-");
    root.querySelectorAll("[data-pf-trajectory]").forEach((element) => {
      element.hidden = !trajectories.includes(element.dataset.pfTrajectory);
    });
    root.querySelectorAll("[data-pf-comparison]").forEach((element) => {
      element.hidden = element.dataset.pfComparison !== pair.id;
    });
    root.querySelectorAll("[data-pf-development]").forEach((element) => {
      element.hidden = element.dataset.pfDevelopment !== developmentId;
    });
    root.querySelectorAll("[data-pf-assumption]").forEach((button) => {
      button.setAttribute("aria-pressed", String(assumptions[button.dataset.pfAssumption] === button.dataset.pfValue));
    });
    if (announce) {
      root.querySelector("#pf-control-status").textContent = `${pair.label}. ${development.label}. ${development.adoption[pair.id].shift}`;
      const url = new URL(location.href);
      url.searchParams.set("pair", pair.id);
      ["development", "generation", "grid"].forEach((key) => url.searchParams.delete(key));
      data.sensitivity_inputs.forEach((input) => url.searchParams.set(input.id, assumptions[input.id]));
      history.replaceState(null, "", url);
    }
  }
  root.classList.add("pf-pair-ready", "pf-development-ready");
  root.querySelector(".pf-pair-control").hidden = false;
  root.querySelector(".pf-development-control").hidden = false;
  root.querySelector(".pf-conditions-return").hidden = false;
  pairSelect.addEventListener("change", () => updateComparison(true));
  root.querySelectorAll("[data-pf-assumption]").forEach((button) => {
    button.addEventListener("click", () => {
      assumptions[button.dataset.pfAssumption] = button.dataset.pfValue;
      updateComparison(true);
    });
  });
  updateComparison();
  function openLinkedDimension() {
    if (!location.hash.startsWith("#pf-dimension-")) return;
    const target = document.getElementById(location.hash.slice(1));
    if (target?.classList.contains("pf-dimension")) target.open = true;
  }
  openLinkedDimension();
  window.addEventListener("hashchange", openLinkedDimension);
  let selected = data.outside[0].code;
  function selectPlace(code) {
    if (!data.outside.some((p) => p.code === code)) return;
    selected = code;
    root.querySelectorAll("[data-pf-place]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.pfPlace === code)));
    root.querySelectorAll(".pf-place-reading").forEach((p) => {
      p.hidden = p.id !== `pf-place-${code}`;
    });
    root.querySelectorAll("[data-map-code]").forEach((p) => {
      p.classList.toggle("pf-map-active", p.dataset.mapCode === code);
    });
    root.querySelectorAll("[data-label-code]").forEach((p) => p.classList.toggle("pf-map-label-active", p.dataset.labelCode === code));
    const item = data.outside.find((p) => p.code === code);
    root.querySelector("#pf-map-title").textContent = `Policy survey: ${item.country} selected`;
  }
  root.querySelector(".pf-place-choices").hidden = false;
  root.querySelectorAll("[data-pf-place]").forEach((button) => button.addEventListener("click", () => selectPlace(button.dataset.pfPlace)));
  function followPlaceHash() {
    const code = location.hash.replace("#pf-place-", "");
    if (data.outside.some((p) => p.code === code)) selectPlace(code);
  }
  selectPlace(selected);
  followPlaceHash();
  window.addEventListener("hashchange", followPlaceHash);

  if (window.d3 && root.dataset.pfMap) {
    const d3 = window.d3;
    d3.json(root.dataset.pfMap)
      .then((geography) => {
        const map = d3.select(root.querySelector("#pf-place-map"));
        const projection = d3.geoMercator().center([10, 54]).scale(260).translate([228, 162]);
        const eu = data.outside.filter((p) => p.region === "europe");
        const byIso = new Map(eu.map((p) => [p.iso3, p]));
        const defs = map.append("defs");
        defs.append("clipPath").attr("id", "pf-europe-clip").append("rect").attr("width", 440).attr("height", 305);
        map
          .append("g")
          .attr("clip-path", "url(#pf-europe-clip)")
          .selectAll("path")
          .data(geography.features)
          .join("path")
          .attr("class", (f) => `pf-map-country${byIso.has(f.properties.code) ? " pf-map-included" : ""}`)
          .attr("data-map-code", (f) => byIso.get(f.properties.code)?.code || "")
          .attr("d", d3.geoPath(projection));
        const positions = { IE: [-15, 3, "end"], ES: [10, 24, "start"], SE: [-10, -17, "end"], FI: [11, -7, "start"], DE: [14, 15, "start"] };
        eu.forEach((p) => {
          const point = projection(p.coordinates),
            [dx, dy, anchor] = positions[p.code];
          const g = map.append("g").attr("transform", `translate(${point.join(",")})`);
          g.append("line").attr("class", "pf-map-leader").attr("x2", dx).attr("y2", dy);
          g.append("circle").attr("class", "pf-map-point").attr("r", 3);
          g.append("text")
            .attr("class", "pf-map-label")
            .attr("data-label-code", p.code)
            .attr("x", dx)
            .attr("y", dy)
            .attr("text-anchor", anchor)
            .text(p.country);
        });
        // Separate North American locator; its scale is labelled rather than implied.
        map.append("rect").attr("class", "pf-map-inset-border").attr("x", 8).attr("y", 216).attr("width", 145).attr("height", 106);
        defs.append("clipPath").attr("id", "pf-us-clip").append("rect").attr("x", 10).attr("y", 218).attr("width", 141).attr("height", 70);
        const usProjection = d3.geoMercator().center([-99, 39]).scale(125).translate([80, 255]);
        map
          .append("g")
          .attr("clip-path", "url(#pf-us-clip)")
          .selectAll("path")
          .data(geography.features.filter((f) => ["USA", "CAN", "MEX"].includes(f.properties.code)))
          .join("path")
          .attr("class", (f) => `pf-map-country${f.properties.code === "USA" ? " pf-map-included" : ""}`)
          .attr("data-map-code", (f) => (f.properties.code === "USA" ? "US" : ""))
          .attr("d", d3.geoPath(usProjection));
        map.append("text").attr("class", "pf-map-label").attr("data-label-code", "US").attr("x", 18).attr("y", 299).text("United States");
        map.append("text").attr("class", "pf-map-inset-note").attr("x", 18).attr("y", 316).text("Separate scale");
        root.querySelector(".pf-place-map").hidden = false;
        root.querySelector(".pf-spatial-grid").classList.add("pf-map-ready");
        selectPlace(selected);
      })
      .catch(() => {
        // Country controls and all source readings remain available if the map fails.
        root.querySelector(".pf-place-map").hidden = true;
      });
  }

  const dialog = root.querySelector("#pf-source-dialog");
  const dialogContent = root.querySelector("#pf-source-content");
  root.querySelector("#pf-close-source").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    }
  });
  root.addEventListener("click", (event) => {
    const link = event.target.closest("[data-pf-source]");
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !dialog.showModal) return;
    const source = sources.get(link.dataset.pfSource);
    if (!source) return;
    event.preventDefault();
    const policy = source.id.startsWith("E");
    root.querySelector("#pf-source-kind").textContent = `${source.id} · ${policy ? "Policy evidence" : "Research"} · 10 October 2026 snapshot`;
    if (policy) {
      dialogContent.innerHTML = `<h2 id="pf-source-title">${escape(source.title)}</h2><p class="pf-caption">${escape(source.issuer)} · ${escape(source.country)} · ${escape(source.date)}</p><dl><dt>Source status</dt><dd>${escape(source.status)}</dd><dt>Passage locator</dt><dd>${escape(source.locator)}${source.pages ? ` · PDF pages ${escape(source.pages)}` : ""} · Archived text lines ${escape(source.lines)}</dd><dt>Analytical summary from the lab (Swedish)</dt><dd>${escape(source.claim_sv)}</dd><dt>Limit / counterevidence (Swedish)</dt><dd>${escape(source.limit_sv)}</dd><dt>Review recorded in the lab</dt><dd>${escape(source.quality)}</dd><dt>Archive format</dt><dd>${escape(source.archive_format)}</dd></dl><p><a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">Read the original source ↗</a></p>`;
    } else {
      dialogContent.innerHTML = `<h2 id="pf-source-title">${escape(source.title)}</h2><p class="pf-caption">${escape(source.citation)}</p><dl><dt>Type and context</dt><dd>${escape(source.kind)}</dd><dt>Reading note and limit (Swedish)</dt><dd>${escape(source.note_sv)}</dd><dt>Reviewed PDF pages, one-based</dt><dd>${escape(source.pages)}</dd><dt>Review scope</dt><dd>${escape(source.review)}</dd></dl>${source.url ? `<p><a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">Read the research source ↗</a></p>` : ""}`;
    }
    dialogContent.insertAdjacentHTML(
      "beforeend",
      `<p class="pf-caption"><a href="${escape(sourceBase)}#${source.id}">Permanent source record: ${source.id}</a></p>`
    );
    dialog.showModal();
    dialog.scrollTop = 0;
  });
})();

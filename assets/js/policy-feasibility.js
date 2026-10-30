/* Progressive enhancement: every reading and comparison is present in the HTML. */
(() => {
  "use strict";
  const root = document.getElementById("policy-feasibility");
  if (!root) return;
  const data = JSON.parse(root.querySelector("#pf-case-data").textContent);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Links to a dimension or a place open the fold-out that holds it.
  function openLinkedTarget() {
    if (!location.hash) return;
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!target) return;
    let node = target;
    while (node && node !== root) {
      if (node.tagName === "DETAILS") node.open = true;
      node = node.parentElement;
    }
  }
  openLinkedTarget();
  window.addEventListener("hashchange", openLinkedTarget);
  root.querySelectorAll('.pf-profile a[href^="#pf-dimension-"]').forEach((link) => {
    link.addEventListener("click", () => {
      const target = document.getElementById(link.getAttribute("href").slice(1));
      if (target) target.open = true;
    });
  });

  // Section navigation: mark the section in view.
  const navLinks = [...root.querySelectorAll(".pf-stepnav a")];
  const sections = navLinks.map((link) => document.getElementById(link.getAttribute("href").slice(1))).filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    const visible = new Map();
    const mark = () => {
      let current = sections[0];
      sections.forEach((section) => {
        if (visible.get(section)) current = section;
      });
      navLinks.forEach((link) => {
        const active = link.getAttribute("href") === `#${current.id}`;
        if (active && !link.hasAttribute("aria-current")) {
          link.setAttribute("aria-current", "true");
          // On narrow screens the bar scrolls sideways; keep the current step in view without moving the page.
          const list = link.closest("ol");
          if (list && list.scrollWidth > list.clientWidth) {
            const left = link.parentElement.offsetLeft - (list.clientWidth - link.parentElement.offsetWidth) / 2;
            list.scrollTo({ left: Math.max(0, left), behavior: reducedMotion ? "auto" : "smooth" });
          }
        } else if (!active) link.removeAttribute("aria-current");
      });
    };
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => visible.set(entry.target, entry.isIntersecting));
        mark();
      },
      { rootMargin: "-35% 0px -55% 0px" }
    );
    sections.forEach((section) => observer.observe(section));
    root.classList.add("pf-stepnav-ready");
  }

  // Gentle reveal as each part comes into view; everything stays visible without scripts or with reduced motion.
  if (!reducedMotion && "IntersectionObserver" in window) {
    const reveal = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("pf-in-view");
            reveal.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    root.querySelectorAll(".pf-reveal").forEach((element) => {
      if (element.getBoundingClientRect().top < window.innerHeight) element.classList.add("pf-in-view");
      else reveal.observe(element);
    });
    root.classList.add("pf-reveal-ready");
    // Bars grow when their figure appears.
    const grow = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("pf-grown");
            grow.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    root.querySelectorAll(".pf-bars, .pf-stack").forEach((figure) => grow.observe(figure));
    root.classList.add("pf-grow-ready");
  }
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
})();

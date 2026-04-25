---
layout: page
title: Swedish data center tracker
permalink: /projects/datacenter-tracker/
---

# Swedish data center tracker

This page collects publicly reported data center projects in Sweden. The dataset is under development and should be interpreted as a structured tracker of reported plans, not as a forecast.

## Projects

<div id="projects-table"></div>

## Capacity claims

<div id="capacity-table"></div>

## Assumptions

<div id="assumptions-table"></div>

<script>
async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Could not load ${path}`);
  }
  return response.json();
}

function valueOrBlank(value) {
  return value === null || value === undefined ? "" : value;
}

function makeTable(containerId, data, columns) {
  const container = document.getElementById(containerId);

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No data available.</p>";
    return;
  }

  let html = "<table><thead><tr>";

  columns.forEach(col => {
    html += `<th>${col.label}</th>`;
  });

  html += "</tr></thead><tbody>";

  data.forEach(row => {
    html += "<tr>";

    columns.forEach(col => {
      html += `<td>${valueOrBlank(row[col.key])}</td>`;
    });

    html += "</tr>";
  });

  html += "</tbody></table>";

  container.innerHTML = html;
}

async function init() {
  const projects = await loadJson("/assets/data/datacenters/projects.json");
  const capacity = await loadJson("/assets/data/datacenters/capacity.json");
  const assumptions = await loadJson("/assets/data/datacenters/assumptions.json");

  makeTable("projects-table", projects, [
    { key: "project_name", label: "Project" },
    { key: "developer", label: "Developer" },
    { key: "bidding_zone", label: "Zone" },
    { key: "municipality", label: "Municipality" },
    { key: "county", label: "County" },
    { key: "type", label: "Type" },
    { key: "status", label: "Status" },
    { key: "expected_operational_years", label: "Expected operation" },
    { key: "max_reported_capacity_mw", label: "Max MW" },
    { key: "notes", label: "Notes" }
  ]);

  makeTable("capacity-table", capacity, [
    { key: "project_id", label: "Project ID" },
    { key: "claim_id", label: "Claim ID" },
    { key: "phase", label: "Phase" },
    { key: "capacity_type", label: "Capacity type" },
    { key: "value_mw", label: "MW" },
    { key: "interpreted_it_load_mw", label: "IT load MW" },
    { key: "interpreted_grid_load_mw", label: "Grid load MW" },
    { key: "start_year", label: "Start year" },
    { key: "notes", label: "Notes" }
  ]);

  makeTable("assumptions-table", assumptions, [
    { key: "assumption_id", label: "ID" },
    { key: "assumption_type", label: "Type" },
    { key: "value", label: "Value" },
    { key: "unit", label: "Unit" },
    { key: "description", label: "Description" },
    { key: "source", label: "Source" }
  ]);
}

init().catch(error => {
  console.error(error);
  document.getElementById("projects-table").innerHTML =
    "<p>Could not load tracker data.</p>";
});
</script>

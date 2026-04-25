---
layout: page
title: Swedish data center tracker
permalink: /projects/datacenter-tracker/
---

This page tracks publicly reported data center projects in Sweden. The dataset and methodology is under development.

The table combines project-level information with reported capacity claims. Where possible, reported capacity is translated into estimated grid load and annual electricity use using assumptions stated at the bottom of the page.

<div class="tracker-controls">
  <label>
    Bidding zone
    <select id="filter-zone">
      <option value="">All</option>
    </select>
  </label>

  <label>
    Status
    <select id="filter-status">
      <option value="">All</option>
    </select>
  </label>

  <label>
    Type
    <select id="filter-type">
      <option value="">All</option>
    </select>
  </label>

  <label>
    Search
    <input id="filter-search" type="search" placeholder="Project, developer, notes..." />
  </label>
</div>

<div id="summary-box" class="summary-box"></div>

<div class="table-wrapper">
  <table id="tracker-table">
    <thead>
      <tr>
        <th>Project</th>
        <th>Developer</th>
        <th>Zone</th>
        <th>Type</th>
        <th>Status</th>
        <th>Capacity basis</th>
        <th>Est. grid load MW</th>
        <th>Est. TWh/year</th>
        <th>Expected operation</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>
</div>

## Capacity interpretation and derived load estimates

Capacity figures reported for data center projects are derived from news articles and press releases, rendering them heterogeneous and open for interpretation. A reported MW value may refer to IT load, total site or grid connection capacity, an incremental expansion, full campus build-out potential or backup generation capacity.

The tracker therefore separates the reported capacity value from its interpreted `capacity_basis`. IT load refers to the power demand of servers and related IT equipment. Estimated grid load includes additional facility energy use for cooling, power conversion, lighting and other infrastructure. Backup power permits and generation capacities are not treated as data center load unless a separate IT or grid connection capacity is reported.

Where appropriate, grid load is estimated using:

```text
estimated grid load MW = reported IT load MW × assumed PUE

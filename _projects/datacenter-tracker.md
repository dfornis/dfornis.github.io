---
layout: page
title: Swedish data center tracker
permalink: /projects/datacenter-tracker/
---

<div class="dc-tracker">
  <div class="dc-controls">
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
  </div>

  <div id="dc-map" style="height: 560px;"></div>

  <h2>Projects</h2>
  <table id="dc-table">
    <thead>
      <tr>
        <th>Project</th>
        <th>Developer</th>
        <th>Zone</th>
        <th>Municipality</th>
        <th>Type</th>
        <th>Status</th>
        <th>MW</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>
</div>

<link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css">
<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script src="/assets/js/datacenter-tracker.js"></script>
<link rel="stylesheet" href="/assets/css/datacenter-tracker.css">

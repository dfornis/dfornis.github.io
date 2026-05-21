---
layout: page
title: Transport electrification policy explorer
description: Interactive policy-scenarios for projected Swedish new-car sales shares by drivetrain.
img: /assets/images/drivetrain_thumbnail.png
importance: 2
permalink: /projects/drivetrain-demand-model/
---

This is a visual explorer of policy scenarios for new car sales by drivetrain in Sweden. In recent years, sales of BEVs have been lagging in the Swedish market compared to that of Nordic neighbors. 
While reasons are multiple and diverse, stalled electrification follows several years of cuts to excise fuel taxes, lowered blending-mandates and removed incentives for BEV and PHEV vehicles. This development prompted
me to iterate on a policy-driven demand model which originates from previous work on a government assignment. 
The purpose of this tool is to enable the exploration of how key policies impact the electrification rate of the passenger vehicle fleet. 
Methods, data and key assumptions are presented and discussed below.

<link rel="stylesheet" href="{{ '/assets/css/drivetrain-demand-model.css?v=20260521-s-curves' | relative_url }}">

<div
  id="drivetrain-demand-model"
  class="drivetrain-app"
  data-drivetrain-app
  aria-live="polite"
>
  <div class="drivetrain-status" data-status>Loading model run...</div>

  <div class="drivetrain-shell" hidden>
    <section class="drivetrain-toolbar" aria-label="Scenario controls">
    </section>

    <section class="drivetrain-elasticity-control" data-elasticity-control aria-label="Elasticity assumptions"></section>

    <section class="drivetrain-chart-wrap" aria-label="Sales share chart">
      <div class="drivetrain-chart-head">
        <div>
          <p class="drivetrain-kicker">New-car sales shares</p>
          <h3>2024-2035</h3>
        </div>
        <div class="drivetrain-legend" data-legend></div>
      </div>
      <div class="drivetrain-chart" data-chart></div>
    </section>

    <section class="drivetrain-details" aria-label="Scenario details">
      <div class="drivetrain-panel">
        <div class="drivetrain-panel-head">
          <div>
            <p class="drivetrain-kicker">Composition</p>
            <h3 data-composition-title></h3>
          </div>
          <div class="drivetrain-year-toggle" data-year-toggle aria-label="Summary year"></div>
        </div>
        <div class="drivetrain-stack" data-stack></div>
      </div>

      <div class="drivetrain-panel">
        <div class="drivetrain-panel-head">
          <div>
            <p class="drivetrain-kicker">Difference from adopted</p>
            <h3 data-delta-title></h3>
          </div>
        </div>
        <div class="drivetrain-delta-grid" data-delta-grid></div>
      </div>
    </section>
    
     <section class="drivetrain-technology-curves" data-technology-curves aria-label="Exogenous technology S-curves for BEV vehicles">
      <div class="drivetrain-technology-curves-head">
        <div>
          <p class="drivetrain-kicker">Technology S-curves</p>
        </div>
      </div>
      <div class="drivetrain-technology-curve-chart" data-technology-curve-chart></div>
    </section>
  </div>
</div>

<script>
window.DRIVETRAIN_DEMAND_MODEL_PATHS = {
  base: "{{ '/assets/data/drivetrain-demand-model/data/' | relative_url }}",
  index: "{{ '/assets/data/drivetrain-demand-model/data/scenario_index.json' | relative_url }}?v=20260521-s-curves",
  technology: "{{ '/assets/data/drivetrain-demand-model/data/technology_scenarios.json' | relative_url }}?v=20260521-s-curves",
  technologySummary: "{{ '/assets/data/drivetrain-demand-model/data/technology_summary.csv' | relative_url }}?v=20260521-s-curves",
  policyLevers: "{{ '/assets/data/drivetrain-demand-model/data/policy_levers.json' | relative_url }}?v=20260521-s-curves"
};
</script>
<script src="{{ '/assets/js/drivetrain-demand-model.js?v=20260521-s-curves' | relative_url }}"></script>

## Method
The  model simulates annual drivetrain market shares for new passenger cars using a calibrated nested-logit structure. The choice set consists of gasoline, diesel, hybrid electric (HEV), plug-in hybrid (PHEV) and battery electric vehicles (BEV). 
Utility is specified at the drivetrain level and includes purchase price, fuel or electricity cost and a drivetrain-specific constants. 

The drivetrains are grouped into two nests. Gasoline, diesel, HEV and PHEV are placed in a combustion/hybrid nest, while BEV is placed in a separate pure-electric nest. 
The model is calibrated to observed drivetrain market shares in the model base year 2024 by adjusting alternative-specific constants, with gasoline used as the reference. 

A separate technology path represents non-price developments affecting BEV and PHEV adoption, including vehicle availability, battery costs, model variety, charging access, and consumer familiarity. 
This path is specified as an S-curve and normalized to zero in 2024. The S-curve is calibrated to exogenous technology anchors for the adopted-policy baseline. These anchors represent plausible BEV shares under adopted policy, 
informed by external electrification outlooks such as the IEA Stated Policies Scenario and adjusted to the Swedish passenger-car context. All adopted-policy baselines are aligned with the same technology path, so that differences 
between policy scenarios are driven by price and policy responses rather than by different assumptions about underlying technology diffusion.
## Data
The model is built on annual Swedish data for new passenger car registrations aggregated by year, model and drivetrain in order to generate vehicle purchase prices. Observed drivetrain shares
are deerived from Trafikanalys and used to calibrate shares in the 2024 model base year.

Fuel prices are decomposed into a product price, excise tax, VAT and used to construct a final consumer price. Gasoline and diesel prices are based on pump-price data. Electricity
prices are based on household electricity-price data (Statistics Sweden). All prices enter as nominal and are converted to real 2024 prices in the model.

Price responses are based on published own-price and cross-price elasticities. Purchase-price elasticities determine the response to changes in vehicle prices, including purchase subsidies. 
Fuel-price elasticities determine the response to changes in gasoline, diesel, electricity and the blended PHEV energy price. 

The default elasticity specification is based on Fridstrøm and Østli (2021) which provides conservative and un-segmented elasticities based on Norwegian micro data. Alternative specifications use purchase-price elasticities from Xing et al. (2021), combined with Swedish electricity-price elasticities from Vesterberg (2025). 
Higher BEV purchase-price elasticities are explored to reflect that the EV market is moving from early adopters toward more price-sensitive mass-market segments.


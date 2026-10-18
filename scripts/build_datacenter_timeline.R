#!/usr/bin/env Rscript
# Presentation export: reuse the approved model, never interpolate scenario endpoints.
# Run from the site root after results.json is updated. No pipeline files are changed.
site <- normalizePath('.', mustWork=TRUE)
pipeline <- normalizePath(Sys.getenv('DATACENTER_PIPELINE_ROOT', unset=file.path('..', 'datacenter-tracker-pipeline')), mustWork=TRUE)
source(file.path(pipeline, 'scripts/model.R'))
path <- file.path(site, 'assets/data/datacenters/results.json')
snapshot <- jsonlite::fromJSON(path, simplifyVector=FALSE)
hashes <- input_hashes(pipeline)
source_keys <- c('projects', 'capacity', 'sources', 'actors', 'model', 'method')
for (key in source_keys) {
  if (!identical(hashes[[key]], snapshot$input_hashes[[key]]))
    stop('The approved result and pipeline differ: ', key, '. Refresh the approved export first.')
}
x <- read_inputs(pipeline)
original <- calculate(x)$project_scenarios
saved <- jsonlite::fromJSON(path)$project_scenarios
fields <- c('project_id', 'mw_low', 'mw_high', 'capacity_known', 'indicator')
for (scenario in unique(saved$scenario)) {
  a <- saved[saved$scenario == scenario, fields]
  b <- original[original$scenario == scenario & original$project_id %in% a$project_id, fields]
  b <- b[match(a$project_id, b$project_id), ]
  rownames(a) <- rownames(b) <- NULL
  if (!isTRUE(all.equal(a, b, check.attributes=FALSE))) stop('Model does not reproduce saved results: ', scenario)
}
years <- seq(as.integer(substr(snapshot$as_of, 1, 4)), 2035L)
families <- list(list(id='low', label='Confirmed investment', selection='decided_dated'),
                 list(id='stated', label='Stated plans', selection='dated'))
x$config$scenarios <- unlist(lapply(families, function(family) lapply(years, function(year)
  list(id=paste0(family$id, '_', year), label=family$label, year=year, selection=family$selection))), recursive=FALSE)
rows <- calculate(x)$project_scenarios
rows <- rows[rows$included_in_result & rows$project_id %in% saved$project_id,
             c('scenario', 'project_id', 'mw_low', 'mw_high', 'capacity_known', 'indicator')]
rows$year <- as.integer(sub('.*_', '', rows$scenario))
rows$family <- sub('_.*', '', rows$scenario)
rows$scenario <- NULL
out <- list(version=1, as_of=snapshot$as_of, source_hashes=snapshot$input_hashes[source_keys],
            years=as.list(years), families=families, rows=rows)
destination <- file.path(site, 'assets/data/datacenters/timeline.json')
jsonlite::write_json(out, destination, auto_unbox=TRUE, na='null', null='null', digits=NA)
cat('Exported', nrow(rows), 'project/year results; all saved scenario endpoints match.\n')

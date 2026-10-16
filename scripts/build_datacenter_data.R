#!/usr/bin/env Rscript
# Compatibility entry point: the pipeline repository is the sole register and model.
site<-normalizePath('.',mustWork=TRUE)
pipeline<-normalizePath(Sys.getenv('DATACENTER_PIPELINE_ROOT',unset=file.path('..','datacenter-tracker-pipeline')),mustWork=FALSE)
if(!file.exists(file.path(pipeline,'scripts/pipeline.R')))
  stop('Set DATACENTER_PIPELINE_ROOT to the datacenter-tracker-pipeline checkout. This site no longer builds from old _data/datacenters tables.')
setwd(pipeline)
status<-system2(file.path(R.home('bin'),'Rscript'),c('scripts/pipeline.R','tracker',shQuote(paste0('--site=',site))))
if(status!=0)stop('Shared tracker build failed with status ',status)

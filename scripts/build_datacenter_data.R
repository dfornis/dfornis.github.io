library(readr)
library(dplyr)
library(jsonlite)
library(sf)
library(purrr)

# Paths
csv_dir <- "_data/datacenters"
json_dir <- "assets/data/datacenters"

dir.create(json_dir, recursive = TRUE, showWarnings = FALSE)

# Read CSV master files
projects <- read_csv(file.path(csv_dir, "projects.csv"), show_col_types = FALSE)
capacity <- read_csv(file.path(csv_dir, "capacity.csv"), show_col_types = FALSE)
assumptions <- read_csv(file.path(csv_dir, "assumptions.csv"), show_col_types = FALSE)

# Basic validation
required_project_cols <- c(
  "project_id", "project_name", "developer",
  "bidding_zone", "county", "municipality",
  "type", "status", "notes"
)

missing_project_cols <- setdiff(required_project_cols, names(projects))

if (length(missing_project_cols) > 0) {
  stop("Missing columns in projects.csv: ", paste(missing_project_cols, collapse = ", "))
}

required_capacity_cols <- c(
  "claim_id", "project_id", "capacity_type", "value_mw"
)

missing_capacity_cols <- setdiff(required_capacity_cols, names(capacity))

if (length(missing_capacity_cols) > 0) {
  stop("Missing columns in capacity.csv: ", paste(missing_capacity_cols, collapse = ", "))
}

# Check project_id consistency
missing_project_ids <- setdiff(capacity$project_id, projects$project_id)

if (length(missing_project_ids) > 0) {
  stop("capacity.csv contains project_id values not found in projects.csv: ",
       paste(missing_project_ids, collapse = ", "))
}

# Optional display table for frontend
project_display <- projects %>%
  left_join(
    capacity %>%
      group_by(project_id) %>%
      summarise(
        max_reported_capacity_mw = max(value_mw, na.rm = TRUE),
        capacity_types = paste(sort(unique(capacity_type)), collapse = "; "),
        .groups = "drop"
      ),
    by = "project_id"
  )

# Export JSON
write_json(projects, file.path(json_dir, "projects.json"), pretty = TRUE, auto_unbox = TRUE, na = "null")
write_json(capacity, file.path(json_dir, "capacity.json"), pretty = TRUE, auto_unbox = TRUE, na = "null")
write_json(assumptions, file.path(json_dir, "assumptions.json"), pretty = TRUE, auto_unbox = TRUE, na = "null")
write_json(project_display, file.path(json_dir, "project_display.json"), pretty = TRUE, auto_unbox = TRUE, na = "null")

message("Built JSON files in ", json_dir)

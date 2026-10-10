"""Build a dated, traceable website snapshot from the read-only feasibility lab."""

import argparse
import csv
import hashlib
import json
import re
from itertools import combinations
from pathlib import Path


def rows(path):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def references(value):
    if isinstance(value, dict):
        for key, child in value.items():
            if key in ("evidence", "benefit_evidence", "literature"):
                yield from child
            else:
                yield from references(child)
    elif isinstance(value, list):
        for child in value:
            yield from references(child)


def main():
    site = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    candidates = [site.parent, site.parent / "policy-feasibility-lab/feasibility-lab", site.parent / "policy-feasibility-lab"]
    default_lab = next((p for p in candidates if (p / "cases/datacentres-sweden/inside/presentation.json").exists()), candidates[-1])
    parser.add_argument("--lab", type=Path, default=default_lab)
    args = parser.parse_args()
    lab = args.lab.resolve()
    case_path = site / "_data/policy_feasibility.json"
    case = json.loads(case_path.read_text())
    original = json.loads((lab / "cases/datacentres-sweden/inside/presentation.json").read_text())
    assert case["knowledge_date"] == original["knowledge_cutoff"], "Knowledge dates differ"
    assert case["decision_period"] == original["decision_period"]
    assert str(case["model_horizon"]) == str(original["model_horizon"])
    trajectory_ids = [t["trajectory_id"] for t in original["trajectories"]]
    assert [t["id"] for t in case["trajectories"]] == trajectory_ids
    expected_pairs = {"-".join(pair) for pair in combinations(trajectory_ids, 2)}
    assert {p["id"] for p in case["pairs"]} == expected_pairs
    assert len(case["dimensions"]) == 5
    assert case["overall"]["decisive_dimensions"] == original["overall_assessment"]["decisive_dimensions"]
    assert set(original["overall_assessment"]["evidence_ids"]) <= set(case["overall"]["evidence"])
    assert all(case["scope"].get(k) for k in ["question", "cohort", "shared", "timing", "definition"])
    assert case.get("model_note") and case["overall"].get("model"), "Missing scenario implication"
    original_dimensions = {d["dimension_id"] for d in original["dimensions"]}
    assert {d["id"] for d in case["dimensions"]} == original_dimensions
    for dimension in case["dimensions"]:
        assert set(dimension["cells"]) == set(trajectory_ids)
        assert set(dimension["pairs"]) == expected_pairs
    dimensions = {d["id"]: d for d in case["dimensions"]}
    for dimension in original["dimensions"]:
        assert dimensions[dimension["dimension_id"]]["literature"] == dimension["literature_ids"]
    for cell in original["cells"]:
        shown = dimensions[cell["dimension_id"]]["cells"][cell["trajectory_id"]]
        assert set(cell["evidence_ids"]) <= set(shown["evidence"]), "Original cell references omitted"
    for comparison in original["pairwise_comparisons"]:
        shown = dimensions[comparison["dimension_id"]]["pairs"]["-".join(comparison["trajectory_ids"])]
        assert set(comparison["evidence_ids"]) <= set(shown["evidence"]), "Original comparison references omitted"
    actor_ids = {a["actor_id"] for a in rows(lab / "cases/datacentres-sweden/outside/actors.csv")}
    assert all(a["id"] in actor_ids for a in case["actors"]), "Unknown source actor ID"
    geography = json.loads((site / "assets/data/policy-feasibility/countries.geojson").read_text())
    country_codes = {f["properties"]["code"] for f in geography["features"]}
    assert all(o["iso3"] in country_codes for o in case["outside"] if o["code"] != "SG"), "A mapped policy country has no outline"
    history_ids = {h["id"] for h in case["history_sources"]}
    assert len(history_ids) == len(case["history_sources"])
    assert all(set(h["source_ids"]) <= history_ids for h in case["history"]), "Unknown historical source"
    historical = json.loads((lab / "cases/datacentres-sweden/outside/history.json").read_text())
    assert historical["examples"] == case["history"] and historical["sources"] == case["history_sources"], "Historical presentation differs from lab"
    assert historical["mobilisation_example"] == case["historical_mobilisation"], "Historical mobilisation example differs from lab"

    conditional = json.loads((lab / "cases/datacentres-sweden/inside/conditional-comparisons.json").read_text())
    assert conditional["developments"] == case["developments"], "Conditional settings differ from lab"
    development_ids = {item["id"] for item in case["developments"]}
    for original_dimension in conditional["dimensions"]:
        shown = dimensions[original_dimension["id"]]
        assert shown["developments"] == original_dimension["developments"]
        assert shown["development_evidence"] == original_dimension["evidence"]
        assert {pair: content["takeaway"] for pair, content in shown["pairs"].items()} == original_dimension["initial_comparisons"]
        assert set(shown["developments"]) == development_ids
        assert all(set(pairs) == expected_pairs for pairs in shown["developments"].values())

    source_rows = {s["source_id"]: s for s in rows(lab / "cases/datacentres-sweden/sources/index.csv")}
    evidence = []
    for item in rows(lab / "cases/datacentres-sweden/outside/evidence.csv"):
        source = source_rows[item["source_id"]]
        source_text = (lab / source["text_path"]).read_text().splitlines()
        start, end = int(item["line_start"]), int(item["line_end"])
        assert 1 <= start <= end <= len(source_text), f"Invalid passage bounds: {item['evidence_id']}"
        excerpt = "\n".join(source_text[start - 1 : end]).strip()
        assert excerpt, f"Empty passage: {item['evidence_id']}"
        url = source["resolved_url"] or source["url"]
        page = re.match(r"\d+", item["pdf_pages"])
        if page and ".pdf" in url.lower():
            url += "#page=" + page.group()
        evidence.append({
            "id": item["evidence_id"], "source_id": item["source_id"],
            "title": source["title"], "issuer": source["issuer"],
            "date": source["publication_date"] or "Date not recorded",
            "country": source["country"], "status": source["legal_status"].replace("_", " "),
            "url": url, "locator": item["locator"],
            "pages": item["pdf_pages"], "lines": f"{start}–{end}",
            "claim_sv": item["claim"], "limit_sv": item["counterevidence_or_limit"],
            "excerpt": "", "quality": item["quality_status"].replace("_", " "),
            "archive_format": "Web-reader text representation; source-original bytes unavailable" if source["status"] == "web_retrieved" else ("Original PDF and extracted text" if source["original_path"].endswith(".pdf") else "Original HTML and extracted text"),
            "source_hash": source["sha256"],
        })

    guide = (lab / "reference/literature/README.md").read_text()
    literature = []
    for item in rows(lab / "reference/literature/index.csv"):
        if item["use"] != "inside":
            continue
        match = re.search(r"^## " + item["literature_id"] + r"\n(.*?)(?=^## |\Z)", guide, re.M | re.S)
        assert match, f"Missing reading note: {item['literature_id']}"
        paragraphs = match.group(1).strip().split("\n\n")
        note = next((p for p in paragraphs if "Användning:" in p), "")
        # These are the lab's own reading notes; copyrighted full texts are not copied to the site.
        literature.append({
            "id": item["literature_id"], "title": item["title"],
            "citation": item["citation"], "kind": item["kind"],
            "url": item["source_url"], "pages": item["reviewed_pages"].replace(";", ", ").strip(", "),
            "note_sv": re.sub(r"\*\*", "", note), "review": item["review_status"],
            "source_hash": item["sha256"],
        })
    ids = {e["id"] for e in evidence + literature}
    missing = set(references(case)) - ids
    assert not missing, f"Missing sources: {sorted(missing)}"
    result = {
        "knowledge_date": case["knowledge_date"],
        "translation_note": "English presentation text is an LLM-assisted adaptation of the Swedish lab assessment. The website exports authored summaries and source locators; archived source passages remain in the lab.",
        "assessment_sha256": hashlib.sha256((lab / "cases/datacentres-sweden/inside/presentation.json").read_bytes()).hexdigest(),
        "evidence": evidence, "literature": literature,
    }
    destination = site / "_data/policy_feasibility_sources.json"
    destination.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(f"Verified {len(trajectory_ids)} trajectories, 5 dimensions, {len(original['cells'])} cells and {len(original['pairwise_comparisons'])} comparisons; exported {len(evidence)} policy records and {len(literature)} research notes.")


if __name__ == "__main__":
    main()

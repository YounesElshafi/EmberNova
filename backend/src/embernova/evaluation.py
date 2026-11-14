import argparse
import json
import math
import time

import yaml

from embernova.agent.citations import validate
from embernova.config import ROOT, settings
from embernova.evidence import Ledger
from embernova.provenance import canonical, new_id, now
from embernova.retrieval import document_page, search_documents, search_investigations
from embernova.science.bundle import Bundle
from embernova.storage import Store
from embernova.tools import Tools


def retrieval(split="both", offline=False):
    cfg = settings().model_copy(update={"openai_api_key": None}) if offline else settings()
    state = Store(cfg)
    questions = yaml.safe_load((ROOT / "curation/benchmark/retrieval_v1.yaml").read_text())[
        "questions"
    ]
    output = {
        "mode": "hybrid"
        if (cfg.build_dir / "embeddings.json").exists() and cfg.openai_api_key
        else "bm25_only",
        "splits": {},
    }
    for subset in [split] if split in {"dev", "test"} else ["dev", "test"]:
        metrics = []
        for question in questions:
            if question["split"] != subset:
                continue
            start = time.perf_counter()
            ledger = Ledger(state)
            result = search_investigations(state, ledger, question["question"], limit=15)
            ranked = [r["investigation_id"] for r in result["results"]]
            gold = question["relevance"]
            relevant = set(gold)
            recall = len(set(ranked[:5]) & relevant) / len(relevant)
            rr = next((1 / (n + 1) for n, key in enumerate(ranked) if key in relevant), 0)
            dcg = sum(
                (2 ** gold.get(key, 0) - 1) / math.log2(i + 2) for i, key in enumerate(ranked[:10])
            )
            ideal = sum(
                (2**grade - 1) / math.log2(i + 2)
                for i, grade in enumerate(sorted(gold.values(), reverse=True)[:10])
            )
            metrics.append(
                {
                    "id": question["id"],
                    "ranked": ranked[:10],
                    "recall_at_5": recall,
                    "mrr": rr,
                    "ndcg_at_10": dcg / ideal if ideal else 0,
                    "latency_ms": (time.perf_counter() - start) * 1000,
                }
            )
            if question.get("gold_pages"):
                passages = search_documents(state, Ledger(state), question["question"], limit=8)[
                    "passages"
                ]
                metrics[-1]["evidence_hit_at_8"] = int(
                    any(
                        p["document_id"] == gold["document_id"] and p["page"] == gold["page"]
                        for p in passages
                        for gold in question["gold_pages"]
                    )
                )
        output["splits"][subset] = {
            "questions": metrics,
            **{
                k: sum(m[k] for m in metrics) / len(metrics)
                for k in ["recall_at_5", "mrr", "ndcg_at_10", "latency_ms"]
            },
        }
        page_metrics = [m["evidence_hit_at_8"] for m in metrics if "evidence_hit_at_8" in m]
        output["splits"][subset]["evidence_hit_at_8"] = (
            sum(page_metrics) / len(page_metrics) if page_metrics else None
        )
        output["splits"][subset]["gold_page_questions"] = len(page_metrics)
    (cfg.build_dir / "eval").mkdir(exist_ok=True)
    (cfg.build_dir / "eval/retrieval.json").write_text(
        json.dumps(output, indent=2), encoding="utf-8"
    )
    print(
        json.dumps(
            {
                k: {m: v for m, v in s.items() if m != "questions"}
                for k, s in output["splits"].items()
            },
            indent=2,
        )
    )


def demos():
    """Record deterministic source walkthroughs, explicitly not previous model responses."""
    cfg = settings()
    store, bundle = Store(cfg), Bundle(cfg)
    folder = cfg.build_dir / "replays"
    folder.mkdir(exist_ok=True)
    scenarios = [
        (
            "atmosphere",
            "An atmosphere is not a gravity regime",
            "Which FLEX tests overlap elevated-oxygen habitat atmospheres?",
        ),
        (
            "consistency",
            "Check the data against the d²-law",
            "Are NASA's droplet diameters, burning rates and times internally consistent?",
        ),
        (
            "detection",
            "Find evidence for spacecraft smoke detection",
            "Which NASA investigations help us understand spacecraft smoke detection?",
        ),
    ]
    for scenario, title, question in scenarios:
        tools = Tools(store, bundle)
        tid = new_id("turn_")
        sid = new_id("ses_")
        events = []

        def emit(name, events=events, tid=tid, sid=sid, **payload):
            event = {
                "event": name,
                "seq": len(events),
                "turn_id": tid,
                "t_ms": len(events) * 120,
                **payload,
            }
            events.append(event)
            store.event(sid, event)

        emit("turn.started", session_id=sid, model=None, replay=True)
        emit(
            "status",
            phase="searching",
            message="Playing recorded deterministic source computations…",
        )
        if scenario == "atmosphere":
            call, args = (
                "check_applicability_envelope",
                {
                    "scenario_label": "Elevated oxygen, reduced pressure reference",
                    "o2_mole_fraction": {"min": 0.30, "max": 0.34},
                    "total_pressure": {"min": 520, "max": 560, "unit": "mmHg"},
                    "gravity": "lunar",
                },
            )
        elif scenario == "consistency":
            call, args = "check_d2_law", {"table_id": "PSI-69:flex_experimental"}
        else:
            call, args = (
                "search_investigations",
                {"query": "smoke detection particle aerosols spacecraft SAME Saffire", "limit": 5},
            )
        emit(
            "tool.started",
            call_id="demo",
            tool=call,
            label=call.replace("_", " "),
            args_summary="Recorded deterministic computation on verified NASA data",
        )
        data = tools.call(call, args)
        page = (
            document_page(store, tools.ledger, "doc:NTRS-20150023456-1", 26)
            if scenario != "detection"
            else None
        )
        for evidence in tools.ledger.items.values():
            emit("evidence.added", evidence=evidence)
        emit(
            "tool.completed",
            call_id="demo",
            tool=call,
            status="ok",
            latency_ms=0,
            summary="Recorded deterministic computation",
            evidence_ids=list(tools.ledger.items),
            artifact_ids=[a["artifact_id"] for a in tools.ledger.artifacts],
        )
        for artifact in tools.ledger.artifacts:
            emit("artifact.created", artifact=artifact)
        if scenario == "atmosphere":
            art = data["artifact"]
            flex = next(
                p for p in art["payload"]["per_investigation"] if p["investigation_id"] == "PSI-69"
            )
            text = f"## Answer\nThis recorded deterministic demonstration finds **{flex['n_runs_in_range']} FLEX tests** inside the specified oxygen and pressure ranges. The atmosphere overlap does not establish lunar-gravity coverage or safety. [[ev:{art['evidence_id']}]]\n\n## Evidence\n**Derived** — inspect the envelope, exact query, source runs and missing conditions. [[ev:{art['evidence_id']}]]\n\n**Published** — NASA's original table defines oxygen mole fraction, total pressure and burning-rate constant separately. [[ev:{page['evidence_id']}]]\n\n## Limits of the evidence\nNo partial-gravity run data exist in this PSI snapshot. Droplet behavior does not establish solid-material flammability. Similarity is not certification."
        elif scenario == "consistency":
            art = data["artifact"]
            stats = data["stats"]
            text = f"## Answer\nThe deterministic d²-law check has a median consistency ratio of **{stats['median_ratio']:.3f}** over **{stats['n']} complete, accepted rows**. [[ev:{art['evidence_id']}]]\n\n## Evidence\n**Derived** — the chart compares reported burn time against (D₀² − Dext²)/K and flags departures. [[ev:{art['evidence_id']}]]\n\n**Published** — the original NASA table reports K in mm²/s. [[ev:{page['evidence_id']}]]\n\n## Limits of the evidence\nDepartures from the quasi-steady relation may be physical; they do not prove a data error. This is a scripted computation walkthrough, not live model interpretation."
        else:
            results = data["results"]
            text = (
                "## Answer\nThis recorded lexical search ranks source investigations relevant to spacecraft smoke detection.\n\n## Evidence\n"
                + "\n".join(
                    f"- **Source metadata** — {r['acronym'] or r['investigation_id']}: {r['title']}. [[ev:{r['evidence_id']}]]"
                    for r in results
                )
                + "\n\n## Limits of the evidence\nRanking is retrieval relevance, not evidence strength or certification. Detector performance requires investigation-specific measurements and publications. This walkthrough makes no quantitative detection claim."
            )
        answer = validate(text, tools.ledger.items)
        emit("text.completed", answer=answer)
        emit(
            "turn.completed",
            usage={"input_tokens": 0, "cached_tokens": 0, "output_tokens": 0},
            cost_usd=0.0,
            latency_ms=0,
        )
        meta = {
            "replay_id": scenario,
            "title": title,
            "question": question,
            "recorded_at": now(),
            "model": None,
            "scenario": scenario,
            "origin": "scripted_deterministic",
            "si_generated": True,
            "build_version": "0.1.0",
            "bundle_sha256": bundle.manifest["bundle_sha256"],
        }
        (folder / (scenario + ".json")).write_text(
            canonical({"meta": meta, "events": events}), encoding="utf-8"
        )
    print("Recorded 3 scripted deterministic evidence demonstrations (no model execution).")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["retrieval", "demos"])
    parser.add_argument("--split", choices=["dev", "test", "both"], default="both")
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Disable paid embeddings even when .env contains a key",
    )
    args = parser.parse_args()
    retrieval(args.split, args.offline) if args.command == "retrieval" else demos()


if __name__ == "__main__":
    main()

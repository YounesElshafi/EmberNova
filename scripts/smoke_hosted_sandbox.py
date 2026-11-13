"""Verify the selected hosted execution boundary before enabling Analysis Lab."""

import json

from embernova.config import settings
from embernova.provenance import canonical, now
from openai import OpenAI

cfg = settings()
report = {
    "checked_at": now(),
    "model": cfg.agent_model,
    "verified": False,
    "memory_limit": None,
    "network_disabled": False,
    "code_executed": False,
}
container = None
try:
    with OpenAI(
        api_key=cfg.openai_api_key.get_secret_value(), timeout=90, max_retries=0
    ) as client:
        try:
            container = client.containers.create(
                name="embernova-isolation-verification",
                memory_limit="1g",
                network_policy={"type": "disabled"},
                expires_after={"anchor": "last_active_at", "minutes": 20},
            )
            report["memory_limit"] = container.memory_limit
            report["network_disabled"] = container.network_policy.type == "disabled"
            if container.memory_limit != "1g" or not report["network_disabled"]:
                raise ValueError("Provider did not confirm required isolation policy")
            response = client.responses.create(
                model=cfg.agent_model,
                tools=[{"type": "code_interpreter", "container": container.id}],
                tool_choice="required",
                input='Use the Python tool to verify that OPENAI_API_KEY is absent from the environment and write /mnt/data/result.json containing {"ok": true, "host_key_absent": true} only if the environment has no OPENAI_API_KEY. Do not print any environment values. This is an isolation smoke test, not scientific evidence.',
                max_output_tokens=1000,
            )
            report["code_executed"] = any(
                item.type == "code_interpreter_call" and item.status == "completed"
                for item in response.output
            )
            files = list(client.containers.files.list(container.id))
            output = next(f for f in files if f.path.endswith("/result.json"))
            result = json.loads(
                client.containers.files.content.retrieve(
                    output.id, container_id=container.id
                ).content
            )
            report["verified"] = bool(
                report["code_executed"]
                and result == {"ok": True, "host_key_absent": True}
            )
        finally:
            if container:
                client.containers.delete(container.id)
                report["container_deleted"] = True
except Exception as exc:  # noqa: BLE001 - Report exception type only; never leak provider bodies or credentials.
    report["blocker"] = type(exc).__name__ + (
        f" HTTP {exc.status_code}" if hasattr(exc, "status_code") else ""
    )
(cfg.build_dir / "eval/sandbox_smoke.json").write_text(
    canonical(report), encoding="utf-8"
)
print(json.dumps(report, indent=2))

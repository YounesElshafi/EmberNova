import json

import pytest
from fastapi.testclient import TestClient

from embernova.config import ROOT, Settings
from embernova.main import create_app
from embernova.science.bundle import Bundle
from embernova.storage import Store
from embernova.tools import Tools


@pytest.fixture(scope="session")
def cfg(tmp_path_factory):
    return Settings(_env_file=None, openai_api_key=None, state_dir=tmp_path_factory.mktemp("state"))


@pytest.fixture(scope="session")
def bundle(cfg):
    if not (cfg.build_dir / "knowledge.db").exists():
        pytest.fail("Build the real NASA corpus first: embernova-build all")
    return Bundle(cfg)


@pytest.fixture
def store(cfg):
    return Store(cfg)


@pytest.fixture
def tools(store, bundle):
    return Tools(store, bundle)


@pytest.fixture
def client(cfg):
    with TestClient(create_app(cfg)) as test_client:
        yield test_client


@pytest.fixture
def schemas():
    return {
        name: json.loads((ROOT / f"docs/architecture/contracts/{name}.schema.json").read_text())
        for name in ["artifact", "evidence", "sse_events"]
    }

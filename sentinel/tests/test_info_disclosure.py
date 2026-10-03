from unittest.mock import MagicMock, patch

from scanner.checks.info_disclosure import analyse_info_disclosure
from scanner.engine.http_client import HttpObservation


def test_powered_by_header():
    obs = HttpObservation(
        requested_url="https://example.com",
        final_url="https://example.com/",
        status_code=200,
        headers={"x-powered-by": "Express"},
        cookies=[],
    )
    mock_response = MagicMock(status_code=404, text="", content=b"")
    with patch("scanner.checks.info_disclosure.httpx.Client") as client_cls:
        client_cls.return_value.__enter__.return_value.get.return_value = mock_response
        findings = analyse_info_disclosure(obs)
    assert any("X-Powered-By" in f.title for f in findings)

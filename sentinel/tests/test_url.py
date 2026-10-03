import pytest

from scanner.engine.url import UrlValidationError, host_from_url, validate_and_normalise_url


def test_normalises_bare_host():
    assert validate_and_normalise_url("example.com") == "https://example.com/"


def test_rejects_credentials():
    with pytest.raises(UrlValidationError):
        validate_and_normalise_url("https://user:pass@example.com")


def test_rejects_bad_scheme():
    with pytest.raises(UrlValidationError):
        validate_and_normalise_url("ftp://example.com")


def test_host_from_url():
    assert host_from_url("https://Example.COM:443/path") == "example.com"

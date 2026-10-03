from unittest.mock import patch

from scanner.engine.email_auth import apex_from_host, lookup_email_auth


def test_apex_from_host():
    assert apex_from_host("www.sogki.dev") == "sogki.dev"
    assert apex_from_host("sogki.dev") == "sogki.dev"


def test_lookup_email_auth_parses_records():
    def fake_txt(name: str) -> list[str]:
        if name == "example.com":
            return ["v=spf1 include:_spf.google.com ~all"]
        if name == "_dmarc.example.com":
            return ["v=DMARC1; p=none; rua=mailto:dmarc@example.com"]
        if name == "google._domainkey.example.com":
            return ["v=DKIM1; k=rsa; p=abc"]
        return []

    with patch("scanner.engine.email_auth._txt_records", side_effect=fake_txt):
        result = lookup_email_auth("www.example.com")

    assert result["apex"] == "example.com"
    assert result["spf"]["present"] is True
    assert result["dmarc"]["present"] is True
    assert result["dkim"]["present"] is True
    assert result["issues"] == []

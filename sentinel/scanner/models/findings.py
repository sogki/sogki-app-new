from dataclasses import dataclass, field
from typing import Literal

Severity = Literal["critical", "high", "medium", "low", "informational"]


@dataclass
class FindingDraft:
    title: str
    severity: Severity
    category: str
    description: str
    evidence: str = ""
    impact: str = ""
    remediation: str = ""
    references: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "severity": self.severity,
            "category": self.category,
            "description": self.description,
            "evidence": self.evidence,
            "impact": self.impact,
            "remediation": self.remediation,
            "references": list(self.references),
        }

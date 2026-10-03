# Sentinel Security Score

The **Sentinel Security Score** is an internal prioritisation metric used only inside this private tool.

It is **not**:

- CVSS
- A penetration-test grade
- An industry certification score

## Calculation

Start at **100**.

| Severity        | Deduction per finding |
|-----------------|-----------------------|
| Critical        | 25                    |
| High            | 15                    |
| Medium          | 8                     |
| Low             | 3                     |
| Informational   | 0                     |

Positive informational observations (for example HTTPS reachable, useful security headers present) may add up to **+5** credit.

Final score is clamped to **0–100**. The same findings always produce the same score.

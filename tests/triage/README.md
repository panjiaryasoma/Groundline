# Triage acceptance tests

P-03 converts the frozen `TRIAGE-001…008` documents into executable tests.

Rules:
- expected fixture states are copied from the contract;
- test expectations must not be weakened to make implementation pass;
- scores are operational prioritization values, never truth/confidence;
- semantic ratings are structured inputs in P-03, not inferred by a hidden free-form text oracle.

Expected suite result: **8/8 acceptance cases PASS**.

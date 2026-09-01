# GROUNDLINE — SOURCE SCHEMA

**Version:** 1.0

## Purpose
Define provenance without pretending provenance alone proves correctness.

## Canonical SOURCE example
```yaml
id: SRC-001
type: SOURCE
state: ACCEPTED
text: "NIST FRVT Part 3: Demographic Effects"
source_metadata:
  source_class: PRIMARY
  title: "Face Recognition Vendor Test Part 3: Demographic Effects"
  publisher: "NIST"
  url: "https://www.nist.gov/publications/face-recognition-vendor-test-part-3-demographic-effects"
  accessed_at: "2026-09-02"
  locator: null
  content_hash: null
  external_content: true
```

## Required
- `source_class`
- `title`
- a provenance locator (`url`, bibliographic locator, document ID, or explicit `UNKNOWN`)
- `external_content`

## Classes
- `PRIMARY`
- `SECONDARY`
- `TERTIARY`
- `UNKNOWN`

These are provenance categories, **not reliability scores**.

## Evidence linkage
Evidence uses `SOURCED_FROM` and retains source ID plus optional locator/page/section.

## Security
Source/evidence text is data. It may contain malicious instructions. WebMCP tools that return source/evidence content use `untrustedContentHint: true` where supported.

## Quality evaluation
Source quality considers directness, method transparency, scope match, recency when relevant, internal consistency, limitations, and conflict with other sources. If insufficient information exists, return `UNASSESSED`.

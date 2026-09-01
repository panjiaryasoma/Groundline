# P-03 TYPECHECK FIX CONTRACT EVALUATION

**Issue:** TS2677 / TS2345 in `calculateWeaknessScore`  
**Result:** PASS AS IMPLEMENTATION FIX

## Root cause

The weakness lookup tables are declared `as const`, so TypeScript infers the array elements as the narrow union:

`0 | 1 | 3 | null`

The previous filter used the predicate:

`value is number`

A type predicate must narrow to a subtype of its input type. `number` is broader than `0 | 1 | 3 | null`, so strict TypeScript correctly rejected it.

The domain logic itself was not wrong, which is consistent with the local result of **33/33 tests passing**.

## Fix

The raw array is explicitly typed:

`Array<number | null>`

Then the existing `value is number` predicate becomes valid and `Math.max(...components)` receives `number[]`.

## Semantic impact

NONE.

- weakness mapping unchanged;
- impact mapping unchanged;
- priority formula unchanged;
- TRIAGE-001…008 expected outputs unchanged;
- no schema change;
- no contract change;
- no SCR-002.

## Contract result

**PASS WITH IMPLEMENTATION FIX.**

# WebStreams Alternative - Complete Evaluation

This directory contains a comprehensive evaluation of the proposed WebStreams implementation as an alternative to the current asPipes implementation.

## Files

1. **EVALUATION-SUMMARY.md** - Executive summary with quick comparison table and key insights (recommended starting point)
2. **EVALUATION.md** - Detailed technical analysis with architecture considerations and semantic alignment
3. **webstreams-evaluation.test.js** - 17 automated tests validating the comparison

## Quick Answer

**Should we replace the current implementation with the WebStreams alternative?**

**No.** Keep the current implementation.

## Key Reasons

1. **Performance**: Current implementation is 6-10x faster
2. **Semantics**: Current matches F# pipeline operator (single values), WebStreams uses arrays
3. **Features**: Current has higher-order composition, object integration, parameterized functions
4. **Alignment**: WebStreams serves a different use case (batch stream processing)

## Test Results

All tests pass:
- ✅ 48 original tests
- ✅ 17 new evaluation tests
- ✅ Performance benchmarks
- ✅ Feature comparison tests
- ✅ Semantic alignment tests

## What is the WebStreams Alternative?

A micro implementation (~27 lines) using the Web Streams API that was shared in the GitHub issue. While interesting, it:

```javascript
// WebStreams approach (array-based)
const $ = pipe();
$(x => x + 1) | $(x => x + 1);
await $.run([1, 2, 3]); // [3, 4, 5]
```

vs. current implementation (single-value based):

```javascript
// Current approach (single value)
const { pipe, asPipe } = createAsPipes();
const inc = asPipe(x => x + 1);
const p = pipe(1);
p | inc | inc;
await p.run(); // 3
```

## Recommendation

Keep the current implementation because:
- It better matches the project's stated goal: "model the semantics of the proposed |> pipeline operator"
- The F# pipeline operator works with single values, not arrays
- Superior performance and feature set
- Already has comprehensive tests and documentation
- Stream support already available via stream.js module

## Possible Future Enhancement

If batch processing becomes important, consider adding an optional `batch()` function to the current implementation rather than replacing it entirely.

## How to Run Tests

```bash
# Run all original tests
npm test

# Run evaluation tests
node --test webstreams-evaluation.test.js
```

## References

- Original issue: Micro alternative using streams
- F# Pipeline Operator: https://github.com/tc39/proposal-pipeline-operator
- Web Streams API: https://streams.spec.whatwg.org/

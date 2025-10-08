# asPipes: working pipelines today in pure JavaScript

## 1 Summary

asPipes is an experimental runtime abstraction that models the semantics of the proposed |> pipeline operator, implemented entirely in standard JavaScript (ES2020+).
It demonstrates that pipeline-style composition can be expressed using the existing coercion semantics of the bitwise OR operator (|) and Symbol.toPrimitive.

The implementation is small (<50 lines) and supports both synchronous and asynchronous evaluation with a familiar syntax:

```javascript
const greeting = pipe('hello');

greeting 
  | upper 
  | ex('!!!');

await greeting.run(); // → "HELLO!!!"
```

## Installation

```bash
npm install aspipes
```

```javascript
import { createAsPipes } from 'aspipes';
```

⸻

## 2 Motivation

The pipeline operator proposal (tc39/proposal-pipeline-operator) has been under discussion for several years, exploring multiple variants (F#, Smart, Hack, etc.).
The asPipes experiment aims to:

- prototype F#-style semantics directly in today’s JavaScript;
- study ergonomics and readability in real-world code;
- show that deferred, referentially transparent composition can be achieved without syntax extensions; and
- inform the design conversation with practical, user-level feedback.

⸻

## 3 Design Goals

- ✅ Composable — each transformation behaves like a unary function of the previous result.
- ✅ Deferred — no execution until .run() is called.
- ✅ Async-safe — promises and async functions are first-class citizens.
- ✅ Stateless — no global mutation; every pipeline owns its own context.
- ✅ Ergonomic — visually aligns with the future |> operator.

⸻

## 4 Core API

### Installation and Import

```bash
npm install aspipes
```

```javascript
import { createAsPipes } from 'aspipes';
```

### createAsPipes()

Creates an isolated pipeline environment and returns:

```javascript
{
  pipe, // begin a pipeline
  asPipe // lift a function into a pipeable form
}
```

pipe(initialValue)

Begins a new pipeline with initialValue.
The returned object intercepts | operations via Symbol.toPrimitive.
Call .run() to evaluate and retrieve the final result (async).

asPipe(fn)

Wraps a function fn so that it can be used in a pipeline:

```javascript
const upper = asPipe((s) => s.toUpperCase());
const ex = asPipe((s, mark = '!') => s + mark);
```

Pipeable functions can also be called with arguments:

```javascript
pipe('hello') 
  | upper 
  | ex('!!!');
```

.run()

Evaluates the accumulated transformations sequentially, returning a Promise of the final value.

## 5 Examples

**A. String pipeline**

```javascript
import { createAsPipes } from 'aspipes';

const { pipe, asPipe } = createAsPipes();

const upper = asPipe((s) => s.toUpperCase());
const ex = asPipe((s, mark = '!') => s + mark);

const greeting = pipe('hello');
greeting 
  | upper 
  | ex('!!!');
  
console.log(await greeting.run()); // "HELLO!!!"
```

**B. Numeric pipeline**

```javascript
import { createAsPipes } from 'aspipes';

const { pipe, asPipe } = createAsPipes();

const inc = asPipe((x) => x + 1);
const mul = asPipe((x, k) => x * k);

const calc = pipe(3);
calc 
  | inc 
  | mul(10);

console.log(await calc.run()); // 40
```

**C. Async composition (LLM API call)**

```javascript
import { createAsPipes } from 'aspipes';

const { pipe, asPipe } = createAsPipes();

const postJson = asPipe((url, body, headers = {}) =>
  fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }),
);
const toJson = asPipe((r) => r.json());
const pick = asPipe((o, ...keys) => keys.reduce((a, k) => a?.[k], o));
const trim = asPipe((s) => (typeof s === 'string' ? s.trim() : s));

const ENDPOINT = 'https://api.berget.ai/v1/chat/completions';
const BODY = {
  model: 'gpt-oss',
  messages: [
    { role: 'system', content: 'Reply briefly.' },
    { role: 'user', content: 'Write a haiku about mountains.' },
  ],
};

const haiku = pipe(ENDPOINT);
haiku 
| postJson(BODY) 
| toJson 
| pick('choices', 0, 'message', 'content') 
| trim;
console.log(await haiku.run());
```

**D. Composable pipes (Higher-Order Pipes)**

Pipes can be composed into reusable, named higher-order pipes by wrapping them with `asPipe`. The implementation automatically detects and executes pipeline expressions, enabling clean, direct syntax:

```javascript
import { createAsPipes } from 'aspipes';

const { pipe, asPipe } = createAsPipes();

// Assume postJson, toJson, pick, trim are defined (see example C)

// Create reusable bot operations
const askBot = asPipe((question) => {
  const p = pipe('https://api.berget.ai/v1/chat/completions');
  p 
  | postJson({
      model: 'gpt-oss',
      messages: [{ role: 'user', content: question }],
    }) 
  | toJson 
  | pick('choices', 0, 'message', 'content') 
  | trim;
  return p;
});

const summarize = asPipe((text) => {
  const p = pipe('https://api.berget.ai/v1/chat/completions');
  p 
  | postJson({
      model: 'gpt-oss',
      messages: [
        { role: 'system', content: 'Summarize in one sentence.' },
        { role: 'user', content: text },
      ],
    }) 
  | toJson 
  | pick('choices', 0, 'message', 'content') 
  | trim;
  return p;
});

// Compose an agent that chains multiple bot operations
const researchAgent = asPipe((topic) => {
  const p = pipe(`Research topic: ${topic}`);
  p 
    | askBot 
    | summarize;
  return p;
});

// Use the composed agent in a pipeline
const result = pipe('quantum computing');
result 
  | researchAgent;

console.log(await result.run());
// First asks bot about quantum computing, then summarizes the response
```

This pattern demonstrates:

- **Composability**: Small pipes (`askBot`, `summarize`) combine into larger ones (`researchAgent`)
- **Abstraction**: Complex multi-step operations hidden behind simple interfaces
- **Reusability**: Each composed pipe can be used independently or as part of larger workflows

**E. Stream processing with async generators (Functional Reactive Programming)**

The asPipes library includes stream support for working with async generators, enabling functional reactive programming patterns:

```javascript
import { createAsPipes } from 'aspipes';
import { createStreamPipes, eventStream } from 'aspipes/stream.js';

const { pipe, asPipe } = createAsPipes();
const { map, filter, take, scan } = createStreamPipes(asPipe);

// Process an endless stream of events
async function* eventGenerator() {
  let id = 0;
  while (true) {
    yield { id: id++, type: id % 3 === 0 ? 'special' : 'normal' };
  }
}

// Take first 3 "special" events
const result = pipe(eventGenerator());
result 
  | filter((e) => e.type === 'special') 
  | map((e) => e.id) 
  | take(3);

const stream = await result.run();
for await (const id of stream) {
  console.log(id); // 0, 3, 6
}
```

**F. Mouse event stream processing**

```javascript
// Simulate mouse drag tracking
const events = [
  { type: 'mousedown', x: 10, y: 10 },
  { type: 'mousemove', x: 15, y: 15 },
  { type: 'mousemove', x: 20, y: 20 },
  { type: 'mouseup', x: 20, y: 20 },
];

let isDragging = false;
const trackDrag = (e) => {
  if (e.type === 'mousedown') isDragging = true;
  if (e.type === 'mouseup') isDragging = false;
  return isDragging && e.type === 'mousemove';
};

const result = pipe(eventStream(events));
result 
  | filter(trackDrag) 
  | map((e) => ({ x: e.x, y: e.y }));

const stream = await result.run();
const positions = [];
for await (const pos of stream) {
  positions.push(pos); // [{ x: 15, y: 15 }, { x: 20, y: 20 }]
}
```

**Stream Functions**

The `stream.js` module provides these generator-based aspipe functions:

- **map(iterable, fn)** - Transform each item in the stream
- **filter(iterable, predicate)** - Filter items based on a condition
- **take(iterable, n)** - Take the first n items from a stream
- **scan(iterable, reducer, initial)** - Accumulate values, yielding intermediate results
- **reduce(iterable, reducer, initial)** - Reduce stream to a single value

These functions work seamlessly with async generators, enabling reactive patterns like waiting for specific events in an endless stream.


## 6 Reference Implementation

```javascript
export function createAsPipes() {
  const stack = [];

  const asPipe = (fn) =>
    new Proxy(function () {}, {
      get(_, prop) {
        if (prop === Symbol.toPrimitive)
          return () => (
            stack.at(-1).steps.push(async (v) => {
              const stackLengthBefore = stack.length;
              const result = await Promise.resolve(fn(v));

              // If a new pipeline was created during fn execution and result is 0
              if (result === 0 && stack.length > stackLengthBefore) {
                // Get the pipeline that was created and execute it
                const pipelineCtx = stack[stack.length - 1];
                stack.pop(); // Remove from stack as we're executing it
                return await pipelineCtx.steps.reduce(
                  (p, f) => p.then(f),
                  Promise.resolve(pipelineCtx.v),
                );
              }

              // If the function returns a pipeline token, execute it automatically
              if (result && typeof result.run === 'function') {
                return await result.run();
              }
              return result;
            }),
            0
          );
      },
      apply(_, __, args) {
        const t = function () {};
        t[Symbol.toPrimitive] = () => (
          stack.at(-1).steps.push(async (v) => {
            const stackLengthBefore = stack.length;
            const result = await Promise.resolve(fn(v, ...args));

            // If a new pipeline was created during fn execution and result is 0
            if (result === 0 && stack.length > stackLengthBefore) {
              // Get the pipeline that was created and execute it
              const pipelineCtx = stack[stack.length - 1];
              stack.pop(); // Remove from stack as we're executing it
              return await pipelineCtx.steps.reduce(
                (p, f) => p.then(f),
                Promise.resolve(pipelineCtx.v),
              );
            }

            // If the function returns a pipeline token, execute it automatically
            if (result && typeof result.run === 'function') {
              return await result.run();
            }
            return result;
          }),
          0
        );
        return t;
      },
    });

  const pipe = (x) => {
    const ctx = { v: x, steps: [] };
    const token = {
      [Symbol.toPrimitive]: () => (stack.push(ctx), 0),
      async run() {
        return ctx.steps.reduce((p, f) => p.then(f), Promise.resolve(ctx.v));
      },
    };
    return token;
  };

  return { pipe, asPipe };
}
```

## 7 Semantics

Each pipe() call creates a private evaluation context { v, steps[] }.
Every pipeable function registers a transformation when coerced by |.
.run() folds the step list into a promise chain:

```
value₀ → step₁(value₀) → step₂(value₁) → … → result
```

Each step may return either a value or a promise.
Evaluation order is strict left-to-right, with promise resolution between steps.

⸻

## 8 Motivation and Design Notes

Why use Symbol.toPrimitive?
Because bitwise operators force primitive coercion and can be intercepted per-object, giving a hook for sequencing without syntax modification.

Why | and not || or &?
| is the simplest binary operator that (a) performs coercion on both operands, and (b) yields a valid runtime expression chain.

Why explicit .run()?
It makes side effects explicit, keeps the evaluation lazy, and aligns with functional semantics (like Observable.subscribe() or Task.run()).

Limitations:

- Doesn’t support arbitrary expressions on the right-hand side (only pipeable tokens).
- Overuse may confuse tooling or linters.
- Purely demonstrative — not intended for production.

⸻

## 9 Open Questions

1. Could a future ECMAScript grammar support a similar deferred evaluation model natively?
2. What would static analyzers and TypeScript need to infer such pipeline types?
3. Can the |> proposal benefit from runtime experiments like this to clarify ergonomics?
4. Should .run() be implicit (auto-executed) or always explicit?

⸻

## 10 Conclusion

asPipes is not a syntax proposal but a runtime prototype — a living example of how far JavaScript can stretch to approximate future language constructs using only what’s already standardized.

It demonstrates that:

- The semantics of pipelines are composable and ergonomic in practice.
- Async behavior integrates naturally.
- The readability and cognitive flow of |> syntax can be validated today.

⸻

## 11 License

MIT © 2025
This document is non-normative and intended for exploration and discussion within the JavaScript community.

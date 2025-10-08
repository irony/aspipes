import { createAsPipes } from './index.js';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

test('basic example', async () => {
  const { pipe, asPipe } = createAsPipes();
  const upper = asPipe((s) => s.toUpperCase());

  const result = pipe('hello');
  result | upper;
  assert.equal(await result.run(), 'HELLO');
});

test('createAsPipes returns pipe and asPipe functions', () => {
  const { pipe, asPipe } = createAsPipes();
  assert.equal(typeof pipe, 'function');
  assert.equal(typeof asPipe, 'function');
});

test('basic string pipeline - uppercase', async () => {
  const { pipe, asPipe } = createAsPipes();
  const upper = asPipe((s) => s.toUpperCase());

  const result = pipe('hello');
  result | upper;
  assert.equal(await result.run(), 'HELLO');
});

test('string pipeline with multiple operations', async () => {
  const { pipe, asPipe } = createAsPipes();
  const upper = asPipe((s) => s.toUpperCase());
  const ex = asPipe((s, mark = '!') => s + mark);

  const greeting = pipe('hello');
  greeting | upper | ex('!!!');
  assert.equal(await greeting.run(), 'HELLO!!!');
});

test('string pipeline with default parameter', async () => {
  const { pipe, asPipe } = createAsPipes();
  const upper = asPipe((s) => s.toUpperCase());
  const ex = asPipe((s, mark = '!') => s + mark);

  const greeting = pipe('hello');
  greeting | upper | ex();
  assert.equal(await greeting.run(), 'HELLO!');
});

test('numeric pipeline - increment', async () => {
  const { pipe, asPipe } = createAsPipes();
  const inc = asPipe((x) => x + 1);

  const result = pipe(5);
  result | inc;
  assert.equal(await result.run(), 6);
});

test('numeric pipeline with multiplication', async () => {
  const { pipe, asPipe } = createAsPipes();
  const inc = asPipe((x) => x + 1);
  const mul = asPipe((x, k) => x * k);

  const calc = pipe(3);
  calc | inc | mul(10);
  assert.equal(await calc.run(), 40);
});

test('async pipeline', async () => {
  const { pipe, asPipe } = createAsPipes();
  const asyncDouble = asPipe(async (x) => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(x * 2), 10);
    });
  });

  const result = pipe(5);
  result | asyncDouble;
  assert.equal(await result.run(), 10);
});

test('mixed sync and async pipeline', async () => {
  const { pipe, asPipe } = createAsPipes();
  const inc = asPipe((x) => x + 1);
  const asyncDouble = asPipe(async (x) => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(x * 2), 10);
    });
  });
  const add = asPipe((x, y) => x + y);

  const result = pipe(5);
  result | inc | asyncDouble | add(3);
  assert.equal(await result.run(), 15); // (5 + 1) * 2 + 3 = 15
});

test('object pipeline', async () => {
  const { pipe, asPipe } = createAsPipes();
  const addProperty = asPipe((obj, key, value) => ({ ...obj, [key]: value }));

  const result = pipe({});
  result | addProperty('name', 'John') | addProperty('age', 30);
  const final = await result.run();

  assert.equal(final.name, 'John');
  assert.equal(final.age, 30);
});

test('array pipeline', async () => {
  const { pipe, asPipe } = createAsPipes();
  const map = asPipe((arr, fn) => arr.map(fn));
  const filter = asPipe((arr, fn) => arr.filter(fn));

  const result = pipe([1, 2, 3, 4, 5]);
  result | map((x) => x * 2) | filter((x) => x > 5);

  const final = await result.run();
  assert.deepEqual(final, [6, 8, 10]);
});

test('pick function for nested object access', async () => {
  const { pipe, asPipe } = createAsPipes();
  const pick = asPipe((o, ...keys) => keys.reduce((a, k) => a?.[k], o));

  const obj = {
    user: {
      profile: {
        name: 'Alice',
      },
    },
  };

  const result = pipe(obj);
  result | pick('user', 'profile', 'name');
  assert.equal(await result.run(), 'Alice');
});

test('trim function', async () => {
  const { pipe, asPipe } = createAsPipes();
  const trim = asPipe((s) => (typeof s === 'string' ? s.trim() : s));

  const result = pipe('  hello  ');
  result | trim;
  assert.equal(await result.run(), 'hello');
});

test('trim function with non-string', async () => {
  const { pipe, asPipe } = createAsPipes();
  const trim = asPipe((s) => (typeof s === 'string' ? s.trim() : s));

  const result = pipe(42);
  result | trim;
  assert.equal(await result.run(), 42);
});

test('isolated pipeline contexts', async () => {
  const { pipe, asPipe } = createAsPipes();
  const inc = asPipe((x) => x + 1);

  const pipeline1 = pipe(10);
  const pipeline2 = pipe(20);
  pipeline1 | inc;
  pipeline2 | inc;

  assert.equal(await pipeline1.run(), 11);
  assert.equal(await pipeline2.run(), 21);
});

test('multiple isolated environments', async () => {
  const env1 = createAsPipes();
  const env2 = createAsPipes();

  const inc1 = env1.asPipe((x) => x + 1);
  const inc2 = env2.asPipe((x) => x + 2);

  const result1 = env1.pipe(10);
  const result2 = env2.pipe(10);
  result1 | inc1;
  result2 | inc2;

  assert.equal(await result1.run(), 11);
  assert.equal(await result2.run(), 12);
});

test('complex pipeline with multiple transformations', async () => {
  const { pipe, asPipe } = createAsPipes();

  const upper = asPipe((s) => s.toUpperCase());
  const split = asPipe((s, delim) => s.split(delim));
  const filter = asPipe((arr, fn) => arr.filter(fn));
  const join = asPipe((arr, delim) => arr.join(delim));

  const result = pipe('hello world test');
  result | upper | split(' ') | filter((w) => w.length > 4) | join('-');

  assert.equal(await result.run(), 'HELLO-WORLD');
});

test('error propagation in pipeline', async () => {
  const { pipe, asPipe } = createAsPipes();
  const throwError = asPipe(() => {
    throw new Error('Test error');
  });

  const result = pipe(5);
  result | throwError;

  await assert.rejects(async () => await result.run(), {
    message: 'Test error',
  });
});

test('promise rejection propagation', async () => {
  const { pipe, asPipe } = createAsPipes();
  const rejectPromise = asPipe(async () => {
    throw new Error('Async error');
  });

  const result = pipe(5);
  result | rejectPromise;

  await assert.rejects(async () => await result.run(), {
    message: 'Async error',
  });
});

test('identity pipeline', async () => {
  const { pipe } = createAsPipes();
  const result = pipe(42);
  assert.equal(await result.run(), 42);
});

test('chaining with zero arguments', async () => {
  const { pipe, asPipe } = createAsPipes();
  const negate = asPipe((x) => -x);

  const result = pipe(5);
  result | negate;
  assert.equal(await result.run(), -5);
});

test('pipeline with boolean values', async () => {
  const { pipe, asPipe } = createAsPipes();
  const not = asPipe((x) => !x);

  const result = pipe(true);
  result | not;
  assert.equal(await result.run(), false);
});

test('pipeline with null/undefined handling', async () => {
  const { pipe, asPipe } = createAsPipes();
  const defaultValue = asPipe((x, def) => x ?? def);

  const result1 = pipe(null);
  result1 | defaultValue('default');
  assert.equal(await result1.run(), 'default');

  const result2 = pipe(undefined);
  result2 | defaultValue('default');
  assert.equal(await result2.run(), 'default');

  const result3 = pipe('value');
  result3 | defaultValue('default');
  assert.equal(await result3.run(), 'value');
});

test('composable pipes - higher-order pipe composition', async () => {
  const { pipe, asPipe } = createAsPipes();

  // Basic building blocks
  const add = asPipe((x, n) => x + n);
  const multiply = asPipe((x, n) => x * n);
  const square = asPipe((x) => x * x);

  // Create a composed pipe - clean syntax without variable assignment
  const complexCalc = asPipe((value) => {
    const p = pipe(value);
    p | add(5) | multiply(2) | square;
    return p;
  });

  // Use the composed pipe in a new pipeline
  const finalResult = pipe(3);
  finalResult | complexCalc;

  // (3 + 5) * 2 = 16, then 16^2 = 256
  assert.equal(await finalResult.run(), 256);
});

test('composable pipes - bot-like pattern with mock data', async () => {
  const { pipe, asPipe } = createAsPipes();

  // Mock fetch-like operations
  const postJson = asPipe((data, body) => ({
    ...data,
    response: { result: body.input.toUpperCase() },
  }));
  const extract = asPipe((data, key) => data.response[key]);
  const trim = asPipe((s) => (typeof s === 'string' ? s.trim() : s));

  // Compose a reusable bot pipe - clean direct syntax
  const botPipe = asPipe((endpoint, payload) => {
    const p = pipe(endpoint);
    p | postJson(payload) | extract('result') | trim;
    return p;
  });

  // Use the composed bot pipe in a pipeline
  const response = pipe({ url: 'mock-api', data: {} });
  response | botPipe({ input: '  hello world  ' });

  assert.equal(await response.run(), 'HELLO WORLD');
});

test('composable pipes - pipe used directly as operator', async () => {
  const { pipe, asPipe } = createAsPipes();

  const add = asPipe((x, n) => x + n);
  const mul = asPipe((x, n) => x * n);

  // Create a composable pipe using direct pipeline expression
  const calculate = asPipe((value) => {
    const p = pipe(value);
    p | add(10) | mul(2);
    return p;
  });

  // Use in a larger pipeline
  const final = pipe(5);
  final | calculate | add(100);

  // (5 + 10) * 2 = 30, then 30 + 100 = 130
  assert.equal(await final.run(), 130);
});

test('asPipe with Math object - destructuring methods', async () => {
  const { pipe, asPipe } = createAsPipes();
  
  const { sqrt, floor, abs } = asPipe(Math);

  const result = pipe(16.7);
  result | sqrt | floor | abs;
  
  // sqrt(16.7) ≈ 4.087, floor(4.087) = 4, abs(4) = 4
  assert.equal(await result.run(), 4);
});

test('asPipe with custom object - all methods become pipeable', async () => {
  const { pipe, asPipe } = createAsPipes();
  
  const calculator = {
    add(x, n) { return x + n; },
    multiply(x, n) { return x * n; },
    square(x) { return x * x; }
  };
  
  const { add, multiply, square } = asPipe(calculator);

  const result = pipe(3);
  result | add(2) | multiply(4) | square;
  
  // (3 + 2) * 4 = 20, then 20^2 = 400
  assert.equal(await result.run(), 400);
});

test('asPipe with object - non-function properties accessible', async () => {
  const { asPipe } = createAsPipes();
  
  const obj = {
    value: 42,
    getName() { return 'test'; }
  };
  
  const wrapped = asPipe(obj);
  
  assert.equal(wrapped.value, 42);
  assert.equal(typeof wrapped.getName, 'function');
});


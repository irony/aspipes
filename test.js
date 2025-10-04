import { createAsPipes } from './index.js';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

test('createAsPipes returns pipe and asPipe functions', () => {
  const { pipe, asPipe } = createAsPipes();
  assert.equal(typeof pipe, 'function');
  assert.equal(typeof asPipe, 'function');
});

test('basic string pipeline - uppercase', async () => {
  const { pipe, asPipe } = createAsPipes();
  const upper = asPipe(s => s.toUpperCase());
  
  let result;
  (result = pipe('hello')) | upper;
  assert.equal(await result.run(), 'HELLO');
});

test('string pipeline with multiple operations', async () => {
  const { pipe, asPipe } = createAsPipes();
  const upper = asPipe(s => s.toUpperCase());
  const ex = asPipe((s, mark='!') => s + mark);
  
  let greeting;
  (greeting = pipe('hello')) | upper | ex('!!!');
  assert.equal(await greeting.run(), 'HELLO!!!');
});

test('string pipeline with default parameter', async () => {
  const { pipe, asPipe } = createAsPipes();
  const upper = asPipe(s => s.toUpperCase());
  const ex = asPipe((s, mark='!') => s + mark);
  
  let greeting;
  (greeting = pipe('hello')) | upper | ex();
  assert.equal(await greeting.run(), 'HELLO!');
});

test('numeric pipeline - increment', async () => {
  const { pipe, asPipe } = createAsPipes();
  const inc = asPipe(x => x + 1);
  
  let result;
  (result = pipe(5)) | inc;
  assert.equal(await result.run(), 6);
});

test('numeric pipeline with multiplication', async () => {
  const { pipe, asPipe } = createAsPipes();
  const inc = asPipe(x => x + 1);
  const mul = asPipe((x, k) => x * k);
  
  let calc;
  (calc = pipe(3)) | inc | mul(10);
  assert.equal(await calc.run(), 40);
});

test('async pipeline', async () => {
  const { pipe, asPipe } = createAsPipes();
  const asyncDouble = asPipe(async x => {
    return new Promise(resolve => {
      setTimeout(() => resolve(x * 2), 10);
    });
  });
  
  let result;
  (result = pipe(5)) | asyncDouble;
  assert.equal(await result.run(), 10);
});

test('mixed sync and async pipeline', async () => {
  const { pipe, asPipe } = createAsPipes();
  const inc = asPipe(x => x + 1);
  const asyncDouble = asPipe(async x => {
    return new Promise(resolve => {
      setTimeout(() => resolve(x * 2), 10);
    });
  });
  const add = asPipe((x, y) => x + y);
  
  let result;
  (result = pipe(5)) | inc | asyncDouble | add(3);
  assert.equal(await result.run(), 15); // (5 + 1) * 2 + 3 = 15
});

test('object pipeline', async () => {
  const { pipe, asPipe } = createAsPipes();
  const addProperty = asPipe((obj, key, value) => ({ ...obj, [key]: value }));
  
  let result;
  (result = pipe({})) | addProperty('name', 'John') | addProperty('age', 30);
  const final = await result.run();
  
  assert.equal(final.name, 'John');
  assert.equal(final.age, 30);
});

test('array pipeline', async () => {
  const { pipe, asPipe } = createAsPipes();
  const map = asPipe((arr, fn) => arr.map(fn));
  const filter = asPipe((arr, fn) => arr.filter(fn));
  
  let result;
  (result = pipe([1, 2, 3, 4, 5]))
    | map(x => x * 2)
    | filter(x => x > 5);
  
  const final = await result.run();
  assert.deepEqual(final, [6, 8, 10]);
});

test('pick function for nested object access', async () => {
  const { pipe, asPipe } = createAsPipes();
  const pick = asPipe((o, ...keys) => keys.reduce((a, k) => a?.[k], o));
  
  const obj = {
    user: {
      profile: {
        name: 'Alice'
      }
    }
  };
  
  let result;
  (result = pipe(obj)) | pick('user', 'profile', 'name');
  assert.equal(await result.run(), 'Alice');
});

test('trim function', async () => {
  const { pipe, asPipe } = createAsPipes();
  const trim = asPipe(s => typeof s === 'string' ? s.trim() : s);
  
  let result;
  (result = pipe('  hello  ')) | trim;
  assert.equal(await result.run(), 'hello');
});

test('trim function with non-string', async () => {
  const { pipe, asPipe } = createAsPipes();
  const trim = asPipe(s => typeof s === 'string' ? s.trim() : s);
  
  let result;
  (result = pipe(42)) | trim;
  assert.equal(await result.run(), 42);
});

test('isolated pipeline contexts', async () => {
  const { pipe, asPipe } = createAsPipes();
  const inc = asPipe(x => x + 1);
  
  let pipeline1, pipeline2;
  (pipeline1 = pipe(10)) | inc;
  (pipeline2 = pipe(20)) | inc;
  
  assert.equal(await pipeline1.run(), 11);
  assert.equal(await pipeline2.run(), 21);
});

test('multiple isolated environments', async () => {
  const env1 = createAsPipes();
  const env2 = createAsPipes();
  
  const inc1 = env1.asPipe(x => x + 1);
  const inc2 = env2.asPipe(x => x + 2);
  
  let result1, result2;
  (result1 = env1.pipe(10)) | inc1;
  (result2 = env2.pipe(10)) | inc2;
  
  assert.equal(await result1.run(), 11);
  assert.equal(await result2.run(), 12);
});

test('complex pipeline with multiple transformations', async () => {
  const { pipe, asPipe } = createAsPipes();
  
  const upper = asPipe(s => s.toUpperCase());
  const split = asPipe((s, delim) => s.split(delim));
  const filter = asPipe((arr, fn) => arr.filter(fn));
  const join = asPipe((arr, delim) => arr.join(delim));
  
  let result;
  (result = pipe('hello world test'))
    | upper
    | split(' ')
    | filter(w => w.length > 4)
    | join('-');
  
  assert.equal(await result.run(), 'HELLO-WORLD');
});

test('error propagation in pipeline', async () => {
  const { pipe, asPipe } = createAsPipes();
  const throwError = asPipe(() => {
    throw new Error('Test error');
  });
  
  let result;
  (result = pipe(5)) | throwError;
  
  await assert.rejects(
    async () => await result.run(),
    { message: 'Test error' }
  );
});

test('promise rejection propagation', async () => {
  const { pipe, asPipe } = createAsPipes();
  const rejectPromise = asPipe(async () => {
    throw new Error('Async error');
  });
  
  let result;
  (result = pipe(5)) | rejectPromise;
  
  await assert.rejects(
    async () => await result.run(),
    { message: 'Async error' }
  );
});

test('identity pipeline', async () => {
  const { pipe } = createAsPipes();
  const result = pipe(42);
  assert.equal(await result.run(), 42);
});

test('chaining with zero arguments', async () => {
  const { pipe, asPipe } = createAsPipes();
  const negate = asPipe(x => -x);
  
  let result;
  (result = pipe(5)) | negate;
  assert.equal(await result.run(), -5);
});

test('pipeline with boolean values', async () => {
  const { pipe, asPipe } = createAsPipes();
  const not = asPipe(x => !x);
  
  let result;
  (result = pipe(true)) | not;
  assert.equal(await result.run(), false);
});

test('pipeline with null/undefined handling', async () => {
  const { pipe, asPipe } = createAsPipes();
  const defaultValue = asPipe((x, def) => x ?? def);
  
  let result1, result2, result3;
  (result1 = pipe(null)) | defaultValue('default');
  assert.equal(await result1.run(), 'default');
  
  (result2 = pipe(undefined)) | defaultValue('default');
  assert.equal(await result2.run(), 'default');
  
  (result3 = pipe('value')) | defaultValue('default');
  assert.equal(await result3.run(), 'value');
});


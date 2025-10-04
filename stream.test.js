import { createAsPipes } from './index.js';
import { createStreamPipes, eventStream, mouseEventStream, collect } from './stream.js';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

test('stream map - transforms each item in async generator', async () => {
  const { pipe, asPipe } = createAsPipes();
  const { map } = createStreamPipes(asPipe);
  
  async function* numbers() {
    yield 1;
    yield 2;
    yield 3;
  }
  
  let result;
  (result = pipe(numbers())) | map(x => x * 2);
  const stream = await result.run();
  const items = await collect(stream);
  
  assert.deepEqual(items, [2, 4, 6]);
});

test('stream filter - filters items based on predicate', async () => {
  const { pipe, asPipe } = createAsPipes();
  const { filter } = createStreamPipes(asPipe);
  
  async function* numbers() {
    yield 1;
    yield 2;
    yield 3;
    yield 4;
    yield 5;
  }
  
  let result;
  (result = pipe(numbers())) | filter(x => x > 2);
  const stream = await result.run();
  const items = await collect(stream);
  
  assert.deepEqual(items, [3, 4, 5]);
});

test('stream take - takes first n items from stream', async () => {
  const { pipe, asPipe } = createAsPipes();
  const { take } = createStreamPipes(asPipe);
  
  async function* infiniteNumbers() {
    let i = 1;
    while (true) {
      yield i++;
    }
  }
  
  let result;
  (result = pipe(infiniteNumbers())) | take(5);
  const stream = await result.run();
  const items = await collect(stream);
  
  assert.deepEqual(items, [1, 2, 3, 4, 5]);
});

test('stream scan - yields intermediate accumulator values', async () => {
  const { pipe, asPipe } = createAsPipes();
  const { scan } = createStreamPipes(asPipe);
  
  async function* numbers() {
    yield 1;
    yield 2;
    yield 3;
    yield 4;
  }
  
  let result;
  (result = pipe(numbers())) | scan((acc, x) => acc + x, 0);
  const stream = await result.run();
  const items = await collect(stream);
  
  assert.deepEqual(items, [1, 3, 6, 10]); // Running sum
});

test('stream reduce - reduces stream to single value', async () => {
  const { pipe, asPipe } = createAsPipes();
  const { reduce } = createStreamPipes(asPipe);
  
  async function* numbers() {
    yield 1;
    yield 2;
    yield 3;
    yield 4;
  }
  
  let result;
  (result = pipe(numbers())) | reduce((acc, x) => acc + x, 0);
  const sum = await result.run();
  
  assert.equal(sum, 10);
});

test('combined stream operations - map, filter, take', async () => {
  const { pipe, asPipe } = createAsPipes();
  const { map, filter, take } = createStreamPipes(asPipe);
  
  async function* numbers() {
    let i = 1;
    while (true) {
      yield i++;
    }
  }
  
  let result;
  (result = pipe(numbers()))
    | map(x => x * 2)
    | filter(x => x > 5)
    | take(3);
  
  const stream = await result.run();
  const items = await collect(stream);
  
  assert.deepEqual(items, [6, 8, 10]);
});

test('eventStream helper - creates async generator from array', async () => {
  const events = ['click', 'move', 'drag', 'drop'];
  const stream = eventStream(events);
  const items = await collect(stream);
  
  assert.deepEqual(items, events);
});

test('mouseEventStream with filter - simulates mouse events', async () => {
  const { pipe, asPipe } = createAsPipes();
  const { filter, take } = createStreamPipes(asPipe);
  
  const events = [
    { type: 'mousemove', x: 10, y: 20 },
    { type: 'click', x: 10, y: 20 },
    { type: 'mousemove', x: 15, y: 25 },
    { type: 'click', x: 15, y: 25 },
    { type: 'mousemove', x: 20, y: 30 },
    { type: 'click', x: 20, y: 30 },
  ];
  
  let result;
  (result = pipe(mouseEventStream(events)))
    | filter(e => e.type === 'click')
    | take(2);
  
  const stream = await result.run();
  const clicks = await collect(stream);
  
  assert.equal(clicks.length, 2);
  assert.equal(clicks[0].type, 'click');
  assert.equal(clicks[1].type, 'click');
});

test('mouse drag composable - track drag movements', async () => {
  const { pipe, asPipe } = createAsPipes();
  const { filter, map, take } = createStreamPipes(asPipe);
  
  // Simulate a sequence of mouse events
  const events = [
    { type: 'mousedown', x: 10, y: 10 },
    { type: 'mousemove', x: 15, y: 15 },
    { type: 'mousemove', x: 20, y: 20 },
    { type: 'mousemove', x: 25, y: 25 },
    { type: 'mouseup', x: 25, y: 25 },
    { type: 'mousemove', x: 30, y: 30 },
  ];
  
  // Extract drag movements (between mousedown and mouseup)
  let isDragging = false;
  const trackDrag = e => {
    if (e.type === 'mousedown') isDragging = true;
    if (e.type === 'mouseup') isDragging = false;
    return isDragging && e.type === 'mousemove';
  };
  
  let result;
  (result = pipe(eventStream(events)))
    | filter(trackDrag)
    | map(e => ({ x: e.x, y: e.y }));
  
  const stream = await result.run();
  const dragPositions = await collect(stream);
  
  assert.equal(dragPositions.length, 3);
  assert.deepEqual(dragPositions[0], { x: 15, y: 15 });
  assert.deepEqual(dragPositions[1], { x: 20, y: 20 });
  assert.deepEqual(dragPositions[2], { x: 25, y: 25 });
});

test('async operations in stream pipeline', async () => {
  const { pipe, asPipe } = createAsPipes();
  const { map, take } = createStreamPipes(asPipe);
  
  async function* numbers() {
    for (let i = 1; i <= 5; i++) {
      yield i;
    }
  }
  
  // Async transformation
  const asyncDouble = async (x) => {
    return new Promise(resolve => {
      setTimeout(() => resolve(x * 2), 5);
    });
  };
  
  let result;
  (result = pipe(numbers()))
    | map(asyncDouble)
    | take(3);
  
  const stream = await result.run();
  const items = await collect(stream);
  
  assert.deepEqual(items, [2, 4, 6]);
});

test('scan with complex accumulator - track event statistics', async () => {
  const { pipe, asPipe } = createAsPipes();
  const { scan } = createStreamPipes(asPipe);
  
  const events = [
    { type: 'click', timestamp: 100 },
    { type: 'click', timestamp: 200 },
    { type: 'move', timestamp: 250 },
    { type: 'click', timestamp: 300 },
  ];
  
  const trackStats = (stats, event) => ({
    total: stats.total + 1,
    clicks: stats.clicks + (event.type === 'click' ? 1 : 0),
    lastTime: event.timestamp
  });
  
  let result;
  (result = pipe(eventStream(events)))
    | scan(trackStats, { total: 0, clicks: 0, lastTime: 0 });
  
  const stream = await result.run();
  const stats = await collect(stream);
  
  assert.equal(stats.length, 4);
  assert.equal(stats[3].total, 4);
  assert.equal(stats[3].clicks, 3);
  assert.equal(stats[3].lastTime, 300);
});

test('filter with async predicate', async () => {
  const { pipe, asPipe } = createAsPipes();
  const { filter } = createStreamPipes(asPipe);
  
  async function* numbers() {
    yield 1;
    yield 2;
    yield 3;
    yield 4;
  }
  
  const asyncIsEven = async (x) => {
    return new Promise(resolve => {
      setTimeout(() => resolve(x % 2 === 0), 1);
    });
  };
  
  let result;
  (result = pipe(numbers())) | filter(asyncIsEven);
  const stream = await result.run();
  const items = await collect(stream);
  
  assert.deepEqual(items, [2, 4]);
});

test('endless stream with take - functional reactive programming', async () => {
  const { pipe, asPipe } = createAsPipes();
  const { filter, map, take } = createStreamPipes(asPipe);
  
  // Simulate an endless stream of events
  async function* endlessEventStream() {
    let id = 0;
    while (true) {
      const currentId = id++;
      yield { id: currentId, type: currentId % 3 === 0 ? 'special' : 'normal', value: Math.random() };
    }
  }
  
  // Wait for 3 special events
  let result;
  (result = pipe(endlessEventStream()))
    | filter(e => e.type === 'special')
    | map(e => e.id)
    | take(3);
  
  const stream = await result.run();
  const specialIds = await collect(stream);
  
  assert.equal(specialIds.length, 3);
  assert.deepEqual(specialIds, [0, 3, 6]);
});

test('waiting for particular event in stream', async () => {
  const { pipe, asPipe } = createAsPipes();
  const { filter, take } = createStreamPipes(asPipe);
  
  const events = [
    { type: 'load', data: 'starting' },
    { type: 'update', data: 'processing' },
    { type: 'update', data: 'processing' },
    { type: 'complete', data: 'finished' },
    { type: 'update', data: 'after' },
  ];
  
  // Wait for the 'complete' event
  let result;
  (result = pipe(eventStream(events)))
    | filter(e => e.type === 'complete')
    | take(1);
  
  const stream = await result.run();
  const completeEvent = await collect(stream);
  
  assert.equal(completeEvent.length, 1);
  assert.equal(completeEvent[0].data, 'finished');
});

test('mouse click composable - double click detection', async () => {
  const { pipe, asPipe } = createAsPipes();
  const { filter, scan, map } = createStreamPipes(asPipe);
  
  const events = [
    { type: 'click', timestamp: 100, x: 10, y: 10 },
    { type: 'click', timestamp: 150, x: 10, y: 10 },  // Double click
    { type: 'move', timestamp: 200, x: 15, y: 15 },
    { type: 'click', timestamp: 500, x: 20, y: 20 },
    { type: 'click', timestamp: 600, x: 20, y: 20 },
  ];
  
  // Track consecutive clicks
  const trackClicks = (state, event) => {
    if (event.type !== 'click') {
      return { lastClick: null, count: 0, isDouble: false };
    }
    
    const timeDiff = state.lastClick ? event.timestamp - state.lastClick.timestamp : Infinity;
    const isDouble = timeDiff < 300;
    
    return {
      lastClick: event,
      count: isDouble ? state.count + 1 : 1,
      isDouble,
      event
    };
  };
  
  let result;
  (result = pipe(eventStream(events)))
    | scan(trackClicks, { lastClick: null, count: 0, isDouble: false })
    | filter(state => state.isDouble)
    | map(state => state.event);
  
  const stream = await result.run();
  const doubleClicks = await collect(stream);
  
  assert.equal(doubleClicks.length, 2);
  assert.equal(doubleClicks[0].timestamp, 150);
  assert.equal(doubleClicks[1].timestamp, 600);
});

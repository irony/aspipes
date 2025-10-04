// Example demonstrating stream support for functional reactive programming

import { createAsPipes } from './index.js';
import { createStreamPipes, eventStream } from './stream.js';

const { pipe, asPipe } = createAsPipes();
const { map, filter, take, scan } = createStreamPipes(asPipe);

// Helper to collect and display stream results
async function display(stream, label) {
  console.log(`\n${label}:`);
  const items = [];
  for await (const item of stream) {
    items.push(item);
  }
  console.log(items);
  return items;
}

// Example 1: Basic stream operations
console.log('=== Example 1: Basic Stream Operations ===');

async function* numbers() {
  for (let i = 1; i <= 10; i++) {
    yield i;
  }
}

let result1;
(result1 = pipe(numbers()))
  | map(x => x * 2)
  | filter(x => x > 10)
  | take(3);

const stream1 = await result1.run();
await display(stream1, 'Doubled numbers > 10, take 3');

// Example 2: Endless stream with take (functional reactive programming)
console.log('\n=== Example 2: Endless Stream Processing ===');

async function* endlessEvents() {
  let id = 0;
  while (true) {
    const currentId = id++;
    yield { 
      id: currentId, 
      type: currentId % 3 === 0 ? 'special' : 'normal',
      timestamp: Date.now()
    };
  }
}

let result2;
(result2 = pipe(endlessEvents()))
  | filter(e => e.type === 'special')
  | map(e => ({ id: e.id, type: e.type }))
  | take(5);

const stream2 = await result2.run();
await display(stream2, 'First 5 special events from endless stream');

// Example 3: Mouse event simulation
console.log('\n=== Example 3: Mouse Event Stream ===');

const mouseEvents = [
  { type: 'mousedown', x: 10, y: 10, timestamp: 100 },
  { type: 'mousemove', x: 15, y: 15, timestamp: 110 },
  { type: 'mousemove', x: 20, y: 20, timestamp: 120 },
  { type: 'mousemove', x: 25, y: 25, timestamp: 130 },
  { type: 'mouseup', x: 25, y: 25, timestamp: 140 },
  { type: 'mousemove', x: 30, y: 30, timestamp: 150 },
];

let isDragging = false;
const trackDrag = e => {
  if (e.type === 'mousedown') isDragging = true;
  if (e.type === 'mouseup') isDragging = false;
  return isDragging && e.type === 'mousemove';
};

let result3;
(result3 = pipe(eventStream(mouseEvents)))
  | filter(trackDrag)
  | map(e => ({ x: e.x, y: e.y }));

const stream3 = await result3.run();
await display(stream3, 'Mouse drag positions');

// Example 4: Scan for accumulating state
console.log('\n=== Example 4: Scan - Running Statistics ===');

const events = [
  { type: 'click', value: 10 },
  { type: 'click', value: 20 },
  { type: 'move', value: 5 },
  { type: 'click', value: 30 },
];

const trackStats = (stats, event) => ({
  totalEvents: stats.totalEvents + 1,
  clicks: stats.clicks + (event.type === 'click' ? 1 : 0),
  sum: stats.sum + event.value,
  lastEvent: event.type
});

let result4;
(result4 = pipe(eventStream(events)))
  | scan(trackStats, { totalEvents: 0, clicks: 0, sum: 0, lastEvent: null });

const stream4 = await result4.run();
await display(stream4, 'Running statistics (scan)');

// Example 5: Waiting for a particular event
console.log('\n=== Example 5: Wait for Specific Event ===');

const systemEvents = [
  { type: 'init', message: 'Starting...' },
  { type: 'progress', percent: 30 },
  { type: 'progress', percent: 60 },
  { type: 'complete', message: 'Done!' },
  { type: 'cleanup', message: 'Cleaning up...' },
];

let result5;
(result5 = pipe(eventStream(systemEvents)))
  | filter(e => e.type === 'complete')
  | take(1);

const stream5 = await result5.run();
await display(stream5, 'Waiting for complete event');

console.log('\n=== All examples completed! ===');

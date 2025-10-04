// Comprehensive example demonstrating functional reactive programming with aspipes
// This shows how to use aspipes as FRP - taking an endless stream of events
// and piping it to a pipeline that waits for particular events

import { createAsPipes } from './index.js';
import { createStreamPipes, eventStream } from './stream.js';

const { pipe, asPipe } = createAsPipes();
const { map, filter, take, scan } = createStreamPipes(asPipe);

console.log('=== Functional Reactive Programming with aspipes ===\n');

// ============================================================================
// Example 1: Endless event stream - waiting for specific events
// ============================================================================
console.log('1. Waiting for specific events in an endless stream:');
console.log('   Creating an infinite event stream and extracting special events...\n');

async function* infiniteEventStream() {
  let id = 0;
  while (true) {
    const currentId = id++;
    yield {
      id: currentId,
      type: currentId % 5 === 0 ? 'important' : 'normal',
      data: `Event ${currentId}`
    };
  }
}

// Wait for the first 3 "important" events from an endless stream
let result1;
(result1 = pipe(infiniteEventStream()))
  | filter(e => e.type === 'important')
  | take(3);

const stream1 = await result1.run();
console.log('   First 3 important events:');
for await (const event of stream1) {
  console.log(`   - ${event.data} (id: ${event.id})`);
}

// ============================================================================
// Example 2: Mouse drag composable - tracking drag movements
// ============================================================================
console.log('\n2. Mouse drag composable:');
console.log('   Simulating mouse events and tracking only drag movements...\n');

const mouseDragEvents = [
  { type: 'mousemove', x: 5, y: 5, time: 0 },
  { type: 'mousedown', x: 10, y: 10, time: 100 },
  { type: 'mousemove', x: 15, y: 15, time: 110 },
  { type: 'mousemove', x: 20, y: 20, time: 120 },
  { type: 'mousemove', x: 25, y: 25, time: 130 },
  { type: 'mouseup', x: 25, y: 25, time: 140 },
  { type: 'mousemove', x: 30, y: 30, time: 150 },
  { type: 'mousedown', x: 30, y: 30, time: 200 },
  { type: 'mousemove', x: 35, y: 35, time: 210 },
  { type: 'mouseup', x: 35, y: 35, time: 220 },
];

// Track drag state and filter for drag movements
let isDragging = false;
const isDragMove = e => {
  if (e.type === 'mousedown') isDragging = true;
  if (e.type === 'mouseup') isDragging = false;
  return isDragging && e.type === 'mousemove';
};

let dragResult;
(dragResult = pipe(eventStream(mouseDragEvents)))
  | filter(isDragMove)
  | map(e => ({ position: { x: e.x, y: e.y }, time: e.time }));

const dragStream = await dragResult.run();
console.log('   Drag movements detected:');
for await (const move of dragStream) {
  console.log(`   - Position (${move.position.x}, ${move.position.y}) at time ${move.time}ms`);
}

// ============================================================================
// Example 3: Mouse click composable - double-click detection
// ============================================================================
console.log('\n3. Mouse click composable - detecting double clicks:');
console.log('   Tracking consecutive clicks within a time window...\n');

const clickEvents = [
  { type: 'click', x: 10, y: 10, time: 100 },
  { type: 'click', x: 10, y: 10, time: 150 },  // Double click (50ms apart)
  { type: 'move', x: 20, y: 20, time: 300 },
  { type: 'click', x: 30, y: 30, time: 500 },  // Single click
  { type: 'click', x: 30, y: 30, time: 800 },  // Not a double click (300ms apart)
  { type: 'click', x: 40, y: 40, time: 1000 },
  { type: 'click', x: 40, y: 40, time: 1100 }, // Double click (100ms apart)
];

const DOUBLE_CLICK_THRESHOLD = 250; // milliseconds

const trackDoubleClicks = (state, event) => {
  if (event.type !== 'click') {
    return { lastClick: null, isDouble: false };
  }
  
  const timeDiff = state.lastClick ? event.time - state.lastClick.time : Infinity;
  const isDouble = timeDiff < DOUBLE_CLICK_THRESHOLD;
  
  return {
    lastClick: event,
    isDouble,
    event: isDouble ? event : null
  };
};

let clickResult;
(clickResult = pipe(eventStream(clickEvents)))
  | scan(trackDoubleClicks, { lastClick: null, isDouble: false })
  | filter(state => state.isDouble && state.event)
  | map(state => state.event);

const doubleClickStream = await clickResult.run();
console.log('   Double clicks detected:');
for await (const click of doubleClickStream) {
  console.log(`   - Double click at (${click.x}, ${click.y}) at time ${click.time}ms`);
}

// ============================================================================
// Example 4: Complex reactive pattern - monitoring system events
// ============================================================================
console.log('\n4. Complex reactive pattern - system event monitoring:');
console.log('   Processing a stream of system events with stateful tracking...\n');

async function* systemEventStream() {
  const events = [
    { type: 'start', service: 'web-server', timestamp: 1000 },
    { type: 'request', service: 'web-server', count: 1, timestamp: 1100 },
    { type: 'request', service: 'web-server', count: 2, timestamp: 1200 },
    { type: 'error', service: 'web-server', message: 'Connection timeout', timestamp: 1300 },
    { type: 'request', service: 'web-server', count: 3, timestamp: 1400 },
    { type: 'error', service: 'web-server', message: 'Database error', timestamp: 1500 },
    { type: 'stop', service: 'web-server', timestamp: 1600 },
    { type: 'start', service: 'api-server', timestamp: 1700 },
  ];
  
  for (const event of events) {
    yield event;
  }
}

const aggregateStats = (stats, event) => ({
  totalEvents: stats.totalEvents + 1,
  requests: stats.requests + (event.type === 'request' ? 1 : 0),
  errors: stats.errors + (event.type === 'error' ? 1 : 0),
  services: stats.services.add(event.service),
  lastEvent: event
});

let sysResult;
(sysResult = pipe(systemEventStream()))
  | scan(aggregateStats, { 
      totalEvents: 0, 
      requests: 0, 
      errors: 0, 
      services: new Set(),
      lastEvent: null 
    })
  | filter(stats => stats.errors > 0)  // Only show states with errors
  | take(2);  // Take first 2 states with errors

const sysStream = await sysResult.run();
console.log('   System states when errors occurred:');
let stateNum = 1;
for await (const stats of sysStream) {
  console.log(`   State ${stateNum++}:`);
  console.log(`     - Total events: ${stats.totalEvents}`);
  console.log(`     - Requests: ${stats.requests}`);
  console.log(`     - Errors: ${stats.errors}`);
  console.log(`     - Last event: ${stats.lastEvent.type} (${stats.lastEvent.message || 'N/A'})`);
}

// ============================================================================
// Example 5: Combining multiple stream operations
// ============================================================================
console.log('\n5. Combining multiple stream operations:');
console.log('   Complex pipeline with map, filter, scan, and take...\n');

async function* numberStream() {
  for (let i = 1; i <= 20; i++) {
    yield i;
  }
}

let complexResult;
(complexResult = pipe(numberStream()))
  | map(x => x * 2)                    // Double each number
  | filter(x => x > 10)                // Keep only > 10
  | scan((sum, x) => sum + x, 0)       // Running sum
  | filter(sum => sum > 50)            // Wait until sum > 50
  | take(1);                           // Take first occurrence

const complexStream = await complexResult.run();
console.log('   Running sum progression until > 50:');
for await (const sum of complexStream) {
  console.log(`   - First sum > 50: ${sum}`);
}

console.log('\n=== All FRP examples completed! ===');
console.log('\nKey takeaways:');
console.log('- aspipes can process endless streams using take()');
console.log('- Perfect for reactive patterns like mouse events');
console.log('- scan() enables stateful stream processing');
console.log('- Can wait for specific conditions in event streams');
console.log('- Composable operations work seamlessly together');

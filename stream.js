// Stream/Generator aspipe functions for functional reactive programming

export function createStreamPipes(asPipe) {
  // Map function for async generators
  const map = asPipe(async function* (iterable, fn) {
    for await (const item of iterable) {
      yield await Promise.resolve(fn(item));
    }
  });

  // Filter function for async generators
  const filter = asPipe(async function* (iterable, predicate) {
    for await (const item of iterable) {
      if (await Promise.resolve(predicate(item))) {
        yield item;
      }
    }
  });

  // Take function - takes first n items from stream
  const take = asPipe(async function* (iterable, n) {
    let count = 0;
    for await (const item of iterable) {
      if (count >= n) break;
      yield item;
      count++;
    }
  });

  // Scan function - like reduce but yields intermediate results
  const scan = asPipe(async function* (iterable, reducer, initialValue) {
    let accumulator = initialValue;
    let isFirst = true;

    for await (const item of iterable) {
      if (isFirst && accumulator === undefined) {
        accumulator = item;
        isFirst = false;
      } else {
        accumulator = await Promise.resolve(reducer(accumulator, item));
      }
      yield accumulator;
    }
  });

  // Reduce function - reduces stream to single value
  const reduce = asPipe(async (iterable, reducer, initialValue) => {
    let accumulator = initialValue;
    let isFirst = true;

    for await (const item of iterable) {
      if (isFirst && accumulator === undefined) {
        accumulator = item;
        isFirst = false;
      } else {
        accumulator = await Promise.resolve(reducer(accumulator, item));
      }
    }

    return accumulator;
  });

  return { map, filter, take, scan, reduce };
}

// Helper to create an event stream generator
export async function* eventStream(events) {
  for (const event of events) {
    yield event;
  }
}

// Helper to create a simulated mouse event stream
export async function* mouseEventStream(events, delay = 0) {
  for (const event of events) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    yield event;
  }
}

// Helper to collect all items from an async generator
export async function collect(asyncIterable) {
  const items = [];
  for await (const item of asyncIterable) {
    items.push(item);
  }
  return items;
}

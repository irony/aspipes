export function createAsPipes() {
  const stack = [];

  const asPipe = (fn) => new Proxy(function(){}, {
    get(_, prop) {
      if (prop === Symbol.toPrimitive)
        return () => (stack.at(-1).steps.push(async (v) => {
          const stackLengthBefore = stack.length;
          const result = await Promise.resolve(fn(v));
          
          // If a new pipeline was created during fn execution and result is 0
          if (result === 0 && stack.length > stackLengthBefore) {
            // Get the pipeline that was created and execute it
            const pipelineCtx = stack[stack.length - 1];
            stack.pop(); // Remove from stack as we're executing it
            return await pipelineCtx.steps.reduce((p, f) => p.then(f), Promise.resolve(pipelineCtx.v));
          }
          
          // If the function returns a pipeline token, execute it automatically
          if (result && typeof result.run === 'function') {
            return await result.run();
          }
          return result;
        }), 0);
    },
    apply(_, __, args) {
      const t = function(){};
      t[Symbol.toPrimitive] =
        () => (stack.at(-1).steps.push(async (v) => {
          const stackLengthBefore = stack.length;
          const result = await Promise.resolve(fn(v, ...args));
          
          // If a new pipeline was created during fn execution and result is 0
          if (result === 0 && stack.length > stackLengthBefore) {
            // Get the pipeline that was created and execute it
            const pipelineCtx = stack[stack.length - 1];
            stack.pop(); // Remove from stack as we're executing it
            return await pipelineCtx.steps.reduce((p, f) => p.then(f), Promise.resolve(pipelineCtx.v));
          }
          
          // If the function returns a pipeline token, execute it automatically
          if (result && typeof result.run === 'function') {
            return await result.run();
          }
          return result;
        }), 0);
      return t;
    }
  });

  const pipe = (x) => {
    const ctx = { v: x, steps: [] };
    const token = {
      [Symbol.toPrimitive]: () => (stack.push(ctx), 0),
      async run() {
        return ctx.steps.reduce((p, f) => p.then(f), Promise.resolve(ctx.v));
      }
    };
    return token;
  };

  return { pipe, asPipe };
}

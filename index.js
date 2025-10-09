export function createAsPipes() {
  const stack = [];

  const asPipe = (fnOrObj) => {
    // If it's an object, return a proxy that makes all methods pipeable
    if (typeof fnOrObj === 'object' && fnOrObj !== null && typeof fnOrObj !== 'function') {
      return new Proxy({}, {
        get(_, prop) {
          if (typeof fnOrObj[prop] === 'function') {
            // Don't bind prototype methods - they need the actual value as 'this'
            if (fnOrObj.constructor === Object || 
                fnOrObj === Array.prototype ||
                fnOrObj.constructor === Function) {
              return asPipe(fnOrObj[prop]);
            }
            return asPipe(fnOrObj[prop].bind(fnOrObj));
          }
          return fnOrObj[prop];
        }
      });
    }

    // Original function behavior
    const fn = fnOrObj;
    return new Proxy(function () {}, {
      get(_, prop) {
        if (prop === Symbol.toPrimitive)
          return () => (
            stack.at(-1).steps.push(async (v) => {
              const before = stack.length;
              const result = await Promise.resolve(fn(v));
              if (result === 0 && stack.length > before) {
                const ctx = stack.pop();
                return await ctx.steps.reduce(
                  (p, f) => p.then(f),
                  Promise.resolve(ctx.v),
                );
              }
              if (result && typeof result.run === 'function')
                return await result.run();
              return result;
            }),
            0
          );
      },
      apply(_, __, args) {
        const t = function () {};
        t[Symbol.toPrimitive] = () => (
          stack.at(-1).steps.push(async (v) => {
            const before = stack.length;
            const result = await Promise.resolve(fn(v, ...args));
            if (result === 0 && stack.length > before) {
              const ctx = stack.pop();
              return await ctx.steps.reduce(
                (p, f) => p.then(f),
                Promise.resolve(ctx.v),
              );
            }
            if (result && typeof result.run === 'function')
              return await result.run();
            return result;
          }),
          0
        );
        return t;
      },
    });
  };

  const pipe = (x) => {
    const ctx = { v: x, steps: [], token: null };
    const token = {
      [Symbol.toPrimitive]: () => (stack.push(ctx), 0),
      async run() {
        return ctx.steps.reduce((p, f) => p.then(f), Promise.resolve(ctx.v));
      },
    };
    ctx.token = token;
    return token;
  };

  // fångar den pipeline som just byggdes av ett |-uttryck
  const take = (_ignored) => {
    const ctx = stack.pop();
    return ctx?.token ?? _ignored; // om inget på stacken, returnera originalet
  };

  // Creates a function that can use pipe syntax inside
  const pipeFn = (fn) => {
    return async (...args) => {
      const p = pipe(args[0]);
      fn(p, ...args.slice(1));
      return await p.run();
    };
  };

  return { pipe, asPipe, take, pipeFn };
}

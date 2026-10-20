declare module 'node:test' {
  export function describe(name: string, fn: () => void | Promise<void>): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
}

declare module 'node:assert/strict' {
  const assert: {
    equal(actual: unknown, expected: unknown, message?: string | Error): void;
    ok(value: unknown, message?: string | Error): void;
    throws(fn: () => unknown, expected?: RegExp | Function | object | Error): void;
    deepEqual(actual: unknown, expected: unknown, message?: string | Error): void;
  };
  export default assert;
}

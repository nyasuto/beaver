/**
 * Type bridge for @testing-library/jest-dom matchers under Vitest 5.
 *
 * `src/test/setup.ts` registers the matchers at runtime via
 * `import '@testing-library/jest-dom'`. Its types only extend the global
 * `jest.Matchers` namespace, which Vitest <= 4 bridged into its `Assertion`
 * type; Vitest 5 dropped that bridge and changed `Assertion` to
 * `Assertion<R, T>`, and jest-dom's own `/vitest` typings still augment the
 * old single-parameter `Assertion<T>`.
 *
 * Remove this file once @testing-library/jest-dom ships Vitest 5 typings.
 */
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare module 'vitest' {
  // Type parameters must be identical to Vitest's own `Assertion` declaration for
  // interface merging, even though `T` is not needed here.
  /* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars */
  interface Assertion<
    R extends void | Promise<void> = void,
    T = unknown,
  > extends TestingLibraryMatchers<unknown, R> {}
  /* eslint-enable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<unknown, unknown> {}
}

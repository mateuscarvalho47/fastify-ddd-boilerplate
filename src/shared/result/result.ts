export type Result<T, E = Error> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: E }

export const Result = {
  ok<T>(value: T): Result<T, never> {
    return { success: true, value }
  },

  fail<E>(error: E): Result<never, E> {
    return { success: false, error }
  },

  isOk<T, E>(result: Result<T, E>): result is { success: true; value: T } {
    return result.success === true
  },

  isFail<T, E>(result: Result<T, E>): result is { success: false; error: E } {
    return result.success === false
  },
}

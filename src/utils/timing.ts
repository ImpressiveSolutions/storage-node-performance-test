import { performance } from "perf_hooks";

export type TimeIt<T> = {
  fnRet: T;
  timeit: {
    start: number;
    end: number;
    delta: number;
  };
};

/**
 * @return Current timestamp in milliseconds
 */
export const getCurrentTimestamp = () => performance.now();

/**
 * @param callbackfn A callable function that needs to be timed
 * @param args Arguments to be passed to the callback function
 * @return Object containing the actual result from the callback function, along with the timing results
 */
export function timeit<T>(
  callbackfn: (...args: any[]) => T,
  ...args: any[]
): TimeIt<T> {
  const startTime = getCurrentTimestamp();
  const result = callbackfn(...args);
  const endTime = getCurrentTimestamp();

  const deltaTime = endTime - startTime;

  return {
    fnRet: result,
    timeit: {
      start: startTime,
      end: endTime,
      delta: deltaTime,
    },
  };
}

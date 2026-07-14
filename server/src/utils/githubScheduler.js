const DEFAULT_CONCURRENCY = 3;

/**
 * Executes async tasks with a configurable concurrency limit.
 *
 * @param {Array<any>} items
 * @param {(item:any, index:number)=>Promise<any>} worker
 * @param {number} [concurrency=DEFAULT_CONCURRENCY]
 * @returns {Promise<Array<any>>}
 */

export const runWithConcurrency = async (
  items,
  worker,
  concurrency = DEFAULT_CONCURRENCY
) => {
  if (!Array.isArray(items)) {
    throw new Error("items must be an array");
  }

  if (items.length === 0) {
    return [];
  }

  const safeConcurrency = Math.max(
    1,
    Number.isFinite(concurrency)
      ? Math.floor(concurrency)
      : DEFAULT_CONCURRENCY
  );

  const results = new Array(items.length);
  let nextIndex = 0;

  const executeWorker = async () => {
    while (true) {
      const index = nextIndex++;

      if (index >= items.length) {
        return;
      }

      results[index] = await worker(items[index], index);
    }
  };

  const workers = Array.from(
    { length: Math.min(safeConcurrency, items.length) },
    executeWorker
  );

  await Promise.all(workers);

  return results;
};

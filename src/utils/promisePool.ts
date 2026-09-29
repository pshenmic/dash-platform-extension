// Runs tasks with a bounded number of them in flight.
export async function promisePool<T> (
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let next = 0

  const worker = async (): Promise<void> => {
    while (next < tasks.length) {
      const index = next++
      results[index] = await tasks[index]()
    }
  }

  const size = Math.max(1, Math.min(concurrency, tasks.length))

  await Promise.all(Array.from({ length: size }, async () => { await worker() }))

  return results
}

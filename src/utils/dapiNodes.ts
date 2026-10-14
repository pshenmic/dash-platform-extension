// Which of the Platform nodes are answering right now.
//
// The SDK picks a node at random for every call and does not retry on another
// one, so a dead node in the pool loses its share of the requests: with one dead
// node among three, three calls in ten failed. Probing first keeps the pool to
// nodes that are up.
//
// The SDK can discover nodes by itself, but it asks the platform explorer for
// the validator list and falls back to a single hardcoded seed - and on
// 12 October 2026 the explorer and that seed went down together, which left
// every wallet with no way into Platform at all.
export const pickLiveDapiUrls = async (candidates: string[], timeoutMs: number = 2500): Promise<string[]> => {
  const probes = candidates.map(async url => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      // A gRPC-web endpoint answers a plain GET with 405; anything that answers
      // at all is listening and has a certificate the browser accepts.
      await fetch(url, { signal: controller.signal })

      return url
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  })

  const live = (await Promise.all(probes)).filter((url): url is string => url != null)

  // Everything unreachable usually means the machine running this is offline,
  // not that every node is down: hand back the full list and let the calls fail
  // with their own errors.
  return live.length > 0 ? live : candidates
}

// dash-core-sdk's pool takes a list of nodes - `grpcConnectionPool` is typed
// `string | string[]` and branches on an array at runtime - but the SDK's own
// options still type `dapiUrl` as a single string. Handing it the list is right;
// the cast can go once that type catches up.
export const asCoreDapiUrl = (urls: string[]): string => urls as unknown as string

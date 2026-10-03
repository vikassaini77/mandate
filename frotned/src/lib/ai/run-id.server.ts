const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

export function createRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  let resolveRunId: (value: string | undefined) => void = () => undefined;
  let resolved = false;
  const ready = new Promise<string | undefined>((resolve) => {
    resolveRunId = resolve;
  });
  const publish = (value?: string) => {
    runId ||= value?.trim() || undefined;
    if (!resolved) {
      resolved = true;
      resolveRunId(runId);
    }
  };
  if (runId) publish(runId);
  return {
    getRunId: () => runId,
    waitForRunId: () => (runId ? Promise.resolve(runId) : ready),
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set(RUN_ID_HEADER, runId);
      try {
        const response = await fetch(input, { ...init, headers });
        publish(response.headers.get(RUN_ID_HEADER) ?? undefined);
        return response;
      } catch (error) {
        publish();
        throw error;
      }
    },
  };
}

export function getRunId(request: Request) {
  return request.headers.get(RUN_ID_HEADER)?.trim() || undefined;
}

export async function withRunId(response: Response, gateway: ReturnType<typeof createRunIdFetch>) {
  const headers = new Headers(response.headers);
  const runId = await gateway.waitForRunId();
  if (runId) {
    headers.set(RUN_ID_HEADER, runId);
    headers.set("Access-Control-Expose-Headers", RUN_ID_HEADER);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

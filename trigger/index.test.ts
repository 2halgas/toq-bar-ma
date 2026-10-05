import { describe, expect, it, vi } from "vitest";

import { dispatchWorkflow, type TriggerEnv } from "./index";

const env: TriggerEnv = {
  GITHUB_TOKEN: "test-token",
  GITHUB_REPO: "owner/repo",
  GITHUB_WORKFLOW: "update-data.yml",
  GITHUB_REF: "main",
};

describe("dispatchWorkflow", () => {
  it("POSTs a workflow_dispatch for the configured workflow and ref", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));

    await dispatchWorkflow(env, fetchMock);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://api.github.com/repos/owner/repo/actions/workflows/update-data.yml/dispatches",
    );
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer test-token");
    expect(JSON.parse(String(init?.body))).toEqual({ ref: "main" });
  });

  it("fails loudly when GitHub refuses, so the cron run shows as failed", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response('{"message":"Bad credentials"}', { status: 401 }),
    );
    await expect(dispatchWorkflow(env, fetchMock)).rejects.toThrow(/401.*Bad credentials/);
  });

  it("refuses to call GitHub without a token", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    await expect(dispatchWorkflow({ ...env, GITHUB_TOKEN: "" }, fetchMock)).rejects.toThrow(
      /GITHUB_TOKEN/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

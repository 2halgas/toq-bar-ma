/**
 * Cloudflare Worker with only a `scheduled` handler: on each Cron Trigger it
 * asks GitHub to run the data workflow, exactly like pressing "Run workflow".
 * All the work (fetch, geocode, audit, build, commit) stays in GitHub Actions.
 */

export interface TriggerEnv {
  /** Fine-grained token limited to this repository, Actions: read & write. Set with `wrangler secret put`. */
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  GITHUB_WORKFLOW: string;
  GITHUB_REF: string;
}

/** POST /repos/{repo}/actions/workflows/{workflow}/dispatches */
export async function dispatchWorkflow(
  env: TriggerEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (!env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN secret is not set");

  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/${env.GITHUB_WORKFLOW}/dispatches`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "toq-bar-ma-trigger",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ ref: env.GITHUB_REF }),
  });

  if (!response.ok) {
    // GitHub's error body never echoes the token; keep it short for the logs.
    const details = (await response.text()).slice(0, 300);
    throw new Error(`GitHub responded ${response.status}: ${details}`);
  }
}

const worker = {
  async scheduled(controller: { cron: string }, env: TriggerEnv): Promise<void> {
    await dispatchWorkflow(env);
    console.log(
      `Dispatched ${env.GITHUB_WORKFLOW} on ${env.GITHUB_REF} (cron "${controller.cron}")`,
    );
  },
};

export default worker;

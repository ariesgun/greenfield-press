import { Octokit } from "octokit";

export async function triggerGitHubAction(bucketName: string) {
  // Octokit.js
  // https://github.com/octokit/core.js#readme
  console.log("Bucket", bucketName);
  console.log(process.env.GITHUB_TOKEN);
  try {
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    await octokit.request(
      "POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches",
      {
        owner: "ariesgun",
        repo: "greenfield-blogs-template",
        workflow_id: "node.js.yml",
        ref: "main",
        inputs: {
          bucketName: bucketName,
        },
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
  } catch (err) {
    console.log(err);
  }
}

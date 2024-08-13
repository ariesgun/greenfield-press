import { triggerGitHubAction } from "@/actions/github";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const bucketName = req.body;
  await triggerGitHubAction(bucketName);

  res.status(200).json({ bucketName });
}

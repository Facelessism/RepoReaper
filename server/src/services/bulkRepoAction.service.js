import { runWithConcurrency } from "../utils/githubScheduler.js";

const DEFAULT_CONCURRENCY = 3;

/**
 * Executes a bulk action on multiple GitHub repositories.
 *
 * @param {Object} params - Parameters object.
 * @param {Array<string>} params.repos - Array of repository full names (owner/repo).
 * @param {string} params.token - GitHub authentication token.
 * @param {Function} params.action - Async function that performs the action on a single repository.
 * @param {string} params.successStatus - Status value to use on success.
 * @param {number} [params.concurrency=DEFAULT_CONCURRENCY] - Maximum number of concurrent operations.
 * @returns {Promise<Array>} Array of results in the format:
 * [{ repo, status, message? }]
 */

export const bulkRepoAction = async ({
  repos,
  token,
  action,
  successStatus,
  concurrency = DEFAULT_CONCURRENCY,
}) => {
  if (!Array.isArray(repos)) {
    throw new Error("repos must be an array");
  }

  if (typeof action !== "function") {
    throw new Error("action must be a function");
  }

  if (typeof successStatus !== "string" || successStatus.trim() === "") {
    throw new Error("successStatus must be a non-empty string");
  }

  return runWithConcurrency(
    repos,
    async (fullName) => {
      try {
        await action(fullName, token);

        return {
          repo: fullName,
          status: successStatus,
        };
      } catch (error) {
        return {
          repo: fullName,
          status: "failed",
          message: error.message || "Unknown error",
        };
      }
    },
    concurrency
  );
};

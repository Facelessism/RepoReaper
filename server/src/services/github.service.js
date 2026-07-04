import axios from "axios";
import logger from "../utils/logger.js";

const githubApi = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Accept: "application/vnd.github+json",
  },
});

const MAX_RETRIES = 3;
const MAX_BACKOFF = 8000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getHeaders = (token) => ({
  Authorization: `token ${token}`,
});

const shouldRetry = (error) => {
  const status = error.response?.status;

  return (
    !status ||
    status === 403 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
};

const normalizeError = (error) => {
  const normalizedError = new Error(
    error.response?.data?.message ||
      error.message ||
      "GitHub API request failed"
  );

  normalizedError.status = error.response?.status;
  normalizedError.code = error.code;

  return normalizedError;
};

const handleRateLimit = async (error) => {
  const headers = error.response?.headers;

  if (
    error.response?.status === 403 &&
    headers?.["x-ratelimit-remaining"] === "0"
  ) {
    const reset = Number(headers["x-ratelimit-reset"]);

    if (!Number.isFinite(reset)) {
      return false;
    }

    const resetTime = reset * 1000;
    const waitTime = Math.max(resetTime - Date.now(), 0);

    logger.warn(
      `GitHub rate limit exceeded. Waiting ${Math.ceil(
        waitTime / 1000
      )} seconds before retrying.`
    );

    await sleep(waitTime);
    return true;
  }

  return false;
};

const requestWithRetry = async (requestFn, operation, repo = null) => {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      logger.debug(repo ? `${operation}: ${repo}` : operation);

      const response = await requestFn();

      logger.debug(
        repo ? `${operation} succeeded: ${repo}` : `${operation} succeeded`
      );

      return response;
    } catch (error) {
      attempt++;

      if (!shouldRetry(error) || attempt >= MAX_RETRIES) {
        logger.error(
          repo ? `${operation} failed: ${repo}` : `${operation} failed`,
          error.response?.data || error.message
        );

        throw normalizeError(error);
      }

      const waitedForRateLimit = await handleRateLimit(error);

      if (!waitedForRateLimit) {
        const delay = Math.min(
          1000 * Math.pow(2, attempt - 1),
          MAX_BACKOFF
        );

        logger.warn(
          `${operation} retry ${attempt}/${MAX_RETRIES}${
            repo ? `: ${repo}` : ""
          } in ${Math.ceil(delay / 1000)}s`
        );

        await sleep(delay);
      }
    }
  }
};

export const getRepos = async (token, page = 1) => {
  const { data } = await requestWithRetry(
    () =>
      githubApi.get("/user/repos", {
        headers: getHeaders(token),
        params: {
          affiliation: "owner",
          per_page: 100,
          page,
        },
      }),
    "Fetch repositories"
  );

  return data;
};

export const getStarredRepos = async (token, page = 1) => {
  const { data } = await requestWithRetry(
    () =>
      githubApi.get("/user/starred", {
        headers: getHeaders(token),
        params: {
          per_page: 100,
          page,
        },
      }),
    "Fetch starred repositories"
  );

  return data;
};

export const getAuthenticatedUser = async (token) => {
  const { data } = await requestWithRetry(
    () =>
      githubApi.get("/user", {
        headers: getHeaders(token),
      }),
    "Fetch authenticated user"
  );

  return data;
};

export const deleteRepo = async (fullName, token) =>
  requestWithRetry(
    () =>
      githubApi.delete(`/repos/${fullName}`, {
        headers: getHeaders(token),
      }),
    "Delete repository",
    fullName
  );

export const archiveRepo = async (fullName, token) =>
  requestWithRetry(
    () =>
      githubApi.patch(
        `/repos/${fullName}`,
        { archived: true },
        {
          headers: getHeaders(token),
        }
      ),
    "Archive repository",
    fullName
  );

export const makePrivate = async (fullName, token) =>
  requestWithRetry(
    () =>
      githubApi.patch(
        `/repos/${fullName}`,
        { private: true },
        {
          headers: getHeaders(token),
        }
      ),
    "Make repository private",
    fullName
  );

export const unstarRepo = async (fullName, token) =>
  requestWithRetry(
    () =>
      githubApi.delete(`/user/starred/${fullName}`, {
        headers: getHeaders(token),
      }),
    "Unstar repository",
    fullName
  );

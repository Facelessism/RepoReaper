import {
  getRepos,
  getStarredRepos,
  getAuthenticatedUser,
  deleteRepo as deleteGithubRepo,
  archiveRepo as archiveGithubRepo,
  makePrivate as makeGithubRepoPrivate,
  unstarRepo,
} from '../services/github.service.js';


import { bulkRepoAction } from '../services/bulkRepoAction.service.js';


export const getList = async (req, res) => {
  try {
    const token = req.token;
    let allRepos = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const repos = await getRepos(token, page);
      allRepos = allRepos.concat(repos);
      if (repos.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }

    const simplifiedRepos = allRepos.map(repo => ({
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      user: repo.owner.login,
      id: repo.id,
      fork: repo.fork,
      avatar: repo.owner.avatar_url,
      updated_at: repo.updated_at,
      size: repo.size,
      language: repo.language,
      stargazers_count: repo.stargazers_count,
    }));

    const username = allRepos[0]?.owner?.login;
    const avatar = allRepos[0]?.owner?.avatar_url;

    res.json({ repos: simplifiedRepos, user: username, avatar: avatar });
  } catch (error) {
    console.error('Error fetching repos:', error.message);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
};

export const deleteRepo = async (req, res) => {
  const token = req.token;
  const reposToDelete = req.body.repos;

  if (!Array.isArray(reposToDelete) || reposToDelete.length === 0) {
    return res.status(400).json({ error: 'No repositories specified' });
  }

  const results = await bulkRepoAction({
    repos: reposToDelete,
    token,
    successStatus: 'deleted',
    action: async (fullName, token) => {

      await deleteGithubRepo(fullName, token);
    },
  });

  res.json({ results });
};

export const archiveRepo = async (req, res) => {
  const token = req.token;
  const reposToArchive = req.body.repos;

  if (!Array.isArray(reposToArchive) || reposToArchive.length === 0) {
    return res.status(400).json({ error: 'No repositories specified' });
  }

  const results = await bulkRepoAction({
    repos: reposToArchive,
    token,
    successStatus: 'archived',
    action: async (fullName, token) => {
      await archiveGithubRepo(fullName, token);
    },
  });

  res.json({ results });
};

export const makePrivate = async (req, res) => {
  const token = req.token;
  const reposToUpdate = req.body.repos;

  if (!Array.isArray(reposToUpdate) || reposToUpdate.length === 0) {
    return res.status(400).json({ error: 'No repositories specified' });
  }

  const results = await bulkRepoAction({
    repos: reposToUpdate,
    token,
    successStatus: 'private',
    action: async (fullName, token) => {
      await makeGithubRepoPrivate(fullName, token);
    },
  });

  res.json({ results });
};

export const getStarred = async (req, res) => {
  try {
    const token = req.token;
    let allRepos = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const repos = await getStarredRepos(token, page);
      allRepos = allRepos.concat(repos);
      if (repos.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }

    const simplifiedRepos = allRepos.map(repo => ({
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      user: repo.owner.login,
      id: repo.id,
      fork: repo.fork,
      avatar: repo.owner.avatar_url,
      updated_at: repo.updated_at,
      size: repo.size,
      language: repo.language,
      stargazers_count: repo.stargazers_count,
    }));

    const userData = await getAuthenticatedUser(token);

    res.json({ repos: simplifiedRepos, user: userData.login, avatar: userData.avatar_url });
  } catch (error) {
    console.error('Error fetching starred repos:', error.message);
    res.status(500).json({ error: 'Failed to fetch starred repositories' });
  }
};

export const unstarRepos = async (req, res) => {
  const token = req.token;
  const reposToUnstar = req.body.repos;

  if (!Array.isArray(reposToUnstar) || reposToUnstar.length === 0) {
    return res.status(400).json({ error: 'No repositories specified' });
  }

  const results = await bulkRepoAction({
    repos: reposToUnstar,
    token,
    successStatus: 'unstarred',
    action: async (fullName, token) => {
      await unstarRepo(fullName, token);
    },
  });

  res.json({ results });
};

import { getPostsForUser } from "./lib/db/queries/posts.js";
import { scrapeFeeds } from "./lib/aggregator.js";
import {
  createFeedFollow,
  getFeedFollowsForUser,
  deleteFeedFollow,
} from "./lib/db/queries/feed_follows.js";

import {
  createFeed,
  printFeed,
  getFeeds,
  getFeedByUrl,
  User,
} from "./lib/db/queries/feeds.js";

import {
  createUser,
  getUserByName,
  deleteAllUsers,
  getUsers,
} from "./lib/db/queries/users.js";

import { fetchFeed } from "./lib/rss.js";
import { readConfig, setUser } from "./config.js";

type CommandHandler = (
  cmdName: string,
  ...args: string[]
) => Promise<void>;

type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;
type CommandsRegistry = {
  [cmdName: string]: CommandHandler;
};

const middlewareLoggedIn = (
  handler: UserCommandHandler
): CommandHandler => {
  return async (cmdName: string, ...args: string[]) => {
    const config = readConfig();

    if (!config.currentUserName) {
      throw new Error("No user is currently logged in");
    }

    const user = await getUserByName(config.currentUserName);

    if (!user) {
      throw new Error("Current user does not exist");
    }

    await handler(cmdName, user, ...args);
  };
};

async function handlerLogin(cmdName: string, ...args: string[]) {
  if (args.length === 0) {
    throw new Error("username is required");
  }

  const username = args[0];

  const user = await getUserByName(username);

  if (!user) {
    throw new Error("User does not exist");
  }

  setUser(username);

  console.log(`User set to: ${username}`);
}

async function handlerRegister(cmdName: string, ...args: string[]) {
  if (args.length === 0) {
    throw new Error("username is required");
  }

  const username = args[0];

  const existingUser = await getUserByName(username);

  if (existingUser) {
    throw new Error("User already exists");
  }

  const user = await createUser(username);

  setUser(username);

  console.log(`User created: ${username}`);
  console.log(user);
}

async function handlerReset(cmdName: string, ...args: string[]) {
  await deleteAllUsers();

  console.log("Database reset successfully");
}

async function handlerUsers(cmdName: string, ...args: string[]) {
  const users = await getUsers();
  const config = readConfig();

  for (const user of users) {
    if (user.name === config.currentUserName) {
      console.log(`* ${user.name} (current)`);
    } else {
      console.log(`* ${user.name}`);
    }
  }
}

async function handlerAgg(cmdName: string, ...args: string[]) {
   if (args.length === 0) {
    throw new Error("time_between_reqs is required");
  }

  const timeBetweenRequests = parseDuration(args[0]);

  console.log(
    `Collecting feeds every ${args[0]}`
  );

  scrapeFeeds().catch(handleError);

  const interval = setInterval(() => {
    scrapeFeeds().catch(handleError);
  }, timeBetweenRequests);

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("Shutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
}

function handleError(err: unknown): void {
  console.error(err);
}

function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);

  if (!match) {
    throw new Error("Invalid duration format");
  }

  const amount = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case "ms":
      return amount;
    case "s":
      return amount * 1000;
    case "m":
      return amount * 60 * 1000;
    case "h":
      return amount * 60 * 60 * 1000;
    default:
      throw new Error("Invalid duration unit");
  }
}

async function handlerAddFeed(cmdName: string, user: User, ...args: string[]) {
   if (args.length < 2) {
    throw new Error("name and url are required");
  }

  const name = args[0];
  const url = args[1];

  const feed = await createFeed(name, url, user.id);

  const feedFollow = await createFeedFollow(user.id, feed.id);

  printFeed(feed, user);
}

async function handlerFeeds(cmdName: string, ...args: string[]) {
  const feeds = await getFeeds();

  for (const feed of feeds) {
    console.log(`* ${feed.feed.name}`);
    console.log(`  URL: ${feed.feed.url}`);
    console.log(`  Added by: ${feed.user.name}`);
  }
}

async function handlerFollow(cmdName: string, user: User, ...args: string[]) {
  if (args.length === 0) {
    throw new Error("url is required");
  }

  const url = args[0];

  const feed = await getFeedByUrl(url);

  if (!feed) {
    throw new Error("Feed does not exist");
  }

  const feedFollow = await createFeedFollow(user.id, feed.id);

  console.log(`Followed feed: ${feedFollow.feedName}`);
  console.log(`User: ${feedFollow.userName}`);
}

async function handlerFollowing(cmdName: string, user:User, ...args: string[]) {

  const feedFollows = await getFeedFollowsForUser(user.id);

  for (const feedFollow of feedFollows) {
    console.log(`* ${feedFollow.feedName}`);
  }
}

async function handlerUnfollow(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  if (args.length === 0) {
    throw new Error("url is required");
  }

  const url = args[0];

  await deleteFeedFollow(user.id, url);

  console.log(`Unfollowed feed: ${url}`);
}

async function handlerBrowse(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  const limit = args.length > 0 ? Number(args[0]) : 2;

  if (Number.isNaN(limit) || limit <= 0) {
    throw new Error("limit must be a positive number");
  }

  const posts = await getPostsForUser(user.id, limit);

  for (const post of posts) {
    console.log(`* ${post.posts.title}`);
    console.log(`  URL: ${post.posts.url}`);
    console.log(`  Published: ${post.posts.publishedAt}`);
    console.log();
  }
}

function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler
) {
  registry[cmdName] = handler;
}

async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
) {
  const handler = registry[cmdName];

  if (!handler) {
    throw new Error(`Unknown command: ${cmdName}`);
  }

  await handler(cmdName, ...args);
}

async function main() {
  const registry: CommandsRegistry = {};

  registerCommand(registry, "login", handlerLogin);
  registerCommand(registry, "register", handlerRegister);
  registerCommand(registry, "reset", handlerReset);
  registerCommand(registry, "users", handlerUsers);
  registerCommand(registry, "agg", handlerAgg);
  registerCommand(registry, "addfeed", middlewareLoggedIn(handlerAddFeed));  
  registerCommand(registry, "feeds", handlerFeeds);
  registerCommand(registry, "follow",  middlewareLoggedIn(handlerFollow));
  registerCommand(registry, "following", middlewareLoggedIn(handlerFollowing));
  registerCommand(registry, "unfollow", middlewareLoggedIn(handlerUnfollow));
  registerCommand(registry, "browse",  middlewareLoggedIn(handlerBrowse) );  

  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Error: not enough arguments");
    process.exit(1);
  }

  const cmdName = args[0];
  const cmdArgs = args.slice(1);

  try {
    await runCommand(registry, cmdName, ...cmdArgs);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }

  process.exit(0);
}

main();

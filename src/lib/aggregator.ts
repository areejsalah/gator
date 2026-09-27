import {
  getNextFeedToFetch,
  markFeedFetched,
} from "./db/queries/feeds.js";

import { createPost } from "./db/queries/posts.js";
import { fetchFeed } from "./rss.js";

export async function scrapeFeeds() {
  const feed = await getNextFeedToFetch();

  if (!feed) {
    throw new Error("No feeds found");
  }

  console.log(`Fetching feed: ${feed.name}`);

  const rssFeed = await fetchFeed(feed.url);

  await markFeedFetched(feed.id);

   for (const item of rssFeed.items) {
    await createPost(
      item.title,
      item.link,
      item.description,
      new Date(item.pubDate),
      feed.id
    );
  }
}

import { eq, and } from "drizzle-orm";
import { db } from "..";
import { feedFollows, feeds, users } from "../schema";
import { getFeedByUrl } from "./feeds.js";

export async function createFeedFollow(
  userId: string,
  feedId: string
) {
  const [newFeedFollow] = await db
    .insert(feedFollows)
    .values({
      userId,
      feedId,
    })
    .returning();

  const [result] = await db
    .select({
      feedFollow: feedFollows,
      userName: users.name,
      feedName: feeds.name,
    })
    .from(feedFollows)
    .innerJoin(users, eq(feedFollows.userId, users.id))
    .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
    .where(eq(feedFollows.id, newFeedFollow.id));

  return result;
}

export async function getFeedFollowsForUser(userId: string) {
  return await db
    .select({
      feedFollow: feedFollows,
      userName: users.name,
      feedName: feeds.name,
    })
    .from(feedFollows)
    .innerJoin(users, eq(feedFollows.userId, users.id))
    .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
    .where(eq(feedFollows.userId, userId));
}

export async function deleteFeedFollow(
  userId: string,
  feedUrl: string
) {
  const feed = await getFeedByUrl(feedUrl);

  if (!feed) {
    throw new Error("Feed does not exist");
  }

  await db
    .delete(feedFollows)
    .where(
      and(
        eq(feedFollows.userId, userId),
        eq(feedFollows.feedId, feed.id)
      )
    );
}


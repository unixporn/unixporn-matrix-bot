import * as sdk from "matrix-js-sdk";
import {
  sleep,
  newRedditPosts,
  getNewestRedditPosts,
  announceNewRedditPost,
  removeMessage,
} from "./lib.js";

function must(x, msg) {
  if (!x) {
    console.error(msg);
    process.exit(1);
  }

  return x;
}
const clientConfig = {
  baseUrl: must(process.env.BASE_URL, "specify BASE_URL"),
  accessToken: must(process.env.ACCESS_TOKEN, "specify ACCESS_TOKEN"),
};
const feedInterval = parseInt(process.env.FEED_INTERVAL) || 60 * 1000;
const feedRoom = must(process.env.FEED_ROOM, "specify FEED_ROOM");
const subreddit = must(process.env.SUBREDDIT, "specify SUBREDDIT");

// post.id => [event_id]
const postToEvents = {};
const client = sdk.createClient(clientConfig);
for await (const { deletedPosts, newPosts } of newRedditPosts(
  subreddit,
  getNewestRedditPosts
)) {
  const imagePosts = newPosts.filter((post) => post.post_hint === "image");
  for (const post of imagePosts) {
    console.log("announcing post", post.permalink);
    const { sentMessages } = await announceNewRedditPost(
      client,
      feedRoom,
      post
    );
    postToEvents[post.id] = sentMessages;
  }
  for (const post of deletedPosts) {
    const events = postToEvents[post.id];
    if (!events) {
      break;
    }
    for (const event of events) {
      await removeMessage(client, feedRoom, event);
    }
  }
  await sleep(feedInterval);
}

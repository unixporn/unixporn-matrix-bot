import * as sdk from "matrix-js-sdk";
import fetch from "cross-fetch";
import { safeHtml } from "common-tags";

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
const feedInterval = process.env.FEED_INTERVAL || 60 * 1000;
const feedRoom = must(process.env.FEED_ROOM, "specify FEED_ROOM");
const subreddit = must(process.env.SUBREDDIT, "specify SUBREDDIT");

function sleep(millis) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), millis);
  });
}

async function getNewestRedditPosts(sub) {
  const resp = await fetch(`https://reddit.com/r/${sub}/new.json`);
  const json = await resp.json();

  return json.data.children.map((c) => c.data);
}

async function* newRedditPosts(sub) {
  let last = Date.now();
  while (true) {
    const posts = await getNewestRedditPosts(sub);
    const l = last;
    last = Date.now();
    yield posts.filter((p) => p.created_utc * 1000 > l);
  }
}

const client = sdk.createClient(clientConfig);

async function announceNewRedditPost(post) {
  console.log("announcing post", post.permalink);

  const imgResp = await fetch(post.url);
  const imgType = imgResp.headers.get("content-type");
  const uploadResp = await client.uploadContent(imgResp.body, {
    type: imgType,
    rawResponse: false,
  });
  await client.sendEvent(feedRoom, "m.room.message", {
    msgtype: "m.image",
    body: "Image",
    url: uploadResp.content_uri,
  });

  const postLink = `https://reddit.com${post.permalink}`;
  await client.sendEvent(feedRoom, "m.room.message", {
    msgtype: "m.text",
    body: `${post.title} ${postLink}`,
    format: "org.matrix.custom.html",
    formatted_body: safeHtml`<a href="${postLink}">${post.title}</a>`,
  });
}

for await (const posts of newRedditPosts(subreddit)) {
  const image_posts = posts.filter((post) => post.post_hint === "image");
  for (const post of image_posts) {
    await announceNewRedditPost(post);
  }
  await sleep(feedInterval);
}

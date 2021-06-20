import fetch from "cross-fetch";
import { safeHtml } from "common-tags";

export function sleep(millis) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), millis);
  });
}

export function getDeletedPosts(old, curr) {
  const oldest = Math.min(...curr.map((p) => p.created_utc));
  const o = old.filter((p) => p.created_utc >= oldest);
  const c = curr.filter((p) => p.created_utc >= oldest);
  return o.filter((p) => !c.find((p2) => p2.id === p.id));
}

export async function getNewestRedditPosts(sub) {
  const resp = await fetch(`https://reddit.com/r/${sub}/new.json`);
  const json = await resp.json();

  return json.data.children.map((c) => c.data);
}

export async function* newRedditPosts(sub, getNewestPosts) {
  let last = Date.now() / 1000;
  let lastPosts = [];
  while (true) {
    const posts = await getNewestPosts(sub);
    const l = last;
    last = Math.max(...posts.map((p) => parseInt(p.created_utc)));
    yield {
      newPosts: posts.filter((p) => p.created_utc > l),
      deletedPosts: getDeletedPosts(lastPosts, posts),
    };
    lastPosts = posts;
  }
}

export async function announceNewRedditPost(client, feedRoom, post) {
  const sentMessages = [];

  const imgResp = await fetch(post.url);
  const imgType = imgResp.headers.get("content-type");
  const uploadResp = await client.uploadContent(imgResp.body, {
    type: imgType,
    rawResponse: false,
  });
  const res = await client.sendEvent(feedRoom, "m.room.message", {
    msgtype: "m.image",
    body: "Image",
    url: uploadResp.content_uri,
  });
  sentMessages.push(res.event_id);

  const postLink = `https://reddit.com${post.permalink}`;
  const res2 = await client.sendEvent(feedRoom, "m.room.message", {
    msgtype: "m.text",
    body: `${post.title} ${postLink}`,
    format: "org.matrix.custom.html",
    formatted_body: safeHtml`<a href="${postLink}">${post.title}</a>`,
  });
  sentMessages.push(res2.event_id);

  return { sentMessages };
}

export async function removeMessage(client, roomId, eventId) {
  return await client.redactEvent(roomId, eventId);
}

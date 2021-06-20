import { jest } from "@jest/globals";
import * as lib from "./lib";

function newPost(id, created_utc) {
  return { id, created_utc };
}

test("returns newest posts", async () => {
  const getNewestPosts = jest.fn();
  jest.setSystemTime(0);
  const it = lib.newRedditPosts("unixporn", getNewestPosts);
  jest.setSystemTime(1000);
  getNewestPosts.mockReturnValueOnce([
    {
      id: 1,
      created_utc: 1,
    },
    {
      id: 0,
      created_utc: 0,
    },
  ]);
  expect(await it.next()).toStrictEqual({
    done: false,
    value: { newPosts: [], deletedPosts: [] },
  });
  jest.setSystemTime(2000);
  getNewestPosts.mockReturnValueOnce([
    {
      id: 2,
      created_utc: 2,
    },
    {
      id: 1,
      created_utc: 1,
    },
    {
      id: 0,
      created_utc: 0,
    },
  ]);
  expect(await it.next()).toStrictEqual({
    done: false,
    value: { newPosts: [{ id: 2, created_utc: 2 }], deletedPosts: [] },
  });
  jest.setSystemTime(3000);
  getNewestPosts.mockReturnValueOnce([
    {
      id: 3,
      created_utc: 3,
    },
    {
      id: 2,
      created_utc: 2,
    },
    {
      id: 1,
      created_utc: 1,
    },
  ]);
  expect(await it.next()).toStrictEqual({
    done: false,
    value: { newPosts: [{ id: 3, created_utc: 3 }], deletedPosts: [] },
  });
  jest.setSystemTime(4000);
  getNewestPosts.mockReturnValueOnce([
    {
      id: 3,
      created_utc: 3,
    },
    {
      id: 1,
      created_utc: 1,
    },
    {
      id: 0,
      created_utc: 0,
    },
  ]);
  expect(await it.next()).toStrictEqual({
    done: false,
    value: { newPosts: [], deletedPosts: [{ id: 2, created_utc: 2 }] },
  });
  for (const call of getNewestPosts.mock.calls) {
    expect(call[0]).toBe("unixporn");
  }
});

test("returns deleted posts", () => {
  expect(
    lib.getDeletedPosts(
      [newPost(2, 2), newPost(1, 1), newPost(0, 0)],
      [newPost(2, 2), newPost(0, 0)]
    )
  ).toStrictEqual([newPost(1, 1)]);

  expect(
    lib.getDeletedPosts(
      [newPost(2, 2), newPost(1, 1), newPost(0, 0)],
      [newPost(1, 1), newPost(0, 0)]
    )
  ).toStrictEqual([newPost(2, 2)]);

  expect(
    lib.getDeletedPosts(
      [newPost(2, 2), newPost(1, 1), newPost(0, 0)],
      [newPost(3, 3), newPost(2, 2), newPost(1, 1)]
    )
  ).toStrictEqual([]);

  expect(
    lib.getDeletedPosts(
      [newPost(2, 2), newPost(1, 1), newPost(0, 0)],
      [newPost(2, 2), newPost(1, 1), newPost(0, 0)]
    )
  ).toStrictEqual([]);

  expect(
    lib.getDeletedPosts(
      [newPost(2, 2), newPost(1, 1), newPost(0, 0)],
      [newPost(3, 3), newPost(2, 2), newPost(1, 1), newPost(0, 0)]
    )
  ).toStrictEqual([]);

  expect(
    lib.getDeletedPosts([newPost(1, 1), newPost(0, 0)], [newPost(0, 0)])
  ).toStrictEqual([newPost(1, 1)]);

  expect(lib.getDeletedPosts([newPost(0, 0)], [])).toStrictEqual([]);
});

/* ================================================================
   THE FR-48a FIRST-ENTRY FLAG — unit tests (REQ-FR-48a)

   `globalThis.localStorage` is stubbed per test with a plain object
   carrying `getItem`/`setItem`, and the original global is restored
   after each test, so nothing here depends on the Node version's
   web-storage support. Every failure case asserts the safe
   direction: an unreadable or unwritable store means the long form.
   ================================================================ */

import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  DISCLOSURE_KEY,
  hasSeenDisclosure,
  markDisclosureSeen,
} from "./disclosure.ts";

const ORIGINAL = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

/** A working store backed by a plain object. */
function memoryStore() {
  const cells = {};
  return {
    cells,
    getItem: (key) => (Object.hasOwn(cells, key) ? cells[key] : null),
    setItem: (key, value) => {
      cells[key] = String(value);
    },
  };
}

function install(store) {
  Object.defineProperty(globalThis, "localStorage", {
    value: store,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  if (ORIGINAL) Object.defineProperty(globalThis, "localStorage", ORIGINAL);
  else delete globalThis.localStorage;
});

test("a fresh store reports not seen", () => {
  install(memoryStore());
  assert.equal(hasSeenDisclosure(), false);
});

test("markDisclosureSeen then hasSeenDisclosure reports seen", () => {
  const store = memoryStore();
  install(store);
  markDisclosureSeen();
  assert.equal(hasSeenDisclosure(), true);
  assert.ok(Object.hasOwn(store.cells, DISCLOSURE_KEY), "written under DISCLOSURE_KEY");
});

test("a store whose getItem throws reports not seen rather than propagating", () => {
  install({
    getItem() {
      throw new Error("SecurityError: storage disabled");
    },
    setItem() {},
  });
  assert.doesNotThrow(() => hasSeenDisclosure());
  assert.equal(hasSeenDisclosure(), false);
});

test("a store whose setItem throws leaves markDisclosureSeen returning normally", () => {
  install({
    getItem: () => null,
    setItem() {
      throw new Error("QuotaExceededError");
    },
  });
  assert.doesNotThrow(() => markDisclosureSeen());
  assert.equal(hasSeenDisclosure(), false);
});

test("an absent store reports not seen and accepts a write without throwing", () => {
  delete globalThis.localStorage;
  assert.equal(hasSeenDisclosure(), false);
  assert.doesNotThrow(() => markDisclosureSeen());
});

test("the key is versioned, so a value written under another version is not read", () => {
  const match = /\.v(\d+)$/.exec(DISCLOSURE_KEY);
  assert.ok(match, `DISCLOSURE_KEY carries a version suffix: ${DISCLOSURE_KEY}`);
  const version = Number(match[1]);
  const store = memoryStore();
  install(store);
  // A "seen" recorded by an earlier and by a later version of the key.
  const base = DISCLOSURE_KEY.slice(0, match.index);
  store.setItem(`${base}.v${version - 1}`, "seen");
  store.setItem(`${base}.v${version + 1}`, "seen");
  store.setItem(base, "seen");
  assert.equal(hasSeenDisclosure(), false);
});

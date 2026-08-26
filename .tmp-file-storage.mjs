import fs from "fs";

const STORE_PATH = new URL("./.tmp-auth-store.json", import.meta.url);

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeStore(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

// A minimal file-backed storage adapter matching supabase-js's
// SupportedStorage interface, so the PKCE code verifier (and session)
// persist across separate `node script.mjs` invocations — needed here
// because the emailed link is clicked in a step that happens in a later,
// separate process than the one that called resetPasswordForEmail().
export const fileStorage = {
  async getItem(key) {
    const store = readStore();
    return key in store ? store[key] : null;
  },
  async setItem(key, value) {
    const store = readStore();
    store[key] = value;
    writeStore(store);
  },
  async removeItem(key) {
    const store = readStore();
    delete store[key];
    writeStore(store);
  },
};

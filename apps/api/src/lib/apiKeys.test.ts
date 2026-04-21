import { generateApiKey, verifyApiKey } from "./apiKeys";

describe("apiKeys", () => {
  describe("generateApiKey", () => {
    it("generates a key with the correct prefix for live env", () => {
      const { key, prefix } = generateApiKey("live");
      expect(key.startsWith("av_live_")).toBe(true);
      expect(prefix).toBe(key.slice(0, 14));
      expect(prefix.startsWith("av_live_")).toBe(true);
    });

    it("generates a key with test prefix for test env", () => {
      const { key } = generateApiKey("test");
      expect(key.startsWith("av_test_")).toBe(true);
    });

    it("generates unique keys on each call", () => {
      const k1 = generateApiKey("live");
      const k2 = generateApiKey("live");
      expect(k1.key).not.toBe(k2.key);
    });

    it("returns a hash promise that resolves to a bcrypt hash", async () => {
      const { key, hash } = generateApiKey("live");
      const resolved = await hash;
      expect(resolved).toMatch(/^\$2[aby]\$10\$/);
      expect(resolved).not.toBe(key);
    });
  });

  describe("verifyApiKey", () => {
    it("verifies a correct key against its hash", async () => {
      const { key, hash } = generateApiKey("live");
      const resolved = await hash;
      await expect(verifyApiKey(key, resolved)).resolves.toBe(true);
    });

    it("rejects a wrong key", async () => {
      const { hash } = generateApiKey("live");
      const resolved = await hash;
      await expect(verifyApiKey("av_live_wrong_key", resolved)).resolves.toBe(false);
    });

    it("rejects a key against a different key's hash", async () => {
      const k1 = generateApiKey("live");
      const k2 = generateApiKey("live");
      const h1 = await k1.hash;
      await expect(verifyApiKey(k2.key, h1)).resolves.toBe(false);
    });
  });
});

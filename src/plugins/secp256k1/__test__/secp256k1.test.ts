import { Secp256k1LockScript } from "../secp256k1-single";

test("test secp256k1 lock script", () => {
  const script = new Secp256k1LockScript("0x86c5661a58a0589009a600b9008ec083ddf65f0b8e194aa2b1d5178fbdf8122f");
  expect(script.hash()).toEqual("0x6a242b57227484e904b4e08ba96f19a623c367dcbd18675ec6f2a71a0ff4ec26");
});
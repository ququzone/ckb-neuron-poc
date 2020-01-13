import { SimpleUDTPlugin } from "./simple-udt";

export default async function run() {
  let plugin = new SimpleUDTPlugin(
    "http://localhost:3000",
    "",
    "0x86c5661a58a0589009a600b9008ec083ddf65f0b8e194aa2b1d5178fbdf8122f",
    []
  );

  // register cache rules
  await plugin.register();

  let info = await plugin.info();
  console.log(info);

  plugin = new SimpleUDTPlugin(
    "http://localhost:3000",
    "0x6a242b57227484e904b4e08ba96f19a623c367dcbd18675ec6f2a71a0ff4ec26",
    "0xff1f91f7a63893d2f5a1bd424b139718ff6b0eb66853ace772e7a25250ce635f",
    []
  );
  info = await plugin.info();
  console.log(info);
}

run();
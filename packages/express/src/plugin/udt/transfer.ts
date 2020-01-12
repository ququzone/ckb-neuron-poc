import { SimpleUDTPlugin, IssueAction } from "./simple-udt";
import CKB from "@nervosnetwork/ckb-sdk-core";
import BigNumber from "bignumber.js";

export default async function run() {
  const plugin = new SimpleUDTPlugin(
    "http://localhost:3000",
    "",
    "0x86c5661a58a0589009a600b9008ec083ddf65f0b8e194aa2b1d5178fbdf8122f",
    []
  );

  // register cache rules
  await plugin.register();

  const info = await plugin.info();
  console.log(info);

  console.log(new BigNumber("1000000000000000").toString(16));

  console.log("----------------------------------");

  // issue UDT, totalSupply = 1000000000000000
}

run();
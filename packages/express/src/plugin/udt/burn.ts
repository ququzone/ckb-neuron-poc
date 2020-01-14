import { SimpleUDTPlugin, BurnAction } from "./simple-udt";
import CKB from "@nervosnetwork/ckb-sdk-core";

export default async function run() {
  const plugin = new SimpleUDTPlugin(
    "http://localhost:3000",
    "",
    "0x86c5661a58a0589009a600b9008ec083ddf65f0b8e194aa2b1d5178fbdf8122f",
    [new BurnAction("0x86c5661a58a0589009a600b9008ec083ddf65f0b8e194aa2b1d5178fbdf8122f")]
  );

  // register cache rules
  await plugin.register();

  console.log("----------------------------------");

  // issue UDT, totalSupply = 1000000000000000
  const tx = await plugin.actions[0].sign("1000000000000000");
  const ckb = new CKB("http://localhost:8114");
  const hash = await ckb.rpc.sendTransaction(tx);
  console.log(`burn hash: ${hash}`);
}

run();
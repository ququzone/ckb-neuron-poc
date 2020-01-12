import { SimpleUDTPlugin, TransferAction } from "./simple-udt";
import CKB from "@nervosnetwork/ckb-sdk-core";

export default async function run() {
  const plugin = new SimpleUDTPlugin(
    "http://localhost:3000",
    "",
    "0x86c5661a58a0589009a600b9008ec083ddf65f0b8e194aa2b1d5178fbdf8122f",
    [new TransferAction("0x86c5661a58a0589009a600b9008ec083ddf65f0b8e194aa2b1d5178fbdf8122f", "0x6a242b57227484e904b4e08ba96f19a623c367dcbd18675ec6f2a71a0ff4ec26")]
  );

  // register cache rules
  await plugin.register();

  const info = await plugin.info();
  console.log(info);

  console.log("----------------------------------");
  const tx = await plugin.actions[0].sign({
    hashType: "type" as CKBComponents.ScriptHashType,
    codeHash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
    args: "0xbf3e92da4911fa5f620e7b1fd27c2d0ddd0de744",
  }, 100000000000000, 1000);

  const ckb = new CKB("http://localhost:8114");
  const hash = await ckb.rpc.sendTransaction(tx);
  console.log(`transfer hash: ${hash}`);
}

run();
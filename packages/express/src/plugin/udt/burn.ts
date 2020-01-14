import { SimpleUDTPlugin, BurnAction } from "./simple-udt";
import CKB from "@nervosnetwork/ckb-sdk-core";
import { Command } from "commander"; 

export default async function run(uuid: string, key: string) {
  const plugin = new SimpleUDTPlugin(
    "http://localhost:3000",
    uuid,
    key,
    [new BurnAction(key, uuid)]
  );

  // register cache rules
  await plugin.register();

  console.log("----------------------------------");

  // issue all UDT
  const tx = await plugin.actions[0].sign();
  const ckb = new CKB("http://localhost:8114");
  const hash = await ckb.rpc.sendTransaction(tx);
  console.log(`burn hash: ${hash}`);
}

const command = new Command();
command
  .version("0.1.0")
  .option("-u, --uuid <uuid>", "UDT uuid")
  .option("-k, --key <key>", "private key args")
  .parse(process.argv);

if (command.uuid && command.key) {
  run(command.uuid, command.key);
} else {
  command.help();
}

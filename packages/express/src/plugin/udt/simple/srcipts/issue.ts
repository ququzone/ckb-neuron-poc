import { SimpleUDTPlugin, IssueAction } from "./simple-udt";
import CKB from "@nervosnetwork/ckb-sdk-core";
import { Command } from "commander";

export default async function run(key: string, totalSupply: string) {
  const plugin = new SimpleUDTPlugin(
    "http://localhost:3000",
    "",
    key,
    [new IssueAction(key)]
  );

  // register cache rules
  await plugin.register();

  // issue UDT
  const tx = await plugin.actions[0].sign(totalSupply);
  const ckb = new CKB("http://localhost:8114");
  const hash = await ckb.rpc.sendTransaction(tx);
  console.log(`issue hash: ${hash}`);
}

const command = new Command();
command
  .version("0.1.0")
  .option("-k, --key <key>", "private key")
  .option("-t, --total <total>", "total supply")
  .parse(process.argv);

if (command.key && command.total) {
  run(command.key, command.total);
} else {
  command.help();
}
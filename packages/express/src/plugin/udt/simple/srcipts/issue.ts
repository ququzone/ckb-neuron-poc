import { Command } from "commander";
import CKB from "@nervosnetwork/ckb-sdk-core";
import { PluginContext } from "ckb-neuron-poc-service/lib/plugins";
import { HttpCacheService } from "../../../..";
import { SimpleUDTPlugin, IssueAction } from "..";

export default async function run(key: string, totalSupply: string) {
  const nodeUrl = "http://localhost:8114";
  const ckb = new CKB(nodeUrl);
  const cacheService = new HttpCacheService("http://localhost:3000");
  const context = new PluginContext(ckb, cacheService);

  const plugin = new SimpleUDTPlugin(
    "",
    key,
    [new IssueAction()]
  );

  context.addPlugin("simple-udt-plugin", plugin);

  // issue UDT
  const rawTx = await plugin.actions[0].transaction(totalSupply);
  const tx = plugin.sign(rawTx);
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
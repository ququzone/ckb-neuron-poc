import { Command } from "commander";
import CKB from "@nervosnetwork/ckb-sdk-core";
import { PluginContext } from "ckb-neuron-poc-service/lib/plugins";
import { HttpCacheService } from "../../../..";
import { SimpleUDTPlugin, BurnAction } from "..";

export default async function run(uuid: string, key: string) {
  const nodeUrl = "http://localhost:8114";
  const ckb = new CKB(nodeUrl);
  const cacheService = new HttpCacheService("http://localhost:3000");
  const context = new PluginContext(ckb, cacheService);

  const plugin = new SimpleUDTPlugin(
    uuid,
    key,
    [new BurnAction()]
  );

  context.addPlugin("simple-udt-plugin", plugin);

  // issue all UDT
  const rawTx = await plugin.actions[0].transaction();

  const tx = plugin.sign(rawTx);
  const hash = await ckb.rpc.sendTransaction(tx);
  console.log(`burn hash: ${hash}`);
}

const command = new Command();
command
  .version("0.1.0")
  .option("-u, --uuid <uuid>", "UDT uuid")
  .option("-k, --key <key>", "private key")
  .parse(process.argv);

if (command.uuid && command.key) {
  run(command.uuid, command.key);
} else {
  command.help();
}

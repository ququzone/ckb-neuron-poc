import { Command } from "commander";
import CKB from "@nervosnetwork/ckb-sdk-core";
import { PluginContext } from "ckb-neuron-poc-service/lib/plugins";
import { HttpCacheService } from "../../../..";
import { SimpleUDTPlugin, BalanceAction } from "..";

export default async function run(uuid: string, lockHash: string) {
  const nodeUrl = "http://localhost:8114";
  const ckb = new CKB(nodeUrl);
  const cacheService = new HttpCacheService("http://localhost:3000");
  const context = new PluginContext(ckb, cacheService);

  const plugin = new SimpleUDTPlugin(
    uuid,
    "",
    [new BalanceAction()]
  );

  context.addPlugin("simple-udt-plugin", plugin);

  console.log(await plugin.actions[0].query(lockHash));
}

const command = new Command();
command
  .version("0.1.0")
  .option("-u, --uuid <uuid>", "UDT uuid")
  .option("-h, --hash <hash>", "lock script hash")
  .parse(process.argv);

if (command.uuid && command.hash) {
  run(command.uuid, command.hash);
} else {
  command.help();
}
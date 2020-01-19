import { SimpleUDTPlugin, BalanceAction } from "./simple-udt";
import { Command } from "commander";

export default async function run(uuid: string, args: string) {
  const plugin = new SimpleUDTPlugin(
    "http://localhost:3000",
    uuid,
    "",
    [new BalanceAction(uuid)]
  );
  console.log(await plugin.actions[0].query(args));
}

const command = new Command();
command
  .version("0.1.0")
  .option("-u, --uuid <uuid>", "UDT uuid")
  .option("-h, --hash <hash>", "secp256k1 public key hash")
  .parse(process.argv);

if (command.uuid && command.hash) {
  run(command.uuid, command.hash);
} else {
  command.help();
}
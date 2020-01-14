import { SimpleUDTPlugin } from "./simple-udt";
import { Command } from "commander";

export default async function run(uuid: string, key: string) {
  const plugin = new SimpleUDTPlugin(
    "http://localhost:3000",
    uuid,
    key,
    []
  );
  console.log(await plugin.info());
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
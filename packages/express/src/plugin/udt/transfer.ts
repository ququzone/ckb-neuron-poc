import { SimpleUDTPlugin, TransferAction } from "./simple-udt";
import CKB from "@nervosnetwork/ckb-sdk-core";
import { Command } from "commander";

export default async function run(uuid: string, key: string, to: string, amount: string) {
  const plugin = new SimpleUDTPlugin(
    "http://localhost:3000",
    uuid,
    key,
    [new TransferAction(key, uuid)]
  );

  // register cache rules
  await plugin.register();

  const info = await plugin.info();
  console.log(info);

  console.log("----------------------------------");
  const tx = await plugin.actions[0].sign({
    hashType: "type" as CKBComponents.ScriptHashType,
    codeHash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
    args: to,
  }, amount, 1000);

  const ckb = new CKB("http://localhost:8114");
  const hash = await ckb.rpc.sendTransaction(tx);
  console.log(`transfer hash: ${hash}`);
}

const command = new Command();
command
  .version("0.1.0")
  .option("-u, --uuid <uuid>", "UDT uuid")
  .option("-k, --key <key>", "private key")
  .option("-t, --to <to>", "recipient, secp256k1 public key hash")
  .option("-a, --amount <amount>", "amount")
  .parse(process.argv);

if (command.uuid && command.key && command.to && command.amount) {
  run(command.uuid, command.key, command.amount, command.amount);
} else {
  command.help();
}
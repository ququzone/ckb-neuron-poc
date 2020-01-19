import { Command } from "commander";
import CKB from "@nervosnetwork/ckb-sdk-core";
import * as utils from "@nervosnetwork/ckb-sdk-utils";
import { PluginContext } from "ckb-neuron-poc-service/lib/plugins";
import { Secp256k1LockScript } from "ckb-neuron-poc-service/lib/plugins/secp256k1";
import { HttpCacheService } from "../../../..";
import { SimpleUDTPlugin, TransferAction } from "..";

export default async function run(uuid: string, key: string, to: string, amount: string) {
  const nodeUrl = "http://localhost:8114";
  const ckb = new CKB(nodeUrl);
  const cacheService = new HttpCacheService("http://localhost:3000");
  const context = new PluginContext(ckb, cacheService);

  const publicKey = utils.privateKeyToPublicKey(key);
  const publicKeyHash = `0x${utils.blake160(publicKey, "hex")}`;
  const lock = new Secp256k1LockScript(publicKeyHash);

  const plugin = new SimpleUDTPlugin(
    uuid,
    [new TransferAction()],
    lock
  );

  context.addPlugin("simple-udt-plugin", plugin);

  const info = await plugin.info();
  console.log(info);

  console.log("----------------------------------");
  const rawTx = await plugin.actions[0].transaction({
    hashType: "type" as CKBComponents.ScriptHashType,
    codeHash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
    args: to,
  }, amount);

  const tx = ckb.signTransaction(key)(rawTx, null);
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
  run(command.uuid, command.key, command.to, command.amount);
} else {
  command.help();
}
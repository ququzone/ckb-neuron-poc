import CKB from "@nervosnetwork/ckb-sdk-core";
import { Command } from "commander";
import { PluginContext } from "ckb-neuron-poc-service/lib/plugins";
import { HttpCacheService } from "../../..";
import { Keccak256Plugin, SimpleSendAction } from "..";

export default async function run(key: string, to: string, amount: string) {
  const nodeUrl = "http://localhost:8114";
  const ckb = new CKB(nodeUrl);
  const cacheService = new HttpCacheService("http://localhost:3000");
  const context = new PluginContext(ckb, cacheService);

  const plugin = new Keccak256Plugin(
    key,
    [new SimpleSendAction()]
  );

  await context.addPlugin("keccak256-test", plugin);

  const info = await plugin.info();
  console.log(info);

  console.log("----------------------------------");
  const rawTx = await plugin.actions[0].transaction({
    hashType: "data" as CKBComponents.ScriptHashType,
    codeHash: "0x966e7bf34d4f6dc7ea18c0f86fe9ced504fad7565b47f8c3e168d2e48b1e2970",
    args: to,
  }, amount, 1000);

  const tx = plugin.sign(rawTx);

  const hash = await ckb.rpc.sendTransaction(tx);
  console.log(`transfer hash: ${hash}`);
}

const command = new Command();
command
  .version("0.1.0")
  .option("-k, --key <key>", "private key")
  .option("-t, --to <to>", "recipient, secp256k1 public key hash")
  .option("-a, --amount <amount>", "amount")
  .parse(process.argv);

if (command.key && command.to && command.amount) {
  run(command.key, command.to, command.amount);
} else {
  command.help();
}
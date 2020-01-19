import { Secp256k1LockScript, Secp256k1SinglePlugin } from "..";
import CKB from "@nervosnetwork/ckb-sdk-core";
import * as BN from "bn.js";
import * as utils from "@nervosnetwork/ckb-sdk-utils";
import { DefaultAction, PluginContext } from "../..";
import { NullCacheService } from "../../../cache";

test("test secp256k1 lock script", () => {
  const script = new Secp256k1LockScript("0xedcda9513fa030ce4308e29245a22c022d0443bb");
  expect(script.hash()).toEqual("0x6a242b57227484e904b4e08ba96f19a623c367dcbd18675ec6f2a71a0ff4ec26");
});

class TestSendAction extends DefaultAction {
  name = "TestManualSendAction";

  async transaction(): Promise<CKBComponents.RawTransaction> {
    const tx = await this.baseTransaction();

    tx.inputs.push({
      previousOutput: {
        txHash: "0x5dfaac2fe7f34b803244c11b9580ca12ca32b046b9aac3889d53ebdc6cd8e5b3",
        index: "0x0",
      },
      since: "0x0",
    });
    tx.outputs.push({
      capacity: `0x${new BN(499999990000).toString(16)}`,
      lock: {
        hashType: "type" as CKBComponents.ScriptHashType,
        codeHash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
        args: "0xbf3e92da4911fa5f620e7b1fd27c2d0ddd0de744",
      },
    });
    // @ts-ignore
    tx.witnesses.push({
      lock: "",
      inputType: "",
      outputType: "",
    });
    tx.outputsData.push("0x");

    return tx;
  }
}

test("test send action", async () => {
  const nodeUrl = "http://localhost:8114";
  const ckb = new CKB(nodeUrl);
  const cacheService = new NullCacheService();
  const context = new PluginContext(ckb, cacheService);

  const secp256k1Plugin = new Secp256k1SinglePlugin(
    "0x86c5661a58a0589009a600b9008ec083ddf65f0b8e194aa2b1d5178fbdf8122f",
    [new TestSendAction()]
  );

  await context.addPlugin("test-secp256k1", secp256k1Plugin);

  const tx = await secp256k1Plugin.actions[0].transaction();

  expect(utils.rawTransactionToHash(tx)).toEqual("0x5a3afc4f9ae55f8ec341ac5fb2f2205f5a8feb051db538d50c1c51dcc58358db");
});
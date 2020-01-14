import { Action, RuleName } from "ckb-neuron-poc-service/lib/plugins";
import { Secp256k1SinglePlugin, Secp256k1LockScript } from "ckb-neuron-poc-service/lib/plugins/secp256k1";
import CKB from "@nervosnetwork/ckb-sdk-core";
import * as utils from "@nervosnetwork/ckb-sdk-utils";
import axios from "axios";
import BN from "bn.js";

class SimpleSendAction implements Action {
  name = "SimpleSendAction";

  private cacheUrl: string;
  private ckb: CKB;

  private privateKey: string;
  private lock: CKBComponents.Script;

  public constructor(privateKey: string, nodeUrl: string = "http://localhost:8114", cacheUrl: string = "http://localhost:3000") {
    this.privateKey = privateKey;
    this.ckb = new CKB(nodeUrl);
    this.cacheUrl = cacheUrl;

    const script = new Secp256k1LockScript(privateKey);
    this.lock = script.script;
  }

  async sign(to: CKBComponents.Script, amount: string, fee: string): Promise<CKBComponents.RawTransaction> {
    const deps = await this.ckb.loadSecp256k1Dep();

    const total = new BN(amount).add(new BN(fee));

    const rawTx = {
      version: "0x0",
      cellDeps: [
        {
          outPoint: deps.outPoint,
          depType: "depGroup" as CKBComponents.DepType,
        },
      ],
      headerDeps: [],
      inputs: [],
      outputs: [
        {
          capacity: `0x${new BN(amount).toString(16)}`,
          lock: to,
        },
      ],
      witnesses: [],
      outputsData: ["0x"]
    };
    
    let sum = new BN(0);
    // TODO only first 100 cells
    const response = await axios.get(`${this.cacheUrl}/cells?lockHash=${utils.scriptToHash(this.lock)}`);
    for (let i = 0; i < response.data.length; i++) {
      const element = response.data[i];
      if (element.typeHashType) {
        continue;
      }

      sum = sum.add(new BN(element.capacity.slice(2), 16));
      rawTx.inputs.push({
        previousOutput: {
          txHash: element.txHash,
          index: element.index,
        },
        since: "0x0",
      });
      rawTx.witnesses.push("0x");
      if (sum.lt(total)) {
        continue;
      }
      if (sum.gt(total) && sum.sub(total).gt(new BN("6100000000"))) {
        rawTx.outputs.push({
          capacity: `0x${sum.sub(total).toString(16)}`,
          lock: this.lock,
        });
        rawTx.outputsData.push("0x");
      }
      break;
    }

    rawTx.witnesses[0] = {
      lock: "",
      inputType: "",
      outputType: "",
    };

    const signedTx = this.ckb.signTransaction(this.privateKey)(rawTx, null);

    return signedTx;
  }
}

export class HttpSecp256k1Plugin extends Secp256k1SinglePlugin {
  private url: string;
  private privateKey: string;

  public constructor(url: string, privateKey: string, actions: Action[]) {
    super(privateKey, actions);
    this.privateKey = privateKey;
    this.url = url;
  }

  public async info(): Promise<string> {
    // TODO only first 100 cells
    const response = await axios.get(`${this.url}/cells?lockHash=${this.lock.hash()}`);

    const total = response.data.reduce((sum: BN, cell: any) => {
      return sum.add(new BN(cell.capacity.slice(2), 16));
    }, new BN(0));
    return `${this.lock.hash()} balance is: ${total}`;
  }

  public async register() {
    const rules = this.cacheRules();
    rules.forEach(async rule =>  {
      await axios.post(`${this.url}/rule`, {
        name: RuleName[rule.name],
        value: rule.value
      });
    });
  }
}

export default async function run() {
  const plugin = new HttpSecp256k1Plugin(
    "http://localhost:3000",
    "0x86c5661a58a0589009a600b9008ec083ddf65f0b8e194aa2b1d5178fbdf8122f",
    [new SimpleSendAction("0x86c5661a58a0589009a600b9008ec083ddf65f0b8e194aa2b1d5178fbdf8122f")]
  );

  // register cache rules
  await plugin.register();

  const info = await plugin.info();
  console.log(info);

  console.log("----------------------------------");

  // send 2000 CKB
  const tx = await plugin.actions[0].sign({
    hashType: "type" as CKBComponents.ScriptHashType,
    codeHash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
    args: "0xbf3e92da4911fa5f620e7b1fd27c2d0ddd0de744",
  }, 200000000000, 1000);

  const ckb = new CKB("http://localhost:8114");
  
  const hash = await ckb.rpc.sendTransaction(tx);
  console.log(hash);
}

run();
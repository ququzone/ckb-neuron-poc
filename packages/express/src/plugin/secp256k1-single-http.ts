import { Action, RuleName } from "ckb-neuron-poc-service/lib/plugins";
import { Secp256k1SinglePlugin } from "ckb-neuron-poc-service/lib/plugins/secp256k1";
import axios from "axios";
import BigNumber from "bignumber.js";

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

    const total = response.data.reduce((sum: BigNumber, cell: any) => {
      return sum.plus(new BigNumber(cell.capacity, 16));
    }, new BigNumber(0));
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
  const plugin = new HttpSecp256k1Plugin("http://localhost:3000", "0x86c5661a58a0589009a600b9008ec083ddf65f0b8e194aa2b1d5178fbdf8122f", []);

  // register cache rules
  await plugin.register();

  plugin.info().then(info => {
    console.log(info);
  });
}

run();
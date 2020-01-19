import { Action, DefaultAction } from "ckb-neuron-poc-service/lib/plugins";
import { Secp256k1SinglePlugin } from "ckb-neuron-poc-service/lib/plugins/secp256k1";
import BN from "bn.js";

export class SimpleSendAction extends DefaultAction {
  name = "SimpleSendAction";

  async transaction(to: CKBComponents.Script, amount: string, fee: string): Promise<CKBComponents.RawTransaction> {
    if (!this.plugin.getContext) {
      throw new Error("host plugin must implement getContext method");
    }
    if (!this.plugin.lock) {
      throw new Error("host plugin must has lock script");
    }

    const total = new BN(amount).add(new BN(fee));

    const rawTx = await this.baseTransaction();
    rawTx.outputs.push({
      capacity: `0x${new BN(amount).toString(16)}`,
      lock: to,
    });
    rawTx.outputsData.push("0x");
    
    let sum = new BN(0);

    // TODO only first 100 cells
    const cells = await this.plugin.getContext().getCacheService().findCells({lockHash: this.plugin.lock.hash()});
    for (let i = 0; i < cells.length; i++) {
      const element = cells[i];
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
          lock: this.plugin.lock.script,
        });
        rawTx.outputsData.push("0x");
      }
      break;
    }

    // @ts-ignore
    rawTx.witnesses[0] = {
      lock: "",
      inputType: "",
      outputType: "",
    };

    return rawTx;
  }
}

export class HttpSecp256k1Plugin extends Secp256k1SinglePlugin {
  public constructor(privateKey: string, actions: Action[]) {
    super(privateKey, actions);
  }

  public async info(): Promise<string> {
    // TODO only first 100 cells
    const cells = await this.getContext().getCacheService().findCells({lockHash: this.lock.hash()});

    const total = cells.reduce((sum: BN, cell: any) => {
      return sum.add(new BN(cell.capacity.slice(2), 16));
    }, new BN(0));
    return `${this.lock.hash()} balance is: ${total}`;
  }
}

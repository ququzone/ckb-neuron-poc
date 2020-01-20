import { Action, DefaultAction } from "ckb-neuron-poc-service/lib/plugins";
import { Secp256k1SinglePlugin } from "ckb-neuron-poc-service/lib/plugins/secp256k1";
import BN from "bn.js";
import { QueryBuilder } from "ckb-neuron-poc-service/lib/cache";

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
  
    const result = await this.plugin.getContext().getCacheService().findCells(
      QueryBuilder.create()
        .setLockHash(this.plugin.lock.hash())
        .setTypeCodeHash("null")
        .setData("0x")
        .setCapacity(total)
        .build()
    );
    for (let i = 0; i < result.cells.length; i++) {
      const element = result.cells[i];
      rawTx.inputs.push({
        previousOutput: {
          txHash: element.txHash,
          index: element.index,
        },
        since: "0x0",
      });
      rawTx.witnesses.push("0x");
    }

    if (result.total.gt(total) && result.total.sub(total).gt(new BN("6100000000"))) {
      rawTx.outputs.push({
        capacity: `0x${result.total.sub(total).toString(16)}`,
        lock: this.plugin.lock.script,
      });
      rawTx.outputsData.push("0x");
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
    const result = await this.getContext().getCacheService().findCells(
    QueryBuilder.create()
      .setLockHash(this.lock.hash())
      .build()
  );

    const total = result.cells.reduce((sum: BN, cell: any) => {
      return sum.add(new BN(cell.capacity.slice(2), 16));
    }, new BN(0));
    return `${this.lock.hash()} balance is: ${total}`;
  }
}

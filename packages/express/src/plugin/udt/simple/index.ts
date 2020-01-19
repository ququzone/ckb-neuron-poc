import { Action, RuleName, Script, Rule, DefaultAction } from "ckb-neuron-poc-service/lib/plugins";
import { Secp256k1SinglePlugin } from "ckb-neuron-poc-service/lib/plugins/secp256k1";
import * as utils from "@nervosnetwork/ckb-sdk-utils";
import BN from "bn.js";

export class UDTTypeScript implements Script {
  public name: "SimpleUDTTypeScript";

  private depTxHash: string;
  private depCellIndex: string;
  private depType: string;

  public script: CKBComponents.Script;
  
  public hash(): string {
    return utils.scriptToHash(this.script);
  }

  public async deps(): Promise<CKBComponents.CellDep[]> {
    return [{
      outPoint: {
        txHash: this.depTxHash,
        index: this.depCellIndex
      },
      depType: this.depType as CKBComponents.DepType,
    }];
  }

  public constructor(uuid: string, codeHash: string, hashType: string, depTxHash: string, depCellIndex: string, depType: string) {
    this.script = {
      hashType: hashType as CKBComponents.ScriptHashType,
      codeHash: codeHash,
      args: uuid,
    };
    this.depTxHash = depTxHash;
    this.depCellIndex = depCellIndex;
    this.depType = depType;
  }
}

export class IssueAction extends DefaultAction {
  name = "IssueAction";

  async transaction(totalSupply: string, minCapacity: string = "6100000000", cellCapacity: string = "15000000000", fee: string = "1000"): Promise<CKBComponents.RawTransaction> {
    const _cellCapacity = new BN(cellCapacity)
    const _fee = new BN(fee);

    if (!this.plugin.getContext) {
      throw new Error("host plugin must implement getContext method");
    }
    if (!this.plugin.lock || !this.plugin.type) {
      throw new Error("host plugin must has lock and type script");
    }

    const total = _cellCapacity.add(_fee);

    const rawTx = await this.baseTransaction();
    rawTx.outputs.push({
      capacity: `0x${_cellCapacity.toString(16)}`,
      lock: this.plugin.lock.script,
      type: this.plugin.type.script,
    });
    rawTx.outputsData.push(`0x${new BN(totalSupply).toBuffer("le", 16).toString("hex")}`);

    let sum = new BN(0);
    // TODO only first 100 cells
    const cells = await this.plugin.getContext().getCacheService().findCells({lockHash: this.plugin.lock.hash()});
    for (let i = 0; i < cells.length; i++) {
      const element = cells[i];
      if (element.typeHash || element.data != "0x") {
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
      if (sum.gt(total) && sum.sub(total).gt(new BN(minCapacity))) {
        rawTx.outputs.push({
          capacity: `0x${sum.sub(total).toString(16)}`,
          lock: this.plugin.lock.script,
          type: undefined,
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

export class BurnAction extends DefaultAction {
  name = "BurnAction";

  async transaction(fee: string = "1000"): Promise<CKBComponents.RawTransaction> {
    if (!this.plugin.getContext) {
      throw new Error("host plugin must implement getContext method");
    }
    if (!this.plugin.lock || !this.plugin.type) {
      throw new Error("host plugin must has lock and type script");
    }
  
    const rawTx = await this.baseTransaction();
    rawTx.outputs.push({
      capacity: "",
      lock: this.plugin.lock.script,
    });
    rawTx.outputsData.push("0x");
    
    let sum = new BN(0);
    // TODO only first 100 cells
    const cells = await this.plugin.getContext().getCacheService().findCells({lockHash: this.plugin.lock.hash(), typeHash: this.plugin.type.hash()});
    for (let i = 0; i < cells.length; i++) {
      const element = cells[i];

      sum = sum.add(new BN(element.capacity.slice(2), 16));
      rawTx.inputs.push({
        previousOutput: {
          txHash: element.txHash,
          index: element.index,
        },
        since: "0x0",
      });
      rawTx.witnesses.push("0x");
    }
    rawTx.outputs[0].capacity = `0x${sum.sub(new BN(fee)).toString(16)}`;

    // @ts-ignore
    rawTx.witnesses[0] = {
      lock: "",
      inputType: "",
      outputType: "",
    };

    return rawTx;
  }
}

export class TransferAction extends DefaultAction {
  name = "TransferAction";

  async transaction(to: CKBComponents.Script, amount: string, minCapacity: string = "6100000000", cellCapacity: string = "15000000000", fee: string = "1000"): Promise<CKBComponents.RawTransaction> {
    if (!this.plugin.getContext) {
      throw new Error("host plugin must implement getContext method");
    }
    if (!this.plugin.lock || !this.plugin.type) {
      throw new Error("host plugin must has lock and type script");
    }

    const bigAmount = new BN(amount);
    let totalCKB = new BN(cellCapacity).add(new BN(fee));
    let gatheredCKB = new BN(0);

    const rawTx = await this.baseTransaction();
    rawTx.outputs.push({
      capacity: `0x${new BN(cellCapacity).toString(16)}`,
      lock: to,
      type: this.plugin.type.script
    });
    rawTx.outputsData.push(`0x${bigAmount.toBuffer("le", 16).toString("hex")}`);
  
    let sum = new BN(0);
    // TODO only first 100 cells
    let cells = await this.plugin.getContext().getCacheService().findCells({lockHash: this.plugin.lock.hash(), typeHash: this.plugin.type.hash()});
    for (let i = 0; i < cells.length; i++) {
      const element = cells[i];

      sum = sum.add(new BN(Buffer.from(element.data.slice(2), "hex"), 16, "le"));
      rawTx.inputs.push({
        previousOutput: {
          txHash: element.txHash,
          index: element.index,
        },
        since: "0x0",
      });
      rawTx.witnesses.push("0x");
      gatheredCKB = gatheredCKB.add(new BN(element.capacity.slice(2), 16));

      if (sum.lt(bigAmount)) {
        continue;
      }
    }

    if (sum.gt(bigAmount)) {
      rawTx.outputs.push({
        capacity: `0x${new BN(cellCapacity).toString(16)}`,
        lock: this.plugin.lock.script,
        type: this.plugin.type.script
      });
      rawTx.outputsData.push(`0x${sum.sub(bigAmount).toBuffer("le", 16).toString("hex")}`);
      totalCKB = totalCKB.add(new BN(cellCapacity));
    }

    sum = new BN(gatheredCKB);
    // TODO only first 100 cells
    cells = await this.plugin.getContext().getCacheService().findCells({lockHash: this.plugin.lock.hash()});
    for (let i = 0; i < cells.length; i++) {
      const element = cells[i];

      if (element.typeHash || element.data != "0x") {
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
      gatheredCKB.add(new BN(element.capacity.slice(2), 16));

      if (sum.lt(totalCKB)) {
        continue;
      }
      if (sum.gt(totalCKB) && sum.sub(totalCKB).gt(new BN(minCapacity))) {
        rawTx.outputs.push({
          capacity: `0x${sum.sub(totalCKB).toString(16)}`,
          lock: this.plugin.lock.script,
          type: undefined
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

export class BalanceAction extends DefaultAction {
  name = "BalanceAction";

  async query(lockHash: string): Promise<any> {
    if (!this.plugin.getContext) {
      throw new Error("host plugin must implement getContext method");
    }
  
    // TODO only first 100 cells
    const cells = await this.plugin.getContext().getCacheService().findCells({lockHash: lockHash, typeHash: this.plugin.type.hash()});

    const total = cells.reduce((sum: BN, cell: any) => {
      return sum.add(new BN(Buffer.from(cell.data.slice(2), "hex"), 16, "le"));
    }, new BN(0));
    return `${lockHash} balance is: ${total}`;
  }
}

export class SimpleUDTPlugin extends Secp256k1SinglePlugin {
  private uuid: string;
  public type: Script;

  public constructor(uuid: string, privateKey: string, actions: Action[],
      codeHash: string = "0x48dbf59b4c7ee1547238021b4869bceedf4eea6b43772e5d66ef8865b6ae7212",
      hashType: string = "data",
      depTxHash: string = "0x78fbb1d420d242295f8668cb5cf38869adac3500f6d4ce18583ed42ff348fa64",
      depCellIndex: string = "0x0",
      depType: string = "code"
  ) {
    super(privateKey, actions);

    if (uuid == "") {
      this.uuid = utils.scriptToHash(this.lock.script);
    } else {
      this.uuid = uuid;
    }

    this.type = new UDTTypeScript(this.uuid, codeHash, hashType, depTxHash, depCellIndex, depType);
  }

  public cacheRules(): Rule[] {
    const rules = super.cacheRules();
    return [...rules, {
      name: RuleName.TypeHash,
      value: this.type.hash(),
    }];
  }

  public async info(): Promise<string> {
    // TODO only first 100 cells
    const cells = await this.getContext().getCacheService().findCells({lockHash: this.lock.hash(), typeHash: this.type.hash()});

    const total = cells.reduce((sum: BN, cell: any) => {
      return sum.add(new BN(Buffer.from(cell.data.slice(2), "hex"), 16, "le"));
    }, new BN(0));
    return `${this.lock.hash()} balance is: ${total}`;
  }
}

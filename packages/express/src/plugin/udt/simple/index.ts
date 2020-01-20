import BN from "bn.js";
import * as utils from "@nervosnetwork/ckb-sdk-utils";
import { Action, RuleName, Script, Rule, DefaultAction, DefaultPlugin } from "ckb-neuron-poc-service/lib/plugins";
import { QueryBuilder } from "ckb-neuron-poc-service/lib/cache";
import { Cell } from "ckb-neuron-poc-service/lib/database/entity/cell";

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

    if (result.total.gt(total) && result.total.sub(total).gt(new BN(minCapacity))) {
      rawTx.outputs.push({
        capacity: `0x${result.total.sub(total).toString(16)}`,
        lock: this.plugin.lock.script
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

    const result = await this.plugin.getContext().getCacheService().findCells(
      QueryBuilder.create()
        .setLockHash(this.plugin.lock.hash())
        .setTypeHash(this.plugin.type.hash())
        .setCapacityFetcher((cell: Cell) => {
          return new BN(Buffer.from(cell.data.slice(2), "hex"), 16, "le")
        })
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
    rawTx.outputs[0].capacity = `0x${result.totalCKB.sub(new BN(fee)).toString(16)}`;

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
  
    let result = await this.plugin.getContext().getCacheService().findCells(
      QueryBuilder.create()
        .setLockHash(this.plugin.lock.hash())
        .setTypeHash(this.plugin.type.hash())
        .setCapacity(bigAmount)
        .setCapacityFetcher((cell: Cell) => {
          return new BN(Buffer.from(cell.data.slice(2), "hex"), 16, "le")
        })
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

    if (result.total.gt(bigAmount)) {
      rawTx.outputs.push({
        capacity: `0x${new BN(cellCapacity).toString(16)}`,
        lock: this.plugin.lock.script,
        type: this.plugin.type.script
      });
      rawTx.outputsData.push(`0x${result.total.sub(bigAmount).toBuffer("le", 16).toString("hex")}`);
      totalCKB = totalCKB.add(new BN(cellCapacity));
    }

    gatheredCKB = new BN(result.totalCKB);
    if (result.totalCKB.lt(totalCKB)) {
      result = await this.plugin.getContext().getCacheService().findCells(
        QueryBuilder.create()
          .setLockHash(this.plugin.lock.hash())
          .setTypeCodeHash("null")
          .setData("0x")
          .setCapacity(totalCKB.sub(result.totalCKB))
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

      gatheredCKB.iadd(result.total);
    }

    if (gatheredCKB.gt(totalCKB) && gatheredCKB.sub(totalCKB).gt(new BN(minCapacity))) {
      rawTx.outputs.push({
        capacity: `0x${gatheredCKB.sub(totalCKB).toString(16)}`,
        lock: this.plugin.lock.script
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

export class BalanceAction extends DefaultAction {
  name = "BalanceAction";

  async query(lockHash: string): Promise<any> {
    if (!this.plugin.getContext) {
      throw new Error("host plugin must implement getContext method");
    }
  
    const result = await this.plugin.getContext().getCacheService().findCells(
      QueryBuilder.create()
        .setLockHash(lockHash)
        .setTypeHash(this.plugin.type.hash())
        .setCapacityFetcher((cell: Cell) => {
          return new BN(Buffer.from(cell.data.slice(2), "hex"), 16, "le")
        })
        .build()
    );

    return `${lockHash} balance is: ${result.total}`;
  }
}

export class SimpleUDTPlugin extends DefaultPlugin {
  private uuid: string;
  public lock: Script;
  public type: Script;

  public constructor(uuid: string, actions: Action[], lock?: Script,
      codeHash: string = "0x48dbf59b4c7ee1547238021b4869bceedf4eea6b43772e5d66ef8865b6ae7212",
      hashType: string = "data",
      depTxHash: string = "0x78fbb1d420d242295f8668cb5cf38869adac3500f6d4ce18583ed42ff348fa64",
      depCellIndex: string = "0x0",
      depType: string = "code"
  ) {
    super(actions);

    if (uuid == "") {
      this.uuid = lock.hash();
    } else {
      this.uuid = uuid;
    }

    this.lock = lock;
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
    const result = await this.getContext().getCacheService().findCells(
      QueryBuilder.create()
        .setLockHash(this.lock.hash())
        .setTypeHash(this.type.hash())
        .setCapacityFetcher((cell: Cell) => {
          return new BN(Buffer.from(cell.data.slice(2), "hex"), 16, "le")
        })
        .build()
    );

    return `${this.lock.hash()} balance is: ${result.total}`;
  }
}

import { Action, RuleName, TypeScript, Rule } from "ckb-neuron-poc-service/lib/plugins";
import { Secp256k1SinglePlugin, Secp256k1LockScript } from "ckb-neuron-poc-service/lib/plugins/secp256k1";
import CKB from "@nervosnetwork/ckb-sdk-core";
import * as utils from "@nervosnetwork/ckb-sdk-utils";
import axios from "axios";
import BigNumber from "bignumber.js";

export function leftPad(origin: string, chars: number): string {
  const padding = (chars - origin.length + 1 >= 0) ? chars - origin.length + 1 : 0;
  return `0x${new Array(padding).join("0") + origin}`;
}

export class UDTTypeScript implements TypeScript {
  public name: "UDTTypeScript";

  public script: CKBComponents.Script;
  
  public hash(): string {
    return utils.scriptToHash(this.script);
  }

  public constructor(uuid: string) {
    this.script = {
      hashType: "data",
      codeHash: "0x29da1ae6cf75ff3ca035a7289562658f82e4ddfe781666f6ee728f5c1d369c90",
      args: uuid,
    };
  }
}

export class IssueAction implements Action {
  name = "IssueAction";

  private cacheUrl: string;
  private ckb: CKB;

  private privateKey: string;
  private lock: CKBComponents.Script;
  private type: CKBComponents.Script;

  public constructor(privateKey: string, uuid: string = "", nodeUrl: string = "http://localhost:8114", cacheUrl: string = "http://localhost:3000") {
    this.privateKey = privateKey;
    this.ckb = new CKB(nodeUrl);
    this.cacheUrl = cacheUrl;

    const script = new Secp256k1LockScript(privateKey);
    this.lock = script.script;

    if (uuid == "") {
      this.type = {
        hashType: "data",
        codeHash: "0x29da1ae6cf75ff3ca035a7289562658f82e4ddfe781666f6ee728f5c1d369c90",
        args: utils.scriptToHash(this.lock),
      };
    } else {
      this.type = {
        hashType: "data",
        codeHash: "0x29da1ae6cf75ff3ca035a7289562658f82e4ddfe781666f6ee728f5c1d369c90",
        args: uuid,
      };
    }
  }
  
  transaction(): Promise<CKBComponents.RawTransaction> {
    throw new Error("Method not implemented.");
  }

  async sign(totalSupply: string): Promise<CKBComponents.RawTransaction> {
    const deps = await this.ckb.loadSecp256k1Dep();

    const total = new BigNumber("15000002000");

    const rawTx = {
      version: "0x0",
      cellDeps: [
        {
          outPoint: deps.outPoint,
          depType: "depGroup" as CKBComponents.DepType,
        },
        {
          outPoint: {
            txHash: "0x85a8c3431fa0cbe36b52609dd7e70188ae38f258aa2215d6b5c784a72c8a3a95",
            index: "0x0"
          },
          depType: "code" as CKBComponents.DepType,
        },
      ],
      headerDeps: [],
      inputs: [],
      outputs: [
        {
          capacity: `0x${new BigNumber("15000000000").toString(16)}`,
          lock: this.lock,
          type: this.type,
        },
      ],
      witnesses: [],
      outputsData: [leftPad(`${new BigNumber(totalSupply).toString(16)}`, 32)]
    };
    
    let sum = new BigNumber(0);
    // TODO only first 100 cells
    const response = await axios.get(`${this.cacheUrl}/cells?lockHash=${utils.scriptToHash(this.lock)}`);
    for (let i = 0; i < response.data.length; i++) {
      const element = response.data[i];
      if (element.typeHashType || element.data != "0x") {
        continue;
      }

      sum = sum.plus(new BigNumber(element.capacity, 16));
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
      if (sum.gt(total) && sum.minus(total).gt(new BigNumber("6100000000"))) {
        rawTx.outputs.push({
          capacity: `0x${sum.minus(total).toString(16)}`,
          lock: this.lock,
          type: undefined,
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

export class BurnAction implements Action {
  name = "BurnAction";

  private cacheUrl: string;
  private ckb: CKB;

  private privateKey: string;
  private lock: CKBComponents.Script;
  private type: CKBComponents.Script;

  public constructor(privateKey: string, uuid: string = "", nodeUrl: string = "http://localhost:8114", cacheUrl: string = "http://localhost:3000") {
    this.privateKey = privateKey;
    this.ckb = new CKB(nodeUrl);
    this.cacheUrl = cacheUrl;

    const script = new Secp256k1LockScript(privateKey);
    this.lock = script.script;

    if (uuid == "") {
      this.type = {
        hashType: "data",
        codeHash: "0x29da1ae6cf75ff3ca035a7289562658f82e4ddfe781666f6ee728f5c1d369c90",
        args: utils.scriptToHash(this.lock),
      };
    } else {
      this.type = {
        hashType: "data",
        codeHash: "0x29da1ae6cf75ff3ca035a7289562658f82e4ddfe781666f6ee728f5c1d369c90",
        args: uuid,
      };
    }
  }
  
  transaction(): Promise<CKBComponents.RawTransaction> {
    throw new Error("Method not implemented.");
  }

  async sign(totalSupply: string): Promise<CKBComponents.RawTransaction> {
    const deps = await this.ckb.loadSecp256k1Dep();

    const rawTx = {
      version: "0x0",
      cellDeps: [
        {
          outPoint: deps.outPoint,
          depType: "depGroup" as CKBComponents.DepType,
        },
        {
          outPoint: {
            txHash: "0x85a8c3431fa0cbe36b52609dd7e70188ae38f258aa2215d6b5c784a72c8a3a95",
            index: "0x0"
          },
          depType: "code" as CKBComponents.DepType,
        },
      ],
      headerDeps: [],
      inputs: [],
      outputs: [
        {
          capacity: "",
          lock: this.lock,
        },
      ],
      witnesses: [],
      outputsData: ["0x"]
    };
    
    let sum = new BigNumber(0);
    // TODO only first 100 cells
    const response = await axios.get(`${this.cacheUrl}/cells?lockHash=${utils.scriptToHash(this.lock)}&typeHash=${utils.scriptToHash(this.type)}`);
    for (let i = 0; i < response.data.length; i++) {
      const element = response.data[i];

      sum = sum.plus(new BigNumber(element.capacity, 16));
      rawTx.inputs.push({
        previousOutput: {
          txHash: element.txHash,
          index: element.index,
        },
        since: "0x0",
      });
      rawTx.witnesses.push("0x");
    }
    rawTx.outputs[0].capacity = `0x${sum.minus(new BigNumber("1000")).toString(16)}`;

    rawTx.witnesses[0] = {
      lock: "",
      inputType: "",
      outputType: "",
    };

    const signedTx = this.ckb.signTransaction(this.privateKey)(rawTx, null);

    return signedTx;
  }
}

export class TransferAction implements Action {
  name = "TransferAction";

  private cacheUrl: string;
  private ckb: CKB;

  private privateKey: string;
  private lock: CKBComponents.Script;
  private type: CKBComponents.Script;

  public constructor(privateKey: string, uuid: string, nodeUrl: string = "http://localhost:8114", cacheUrl: string = "http://localhost:3000") {
    this.privateKey = privateKey;
    this.ckb = new CKB(nodeUrl);
    this.cacheUrl = cacheUrl;

    const script = new Secp256k1LockScript(privateKey);
    this.lock = script.script;

    this.type = {
      hashType: "data",
      codeHash: "0x29da1ae6cf75ff3ca035a7289562658f82e4ddfe781666f6ee728f5c1d369c90",
      args: uuid,
    };
  }
  
  transaction(): Promise<CKBComponents.RawTransaction> {
    throw new Error("Method not implemented.");
  }

  async sign(to: CKBComponents.Script, amount: string, fee: string): Promise<CKBComponents.RawTransaction> {
    const deps = await this.ckb.loadSecp256k1Dep();

    const bigAmount = new BigNumber(amount);
    const totalCKB = new BigNumber("15000000000").plus(new BigNumber(fee));
    const gatheredCKB = new BigNumber(0);

    const rawTx = {
      version: "0x0",
      cellDeps: [
        {
          outPoint: deps.outPoint,
          depType: "depGroup" as CKBComponents.DepType,
        },
        {
          outPoint: {
            txHash: "0x85a8c3431fa0cbe36b52609dd7e70188ae38f258aa2215d6b5c784a72c8a3a95",
            index: "0x0"
          },
          depType: "code" as CKBComponents.DepType,
        },
      ],
      headerDeps: [],
      inputs: [],
      outputs: [
        {
          capacity: `0x${new BigNumber("15000000000").toString(16)}`,
          lock: to,
          type: this.type
        },
      ],
      witnesses: [],
      outputsData: [leftPad(`${bigAmount.toString(16)}`, 32)]
    };
  
    let sum = new BigNumber(0);
    // TODO only first 100 cells
    let response = await axios.get(`${this.cacheUrl}/cells?lockHash=${utils.scriptToHash(this.lock)}&typeHash=${utils.scriptToHash(this.type)}`);
    for (let i = 0; i < response.data.length; i++) {
      const element = response.data[i];

      sum = sum.plus(new BigNumber(element.data.slice(2), 16));
      rawTx.inputs.push({
        previousOutput: {
          txHash: element.txHash,
          index: element.index,
        },
        since: "0x0",
      });
      rawTx.witnesses.push("0x");
      gatheredCKB.plus(new BigNumber(element.capacity, 16));

      if (sum.lt(bigAmount)) {
        continue;
      }
    }

    if (sum.gt(bigAmount)) {
      rawTx.outputs.push({
        capacity: `0x${new BigNumber("15000000000").toString(16)}`,
        lock: this.lock,
        type: this.type
      });
      rawTx.outputsData.push(leftPad(`${sum.minus(bigAmount).toString(16)}`, 32));
      totalCKB.plus(new BigNumber("15000000000"));
    }

    sum = new BigNumber(gatheredCKB);
    // TODO only first 100 cells
    response = await axios.get(`${this.cacheUrl}/cells?lockHash=${utils.scriptToHash(this.lock)}`);
    for (let i = 0; i < response.data.length; i++) {
      const element = response.data[i];

      if (element.type || element.data != "0x") {
        continue;
      }

      sum = sum.plus(new BigNumber(element.capacity, 16));
      rawTx.inputs.push({
        previousOutput: {
          txHash: element.txHash,
          index: element.index,
        },
        since: "0x0",
      });
      rawTx.witnesses.push("0x");
      gatheredCKB.plus(new BigNumber(element.capacity, 16));

      if (sum.lt(totalCKB)) {
        continue;
      }
      if (sum.gt(totalCKB) && sum.minus(totalCKB).gt(new BigNumber("6100000000"))) {
        rawTx.outputs.push({
          capacity: `0x${sum.minus(totalCKB).toString(16)}`,
          lock: this.lock,
          type: undefined
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

export class SimpleUDTPlugin extends Secp256k1SinglePlugin {
  private uuid: string;
  private type: TypeScript;
  private url: string;
  private privateKey: string;

  public constructor(url: string, uuid: string, privateKey: string, actions: Action[]) {
    super(privateKey, actions);

    if (uuid == "") {
      this.uuid = utils.scriptToHash(this.lock.script);
    } else {
      this.uuid = uuid;
    }

    this.type = new UDTTypeScript(this.uuid);
    this.privateKey = privateKey;
    this.url = url;
  }

  public cacheRules(): Rule[] {
    const rules = super.cacheRules();
    return [...rules, {
      name: RuleName.TypeHash,
      value: this.type.hash(),
    }];
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

  public async info(): Promise<string> {
    // TODO only first 100 cells
    const response = await axios.get(`${this.url}/cells?lockHash=${this.lock.hash()}&typeHash=${this.type.hash()}`);

    const total = response.data.reduce((sum: BigNumber, cell: any) => {
      return sum.plus(new BigNumber(cell.data.slice(2), 16));
    }, new BigNumber(0));
    return `${this.lock.hash()} balance is: ${total}`;
  }
}

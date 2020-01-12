import { Action, RuleName, TypeScript, Rule } from "ckb-neuron-poc-service/lib/plugins";
import { Secp256k1SinglePlugin, Secp256k1LockScript } from "ckb-neuron-poc-service/lib/plugins/secp256k1";
import CKB from "@nervosnetwork/ckb-sdk-core";
import * as utils from "@nervosnetwork/ckb-sdk-utils";
import axios from "axios";
import BigNumber from "bignumber.js";

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
      outputsData: [utils.toHexInLittleEndian(`0x${new BigNumber(totalSupply).toString(16)}`, 16)]
    };
    
    let sum = new BigNumber(0);
    // TODO only first 100 cells
    const response = await axios.get(`${this.cacheUrl}/cells?lockHash=${utils.scriptToHash(this.lock)}`);
    for (let i = 0; i < response.data.length; i++) {
      const element = response.data[i];
      if (element.typeHashType) {
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
}
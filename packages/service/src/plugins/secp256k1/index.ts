import * as utils from "@nervosnetwork/ckb-sdk-utils";
import CKB from "@nervosnetwork/ckb-sdk-core";
import { Action, Plugin, Script, Rule, RuleName, PluginContext } from "..";

export class Secp256k1LockScript implements Script {
  public name: "Secp256k1SingleLockScript";

  public script: CKBComponents.Script;

  private ckb: CKB;
  
  public hash(): string {
    return utils.scriptToHash(this.script);
  }

  public constructor(arg: string) {
    this.script = {
      hashType: "type",
      codeHash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
      args: arg,
    };
  }

  public async deps(): Promise<CKBComponents.CellDep[]> {
    const dep = await this.ckb.loadSecp256k1Dep();
    return [{
      outPoint: dep.outPoint,
      depType: "depGroup" as CKBComponents.DepType,
    }];
  }
  
  public setContext(context: PluginContext): void {
    this.ckb = context.getCKB();
  }
}

export class Secp256k1SinglePlugin implements Plugin {
  public name = "Secp256k1Single";

  public description = "secp256k1 single sign plugin."

  public lock: Secp256k1LockScript;

  public actions: Action[];

  private privateKey: string;

  private context: PluginContext;

  public cacheRules(): Rule[] {
    if (this.lock) {
      return [{
        name: RuleName.LockHash,
        value: this.lock.hash(),
      }];
    }
    return [];
  }

  public async info(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  public constructor(privateKey: string, actions: Action[]) {
    if (privateKey) {
      const publicKey = utils.privateKeyToPublicKey(privateKey);
      const publicKeyHash = `0x${utils.blake160(publicKey, "hex")}`;
      this.lock = new Secp256k1LockScript(publicKeyHash);
    }
    this.privateKey = privateKey;
    this.actions = actions;
  }

  public setContext(context: PluginContext) {
    this.context = context;
  }

  public getContext(): PluginContext {
    return this.context;
  }

  public sign(tx: CKBComponents.RawTransaction): CKBComponents.RawTransaction {
    return this.context.getCKB().signTransaction(this.privateKey)(tx, null);
  }
}
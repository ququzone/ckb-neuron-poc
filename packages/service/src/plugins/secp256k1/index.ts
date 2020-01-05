import { Action, Plugin, LockScript, Rule, RuleName } from "..";
import * as utils from "@nervosnetwork/ckb-sdk-utils";

export class Secp256k1LockScript implements LockScript {
  public name: "Secp256k1SingleLockScript";

  public script: CKBComponents.Script;
  
  public hash(): string {
    return utils.scriptToHash(this.script);
  }

  public constructor(privateKey: string) {
    const publicKey = utils.privateKeyToPublicKey(privateKey);
    const publicKeyHash = `0x${utils.blake160(publicKey, "hex")}`;
  
    this.script = {
      hashType: "type",
      codeHash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
      args: publicKeyHash,
    };
  }
}

export class Secp256k1SinglePlugin implements Plugin {
  public name = "Secp256k1Single";

  public description = "secp256k1 single sign plugin."

  public lock: Secp256k1LockScript;

  public actions: Action[];

  public cacheRules(): Rule[] {
    return [{
      name: RuleName.LockHash,
      value: this.lock.hash(),
    }];
  }

  public async info(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  public constructor(privateKey: string, actions: Action[]) {
    this.lock = new Secp256k1LockScript(privateKey);
    this.actions = actions;
  }
}
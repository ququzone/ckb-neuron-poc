import { Action } from "ckb-neuron-poc-service/lib/plugins";
import { Secp256k1SinglePlugin } from "ckb-neuron-poc-service/lib/plugins/secp256k1";

export class HttpSecp256k1Plugin extends Secp256k1SinglePlugin {
  public constructor(privateKey: string, actions: Action[]) {
    super(privateKey, actions);
  }

  public async info(): Promise<string> {
    
    return "";
  }
}
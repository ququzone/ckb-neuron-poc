import * as utils from "@nervosnetwork/ckb-sdk-utils";
import * as web3 from "web3-utils";
import * as ethUtil from 'ethereumjs-util'
import Account from "eth-lib/lib/account";
import Hash from "eth-lib/lib/hash";
import BN from "bn.js";
import { QueryBuilder } from "ckb-neuron-poc-service/lib/cache";
import { Script, DefaultPlugin, Action, Rule, RuleName, DefaultAction } from "ckb-neuron-poc-service/lib/plugins";

function mergeTypedArraysUnsafe(a: any, b: any) {
  var c = new a.constructor(a.length + b.length);
  c.set(a);
  c.set(b, a.length);

  return c;
}

function hashMessage(data) {
  var message = web3.isHexStrict(data) ? utils.hexToBytes(data) : data;
  var messageBuffer = Buffer.from(message);
  var preamble = '\x19Ethereum Signed Message:\n' + message.length;
  var preambleBuffer = Buffer.from(preamble);
  var ethMessage = Buffer.concat([preambleBuffer, messageBuffer]);
  return Hash.keccak256s(ethMessage);
};

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

// TODO only for testnet
export class Keccak256LockScript implements Script {
  public name: "Keccak256LockScript";

  public script: CKBComponents.Script;
  
  public hash(): string {
    return utils.scriptToHash(this.script);
  }

  public constructor(arg: string) {
    this.script = {
      hashType: "type",
      codeHash: "0xac8a4bc0656aeee68d4414681f4b2611341c4f0edd4c022f2d250ef8bb58682f",
      args: arg,
    };
  }

  public async deps(): Promise<CKBComponents.CellDep[]> {
    return [{
      outPoint: {
        txHash: "0x15fb8111fc78fa36da6af96c45ac4714cc9a33974fdae13cc524b29e1a488c7f",
        index: "0x3"
      },
      depType: "code" as CKBComponents.DepType,
    }, {
      outPoint: {
        txHash: "0xcbb9503a8dfdfba7a4ee4661727aef74a5d90c687aee2eaee31652716c931a37",
        index: "0x0"
      },
      depType: "code" as CKBComponents.DepType,
    }];
  }
}

export class Keccak256Plugin extends DefaultPlugin {
  public name = "Keccak256Plugin";

  public description = "keccak256 single sign plugin."

  public lock: Keccak256LockScript;

  public actions: Action[];

  private privateKey: string;

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

  public constructor(privateKey: string, actions: Action[]) {
    super(actions);
    if (!privateKey.startsWith("0x")) {
      privateKey = "0x" + privateKey;
    }
  
    if (privateKey) {
      const account = Account.fromPrivate(privateKey);
      this.lock = new Keccak256LockScript(account.address.toLowerCase());
    }
    this.privateKey = privateKey;
    this.actions = actions;
  }

  public sign(tx: CKBComponents.RawTransaction): CKBComponents.RawTransaction {
    const txHash = utils.rawTransactionToHash(tx);
  
    const emptyWitness = {
      // @ts-ignore
      ...tx.witnesses[0],
      lock: `0x${'0'.repeat(130)}`
    }

    const serializedEmptyWitnessBytes = utils.hexToBytes(
      utils.serializeWitnessArgs(emptyWitness)
    );
    const serialziedEmptyWitnessSize = serializedEmptyWitnessBytes.length;

    let hashBytes = utils.hexToBytes(txHash);

    hashBytes = mergeTypedArraysUnsafe(
      hashBytes,
      utils.hexToBytes(
        utils.toHexInLittleEndian(`0x${serialziedEmptyWitnessSize.toString(16)}`, 8)
      )
    );
    hashBytes = mergeTypedArraysUnsafe(hashBytes, serializedEmptyWitnessBytes);

    tx.witnesses.slice(1).forEach(w => {
      const bytes = utils.hexToBytes(
        typeof w === 'string' ? w : utils.serializeWitnessArgs(w)
      );
      hashBytes = mergeTypedArraysUnsafe(
        hashBytes,
        utils.hexToBytes(utils.toHexInLittleEndian(`0x${bytes.length.toString(16)}`, 8))
      );
      hashBytes = mergeTypedArraysUnsafe(hashBytes, bytes);
    });
    // @ts-ignore
    const message = web3.sha3(hashBytes);

    let signatureHexString = Account.sign(hashMessage(message), this.privateKey);
    let signatureObj = ethUtil.fromRpcSig(signatureHexString);
    signatureObj.v -= 27;
    
    signatureHexString = ethUtil.bufferToHex(
      Buffer.concat([
        ethUtil.setLengthLeft(signatureObj.r, 32),
        ethUtil.setLengthLeft(signatureObj.s, 32),
        ethUtil.toBuffer(signatureObj.v)
      ])
    );

    emptyWitness.lock = signatureHexString

    let signedWitnesses = [
      utils.serializeWitnessArgs(emptyWitness),
      ...tx.witnesses.slice(1)
    ]

    let result = {
      ...tx,
      witnesses: signedWitnesses.map(witness =>
        typeof witness === 'string' ? witness : utils.serializeWitnessArgs(witness)
      )
    }

    return result;
  }
}
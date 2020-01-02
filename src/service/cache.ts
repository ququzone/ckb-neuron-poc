import CKB from "@nervosnetwork/ckb-sdk-core";
import * as utils from "@nervosnetwork/ckb-sdk-utils";
import MetadataRepository from "../database/metadata-repository";
import RuleRepository from "../database/rule-repository";
import CellRepository from "../database/cell-repository";
import logger from "../utils/logger";
import common from "../utils/common";
import { Cell } from "../database/entity/cell";
import { Rule } from "../plugins/plugin";

export default class CacheService {
  private ckb: CKB;
  private metadataRepository: MetadataRepository;
  private ruleRepository: RuleRepository;
  private cellReposicory: CellRepository;
  private rules: Map<string, string[]>;
  private currentBlock: BigInt;
  private stopped = false;

  public constructor(ckb: CKB) {
    this.ckb = ckb;
    this.metadataRepository = new MetadataRepository();
    this.ruleRepository = new RuleRepository();
    this.cellReposicory = new CellRepository();

    this.rules = new Map();
    this.rules.set("LockCodeHash", []);
    this.rules.set("LockHash", []);
    this.rules.set("TypeCodeHash", []);
    this.rules.set("TypeHash", []);
  }

  public async reset() {
    this.stopped = true;
    await this.cellReposicory.clear();
    this.stopped = false;
  }

  public stop() {
    this.stopped = true;
  }

  public async addRule(rule: Rule) {
    await this.ruleRepository.save({id: null, name: rule.name.toString(), data: rule.value});
    const rules = this.rules.get(rule.name.toString());
    for (let i = 0; i < rules.length; i++) {
      if (rules[i] === rule.value) {
        return;
      }
    }
    rules.push(rule.value);
  }

  public async start() {
    const currentBlockS = await this.metadataRepository.findCurrentBlock();
    this.currentBlock = BigInt(currentBlockS) - BigInt(1);

    const rules = await this.ruleRepository.all();
    rules.forEach(rule => {
      const rules = this.rules.get(rule.name);
      rules.push(rule.data);
    });

    while (!this.stopped) {
      let synced = false;
      try {
        const header = await this.ckb.rpc.getTipHeader();
        const headerNumber = BigInt(header.number);
        while (this.currentBlock <= headerNumber) {
          logger.debug(`begin sync block: ${this.currentBlock.toString(10)}`);
          const block = await this.ckb.rpc.getBlockByNumber(this.currentBlock.toString(10));
          synced = true;
          block.transactions.forEach(tx => {
            tx.inputs.forEach(input => {
              this.cellReposicory.remove(input.previousOutput.txHash, input.previousOutput.index);
            });
            for (let i = 0; i < tx.outputs.length; i++) {
              const output = tx.outputs[i];
              if (this.checkCell(output)) {
                const cell = new Cell();
                cell.txHash = tx.hash;
                cell.index = String(i);
                cell.capacity = output.capacity;
                cell.lockHash = utils.scriptToHash(output.lock);
                cell.lockCodeHash = output.lock.codeHash;
                cell.lockHashType = output.lock.hashType;
                cell.lockArgs = output.lock.args;
                if (output.type) {
                  cell.typeHash = utils.scriptToHash(output.type);
                  cell.typeCodeHash = output.type.codeHash;
                  cell.typeHashType = output.type.hashType;
                  cell.typeArgs = output.type.args;
                }
                cell.data = tx.outputsData[i];
                this.cellReposicory.save(cell);
              }
            }
          });

          this.currentBlock = BigInt(this.currentBlock) + BigInt(1);
        }
      } catch (err) {
        logger.error("cache cells error:", err);
      } finally {
        if (synced) {
          await this.metadataRepository.updateCurrentBlock(this.currentBlock.toString(10));
        }
        await this.yield(10000);
      }
    }
  }
  
  private checkCell(output: CKBComponents.CellOutput): boolean {
    const lockCodeHash = this.rules.get("LockCodeHash");
    for (let i = 0; i < lockCodeHash.length; i++) {
      if (lockCodeHash[i] === output.lock.codeHash) {
        return true;
      }
    }
    const lockHash = this.rules.get("LockHash");
    for (let i = 0; i < lockHash.length; i++) {
      if (lockHash[i] === utils.scriptToHash(output.lock)) {
        return true;
      }
    }

    if (!output.type) {
      return false;
    }
    const typeCodeHash = this.rules.get("TypeCodeHash");
    for (let i = 0; i < typeCodeHash.length; i++) {
      if (typeCodeHash[i] === output.type.codeHash) {
        return true;
      }
    }
    const typeHash = this.rules.get("TypeHash");
    for (let i = 0; i < typeHash.length; i++) {
      if (typeHash[i] === utils.scriptToHash(output.type)) {
        return true;
      }
    }

    return false;
  }

  private async yield(millisecond: number = 1) {
    await common.sleep(millisecond);
  }
}
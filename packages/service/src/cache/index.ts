/* eslint-disable @typescript-eslint/no-explicit-any */
import CKB from "@nervosnetwork/ckb-sdk-core";
import { Rule } from "../database/entity/rule";
import { Cell } from "../database/entity/cell";
import SyncService from "./sync";
import CellRepository from "../database/cell-repository";

export interface CacheService {
  addRule(rule: Rule): Promise<void>;

  allRules(): Promise<Rule[]>;

  reset(): Promise<void>;

  resetStartBlockNumber(blockNumber: string): void;

  findCells(query: any): Promise<Cell[]>;
}

export class DefaultCacheService implements CacheService {
  private syncService: SyncService;
  private cellRepository: CellRepository;

  public constructor(ckb: CKB) {
    this.syncService = new SyncService(ckb);
  }

  public async start() {
    this.syncService.start();
  }

  async addRule(rule: Rule): Promise<void> {
    return this.syncService.addRule(rule);
  }
  
  async allRules(): Promise<Rule[]> {
    return this.syncService.allRules();
  }
  
  async reset(): Promise<void> {
    return this.syncService.reset();
  }
  
  resetStartBlockNumber(blockNumber: string): void {
    this.syncService.resetStartBlockNumber(blockNumber);
  }

  async findCells(query: any): Promise<Cell[]> {
    return this.cellRepository.find(query);
  }
}
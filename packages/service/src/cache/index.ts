import * as BN from "bn.js";
import CKB from "@nervosnetwork/ckb-sdk-core";
import { Rule } from "../database/entity/rule";
import { Cell } from "../database/entity/cell";
import SyncService from "./sync";
import CellRepository from "../database/cell-repository";

export class Query {
  lockHash: string;
  lockCodeHash: string;
  typeHash: string;
  typeCodeHash: string;
  capacity: BN;
  capacityFetcher: (cell: Cell) => BN;

  constructor(queryBuilder: QueryBuilder) {
    this.lockHash = queryBuilder.lockHash;
    this.lockCodeHash = queryBuilder.lockCodeHash;
    this.typeHash = queryBuilder.typeHash;
    this.typeCodeHash = queryBuilder.typeCodeHash;
    this.capacity = queryBuilder.capacity;
    this.capacityFetcher = queryBuilder.capacityFetcher;
  }
}

export class QueryBuilder {
  private _lockHash: string;
  private _lockCodeHash: string;
  private _typeHash: string;
  private _typeCodeHash: string;
  private _capacity: BN;
  private _capacityFetcher: (cell: Cell) => BN;

  build(): Query {
    return new Query(this);
  }

  setLockHash(lockHash: string): QueryBuilder {
    this._lockHash = lockHash;
    return this;
  }

  setLockCodeHash(lockCodeHash: string): QueryBuilder {
    this._lockCodeHash = lockCodeHash;
    return this;
  }

  setTypeHash(typeHash: string): QueryBuilder {
    this._typeHash = typeHash;
    return this;
  }

  setTypeCodeHash(typeCodeHash: string): QueryBuilder {
    this._typeCodeHash = typeCodeHash;
    return this;
  }

  setCapacity(capacity: BN): QueryBuilder {
    this._capacity = capacity;
    return this;
  }

  setCapacityFetcher(capacityFetcher: (cell: Cell) => BN): QueryBuilder {
    this._capacityFetcher = capacityFetcher;
    return this;
  }

  get lockHash() {
    return this._lockHash;
  }

  get lockCodeHash() {
    return this._lockCodeHash;
  }

  get typeHash() {
    return this._typeHash;
  }

  get typeCodeHash() {
    return this._typeCodeHash;
  }

  get capacity() {
    return this._capacity;
  }

  get capacityFetcher() {
    return this._capacityFetcher;
  }
}

export interface CacheService {
  addRule(rule: Rule): Promise<void>;

  allRules(): Promise<Rule[]>;

  reset(): Promise<void>;

  resetStartBlockNumber(blockNumber: string): void;

  findCells(query: any): Promise<Cell[]>;
}

export class NullCacheService implements CacheService {
  async addRule(rule: Rule): Promise<void> {
    return;
  }
  
  async allRules(): Promise<Rule[]> {
    return [];
  }
  
  async reset(): Promise<void> {
    return;
  }
  
  resetStartBlockNumber(blockNumber: string): void {
    return;
  }

  async findCells(query: any): Promise<Cell[]> {
    return [];
  }
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
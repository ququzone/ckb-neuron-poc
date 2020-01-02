import CKB from "@nervosnetwork/ckb-sdk-core";
import MetadataRepository from "../database/metadata-repository";
import RuleRepository from "../database/rule-repository";
import CellRepository from "../database/cell-repository";

export default class CacheService {
  private ckb: CKB;
  private metadataRepository: MetadataRepository;
  private ruleRepository: RuleRepository;
  private cellReposicory: CellRepository;

  public constructor(ckb: CKB) {
    this.ckb = ckb;
    this.metadataRepository = new MetadataRepository();
    this.ruleRepository = new RuleRepository();
    this.cellReposicory = new CellRepository();
  }
}
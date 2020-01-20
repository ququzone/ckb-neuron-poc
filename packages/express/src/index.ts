import axios from "axios";
import queryString from "query-string";
import BN from "bn.js";
import { CacheService, Query, QueryResult } from "ckb-neuron-poc-service/lib/cache";
import { Rule } from "ckb-neuron-poc-service/lib/database/entity/rule";
import { RuleName } from "ckb-neuron-poc-service/lib/plugins";

export class HttpCacheService implements CacheService {
  private url: string;

  public constructor(url: string = "http://localhost:3000") {
    this.url = url;
  }

  async addRule(rule: Rule): Promise<void> {
    await axios.post(`${this.url}/rule`, {
      name: RuleName[rule.name],
      value: rule.data
    });
  }
  
  async allRules(): Promise<Rule[]> {
    const res = await axios.get(`${this.url}/rules`);
    return res.data;
  }

  async reset(): Promise<void> {
    await axios.post(`${this.url}/rule`);
  }

  resetStartBlockNumber(blockNumber: string): void {
    throw new Error("Method not implemented.");
  }

  async findCells(query: Query): Promise<QueryResult>{
    const _query = {
      lockHash: query.lockHash,
      lockCodeHash: query.lockCodeHash,
      typeHash: query.typeHash,
      typeCodeHash: query.typeCodeHash,
      data: query.data
    };

    const totalCKB = new BN(0);
    const total = new BN(0);
    const cells = [];
    let skip = 0;
    while (true) {
      let stop = false;
      // @ts-ignore
      _query.skip = skip;
      const data = (await axios.get(`${this.url}/cells?${queryString.stringify(_query)}`)).data;
      for (let i = 0; i < data.length; i++) {
        const cell = data[i];
        total.iadd(query.capacityFetcher(cell));
        totalCKB.iadd(new BN(cell.capacity.slice(2), 16));
        cells.push(cell);

        if (query.capacity && query.capacity.lte(total)) {
          stop = true;
          break;
        }
      }

      if (stop || data.length < 100) {
        break;
      }
      skip += 100;
    }

    return {
      cells: cells,
      total: total,
      totalCKB: totalCKB,
    };
  }
}

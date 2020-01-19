import axios from "axios";
import queryString from "query-string";
import { CacheService } from "ckb-neuron-poc-service/lib/cache";
import { Rule } from "ckb-neuron-poc-service/lib/database/entity/rule";
import { Cell } from "ckb-neuron-poc-service/lib/database/entity/cell";
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

  async findCells(query: any): Promise<Cell[]> {
    if (query) {
      const res = await axios.get(`${this.url}/cells?${queryString.stringify(query)}`);
      return res.data;
    }
    const res = await axios.get(`${this.url}/cells`);
    return res.data;
  }
}

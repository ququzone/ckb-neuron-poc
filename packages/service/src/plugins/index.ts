import CKB from "@nervosnetwork/ckb-sdk-core";
import { CacheService } from "../cache";

export interface Script {
  name: string;

  script: CKBComponents.Script;

  hash(): string;

  deps(): Promise<Array<CKBComponents.CellDep>>;

  setContext?(context: PluginContext): void;
}

export interface Action {
  name: string;

  transaction?(...args: Array<any>): Promise<CKBComponents.RawTransaction>;

  query?(...args: Array<any>): Promise<any>;

  setPlugin?(pugin: Plugin): void;
}

export enum RuleName {LockCodeHash, LockHash, TypeCodeHash, TypeHash}

export class Rule {
  public name: RuleName;

  public value: string;
}

export interface Plugin {
  name: string;

  description?: string;

  lock?: Script;

  type?: Script;

  actions: Array<Action>;

  cacheRules(): Array<Rule>;

  info(): Promise<string>;

  setContext?(context: PluginContext): void;

  getContext?(): PluginContext;
}

export class DefaultAction implements Action {
  public name = "DefaultAction";

  protected plugin: Plugin;

  public setPlugin(plugin: Plugin): void {
    this.plugin = plugin;
  }

  protected async baseTransaction(): Promise<CKBComponents.RawTransaction> {
    const tx = {
      version: "0x0",
      cellDeps: [],
      headerDeps: [],
      inputs: [],
      outputs: [],
      witnesses: [],
      outputsData: []
    };

    if (this.plugin && this.plugin.lock) {
      tx.cellDeps.push(...await this.plugin.lock.deps());
    }
    if (this.plugin && this.plugin.type) {
      tx.cellDeps.push(...await this.plugin.type.deps());
    }
    return tx;
  }
}

export class DefaultPlugin implements Plugin {
  name: string;
  actions: Action[];

  private context: PluginContext;

  public constructor(actions: Action[]) {
    this.actions = actions;
  }

  cacheRules(): Rule[] {
    throw new Error("Method not implemented.");
  }

  info(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  setContext(context: PluginContext): void {
    this.context = context;
  }

  getContext(): PluginContext {
    return this.context;
  }
}

export class PluginContext {
  private readonly plugins: {
    [key: string]: Plugin;
  };

  private readonly cacheService: CacheService;

  private readonly ckb: CKB;

  public constructor(ckb: CKB, cacheService: CacheService) {
    this.ckb = ckb;
    this.cacheService = cacheService;
    this.plugins = {};
  }

  public getCKB(): CKB {
    return this.ckb;
  }

  public getCacheService(): CacheService {
    return this.cacheService;
  }

  public async addPlugin(key: string, plugin: Plugin): Promise<void> {
    if (this.plugins[key]) {
      throw new Error(`${key} plugin alreay exists`);
    }

    const rules = plugin.cacheRules();
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      console.log({
        id: null,
        name: RuleName[rule.name].toString(),
        data: rule.value,
      });
      await this.cacheService.addRule({
        id: undefined,
        name: RuleName[rule.name].toString(),
        data: rule.value,
      });
    }
    if (plugin.setContext) {
      plugin.setContext(this);
      if (plugin.lock && plugin.lock.setContext) {
        plugin.lock.setContext(this);
      }
      if (plugin.type && plugin.type.setContext) {
        plugin.type.setContext(this);
      }
      for (let i = 0; i < plugin.actions.length; i++) {
        const action = plugin.actions[i];
        if (action.setPlugin) {
          action.setPlugin(plugin);
        }
      }
    }
    this.plugins[key] = plugin;
  }

  public getPlugin(key: string): Plugin {
    return this.plugins[key];
  }
}
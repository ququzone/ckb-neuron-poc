/* eslint-disable @typescript-eslint/no-explicit-any */
export interface BaseScript {
  name: string;

  hash(): string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LockScript extends BaseScript {
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TypeScript extends BaseScript {
}

export interface Action {
  name: string;

  transaction(...args: Array<any>): Promise<CKBComponents.RawTransaction>;

  sign(...args: Array<any>): Promise<CKBComponents.RawTransaction>;
}

export enum RuleName {LockCodeHash, LockCodeHashAndArgs, LockHash, TypeCodeHash, TypeCodeHashAndArgs, TypeHash}

export class Rule {
  public name: RuleName;

  public value: string;
}

export interface Plugin {
  name: string;

  description: string;

  lock: LockScript;

  type?: TypeScript;

  actions: Array<Action>;

  cacheRules(): Array<Rule>;
}
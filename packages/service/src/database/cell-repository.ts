import { getRepository } from "typeorm";
import { Cell } from "./entity/cell";

export default class CellRepository {
  private repository = getRepository(Cell);

  async save(cell: Cell) {
    const exists = await this.repository.findOne({txHash: cell.txHash, index: cell.index});

    if (!exists) {
      await this.repository.save(cell);
    }
  }

  async remove(txHash: string, index: string) {
    await this.repository.delete({txHash: txHash, index: index});
  }

  async updateUsed(status: string, txHash: string, blockNumber: string, previousTxHash: string, previousIndex: string) {
    await this.repository.update(
      {txHash: previousTxHash, index: previousIndex},
      {status: status, usedTxHash: txHash, usedBlockNumber: blockNumber}
    );
  }

  async clear() {
    await this.repository.delete({});
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async find(query: any): Promise<Cell[]> {
    const selectBuilder = this.repository.createQueryBuilder().where("status = 'normal'");
    if (query.lockHash) {
      selectBuilder.andWhere("lockHash = :lockHash", {lockHash: query.lockHash});
    }
    if (query.lockCodeHash) {
      selectBuilder.andWhere("lockCodeHash = :lockCodeHash", {lockCodeHash: query.lockCodeHash});
    }
    if (query.typeHash) {
      selectBuilder.andWhere("typeHash = :typeHash", {typeHash: query.typeHash});
    }
    if (query.typeCodeHash) {
      selectBuilder.andWhere("typeCodeHash = :typeCodeHash", {typeCodeHash: query.typeCodeHash});
    }

    if (query.skip) {
      selectBuilder.skip(query.skip);
    }
    selectBuilder.take(100);
    return await selectBuilder.getMany();
  }
}
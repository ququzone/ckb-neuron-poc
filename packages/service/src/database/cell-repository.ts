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

  async remove(id: number) {
    await this.repository.delete({id: id});
  }

  async updateUsed(status: string, txHash: string, blockNumber: string, previousTxHash: string, previousIndex: string) {
    await this.repository.update(
      {txHash: previousTxHash, index: previousIndex},
      {status: status, usedTxHash: txHash, usedBlockNumber: blockNumber}
    );
  }

  async updateStatus(id: number, oldStatus: string, newStatus: string) {
    await this.repository.update(
      {id: id, status: oldStatus},
      {status: newStatus}
    );
  }

  async findByStatus(status: string): Promise<Cell[]> {
    return await this.repository.find({status: status});
  }

  async clear() {
    await this.repository.delete({});
  }

  async find(query: any): Promise<Cell[]> {
    const selectBuilder = this.repository.createQueryBuilder().where("(status = 'normal' or status = 'pending')");
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
    selectBuilder.orderBy("id", "ASC");
    selectBuilder.take(100);
    return await selectBuilder.getMany();
  }
}
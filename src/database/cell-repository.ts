import { getRepository } from "typeorm";
import { Cell } from "./entity/cell";

export default class CellRepository {
  private repository = getRepository(Cell);

  async save(cell: Cell): Promise<void> {
    const exists = await this.repository.findOne({txHash: cell.txHash, index: cell.index});

    if (!exists) {
      await this.repository.save(cell);
    }
  }

  async remove(txHash: string, index: string) {
    await this.repository.delete({txHash: txHash, index: index});
  }
}
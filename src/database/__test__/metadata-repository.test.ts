import initConnection from "..";
import MetadataRepository from "../metadata-repository";

beforeAll(async () => {
  await initConnection();
});

test("test find current block", async ()=> {
  const repository = new MetadataRepository();
  const currentBlock = await repository.findCurrentBlock();
  expect(currentBlock).not.toBeNull();
});

test("test update current block", async ()=> {
  const repository = new MetadataRepository();
  await repository.updateCurrentBlock("100");
});
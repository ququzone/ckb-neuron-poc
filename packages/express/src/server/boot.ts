import express from "express";
import * as bodyParser from "body-parser";
import {Request, Response} from "express";
import CKB from "@nervosnetwork/ckb-sdk-core";

import initConnection from "ckb-neuron-poc-service/lib/database";
import { DefaultCacheService } from "ckb-neuron-poc-service/lib/cache";
import CellRepository from "ckb-neuron-poc-service/lib/database/cell-repository";

initConnection({
  "type": "sqlite",
  "database": "database.sqlite",
  "synchronize": true,
  "logging": false,
  "entities": [
    "node_modules/ckb-neuron-poc-service/lib/database/entity/*.js"
  ]
}).then(() => {
  const nodeUrl = "http://localhost:8114";
  const ckb = new CKB(nodeUrl);
  const cache = new DefaultCacheService(ckb);

  const app = express();
  app.use(bodyParser.json());
  const cellRepository = new CellRepository();

  app.post("/rule", (req: Request, res: Response) => {
    cache.addRule({id:null, name: req.body.name, data: req.body.data});
    return res.end();
  });

  app.get("/rules", async (req: Request, res: Response) => {
    const rules = await cache.allRules();
    res.json(rules);
  });

  app.get("/cells", async (req: Request, res: Response) => {
    const cells = await cellRepository.find(req.query);
    res.json(cells);
  });

  app.post("/reset", (req: Request, res: Response) => {
    cache.resetStartBlockNumber(req.body.blockNumber);
    return res.end();
  });

  app.listen(3000);
  cache.start();

  console.info("Cache server has started on port 3000.");
}).catch(error => console.error("start server error:", error));

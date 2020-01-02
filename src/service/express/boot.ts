import express from "express";
import * as bodyParser from "body-parser";
import {Request, Response} from "express";
import CKB from "@nervosnetwork/ckb-sdk-core";

import logger from "../../utils/logger";
import initConnection from "../../database";
import CacheService from "../cache";

initConnection().then(() => {
  const nodeUrl = "http://localhost:8114";
  const ckb = new CKB(nodeUrl);
  const cache = new CacheService(ckb);

  const app = express();
  app.use(bodyParser.json());

  app.post("/rule", (req: Request, res: Response) => {
    cache.addRule({id:null, name: req.body.name, data: req.body.value});
    return res.end();
  });

  app.get("/rules", async (req: Request, res: Response) => {
    const rules = await cache.allRules();
    res.json(rules);
  });

  app.listen(3000);
  cache.start();

  logger.info("Cache server has started on port 3000.");
}).catch(error => logger.error("start server error:", error));

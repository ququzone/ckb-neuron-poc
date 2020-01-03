import { createConnection, getConnection } from "typeorm";
import logger from "../utils/logger";

export const initConnection = async () => {
  // try to close connection, if not exist, will throw ConnectionNotFoundError when call getConnection()
  try {
    await getConnection().close();
  } catch (err) {
    // do nothing
  }

  try {
    await createConnection();
    await getConnection().manager.query("PRAGMA busy_timeout = 3000;");
    await getConnection().manager.query("PRAGMA temp_store = MEMORY;");
  } catch (err) {
    logger.error(err.message);
  }
};

export default initConnection;
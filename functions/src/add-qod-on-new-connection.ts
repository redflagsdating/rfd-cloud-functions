import {logger} from "firebase-functions/v2";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {addQodFunc} from "./api/add-qod";

/**
 * Add QoD at connection.onDocumentCreated trigger
 */
export const addQodOnNewConnection = onDocumentCreated(
  "connection/{connectionId}",
  async (event) => {
    const connectionId = event.params.connectionId;

    logger.debug(`connection "${connectionId}" document created`);

    if (connectionId) {
      try {
        await addQodFunc(connectionId);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : error);
      }
    } else {
      logger.error("connectionId is null");
    }
  }
);

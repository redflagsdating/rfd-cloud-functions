import {logger} from "firebase-functions/v2";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {addQodFunc} from "./api/add-qod";

/**
 * Add QoD at connection.onDocumentCreated trigger
 */
export const addQodOnNewConnection = onDocumentCreated(
  "connection/{connectionId}",
  async (event) => {
    const snapshot = event.data;
    const connectionId = event.params.connectionId;

    logger.debug(`connection "${connectionId}" document created`);

    if (snapshot != null) {
      try {
        await addQodFunc(connectionId);
      } catch (error) {
        logger.error(error);
      }
    } else {
      logger.error(
        `<QueryDocumentSnapshot> of the connection (${connectionId}) is null`
      );
    }
  }
);

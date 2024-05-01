import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions/v2";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {addQodFunc} from "./api/add-qod";

/**
 * Internal function to update user's connections field in document
 * @param {string} uid
 * @param {string} connectionId
 */
async function updateUserConnections(uid: string, connectionId: string) {
  const docRef = getFirestore().collection("users").doc(uid);

  try {
    await getFirestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef);
      const userConnections: string[] = snapshot.get("connections") || [];

      if (!userConnections?.includes(connectionId)) {
        const connections = userConnections.concat([connectionId]);
        transaction.update(
          docRef,
          {
            connections,
            connectionsCount: connections.length,
          }
        );
      }
    });
  } catch (error) {
    logger.error(error);
  }
}

/**
 * Add QoD into the connection document and update users' document "connections"
 * field when a new connection is created.
 * Instead of loosely using onDocumentCreated(), using onDocumentWritten() to
 * catch all document changing events (create/update/delete) then identify
 * status transition "any" -> "connected", this provides more strict definition
 * of new connection also work along with login in addUserNewConnectionsFunc()
 */
export const onNewConnection = onDocumentWritten(
  "connection/{connectionId}",
  async (event) => {
    const connectionId = event.params.connectionId;
    const prevConnectionData = event.data?.before.data();
    const connectionData = event.data?.after.data();
    const isCreated = prevConnectionData?.status !== "connected" &&
    connectionData?.status === "connected";

    if (isCreated) {
      logger.debug(
        `before: ${prevConnectionData?.status},
         after: ${connectionData?.status}`
      );
      logger.debug(`connection "${connectionId}" is created`);

      // Add a QoD into the new connection
      try {
        await addQodFunc(connectionId);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : error);
      }

      // Update "connections" field of the users' documents accordingly
      const [uidA, uidB] = connectionData.uids as Array<string | undefined>;

      !!uidA && await updateUserConnections(uidA, connectionId);
      !!uidB && await updateUserConnections(uidB, connectionId);
    }
  }
);

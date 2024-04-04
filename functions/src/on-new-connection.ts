import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions/v2";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {addQodFunc} from "./api/add-qod";

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

    logger.debug(
      `connectionId: ${connectionId},
       before: ${prevConnectionData?.status},
       after: ${connectionData?.status}`
    );

    if (isCreated) {
      logger.debug(`connection "${connectionId}" is created`);

      // Add a QoD into the new connection
      try {
        await addQodFunc(connectionId);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : error);
      }

      // Update "connections" field of the users' documents accordingly
      const [uidA, uidB] = connectionData.uids as Array<string | undefined>;

      if (!!uidA && !!uidB) {
        const userCollectionRef = getFirestore().collection("users");
        const userDocRefA = userCollectionRef.doc(uidA);
        const userDocRefB = userCollectionRef.doc(uidB);
        const userSnapshotA = await userDocRefA.get();
        const userSnapshotB = await userDocRefB.get();
        const userConnectionsA: string[] =
          userSnapshotA.get("connections") || [];
        const userConnectionsB: string[] =
          userSnapshotB.get("connections") || [];

        try {
          if (!userConnectionsA?.includes(connectionId)) {
            const connections = userConnectionsA.concat([connectionId]);
            await userDocRefA.update(
              {
                connections,
                connectionsCount: connections.length,
              }
            );
          }

          if (!userConnectionsB?.includes(connectionId)) {
            const connections = userConnectionsB.concat([connectionId]);
            await userDocRefB.update(
              {
                connections,
                connectionsCount: connections.length,
              }
            );
          }
        } catch (error) {
          logger.error(error);
        }
      }
    }
  }
);

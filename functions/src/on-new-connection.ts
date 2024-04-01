import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions/v2";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {addQodFunc} from "./api/add-qod";

/**
 * Side effects for a new created connection document
 */
export const onNewConnection = onDocumentCreated(
  "connection/{connectionId}",
  async (event) => {
    const connectionId = event.params.connectionId;
    const connection = event.data?.data();

    logger.debug(`connection "${connectionId}" document created`);

    if (connectionId) {
      // Add a QoD into the new connection
      try {
        await addQodFunc(connectionId);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : error);
      }

      // Update "connections" field of the users' documents accordingly
      if (connection?.status === "connected") {
        const [uidA, uidB] = connection.uids as Array<string | undefined>;

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
              await userDocRefA.update(
                {
                  connections: userConnectionsA.concat([connectionId]),
                  connectionsCount: userConnectionsA.length,
                }
              );
            }

            if (!userConnectionsB?.includes(connectionId)) {
              await userDocRefB.update(
                {
                  connections: userConnectionsB.concat([connectionId]),
                  connectionsCount: userConnectionsB.length,
                }
              );
            }
          } catch (error) {
            logger.error(error);
          }
        }
      }
    } else {
      logger.error("connectionId is null");
    }
  }
);

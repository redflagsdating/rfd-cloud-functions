import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions/v2";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {addQodFunc} from "./api/add-qod";

/**
 *
 */
export const onNewConnection = onDocumentWritten(
  "connection/{connectionId}",
  async (event) => {
    const connectionId = event.params.connectionId;
    const prevConnectionData = event.data?.before.data();
    const connectionData = event.data?.after.data();
    const isCreated = prevConnectionData?.status !== "connected" &&
    connectionData?.status === "connected";

    if (!connectionId || !connectionData) {
      logger.error(
        `Missing connectionId: ${connectionId} or data: ${connectionData}`
      );
    }

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

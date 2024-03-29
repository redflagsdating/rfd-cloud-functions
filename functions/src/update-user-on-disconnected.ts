import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions/v2";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {addNewConnectionsFunc} from "./api/add-new-connections";

/**
 * Update user document "connections" field on disconnected
 */
export const updateUserOnDisconnected = onDocumentUpdated(
  "connection/{connectionId}",
  async (event) => {
    const snapshot = event.data;
    const before = snapshot?.before.data();
    const after = snapshot?.after.data();
    const wasConnected = before?.status === "connected";
    const isDisconnected = after?.status === "disconnected";
    const [uidA, uidB]: string[] = (after?.uids ?? []);
    const userCollectionRef = getFirestore().collection("users");

    logger.debug(`connection "${event.params.connectionId}" document updated`);

    if (before && wasConnected && after && isDisconnected && uidA && uidB) {
      logger.debug(`Status has changed ${before?.status} -> ${after?.status}`);
      logger.debug(`Connection between "${uidA}" and "${uidB}"`);

      const userDocRefA = userCollectionRef.doc(uidA);
      const userDocRefB = userCollectionRef.doc(uidB);
      const userSnapshotA = await userDocRefA.get();
      const userSnapshotB = await userDocRefB.get();
      const userConnectionsA: string[] | undefined =
      userSnapshotA.get("connections");
      const userConnectionsB: string[] | undefined =
      userSnapshotB.get("connections");

      try {
        if (userConnectionsA && userConnectionsA.length) {
          const connections = userConnectionsA.filter((id) => id !== uidB);

          logger.debug(`Update user "${userSnapshotA.id}" with ${connections}`);
          await userDocRefA.update({connections});
        }

        if (userConnectionsB && userConnectionsB.length) {
          const connections = userConnectionsB.filter((id) => id !== uidA);

          logger.debug(`Update user "${userSnapshotB.id}" with ${connections}`);
          await userDocRefB.update({connections});
        }

        // Add new connection for both users
        await addNewConnectionsFunc(userSnapshotA.id);
        await addNewConnectionsFunc(userSnapshotB.id);
      } catch (error) {
        logger.error(error);
      }
    }
  }
);

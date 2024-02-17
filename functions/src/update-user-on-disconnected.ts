import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions/v2";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";

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
    const collectionRef = getFirestore().collection("users");

    logger.debug(`connection "${event.params.connectionId}" document updated`);

    if (before && wasConnected && after && isDisconnected && uidA && uidB) {
      logger.debug(`Status has changed ${before?.status} -> ${after?.status}`);
      logger.debug(`Connection between "${uidA}" and "${uidB}"`);

      const docRefA = collectionRef.doc(uidA);
      const docRefB = collectionRef.doc(uidB);
      const snapshotA = await docRefA.get();
      const snapshotB = await docRefB.get();
      const connectionsA: string[] | undefined = snapshotA.get("connections");
      const connectionsB: string[] | undefined = snapshotB.get("connections");

      try {
        if (connectionsA && connectionsA.length) {
          const connections = connectionsA.filter((id) => id !== uidB);

          logger.debug(`Update user "${snapshotA.id}" with ${connections}`);
          await docRefA.update({connections});
        }

        if (connectionsB && connectionsB.length) {
          const connections = connectionsB.filter((id) => id !== uidA);

          logger.debug(`Update user "${snapshotB.id}" with ${connections}`);
          await docRefB.update(
            {connections}
          );
        }

        // TODO: Add new connection
      } catch (error) {
        logger.error(error);
      }
    }
  }
);

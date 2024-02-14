import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions/v2";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {_addQod} from "./add-qod-to-connection";

/**
 * Schedule check on "connection" collection to break connection or add new
 * QoD accordingly.
 *
 * Note: Firebase provides 3 free schedule functions per account, thus only
 * add schedule function if that is the only way to do it.
 */
export const onCheckConnections = onSchedule("every 5 minutes", async () => {
  const dayAgo = Date.now() - (24 * 60 * 60 * 10e2);
  const collectionRef = getFirestore().collection("connection");
  // Filter connected and out-of-synced (24+ hours) connections
  const connections = collectionRef
    .where("status", "==", "connected")
    .where("_syncedAt", "<=", new Date(dayAgo));
  const snapshots = await connections.get();

  logger.debug(`Schedule check${snapshots.size} connections`);

  snapshots.forEach(async (result) => {
    const lastQodDocSnapshot = (await result.ref.collection("qod")
      .orderBy("createdAt", "desc")
      .limit(1).get()).docs[0];
    logger.debug(
      `Connection "${result.id}" last QoD "${lastQodDocSnapshot.id}"`
    );

    const lastQodAnswerCount = (await lastQodDocSnapshot.ref
      .collection("qodAnswer")
      .count().get()).data().count;
    logger.debug(
      `Last QoD "${lastQodDocSnapshot.id}" has ${lastQodAnswerCount} answers`
    );

    if (lastQodAnswerCount == 2) {
      // Add new QoD when both have answered the question
      await _addQod(result.id);
      logger.debug(`New QoD has been added for connection "${result.id}"`);
    } else {
      await result.ref.update({"status": "disconnected"});
      logger.debug(`Disconnected connection "${result.id}"`);
    }
  });
}
);

/**
 * Remove connection between users on connection.onDocumentUpdated trigger
 */
export const deleteConnectionOnUpdated = onDocumentUpdated(
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
    logger.debug(`Status has changed ${before?.status} -> ${after?.status}`);
    logger.debug(`Connection between "${uidA}" and "${uidB}"`);

    if (before && wasConnected && after && isDisconnected && uidA && uidB) {
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
          await docRefA.set({connections});
        }

        if (connectionsB && connectionsB.length) {
          const connections = connectionsB.filter((id) => id !== uidA);

          logger.debug(`Update user "${snapshotB.id}" with ${connections}`);
          await docRefB.set(
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

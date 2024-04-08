import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions/v2";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {addUserNewConnectionsFunc} from "./api/add-user-new-connections";

/**
 * Update users' document "connections" field when "connection" document status
 * has changed to disconnected
 */
export const updateUsersOnDisconnected = onDocumentUpdated(
  "connection/{connectionId}",
  async (event) => {
    const snapshot = event.data;
    const connectionId = event.params.connectionId;
    const before = snapshot?.before.data();
    const after = snapshot?.after.data();
    const toDisconnected = before?.status === "connected" &&
     after?.status === "disconnected";
    const [uidA, uidB]: string[] = (after?.uids ?? []);
    const userCollectionRef = getFirestore().collection("users");

    if (toDisconnected && uidA && uidB) {
      logger.debug(
        `"${connectionId}" has changed ${before?.status} -> ${after?.status}`
      );
      logger.debug(`Connection between "${uidA}" and "${uidB}"`);

      const userDocRefA = userCollectionRef.doc(uidA);
      const userDocRefB = userCollectionRef.doc(uidB);
      const userSnapshotA = await userDocRefA.get();
      const userSnapshotB = await userDocRefB.get();
      const userConnectionsA: string[] = userSnapshotA.get("connections") || [];
      const userConnectionsB: string[] = userSnapshotB.get("connections") || [];


      try {
        if (userSnapshotA.exists) {
          if (userConnectionsA?.length) {
            const connections = userConnectionsA.filter(
              (id) => id !== connectionId
            );

            logger.debug(
              `Update user "${uidA}" "connections" with ${connections}`
            );

            await userDocRefA.update(
              {
                connections,
                connectionsCount: connections.length,
              }
            );
          }

          await addUserNewConnectionsFunc(uidA);
        }
      } catch (error) {
        logger.error(error);
      }

      try {
        if (userSnapshotB.exists) {
          if (userConnectionsB?.length) {
            const connections = userConnectionsB.filter(
              (id) => id !== connectionId
            );

            logger.debug(
              `Update user "${uidB}" "connections" with ${connections}`
            );

            await userDocRefB.update(
              {
                connections,
                connectionsCount: connections.length,
              }
            );
          }

          await addUserNewConnectionsFunc(uidB);
        }
      } catch (error) {
        logger.error(error);
      }
    }
  }
);

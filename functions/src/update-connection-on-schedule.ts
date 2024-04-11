import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions/v2";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {addQodFunc} from "./api/add-qod";
import {removeUserConnection} from "./utils/user";

/**
 * Schedule check on "connection" collection to break connection or add new
 * QoD accordingly.
 *
 * Note: Firebase provides 3 free schedule functions per account, thus only
 * add schedule function if that is the only way to do it.
 */
export const updateConnectionOnSchedule = onSchedule(
  "every 5 minutes",
  async () => {
    const dayAgo = Date.now() - (24 * 60 * 60 * 10e2);
    const collectionRef = getFirestore().collection("connection");
    // Filter connected and out-of-synced (24+ hours) connections
    const connections = collectionRef
      .where("status", "==", "connected")
      .where("_syncedAt", "<=", new Date(dayAgo));
    const snapshots = await connections.get();

    logger.debug(`Schedule check ${snapshots.size} connections`);

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
        `Last QoD "${lastQodDocSnapshot.id}" has ${lastQodAnswerCount}
           answers`
      );

      if (lastQodAnswerCount == 2) {
        // Add new QoD when both have answered the question
        try {
          await addQodFunc(result.id);
        } catch (error) {
          logger.error(error);
        }
      } else {
        try {
          const [uidA, uidB]: string[] = result.data()?.uids || [];

          await result.ref.update({"status": "disconnected"});
          logger.debug(`Disconnected connection "${result.id}"`);

          if (uidA) {
            await removeUserConnection(uidA, result.id);
          }

          if (uidB) {
            await removeUserConnection(uidB, result.id);
          }
        } catch (error) {
          logger.error(error);
        }
      }
    });
  }
);

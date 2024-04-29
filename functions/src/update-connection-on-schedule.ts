import {getFirestore} from "firebase-admin/firestore";
import {getMessaging} from "firebase-admin/messaging";
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
  "every 10 minutes",
  async () => {
    const dayAgo = Date.now() - (24 * 60 * 60 * 10e2);
    const usersRef = getFirestore().collection("users");
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
      const [uidA, uidB]: string[] = result.data()?.uids || [];

      logger.debug(
        `Last QoD "${lastQodDocSnapshot.id}" has ${lastQodAnswerCount}
           answers`
      );

      if (lastQodAnswerCount == 2) {
        // Add new QoD when both have answered the question
        try {
          const qod = await addQodFunc(result.id);
          const question = qod?.question;

          // Push notification for new QoD
          if (question) {
            const tokens = [
              (await usersRef.doc(uidA).get()).get("fcmToken"),
              (await usersRef.doc(uidB).get()).get("fcmToken"),
            ].filter((t) => !!t);

            if (tokens.length) {
              await getMessaging().sendEachForMulticast(
                {
                  tokens,
                  apns: {
                    payload: {
                      aps: {
                        alert: {
                          titleLocKey: "NOTIFICATION_NEW_QOD_TITLE",
                          locKey: "NOTIFICATION_NEW_QOD_BODY",
                          locArgs: [question],
                        },
                      },
                    },
                  },
                  android: {
                    priority: "high",
                    notification: {
                      priority: "max",
                      titleLocKey: "notification_new_qod_title",
                      bodyLocKey: "notification_new_qod_body",
                      bodyLocArgs: [question],
                    },
                  },
                }
              );
            }
          }
        } catch (error) {
          logger.error(error);
        }
      } else {
        try {
          await result.ref.update({"status": "disconnected"});

          logger.debug(`Disconnected connection "${result.id}"`);

          await removeUserConnection(uidA, result.id);
          await removeUserConnection(uidB, result.id);
        } catch (error) {
          logger.error(error);
        }
      }
    });
  }
);

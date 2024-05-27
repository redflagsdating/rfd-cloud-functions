import {Timestamp, getFirestore} from "firebase-admin/firestore";
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
    // 2 hours grace period (i.e. the latest QoD created 22 hours ago)
    const gracePeriod = Date.now() - (22 * 60 * 60 * 10e2);
    const dayAgo = Date.now() - (24 * 60 * 60 * 10e2);
    const usersRef = getFirestore().collection("users");
    const collectionRef = getFirestore().collection("connection");
    // Filter connected and out-of-synced (24+ hours) connections
    const connections = collectionRef
      .where("status", "==", "connected")
      .where("_syncedAt", "<=", new Date(gracePeriod));
    const snapshots = await connections.get();

    snapshots.forEach(async (result) => {
      const [uidA, uidB]: string[] = result.data()?.uids || [];
      const snapshotUserA = uidA ? await usersRef.doc(uidA).get() : undefined;
      const snapshotUserB = uidB ? await usersRef.doc(uidB).get() : undefined;
      const fcmTokenA = snapshotUserA?.get("fcmToken");
      const fcmTokenB = snapshotUserB?.get("fcmToken");
      const lastQodDocSnapshot = (await result.ref.collection("qod")
        .orderBy("createdAt", "desc")
        .limit(1).get()).docs[0];
      const lastQodCreatedAt = lastQodDocSnapshot.data().createdAt as Timestamp;
      const lastQodAnswerCount = (await lastQodDocSnapshot.ref
        .collection("qodAnswer")
        .count().get()).data().count;

      logger.debug(
        `Connection (${result.id}) last QoD "${lastQodDocSnapshot.id}" has
        ${lastQodAnswerCount} answers`
      );

      /**
       * Connection still in grace period
       */
      if (lastQodCreatedAt.toMillis() > dayAgo) {
        logger.debug(`Connection "${result.id}" in grace period`);

        if (lastQodAnswerCount != 2) {
          // TODO: Revisit later to send notification to unanswered user.
          // Currently, send to both mainly to avoid too many database R/W
          [fcmTokenA, fcmTokenB].forEach(async (token, index) => {
            if (token) {
              const counter = "2h";
              const displayName = index === 0 ?
                snapshotUserA?.get("displayName") :
                snapshotUserB?.get("displayName");

              try {
                await getMessaging().send(
                  {
                    token,
                    apns: {
                      payload: {
                        aps: {
                          alert: {
                            titleLocKey: "NOTIFICATION_QOD_COUNTDOWN_TITLE",
                            titleLocArgs: [counter],
                            locKey: "NOTIFICATION_QOD_COUNTDOWN_BODY",
                            locArgs: [displayName],
                          },
                        },
                      },
                    },
                    android: {
                      priority: "high",
                      notification: {
                        priority: "max",
                        titleLocKey: "notification_qod_countdown_title",
                        titleLocArgs: [counter],
                        bodyLocKey: "notification_qod_countdown_body",
                        bodyLocArgs: [displayName],
                      },
                    },
                  }
                );

                logger.debug("[Push Notification] Remind QoD is counting down");
              } catch (error) {
                logger.error(error);
              }
            }
          });
        }
      } else {
        if (lastQodAnswerCount == 2) {
          const tokens = [fcmTokenA, fcmTokenB].filter((t) => !!t);

          // Add new QoD when both have answered the question
          try {
            const qod = await addQodFunc(result.id);
            const question = qod?.question;

            // Push notification for new QoD
            if (question && tokens.length) {
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

              logger.debug(
                `[Push Notification] New QoD for connection (${result.id})`
              );
            }
          } catch (error) {
            logger.error(error);
          }
        } else {
          try {
            await result.ref.update({"status": "disconnected"});

            logger.debug(`Disconnected connection ("${result.id}")`);

            await removeUserConnection(uidA, result.id);
            await removeUserConnection(uidB, result.id);
          } catch (error) {
            logger.error(error);
          }
        }
      }
    });
  }
);

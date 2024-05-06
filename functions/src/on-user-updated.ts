import {getFirestore} from "firebase-admin/firestore";
import {getMessaging} from "firebase-admin/messaging";
import {logger} from "firebase-functions/v2";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {backfill} from "./utils/typesense";

export const onUserUpdated = onDocumentUpdated(
  "users/{uid}",
  async (event) => {
    const snapshot = event.data;
    const uid = event.params.uid;
    const before = snapshot?.before.data();
    const userModel = snapshot?.after.data();
    const userDocRef = snapshot?.after.ref;
    const isNowVerified = userModel?.verified == true;
    const isNowOnboarded = userModel?.onboarded == true;
    const isTransToVerified = before?.verified != true && isNowVerified;
    const isTransToOnboarded = before?.onboarded != true && isNowOnboarded;

    // ** Initialize "connectionsCount" field of user's document */
    // When user transits to verified and/or onboarded
    const isReady = (isTransToOnboarded && isNowVerified) ||
     (isTransToVerified && isNowOnboarded);

    if (isReady && userModel?.connectionsCount == null) {
      try {
        await userDocRef?.update({connectionsCount: 0});
        logger.debug(`Initialized user (${uid}) connectionsCount: 0`);
      } catch (error) {
        logger.error(error);
      }
    }

    // ** Backfill Typesense search when new user onboarded */
    if (isTransToOnboarded) {
      await backfill();
      logger.debug(`Done backfill Typesense new onboarded user (${uid})!`);
    }

    // ** Send push notifications for connection changes */
    const fcmToken = userModel?.fcmToken;
    const diff = (userModel?.connectionsCount ?? 0) -
    (before?.connectionsCount ?? 0);

    if (fcmToken != null) {
      try {
        if (diff > 0) {
          await getMessaging().send(
            {
              token: fcmToken,
              apns: {
                payload: {
                  aps: {
                    alert: {
                      titleLocKey: "NOTIFICATION_NEW_CONNECTIONS_TITLE",
                      locKey: "NOTIFICATION_NEW_CONNECTIONS_BODY",
                    },
                  },
                },
              },
              android: {
                priority: "high",
                notification: {
                  titleLocKey: "notification_new_connections_title",
                  bodyLocKey: "notification_new_connections_body",
                },
              },
            }
          );
          logger.debug(
            `[Push Notification] ${diff} new connections`
          );
        } else if (diff < 0) {
          const connections = (userModel?.connections ?? []) as string[];
          const prevConnections = (before?.connections ?? []) as string[];
          const removedConnectionIds = prevConnections.filter((cid) => {
            return !connections.includes(cid);
          });

          if (removedConnectionIds.length) {
            removedConnectionIds.forEach(async (cid) => {
              const uids = ((await getFirestore().collection("connection")
                .doc(cid).get()).get("uids") ?? []) as string[];
              const connectedUserId = uids.find((id) => id !== uid);

              if (connectedUserId) {
                const displayName = (await getFirestore().collection("users")
                  .doc(connectedUserId).get()).get("displayName");

                await getMessaging().send(
                  {
                    token: fcmToken,
                    apns: {
                      payload: {
                        aps: {
                          alert: {
                            // eslint-disable-next-line max-len
                            titleLocKey: "NOTIFICATION_REMOVE_CONNECTIONS_TITLE",
                            titleLocArgs: [displayName],
                            locKey: "NOTIFICATION_REMOVE_CONNECTIONS_BODY",
                            locArgs: [displayName],
                          },
                        },
                      },
                    },
                    android: {
                      priority: "high",
                      notification: {
                        titleLocKey: "notification_remove_connections_title",
                        titleLocArgs: [displayName],
                        bodyLocKey: "notification_remove_connections_body",
                        bodyLocArgs: [displayName],
                      },
                    },
                  }
                );

                logger.debug(
                  `[Push Notification] You lost connection with ${displayName}`
                );
              }
            });
          }
        }
      } catch (e) {
        logger.error(e);
      }
    } else {
      logger.debug("Missing FCM user token, skip push notifications");
    }
  }
);

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
      logger.debug(`Initialize user ${uid} connectionsCount field`);

      try {
        await userDocRef?.update({connectionsCount: 0});
      } catch (error) {
        logger.error(error);
      }
    }

    // ** Backfill Typesense search when new user onboarded */
    if (isTransToOnboarded) {
      logger.debug(`Backfill Typesense new onboarded user (${uid})!`);
      await backfill();
    }

    // ** Send push notifications for connection changes */
    const fcmToken = userModel?.fcmToken;
    const connectionsDiff = (userModel?.connectionsCount ?? 0) -
    (before?.connectionsCount ?? 0);

    if (fcmToken != null) {
      try {
        if (connectionsDiff > 0) {
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
        } else if (connectionsDiff < 0) {
          await getMessaging().send(
            {
              token: fcmToken,
              apns: {
                payload: {
                  aps: {
                    alert: {
                      titleLocKey: "NOTIFICATION_REMOVE_CONNECTIONS_TITLE",
                      locKey: "NOTIFICATION_REMOVE_CONNECTIONS_BODY",
                    },
                  },
                },
              },
              android: {
                priority: "high",
                notification: {
                  titleLocKey: "notification_remove_connections_title",
                  bodyLocKey: "notification_remove_connections_body",
                },
              },
            }
          );
        }
      } catch (e) {
        logger.error(e);
      }
    } else {
      logger.debug("Missing FCM user token, skip push notifications");
    }
  }
);

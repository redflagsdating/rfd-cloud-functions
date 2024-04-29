import {getFirestore} from "firebase-admin/firestore";
import {getMessaging} from "firebase-admin/messaging";
import {logger} from "firebase-functions/v2";

import {onDocumentWritten} from "firebase-functions/v2/firestore";

/**
 * Use onDocumentWritten instead of onDocumentCreated because new message doc
 * is created while user starts typing in order to show loading animation,
 * doc will then be updated the "content" field after user submit the message.
 */
export const onNewMessage = onDocumentWritten(
  "connection/{connectionId}/message/{messageId}",
  async (event) => {
    const messageId = event.params.messageId;
    const connectionId = event.params.connectionId;
    const before = event.data?.before.data();
    const messageModel = event.data?.after.data();
    const isNew = before?.content == null && messageModel?.content != null;

    if (isNew) {
      const connection = (
        await getFirestore().collection("connection").doc(connectionId).get()
      ).data();

      // Skip push notification when disconnected
      if (connection?.status == "disconnected") {
        logger.debug(
          `Connection (${connectionId}) status is ${connection?.status}`
        );
        logger.debug(`Skip push notification for message (${messageId})`);

        return;
      }

      const usersRef = getFirestore().collection("users");
      const sender = messageModel.uid;
      const receiver = ((connection?.uids ?? []) as string[]).find(
        (id) => id != sender
      );

      /**
       * Skip push notification when
       * sender == null, filter receiver uid could be incorrect
       * receiver == null, unable to retrieve fcmToken
       */
      if (sender == null || receiver == null) {
        logger.error(`Sender: ${sender}, receiver: ${receiver}`);
        logger.error("Unable to identify push notification target user");

        return;
      }
      const fcmToken = (await usersRef.doc(receiver).get()).get("fcmToken");
      const displayName = (await usersRef.doc(sender).get()).get("displayName");
      const titleLocArgs = [displayName];
      // TODO: Revisit to support displaying image
      const bodyLocArgs = messageModel.type == "image" ?
        ["🌄"] : [messageModel.content];

      // Skip push notification when fcmToken is null
      if (fcmToken == null) {
        logger.error(`Unable to retrieve fcmToken from user (${receiver})`);
        return;
      }

      try {
        await getMessaging().send(
          {
            token: fcmToken,
            apns: {
              payload: {
                aps: {
                  alert: {
                    titleLocKey: "NOTIFICATION_MESSAGE_TITLE",
                    titleLocArgs,
                    locKey: "NOTIFICATION_MESSAGE_BODY",
                    locArgs: bodyLocArgs,
                  },
                },
              },
            },
            android: {
              priority: "high",
              notification: {
                priority: "max",
                titleLocKey: "notification_message_title",
                titleLocArgs,
                bodyLocKey: "notification_message_body",
                bodyLocArgs,
              },
            },
          }
        );
      } catch (e) {
        logger.error(e);
      }
    }
  },
);

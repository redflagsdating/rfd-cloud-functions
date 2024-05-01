import {getFirestore} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {logger} from "firebase-functions/v2";
import {onDocumentDeleted} from "firebase-functions/v2/firestore";
import {backfill} from "./utils/typesense";
import {removeUserConnection} from "./utils/user";

/**
 * Tear down dependency when user document is delete such as deleting images in
 * the storage, connections and etc.
 */
export const onUserDeleted = onDocumentDeleted(
  "users/{uid}",
  async (event) => {
    const uid = event.params.uid;
    const userModel = event.data?.data();

    // Typesense backfill to remove user from indexed data
    await backfill();

    try {
      await getStorage().bucket().deleteFiles({prefix: `images/${uid}`});
      logger.debug("Deleted user's images storage");
    } catch (error) {
      logger.error(error);
    }


    if (!userModel) {
      logger.error(`User (${uid}) snapshot data is undefined!`);
      return;
    }

    const connections = userModel.connections as string[] | null | undefined;

    if (connections?.length) {
      await getFirestore().runTransaction(
        async (transaction) => {
          connections.forEach(
            async (cid) => {
              try {
                const docRef = getFirestore().collection("connection").doc(cid);

                transaction.update(docRef, {status: "disconnected"});

                const snapshot = await transaction.get(docRef);
                const status = snapshot.data()?.status;
                const uids: string[] = snapshot.data()?.uids || [];
                const connectedUid = uids.find((id) => id !== uid);

                logger.debug(
                  `Updated user's connection (${cid}) status: ${status}`
                );

                if (connectedUid) {
                  await removeUserConnection(connectedUid, cid);
                  logger.debug(
                    `Removed connection (${cid}) from user (${connectedUid})`
                  );
                }
              } catch (error) {
                logger.error(error);
              }
            }
          );
        }
      );
    }
  }
);

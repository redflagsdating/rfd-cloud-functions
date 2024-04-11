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
      logger.debug("Delete user's storage images");
      await getStorage().bucket().deleteFiles({prefix: `images/${uid}`});
    } catch (error) {
      logger.error(error);
    }


    if (!userModel) {
      logger.error(`User (${uid}) snapshot data is undefined!`);
      return;
    }

    const connCollectionRef = getFirestore().collection("connection");
    const connections = userModel.connections as string[] | null | undefined;

    if (connections?.length) {
      logger.debug(`Disconnect user's ${connections.length} connections`);

      connections.forEach(async (connectionId) => {
        try {
          const docRef = connCollectionRef.doc(connectionId);
          const snapshot = await docRef.get();

          await docRef.update({status: "disconnected"});

          if (snapshot.exists) {
            const uids: string[] = snapshot.data()?.uids || [];
            const connectedUid = uids.find((id) => id !== uid);

            if (connectedUid) {
              logger.debug(
                `Remove connection ${connectionId} from user ${connectedUid}`
              );

              await removeUserConnection(connectedUid, connectionId);
            }
          }
        } catch (error) {
          logger.error(error);
        }
      });
    }
  }
);

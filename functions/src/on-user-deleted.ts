import {getFirestore} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {logger} from "firebase-functions/v2";
import {onDocumentDeleted} from "firebase-functions/v2/firestore";

/**
 * Tear down dependency when user document is delete such as deleting images in
 * the storage, connections and etc.
 */
export const onUserDeleted = onDocumentDeleted(
  "users/{uid}",
  async (event) => {
    const uid = event.params.uid;
    const userModel = event.data?.data();

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
          await connCollectionRef.doc(connectionId)
            .update({status: "disconnected"});
        } catch (error) {
          logger.error(`Update connection ${connectionId} status failed.`);
          logger.error(error);
        }
      });
    }
  }
);

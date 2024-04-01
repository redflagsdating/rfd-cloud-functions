import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions/v2";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";

/**
 * Initialize user's "connectionsCount" field after user is ready to connection.
 * The field is mainly to backfill Typesense for search filter purpose since
 * Typesense doesn't not support array.length filter, so we are unable to use
 * the "connections" field for filter.
 * Due to the field is for backend purpose, so we won't expose the field in the
 * userModel at the front-end app source code.
 */
export const initUserConnectionsCount = onDocumentUpdated(
  "users/{uid}",
  async (event) => {
    const snapshot = event.data;
    const before = snapshot?.before.data();
    const after = snapshot?.after.data();
    const toOnboarded = before?.onboarded != true && after?.onboarded == true;
    const toVerified = before?.verified != true && after?.verified == true;
    const isReadyToConnect = (toOnboarded && after?.verified == true) ||
     (toVerified && after?.onboarded == true);

    if (after?.connectionsCount == null && isReadyToConnect) {
      logger.debug(
        `Initialize user ${event.params.uid} connectionsCount field`
      );

      const userCollectionRef = getFirestore().collection("users");

      try {
        await userCollectionRef.doc(after?.uid).update({connectionsCount: 0});
      } catch (error) {
        logger.error(error);
      }
    }
  }
);

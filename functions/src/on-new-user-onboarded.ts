import {logger} from "firebase-functions/v2";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {backfill} from "./utils/typesense";

/**
 * Side effects when a new user is onboarded, base on user's document
 * "onboarded" field transition to `true`
 */
export const onNewUserOnboarded = onDocumentWritten(
  "users/{uid}",
  async (event) => {
    const uid = event.params.uid;
    const prevOnboarded = event.data?.before.data()?.onboarded;
    const onboarded = event.data?.after.data()?.onboarded;

    if (prevOnboarded !== true && onboarded === true) {
      logger.debug(`New user ${uid} onboarded!`);
      // Typesense backfill to add user into indexed data
      await backfill();
    }
  }
);

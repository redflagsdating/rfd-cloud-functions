import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions/v2";
import {onDocumentWritten} from "firebase-functions/v2/firestore";

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

      const backfillDocRef = getFirestore().collection("typesense_sync")
        .doc("backfill");
      const backfillSnapshot = await backfillDocRef.get();

      try {
        logger.debug("Trigger backfill new users data to Typesense");

        if (backfillSnapshot.exists) {
          await backfillDocRef.update({trigger: false});
          await backfillDocRef.update({trigger: true});
        } else {
          await backfillDocRef.create({trigger: true});
        }
      } catch (error) {
        logger.error(error);
      }
    }
  }
);

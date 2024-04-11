import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions/v2";

/**
 * Trigger Typesense backfill
 */
async function backfill() {
  const docRef = getFirestore().collection("typesense_sync").doc("backfill");
  const snapshot = await docRef.get();

  try {
    logger.debug("Trigger backfill Typesense");

    if (snapshot.exists) {
      await docRef.update({trigger: false});
      await docRef.update({trigger: true});
    } else {
      await docRef.create({trigger: true});
    }
  } catch (error) {
    logger.error(error);
  }
}

export {backfill};

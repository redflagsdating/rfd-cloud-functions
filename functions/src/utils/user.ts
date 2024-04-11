import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions/v2";


/**
 * Remove the given connectionId from the "connections" field of the given
 * user's document.
 * @param {string} uid
 * @param {string} connectionId
 *
 */
async function removeUserConnection(uid: string, connectionId: string) {
  logger.debug(`Remove connection (${connectionId}) from user "${uid}" `);

  const collectionRef = getFirestore().collection("users");
  const docRef = collectionRef.doc(uid);
  const snapshot = await docRef.get();

  if (snapshot.exists) {
    const current: string[] = snapshot.get("connections") || [];
    const connections = current.filter((id) => id !== connectionId);

    logger.debug(`Update user "${uid}" "connections" with "${connections}"`);

    try {
      await docRef.update(
        {
          connections,
          connectionsCount: connections.length,
        }
      );
    } catch (error) {
      logger.error(error);
    }
  } else {
    logger.debug(`User ${uid} has empty snapshot`);
  }
}

export {removeUserConnection};

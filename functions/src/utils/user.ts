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
  const docRef = getFirestore().collection("users").doc(uid);

  logger.debug(`Remove connection (${connectionId}) from user "${uid}" `);

  try {
    await getFirestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef);

      if (snapshot.exists) {
        const current: string[] = snapshot.get("connections") || [];
        const connections = current.filter((id) => id !== connectionId);

        logger.debug(
          `Update user "${uid}" "connections" with "${connections}"`
        );

        transaction.update(
          docRef,
          {
            connections,
            connectionsCount: connections.length,
          }
        );
      } else {
        logger.debug(`User ${uid} has empty snapshot`);
      }
    });
  } catch (error) {
    logger.error(error);
  }
}

export {removeUserConnection};

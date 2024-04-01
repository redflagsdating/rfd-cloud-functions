import {getFirestore} from "firebase-admin/firestore";
import {defineInt} from "firebase-functions/params";
import {logger} from "firebase-functions/v2";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {searchMatchedUsersFunc} from "./search-matched-users";

const maxUserConnections = defineInt("MAX_USER_CONNECTIONS").value();

/**
 *
 * @param {string} uid
 * @throws HttpsError for customized errors
 *
 */
async function addUserNewConnectionsFunc(uid: string) {
  let message;

  const connCollectionRef = getFirestore().collection("connection");
  const userDocRef = getFirestore().collection("users").doc(uid);
  const userModel = (await userDocRef.get()).data();

  if (!userModel || !userModel.uid) {
    message = `User (uid=${uid}) document not found`;

    logger.error(message);
    throw new HttpsError("not-found", message, {status: 404});
  }

  const currentConnectionCount = userModel.connections?.length ?? 0;
  const limits = maxUserConnections - currentConnectionCount;

  if (limits <= 0) {
    logger.debug(
      `User already reach max connections
      ${currentConnectionCount}/${maxUserConnections}`
    );

    return;
  }

  const response = await searchMatchedUsersFunc(userModel, limits);
  const status = response.status;
  const json = await response.json();

  if (status !== 200) {
    logger.error(json.message);
    throw new HttpsError("internal", json.message, {status});
  }

  const hits: TypesenseHits = json.hits || [];

  if (!hits.length) {
    message = `No hits (${hits}) for searching new connections (uid=${uid})`;

    logger.debug(message);
    throw new HttpsError("not-found", message, {status: 404});
  }

  // Add new documents into Firestore "connection" collection
  // eslint-disable-next-line max-len
  const connectionDocRefs = await Promise.all<FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>>(
    hits.map(
      async ({document}) => await connCollectionRef.add(
        /**
         * Skip update "status" before updating user's "connections" field
         * to prevent triggering onNewConnection() to work around race condition
         */
        {uids: [uid, document.id]}
      )
    )
  );
  const connectionDocIds = connectionDocRefs.map((ref) => ref.id);

  // Update user's "connections" fields in the documents
  try {
    const userConnections = connectionDocIds.concat(
      userModel.connections || []
    );

    await userDocRef.update(
      {
        connections: userConnections,
        connectionsCount: userConnections.length,
      }
    );
  } catch (error) {
    logger.debug(`Roll back created connection documents ${connectionDocIds}`);

    // Roll back created connection documents
    await Promise.all(connectionDocRefs.map(async (ref) => await ref.delete()));

    logger.error(error);

    throw new HttpsError(
      "internal",
      (error as Error)?.message ||
        "Failed to update user's \"connections\" field in the document",
      {status: 500}
    );
  }

  /**
   * Update all connection documents status to connected to trigger
   * onNewConnection() so the matched users' documents will be updated its
   * "connections" fields
   */
  await Promise.all(connectionDocRefs.map(
    async (ref) => await ref.update({status: "connected"})
  ));

  return connectionDocRefs.map((ref) => ref.id);
}

/**
 * addUserNewConnections HTTP Callable function.
 * (Call from Firebase Function client SDK)
 */
const addUserNewConnections = onCall(
  async (request) => {
    // Checking that the user is authenticated.
    if (!request.auth || !request.auth.uid) {
      const message = "The function must be called while authenticated.";

      logger.debug(message);
      throw new HttpsError( "unauthenticated", message, {status: 401});
    }

    try {
      return await addUserNewConnectionsFunc(request.auth.uid);
    } catch (error) {
      logger.error(error);

      if (error instanceof HttpsError) {
        throw error;
      } else {
        throw new HttpsError(
          "internal",
          (error as Error)?.message,
          {status: 500}
        );
      }
    }
  }
);

export {addUserNewConnections, addUserNewConnectionsFunc};

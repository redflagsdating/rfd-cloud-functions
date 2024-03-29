import {getFirestore} from "firebase-admin/firestore";
import {defineInt} from "firebase-functions/params";
import {logger} from "firebase-functions/v2";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {searchNewConnectionsFunc} from "./search-new-connections";

const maxUserConnections = defineInt("MAX_USER_CONNECTIONS").value();

/**
 *
 * @param {string} uid
 * @throws HttpsError for customized errors
 *
 */
async function addNewConnectionsFunc(uid: string) {
  let message;

  const userCollectionRef = getFirestore().collection("users");
  const connCollectionRef = getFirestore().collection("connection");
  const userDocRef = userCollectionRef.doc(uid);
  const userModel = (await userDocRef.get()).data();

  if (!userModel || !userModel.uid) {
    message = `User (uid=${uid}) document not found`;

    logger.error(message);
    throw new HttpsError("not-found", message, {status: 404});
  }

  const connectionCount = userModel.connections?.length ?? 0;
  const limits = maxUserConnections - connectionCount;

  if (limits <= 0) {
    logger.debug(
      `User already reach max connections
      ${connectionCount}/${maxUserConnections}`
    );

    return;
  }

  const response = await searchNewConnectionsFunc(userModel, limits);
  const status = response.status;
  const json = await response.json();

  if (status !== 200) {
    logger.error(json);
    throw new HttpsError("internal", json, {status});
  }

  const hits: TypesenseHits = json.hits || [];

  if (!hits.length) {
    message = `No hits (${hits}) for searching new connections (uid=${uid})`;

    logger.debug(message);
    throw new HttpsError("not-found", message, {status: 404});
  }

  const hitIds = hits.map(({document}) => document.id as string);
  // Add new documents into Firestore "connection" collection
  // eslint-disable-next-line max-len
  const results = await Promise.all<FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>>(
    hitIds.map(
      async (hitId) => await connCollectionRef.add(
        {status: "connected", uids: [uid, hitId]}
      )
    )
  );

  const rollback = async () => {
    const docIds = results.map((doc) => doc.id);

    logger.debug(`Roll back created connection documents ${docIds}`);

    // Roll back created connection documents
    await Promise.all(docIds.map(
      async (docId) => {
        return docId ?
          await connCollectionRef.doc(docId).delete() : Promise.resolve();
      }
    ));
  };

  // Update "connections" field of connected users' documents
  if (results.every((doc) => !!doc.id)) {
    const prevConnections = userModel.connections || [];

    try {
      const updatedConnections = hitIds.concat(prevConnections);

      // Update the given user's document
      await userDocRef.update(
        {
          connections: updatedConnections,
          /**
         * Append connections size mainly for Typesense search filter since
         * filter by array size is not possible at this point.
         */
          connectionsCount: updatedConnections.length,
        }
      );
    } catch (error) {
      await rollback();

      logger.error(error);

      throw new HttpsError(
        "internal",
        (error as Error)?.message ||
        "Failed to update user's \"connections\" field of document",
        {status: 500}
      );
    }

    try {
      // Update the matched users' documents
      await Promise.all(hitIds.map(
        async (hitId) => {
          const hitUserDocRef = userCollectionRef.doc(hitId);
          const hitUserModel = (await hitUserDocRef.get()).data();
          const hitUserUpdatedConnections = (hitUserModel?.connections || [])
            .concat([uid]);

          return await hitUserDocRef.update({
            connections: hitUserUpdatedConnections,
            connectionsCount: hitUserUpdatedConnections.length,
          });
        }
      ));
    } catch (error) {
      await rollback();

      // Roll back the given user's document
      await userDocRef.update({
        connections: prevConnections,
        connectionsCount: prevConnections.length,
      });

      // Roll back matched users' documents
      await Promise.all(hitIds.map(
        async (hitId) => {
          const hitUserDocRef = userCollectionRef.doc(hitId);
          const hitUserModel = (await hitUserDocRef.get()).data();
          const hitUserPrevConnections = (hitUserModel?.connections || [])
            .filter((id: string) => id !== uid);

          return await hitUserDocRef.update({
            connections: hitUserPrevConnections,
            connectionsCount: hitUserPrevConnections.length,
          });
        }
      ));

      logger.error(error);

      throw new HttpsError(
        "internal",
        (error as Error)?.message ||
        "Failed to update matched users' \"connections\" field of documents",
        {status: 500}
      );
    }

    return results.map((ref) => ref.id);
  } else {
    await rollback();

    throw new HttpsError(
      "internal",
      "Missing some connection document id",
      {status: 500}
    );
  }
}

/**
 * addNewConnections HTTP Callable function.
 * (Call from Firebase Function client SDK)
 */
const addNewConnections = onCall(
  async (request) => {
    const uid = request.auth?.uid;

    if (!uid) {
      const message = "request.auth.uid is undefined";

      logger.debug(message);
      throw new HttpsError("unauthenticated", message, {status: 401});
    }

    try {
      return await addNewConnectionsFunc(uid);
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

export {addNewConnections, addNewConnectionsFunc};

import {getFirestore} from "firebase-admin/firestore";
import {defineInt} from "firebase-functions/params";
import {logger} from "firebase-functions/v2";
import {onRequest} from "firebase-functions/v2/https";
import {searchNewConnectionsFunc} from "./search-new-connections";

const maxUserConnections = defineInt("MAX_USER_CONNECTIONS").value();

/**
 * API endpoint - /addNewConnections?uid=Wf84j3we20k3ee
 */
const addNewConnections = onRequest(
  async (req, res) => {
    let message;

    const uid = req.query.uid;
    const userCollectionRef = getFirestore().collection("users");
    const connCollectionRef = getFirestore().collection("connection");

    if (!uid) {
      message = `Query parameter "uid" (${typeof uid}) is not provided`;
      logger.debug(message);
      res.status(400).json({error: {code: 400, message}});
      return;
    }

    const userDocRef = userCollectionRef.doc(uid as string);
    const userModel = (await userDocRef.get()).data();

    if (!userModel || !userModel.uid) {
      message = `User (uid=${uid}) document not found`;

      logger.error(message);
      res.status(404).json({error: {code: 404, message}});

      return;
    }

    const connectionCount = userModel.connections?.length ?? 0;
    const limits = maxUserConnections - connectionCount;

    if (limits <= 0) {
      // eslint-disable-next-line max-len
      logger.debug(`User already reach max connections ${connectionCount}/${maxUserConnections}`);
      res.status(200).json({data: null});
    }

    const response = await searchNewConnectionsFunc(userModel, limits);
    const status = response.status;
    const json = await response.json();

    if (status !== 200) {
      logger.error(json);
      res.status(status).json({error: {code: status, message: json}});
      return;
    }

    const hits: TypesenseHits = json.hits || [];

    if (!hits.length) {
      message = `No hits (${hits}) for searching new connections (uid=${uid})`;
      logger.debug(message);
      res.status(404).json({error: {code: 404, message}});
      return;
    }

    try {
      const hitIds = hits.map(({document}) => document.id as string);
      // Add new documents into Firestore "connection" collection
      // eslint-disable-next-line max-len
      const results = await Promise.all<FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>>(
        hitIds.map(
          async (hitId) => {
            return await connCollectionRef.add(
              {status: "connected", uids: [uid, hitId]}
            );
          }
        )
      );

      // Update "connections" field of user document
      if (results.every((doc) => !!doc.id)) {
        await userDocRef.update(
          {connections: hitIds.concat(userModel.connections || [])}
        );

        res.status(200).json({data: results});
      } else {
        const docIds = results.map((doc) => doc.id);

        logger.debug(`Roll back created connection documents ${docIds}`);

        // Roll back created connection documents
        await Promise.all(docIds.map(
          async (docId) => {
            return docId ?
              await connCollectionRef.doc(docId).delete() : Promise.resolve();
          }
        ));
        res.status(500).json(
          {error: {code: 500, message: "Missing some connection doc id"}}
        );
      }
    } catch (error) {
      logger.error(error);
      res.status(500).json({error: {code: 500, message: error}});
    }
  }
);

export {addNewConnections};

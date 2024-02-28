import {getFirestore} from "firebase-admin/firestore";
import {defineInt, defineString} from "firebase-functions/params";
import {logger} from "firebase-functions/v2";
import {onRequest} from "firebase-functions/v2/https";

const searchHost = defineString("TYPESENSE_HOST");
const searchApiKey = defineString("TYPESENSE_API_KEY");
const maxUserConnections = defineInt("MAX_USER_CONNECTIONS").value();

const searchUsersApiPath = "/collections/users/documents/search";
const searchUsersApi = `${searchHost.value()}${searchUsersApiPath}`;

/**
 * Typesense search new connections for given user
 * @param {FirebaseFirestore.DocumentData} userModel
 * @param {string | number | undefined} limits
 * @return {Promise<Response>}
 */
async function searchNewConnectionsFunc(
  userModel: FirebaseFirestore.DocumentData, limits?: string | number
) {
  const connCollectionRef = getFirestore().collection("connection");
  const userConnectionDocs = (await connCollectionRef
    .where("uids", "array-contains", userModel.uid).get()).docs;

  // All users are/were connected
  const uids = userConnectionDocs
    .map((doc) => (doc.data()["uids"] ?? []) as string[])
    .flat().filter((id) => !!id && id !== userModel.uid);

  const searchParams = new URLSearchParams("q=*");
  const {genderFor = [], latlng} = userModel;

  // Search hits limit
  if (limits) {
    searchParams.append("limit_hits", limits.toString());
    searchParams.append("per_page", limits.toString());
  }

  // Filter KYC verified users only
  searchParams.append("filter_by", "verified:true");

  // Filter matched genders only
  if (genderFor.length) {
    searchParams.append("filter_by", `gender:=[${genderFor}]`);
  }

  // Filter distance within 50 km radius and sort in distance (closest) order
  if (latlng?.length === 2) {
    const latlngStr = latlng.join(", ");

    searchParams.append("filter_by", `latlng:(${latlngStr},50 km)`);
    searchParams.append("sort_by", `latlng(${latlngStr}):asc`);
  }

  // Filter out already connected/disconnected users
  if (uids.length) {
    searchParams.append("filter_by", `id:!=[${uids}]`);
  }

  // TODO: Semantic search redFlags, greenFlags and realTalk
  // TODO: Filter by age

  logger.debug(`Typesense search params: ${searchParams.toString()}`);

  return await fetch(
    `${searchUsersApi}?${searchParams.toString()}`,
    {
      method: "GET",
      headers: {
        "X-TYPESENSE-API-KEY": searchApiKey.value(),
        "CONTENT-TYPE": "application/json",
      },
    },
  );
}

/**
 * API endpoint - /searchNewConnections?uid=Wf84j3we20k3ee&limits=3
 */
const searchNewConnections = onRequest(
  async (req, res) => {
    let message;

    const uid = req.query.uid;
    const limits = typeof req.query.limits == "string" ?
      req.query.limits : maxUserConnections.toString();
    const userCollectionRef = getFirestore().collection("users");

    if (!uid) {
      message = `Query parameter "uid" (${typeof uid}) is not provided`;

      logger.debug(message);
      res.status(400).json({error: {code: 400, message}});

      return;
    }

    const userModel = (await userCollectionRef.doc(uid as string).get()).data();

    if (!userModel || !userModel.uid) {
      message = `User (uid=${uid}) document not found`;

      logger.error(message);
      res.status(404).json({error: {code: 404, message}});

      return;
    }

    const response = await searchNewConnectionsFunc(userModel, limits);
    const status = response.status;
    const json =await response.json();
    const data = status === 200 ?
      {data: json.hits as TypesenseHits} :
      {error: {code: status, message: json}};

    res.status(status).json(data);
  }
);

export {searchNewConnections, searchNewConnectionsFunc};



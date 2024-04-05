import {getFirestore} from "firebase-admin/firestore";
import {defineInt, defineString} from "firebase-functions/params";
import {logger} from "firebase-functions/v2";
import {HttpsError, onCall} from "firebase-functions/v2/https";

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
async function searchMatchedUsersFunc(
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
  const {gender, genderFor = [], latlng} = userModel;

  // Search hits limit
  if (limits) {
    searchParams.append("limit_hits", limits.toString());
    searchParams.append("per_page", limits.toString());
  }

  // Filtered onboarded users only
  searchParams.append("filter_by", "onboarded:true");

  // Filter KYC verified users only
  searchParams.append("filter_by", "verified:true");

  // Filter users less than maxUserConnections
  searchParams.append("filter_by", `connectionsCount:<${maxUserConnections}`);

  // Filter matched genders only
  searchParams.append("filter_by", `genderFor:=[${gender}]`);
  if (genderFor.length) {
    searchParams.append("filter_by", `gender:=[${genderFor}]`);
  }

  // Filter distance within 50 km radius and sort in distance (closest) order
  if (latlng?.length === 2) {
    const latlngStr = latlng.join(", ");

    searchParams.append("filter_by", `latlng:(${latlngStr},50 km)`);
    searchParams.append("sort_by", `latlng(${latlngStr}):asc`);
  }

  // Filter out already connected/disconnected users and self
  if (uids.length) {
    searchParams.append("filter_by", `id:!=[${uids.concat(userModel.id)}]`);
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
 * searchMatchedUsers HTTP Callable function.
 * (Call from Firebase Function client SDK)
 */
const searchMatchedUsers = onCall<{limits?: number}>(
  async (request) => {
    let message;

    // Checking that the user is authenticated.
    if (!request.auth || !request.auth?.uid) {
      message = "The function must be called while authenticated.";

      logger.debug(message);
      throw new HttpsError("unauthenticated", message, {status: 401});
    }

    const uid = request.auth.uid;
    const limits = request.data.limits ?? maxUserConnections;
    const userCollectionRef = getFirestore().collection("users");
    const userModel = (await userCollectionRef.doc(uid as string).get()).data();

    if (!userModel || !userModel.uid) {
      message = `User (uid=${uid}) document not found`;

      logger.error(message);
      throw new HttpsError("not-found", message, {status: 404});
    }

    const response = await searchMatchedUsersFunc(userModel, limits);
    const status = response.status;
    const json = await response.json();

    if (status === 200) {
      return json.hits;
    } else {
      throw new HttpsError("internal", json.message, {status});
    }
  }
);

export {searchMatchedUsers, searchMatchedUsersFunc};



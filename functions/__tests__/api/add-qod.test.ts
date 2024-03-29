/* eslint-disable @typescript-eslint/no-explicit-any */
import {test} from "@jest/globals";
import {getFirestore} from "firebase-admin/firestore";
import firebaseFunctionsTest from "firebase-functions-test";

// Ensure to import cloud functions from top level for admin.initializeApp()
import {QUESTIONS} from "../../src/api/add-qod";
import {addQod} from "../../src/index";

firebaseFunctionsTest({
  projectId: "rf-app-dev-7145f",
}, "../rf-app-dev-7145f-serviceKeys.json");

describe("Cloud Function [http] > addQoD", () => {
  const connectionId = "eHQ27TioIAkNzcxQbaDX";

  test("should add a new QoD to the connection", async () => {
    await addQod.run({
      data: {connectionId},
      auth: {
        uid: "123",
        token: {email: "test@gmail.com"} as any,
      },
      rawRequest: {} as any,
    });

    const connectionCollectionRef = getFirestore().collection("connection");
    const connectionDocRef = connectionCollectionRef.doc(connectionId);
    const allQods = connectionDocRef.collection("qod")
      .orderBy("createdAt", "desc");
    const lastQod = (await allQods.get()).docs[0];
    const question = lastQod.data().question;

    expect(question).not.toBeNull();
    expect(lastQod.data().createdAt).not.toBeNull();
    expect(QUESTIONS.includes(question)).toBeTruthy();

    // Remove the new QoD to clean up
    lastQod.ref.delete();
    connectionDocRef.update("_excludedQod", []);
  });

  test("should return 400 and error message without connectionId", async () => {
    try {
      await addQod.run({
        data: {},
        auth: {
          uid: "123",
          token: {email: "test@gmail.com"} as any,
        },
        rawRequest: {} as any,
      });
    } catch (err) {
      const error = err as any;

      expect(error).not.toBeNull();
      expect(error?.details.status).toEqual(400);
      expect(error?.message).toEqual(
        "Query param \"connectionId\" is (undefined)"
      );
    }
  });
});

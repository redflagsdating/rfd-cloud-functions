import {test} from "@jest/globals";
import {getFirestore} from "firebase-admin/firestore";
import firebaseFunctionsTest from "firebase-functions-test";

// Ensure to import cloud functions from top level for admin.initializeApp()
import {addQod} from "../../src/index";

firebaseFunctionsTest({
  projectId: "rf-app-dev-7145f",
}, "../rf-app-dev-7145f-serviceKeys.json");

describe("Cloud Function [http] > addQoD", () => {
  const connectionId = "eHQ27TioIAkNzcxQbaDX";

  test("should add a new QoD to the connection", async () => {
    let newQod: Record<string, string> | undefined;

    const req = {query: {connectionId}};
    const res = {
      status: (code: number) => {
        expect(code).toEqual(200);

        return {
          json: ({data}: Record<string, unknown>) => {
            newQod = data as Record<string, string>;
          },
        };
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await addQod(req as any, res as any);

    const connectionCollectionRef = getFirestore().collection("connection");
    const connectionDocRef = connectionCollectionRef.doc(connectionId);
    const allQods = connectionDocRef.collection("qod")
      .orderBy("createdAt", "desc");
    const lastQod = (await allQods.get()).docs[0];

    expect(lastQod.data().question).toEqual(newQod?.question);

    // Remove the new QoD to clean up
    lastQod.ref.delete();
    connectionDocRef.update("_excludedQod", []);
  });

  test("should return 400 and error message without connectionId", async () => {
    let error: Record<string, string> | undefined;
    const req = {query: {}};
    const res = {
      status: (code: number) => {
        expect(code).toEqual(400);

        return {
          json: ({error: _error}: Record<string, unknown>) => {
            error = _error as Record<string, string>;
          },
        };
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await addQod(req as any, res as any);

    expect(error).not.toBeNull();
    expect(error?.code).toEqual(400);
    expect(error?.message).toEqual(
      "Query parameter \"connectionId\" (undefined) is not provided"
    );
  });
});

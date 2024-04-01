import {test} from "@jest/globals";
import {getFirestore} from "firebase-admin/firestore";
import firebaseFunctionsTest from "firebase-functions-test";
// Ensure to import cloud functions from top level for admin.initializeApp()
import {updateUsersOnDisconnected} from "../src/index";

const {wrap, cleanup, makeChange, firestore} = firebaseFunctionsTest({
  projectId: "rf-app-dev-7145f",
}, "../rf-app-dev-7145f-serviceKeys.json");

describe("Cloud Function [trigger] > updateUserOnDisconnected", () => {
  const usersRef = getFirestore().collection("users");
  const wrapped = wrap(updateUsersOnDisconnected);
  const uids = ["aDhpBkhITxQ7c6PPclUwlGRoHUl2", "sNxS7Q9w5RYLB87bBB6N2NdBGU73"];

  beforeEach(async () => {
    await usersRef.doc(uids[0]).update({connections: ["yC8pYI5d8hLp6VmgtqNS"]});
    await usersRef.doc(uids[1]).update({connections: ["yC8pYI5d8hLp6VmgtqNS"]});
  });

  afterEach(async () => {
    cleanup();

    await usersRef.doc(uids[0]).update({connections: []});
    await usersRef.doc(uids[1]).update({connections: []});
  });

  test("should update user's connections field on disconnected", async () => {
    const beforeSnapshot = firestore.makeDocumentSnapshot({
      status: "connected",
      uids,
    },
    "connection/yC8pYI5d8hLp6VmgtqNS"
    );
    const afterSnapshot = firestore.makeDocumentSnapshot({
      status: "disconnected",
      uids,
    },
    "connection/yC8pYI5d8hLp6VmgtqNS"
    );
    const change = makeChange(beforeSnapshot, afterSnapshot);
    const params = {connectionId: afterSnapshot.id};
    const userADoc = usersRef.doc(uids[0]);
    const userBDoc = usersRef.doc(uids[1]);
    const beforeUserAData = await userADoc.get();
    const beforeUserBData = await userBDoc.get();
    const beforeUserADataSize = Object.keys(
      beforeUserAData.data() ?? {}
    ).length;
    const beforeUserBDataSize = Object.keys(
      beforeUserBData.data() ?? {}
    ).length;


    expect(beforeUserAData.get("connections")?.length).toEqual(1);
    expect(beforeUserBData.get("connections")?.length).toEqual(1);

    await wrapped({data: change, params});

    const afterUserAData = await userADoc.get();
    const afterUserBData = await userBDoc.get();
    const afterUserADataSize = Object.keys(
      afterUserAData.data() ?? {}
    ).length;
    const afterUserBDataSize = Object.keys(
      afterUserBData.data() ?? {}
    ).length;

    expect(afterUserAData.get("connections")?.length).toEqual(0);
    expect(afterUserBData.get("connections")?.length).toEqual(0);

    // Ensure other data fields are the same
    expect(afterUserADataSize).toBeGreaterThan(1);
    expect(afterUserBDataSize).toBeGreaterThan(1);
    expect(beforeUserADataSize).toEqual(afterUserADataSize);
    expect(beforeUserBDataSize).toEqual(afterUserBDataSize);
  });

  test("should NOT update if not disconnected", async () => {
    const beforeSnapshot = firestore.makeDocumentSnapshot({
      status: "disconnected",
      uids,
    },
    "connection/yC8pYI5d8hLp6VmgtqNS"
    );
    const afterSnapshot = firestore.makeDocumentSnapshot({
      status: "connected",
      uids,
    },
    "connection/yC8pYI5d8hLp6VmgtqNS"
    );
    const change = makeChange(beforeSnapshot, afterSnapshot);
    const params = {connectionId: afterSnapshot.id};
    const userADoc = usersRef.doc(uids[0]);
    const userBDoc = usersRef.doc(uids[1]);
    const beforeUserAData = await userADoc.get();
    const beforeUserBData = await userBDoc.get();

    expect(beforeUserAData.get("connections")?.length).toEqual(1);
    expect(beforeUserBData.get("connections")?.length).toEqual(1);

    await wrapped({data: change, params});

    const afterUserAData = await userADoc.get();
    const afterUserBData = await userBDoc.get();

    expect(afterUserAData.get("connections")?.length).toEqual(1);
    expect(afterUserBData.get("connections")?.length).toEqual(1);
  });
});

import {expect, test} from "@jest/globals";
import firebaseFunctionsTest from "firebase-functions-test";
import {logger} from "firebase-functions/v2";
import * as addQodApi from "../src/api/add-qod";

// Ensure to import cloud functions from top level for admin.initializeApp()
import {onNewConnection} from "../src/index";

const {wrap, firestore} = firebaseFunctionsTest({
  projectId: "rf-app-dev-7145f",
}, "../rf-app-dev-7145f-serviceKeys.json");

describe("Cloud Function [trigger] > addQodOnNewConnection", () => {
  const mockError = jest.spyOn(logger, "error");
  const wrapped = wrap(onNewConnection);
  const snapshot = firestore.makeDocumentSnapshot(
    {
      status: "connected",
      uids: ["aDhpBkhITxQ7c6PPclUwlGRoHUl2", "sNxS7Q9w5RYLB87bBB6N2NdBGU73"],
    },
    "connection/yC8pYI5d8hLp6VmgtqNS"
  );
  const params = {connectionId: snapshot.id};

  beforeEach(() => {
    mockError.mockReset();
  });

  test("should trigger addQodFunc with connectionId param", async () => {
    const addQodFuncSpy = jest.spyOn(addQodApi, "addQodFunc");

    addQodFuncSpy.mockImplementation((connectionId) => {
      expect(connectionId).toEqual(snapshot.id);
      return Promise.resolve(undefined);
    });

    await wrapped({data: snapshot, params});
    expect(addQodFuncSpy).toBeCalledWith(snapshot.id);
  });

  test("should trigger addQodFunc with error", async () => {
    const errorMsg = "Test catching error from addQodFunc";
    const addQodFuncSpy = jest.spyOn(addQodApi, "addQodFunc");

    addQodFuncSpy.mockImplementation(() => {
      throw Error(errorMsg);
    });

    await wrapped({data: snapshot, params});

    expect(mockError).toBeCalledTimes(1);
    expect(mockError).toBeCalledWith(errorMsg);
  });

  test("should log error when connectionId is null", async () => {
    await wrapped();

    expect(mockError).toBeCalledTimes(1);
    expect(mockError).toBeCalledWith("connectionId is null");
  });
});

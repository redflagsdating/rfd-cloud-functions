import {expect, test} from "@jest/globals";
import firebaseFunctionsTest from "firebase-functions-test";
import {logger} from "firebase-functions/v2";
import * as addQodApi from "../api/add-qod";

// Ensure to import cloud functions from top level for admin.initializeApp()
import {addQodOnNewConnection} from "../index";

const {wrap, firestore} = firebaseFunctionsTest();

describe("Cloud Function [trigger] > addQodOnNewConnection", () => {
  const mockError = jest.spyOn(logger, "error");
  const wrapped = wrap(addQodOnNewConnection);
  const snapshot = firestore.makeDocumentSnapshot(
    {
      status: "connected",
      uids: ["123", "456"],
    },
    "connection/yC8pYI5d8hLp6VmgtqNS"
  );
  const params = {connectionId: snapshot.id};

  beforeEach(() => {
    mockError.mockReset();
  });

  test("should trigger addQodFunc with connectionId param", () => {
    const addQodFuncSpy = jest.spyOn(addQodApi, "addQodFunc");

    addQodFuncSpy.mockImplementation((connectionId) => {
      expect(connectionId).toEqual(snapshot.id);
      return Promise.resolve(undefined);
    });

    wrapped({data: snapshot, params});
    expect(addQodFuncSpy).toBeCalledWith(snapshot.id);
  });

  test("should trigger addQodFunc with error", () => {
    const errorMsg = "Test catching error from addQodFunc";
    const addQodFuncSpy = jest.spyOn(addQodApi, "addQodFunc");

    addQodFuncSpy.mockImplementation(() => {
      throw Error(errorMsg);
    });

    wrapped({data: snapshot, params});
    expect(mockError).toBeCalledTimes(1);
    expect(mockError).toBeCalledWith(errorMsg);
  });

  test("should log error when connectionId is null", () => {
    wrapped();

    expect(mockError).toBeCalledTimes(1);
    expect(mockError).toBeCalledWith("connectionId is null");
  });
});

import {Response} from "firebase-functions";
import firebase from "firebase-functions-test";
import {assert, stub} from "sinon";
import {onCalculate} from "../src/index";

const test = firebase();
// const test = FirebaseFunctionsTest({
//   storageBucket: 'rf-app-dev-7145f.appspot.com',
//   projectId: 'rf-app-dev-7145f',
// }, 'rf-app-dev-7145f-a270458d3aca.json');

describe("Demo test", async () => {
  after(() => {
    test.cleanup();
  });

  it("should return 3", () => {
    const req = {
      query: {},
      body: {
        param1: 1,
        param2: 2,
      },
    };

    const res = {status: stub().returnsThis(), send: stub()};

    onCalculate(req as never, (res as unknown) as Response);

    assert.calledWithExactly(res.status, 200);
    assert.calledWithExactly(res.send, 3);
  });
});

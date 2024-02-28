/* eslint-disable max-len */
import admin from "firebase-admin";
import {setGlobalOptions} from "firebase-functions/v2";

admin.initializeApp();

setGlobalOptions({region: "australia-southeast1"});

export {addQodOnNewConnection} from "./add-qod-on-new-connection";
export {addNewConnections, addQod, searchNewConnections} from "./api";
export {updateConnectionOnSchedule} from "./update-connection-on-schedule";
export {updateUserOnDisconnected} from "./update-user-on-disconnected";


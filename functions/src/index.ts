/* eslint-disable max-len */
import admin from "firebase-admin";
import {setGlobalOptions} from "firebase-functions/v2";

admin.initializeApp();

setGlobalOptions({region: "australia-southeast1"});

export {addQod, addUserNewConnections, searchMatchedUsers} from "./api";
export {onNewConnection} from "./on-new-connection";
export {onNewMessage} from "./on-new-message";
export {onUserDeleted} from "./on-user-deleted";
export {onUserUpdated} from "./on-user-updated";
export {updateConnectionOnSchedule} from "./update-connection-on-schedule";


/* eslint-disable max-len */
import admin from "firebase-admin";
import {setGlobalOptions} from "firebase-functions/v2";

admin.initializeApp();

setGlobalOptions({region: "australia-southeast1"});

export {addQod, addUserNewConnections, searchMatchedUsers} from "./api";
export {initUserConnectionsCount} from "./init-user-connections-count";
export {onNewConnection} from "./on-new-connection";
export {onNewUserOnboarded} from "./on-new-user-onboarded";
export {onUserDeleted} from "./on-user-deleted";
export {updateConnectionOnSchedule} from "./update-connection-on-schedule";
export {updateUsersOnDisconnected} from "./update-users-on-disconnected";


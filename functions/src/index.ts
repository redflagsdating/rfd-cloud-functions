/* eslint-disable max-len */
import admin from "firebase-admin";
import {setGlobalOptions} from "firebase-functions/v2";

admin.initializeApp();

setGlobalOptions({region: "australia-southeast1"});

export {addQod, addQodOnCreated} from "./api/add-qod-to-connection";
export {deleteConnectionOnUpdated, onCheckConnections} from "./api/delete-connection";


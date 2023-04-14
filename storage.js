const { initializeApp, cert } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");

const serviceAccount = require("./ticketing-60a94-firebase-adminsdk-hlevg-55153b5806.json");

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: "gs://ticketing-60a94.appspot.com",
});

const bucket = getStorage().bucket();
module.exports = bucket;

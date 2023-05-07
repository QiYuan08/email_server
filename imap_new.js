const { ImapFlow } = require("imapflow");
const simpleParser = require("mailparser").simpleParser;
const superagent = require("superagent");
// const { initializeApp } = require("firebase-admin/app");
const path = require("path");
const fs = require("fs");
const os = require("os");
const admin = require("firebase-admin");
const bucket = require("./storage");
const { v4 } = require("uuid");

// const app = initializeApp();
const userEmail = "magittester@gmail.com";
let client;

const readMail = async (mailID) => {
  // Then download the whole email by using null
  const { meta, content } = await client.download("*", null, {
    uid: true,
  });

  // and simpleParser is able to process the stream as a Promise
  const parsed = await simpleParser(content);

  // get the ticketID
  superagent
    .post(
      "https://us-central1-ticketing-60a94.cloudfunctions.net/mailer/get-id"
    )
    .set("Content-Type", "application/json")
    .send({
      references: parsed.references ?? ["none"],
    })
    .set("Accept", "application/json")
    .then(async (response) => {
      let data = response.body;
      console.log(data);
      let ticketID = data.exist
        ? data.ticketID
        : "TK" + Math.floor(100000 + Math.random() * 900000);

      let attachmentArr = [];
      let firebaseMessageId = v4();

      await Promise.all(
        parsed.attachments.map(async (item) => {
          attachmentArr.push({
            filename: item.filename,
            size: item.size,
            // contentBuffer: item.content,
          });

          await writeToFile(
            item.filename,
            item.content,
            ticketID,
            firebaseMessageId
          );
        })
      );

      // https://us-central1-ticketing-60a94.cloudfunctions.net/mailer/create-ticket
      // "http://127.0.0.1:5001/ticketing-60a94/us-central1/mailer/create-ticket"

      superagent
        .post(
          "https://us-central1-ticketing-60a94.cloudfunctions.net/mailer/create-ticket"
        )
        .set("Content-Type", "application/json")
        .send({
          ticketID: ticketID,
          firebaseMessageId: firebaseMessageId,
          references: parsed.references,
          email: parsed.from.value[0].address,
          sendMail: false,
          messageId: parsed.messageId,
          subject: parsed.headers?.get("subject") ?? "",
          message: parsed.html ?? parsed.textAsHtml ?? parsed.text,
          to: parsed.to.value[0].address,
          attachments: attachmentArr,
          cc: parsed.cc?.value?.map((addr) => addr.address) ?? [],
        })
        .set("Accept", "*/*")
        .then((response) => {
          writeLog(response);
        })
        .catch((err) => {
          writeLog(err);
        });
    })
    .catch((error) => {
      console.error(error);
    });
};

const isObject = (value) => {
  return value != null && typeof value == "object" && !Array.isArray(value);
};

const writeToFile = async (fileName, data, ticketID, messageId) => {
  let filehandle = null;
  const tmpPath = path.join(os.tmpdir(), fileName);

  try {
    filehandle = await fs.promises.open(tmpPath, (mode = "w"));
    // Write to file
    await filehandle.writeFile(data, { encoding: "base64" });
  } finally {
    if (filehandle) {
      // Close the file if it is opened.
      await filehandle.close();
      // console.log("finished reading");
    }
  }

  const destination = `${ticketID}/${messageId}/${fileName}`;

  try {
    await bucket.upload(tmpPath, {
      destination: destination,
    });
  } catch (err) {
    console.error("Send mail error: ", err);
  }

  writeLog("successfully uploaded to " + ticketID, messageId);
};

const writeLog = (log) => {
  var logStream = fs.createWriteStream("log.txt", { flags: "a" });
  logStream.write("Start log \n");
  logStream.write(isObject(log) ? JSON.stringify(log) : log.toString() + "\n");
  logStream.write("\n");
  logStream.end("End log \n");
};

const main = async () => {
  client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: userEmail,

      // magit.sg
      // pass: "ghpdcpxcsgviyczr",

      pass: "bshhoioghiccfidd",

      // chaelqi89gmail
      // pass: "zvevmwhhwvoamzha",
    },
  });

  await client.connect();

  // await client.mailboxOpen("INBOX");
  let lock = await client.getMailboxLock("INBOX");

  // await readMail();
  // lock.release();
  // client.close();

  try {
    client.on("exists", (data) => {
      writeLog(`Message count in "${data.path}" is ${data.count}`);
      writeLog(data);
      readMail();
    });

    client.on("error", (error) => {
      writeLog("Error output: ", error);
    });

    client.on("log", (entry) => {
      writeLog("Log output: ", `${entry.cid} ${entry.msg}`);
    });

    client.on("close", () => {
      lock.release();
      main();
    });
  } finally {
    lock.release();
  }
};

// readMail(5169);
main();

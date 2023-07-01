const { ImapFlow } = require("imapflow");
const simpleParser = require("mailparser").simpleParser;
const superagent = require("superagent");
// const { initializeApp } = require("firebase-admin/app");
const path = require("path");
const fs = require("fs");
const os = require("os");
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

  let apiCall = superagent.post("http://127.0.0.1:8000/api/createTicket");
  // .set("Content-Type", "multipart/form-data")

  console.log("haahahhaha", parsed.attachments.length);

  parsed.attachments.map(async (attachment) => {
    // let filePath = await writeToFile(attachment.filename, attachment.content);

    // console.log(1, filePath);
    apiCall.attach(
      attachment.filename,
      attachment.content,
      attachment.filename
    );
  });

  console.log(" reply to: " + parsed.inReplyTo ?? "");
  console.log(" references to: " + parsed.references);

  apiCall
    .field("inReplyTo", parsed.inReplyTo ?? "")
    .field("from", parsed.from.value[0].address)
    .field("messageId", parsed.messageId)
    .field("fromName", parsed.from.value[0].name)
    .field("subject", parsed.headers?.get("subject") ?? "")
    .field("message", parsed.html ?? parsed.textAsHtml ?? parsed.text)
    .field("to", parsed.to.value[0].address)
    .field("cc", parsed.cc?.value?.map((addr) => addr.address) ?? [])
    .end((err, response) => {
      if (err) {
        console.log(err);
        writeLog(err);
      } else {
        writeLog(response);
        console.log("1233432534523656536", response.body);
      }
    });

  // apiCall
  //   .send({
  // ticketID: ticketID,
  // firebaseMessageId: firebaseMessageId,
  // references: parsed.references,
  // from: parsed.from.value[0].address,
  // fromName: parsed.from.value[0].name,
  // sendMail: false,
  // messageId: parsed.messageId,
  // subject: parsed.headers?.get("subject") ?? "",
  // message: parsed.html ?? parsed.textAsHtml ?? parsed.text,
  // to: parsed.to.value[0].address,
  // attachments: parsed.attachments,
  // cc: parsed.cc?.value?.map((addr) => addr.address) ?? [],
  //   })
  //   .set("Accept", "application/json")
  // .then((response) => {
  //   writeLog(response);
  //   console.log("1233432534523656536", response);
  // })
  // .catch((err) => {
  //   console.log(err);
  //   writeLog(err);
  // })
  // .catch((error) => {
  //   console.error(error);
  // });
};

const isObject = (value) => {
  return value != null && typeof value == "object" && !Array.isArray(value);
};

const writeToFile = async (fileName, data) => {
  let filehandle = null;
  const tmpPath = path.join(os.tmpdir(), fileName);
  // path.join("uploads/", fileName);

  fs.writeFileSync(tmpPath, data, { encoding: "base64", flag: "w" });

  console.log(tmpPath);
  return tmpPath;

  //   filehandle = await fs.promises.open(tmpPath, "w");
  //   // Write to file
  //   await filehandle.writeFile(data, { encoding: "base64" });
  //   return tmpPath;
  // } finally {
  //   if (filehandle) {
  //     // Close the file if it is opened.
  //     console.log(2);
  //     await filehandle.close();
  //     // console.log("finished reading");
  //   }
  // }

  // writeLog("successfully uploaded to " + ticketID, messageId);
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
    // host: "imap.gmail.com",
    host: "cloudmail103.zonecybersite.com",
    port: 993,
    secure: true,
    auth: {
      user: "support@magit.sg",
      pass: "Mag@1234$$",

      // user: "chaelqi89@gmail.com",
      // pass: "ghpdcpxcsgviyczr",

      // user: "magittester@gmail.com",
      // pass: "bshhoioghiccfidd",
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

const { ImapFlow } = require("imapflow");
const simpleParser = require("mailparser").simpleParser;
const superagent = require("superagent");
// const { initializeApp } = require("firebase-admin/app");
const path = require("path");
const fs = require("fs");
const os = require("os");
const admin = require("firebase-admin");
const bucket = require("./storage");

// const app = initializeApp();
const userEmail = "chaelqi89@gmail.com";
let client;

const readMail = async (mailID) => {
  // Then download the whole email by using null
  const { meta, content } = await client.download("*", null, {
    uid: true,
  });

  // and simpleParser is able to process the stream as a Promise
  const parsed = await simpleParser(content);

  let attachmentArr = [];
  let ticketID = "RMTK" + Math.floor(100000 + Math.random() * 900000);

  parsed.attachments.forEach((item) => {
    attachmentArr.push({
      filename: item.filename,
      size: item.size,
      // contentBuffer: item.content,
    });

    writeToFile(item.filename, item.content, ticketID);
  });

  // superagent
  //   .post(
  //     "https://us-central1-ticketing-60a94.cloudfunctions.net/mailer/create-ticket"
  //   )
  //   .send({
  //     email: userEmail,
  //     subject: parsed.headers.get("subject"),
  //     message: parsed.text,
  //     to: userEmail,
  //     attachments: attachmentArr,
  //   })
  //   .set("Content-Type", "application/json")
  //   .set("Accept", "*/*")
  //   .then((response) => {
  //     console.log(response.data);
  //   })
  //   .catch((err) => console.error(err));

  // https://us-central1-ticketing-60a94.cloudfunctions.net/mailer/create-ticket
  // "http://127.0.0.1:5001/ticketing-60a94/us-central1/mailer/create-ticket"

  superagent
    .post(
      "https://us-central1-ticketing-60a94.cloudfunctions.net/mailer/create-ticket"
    )
    .set("Content-Type", "application/json")
    .send({
      ticketID: ticketID,
      email: userEmail,
      subject: parsed.headers.get("subject"),
      message: parsed.text,
      to: userEmail,
      attachments: attachmentArr,
      cc: parsed.cc?.value?.map((addr) => addr.address) ?? [],
    })
    .set("Accept", "*/*")
    .then((response) => {
      console.log(response);
    })
    .catch((err) => {
      console.log(err);
    });
};

const writeToFile = async (fileName, data, ticketID) => {
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

  const destination = `${ticketID}/${fileName}`;

  try {
    await bucket.upload(tmpPath, {
      destination: destination,
    });
  } catch (err) {
    console.error(err);
  }

  console.log("successfully uploaded to " + ticketID);
};

const main = async () => {
  client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      // chaelqi89gmail
      user: userEmail,
      pass: "ghpdcpxcsgviyczr",
    },
  });

  await client.connect();

  // await client.mailboxOpen("INBOX");
  let lock = await client.getMailboxLock("INBOX");

  await readMail();
  lock.release();
  client.close();

  // try {
  //   client.on("exists", (data) => {
  //     console.log(`Message count in "${data.path}" is ${data.count}`);
  //     console.log(data);
  //     readMail();
  //   });

  //   client.on("error", (error) => {
  //     console.log(error);
  //   });

  //   client.on("log", (entry) => {
  //     console.log(`${log.cid} ${log.msg}`);
  //   });

  //   client.on("close", () => {
  //     lock.release();
  //     main();
  //   });
  // } finally {
  //   lock.release();
  // }
};

// readMail(5169);
main();

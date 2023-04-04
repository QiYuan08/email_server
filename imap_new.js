const { ImapFlow } = require("imapflow");
const simpleParser = require("mailparser").simpleParser;
const superagent = require("superagent");

const userEmail = "chaelqi89@gmail.com";

const client = new ImapFlow({
  host: "imap.gmail.com",
  port: 993,
  secure: true,
  auth: {
    // chaelqi89gmail
    user: userEmail,
    pass: "ghpdcpxcsgviyczr",
  },
});

const readMail = async (mailID) => {
  // Then download the whole email by using null
  const { meta, content } = await client.download("*", null, {
    uid: true,
  });

  // and simpleParser is able to process the stream as a Promise
  const parsed = await simpleParser(content);

  superagent
    .post(
      "https://us-central1-ticketing-60a94.cloudfunctions.net/mailer/create-ticket"
    )
    .send({
      email: userEmail,
      subject: parsed.headers.get("subject"),
      message: parsed.text,
    })
    .set("Content-Type", "application/json")
    .set("Accept", "*/*")
    .then((response) => {
      console.log(response.data);
    })
    .catch((err) => console.error(err));
};

const main = async () => {
  await client.connect();

  // await client.mailboxOpen("INBOX");
  let lock = await client.getMailboxLock("INBOX");

  try {
    // on new email send call the callback
    client.on("exists", (data) => {
      console.log(`Message count in "${data.path}" is ${data.count}`);
      console.log(data);
      readMail();
    });

    client.on("error", (error) => {
      console.log(error);
      readMail();
    });
  } finally {
    lock.release();
  }
};

// readMail(5169);
main();

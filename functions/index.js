/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const request = require("request-promise");

const logger = require("firebase-functions/logger");

// Set the maximum instances to 10 for all functions
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

exports.HealthCheck = onRequest((req, res) => {
  logger.info("Hello logs!", { structuredData: true });
  res.send("Hello from Firebase!");
});

const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message";
const LINE_HEADER = {
  "Content-Type": "application/json",
  Authorization: `Bearer niV7MZBXf0aMRHfjVsi0x2B2Rc3HNxl+B0Do8n2d2cD5g5jKf3xTgMiK7NcFPa6I6N6UIYn54F0BWbkxmQviG2hAhWzxqqwHhLCNUKE7CUtzH3dEoy2SDlh6axRtcE+vLduL6sU3nOkUCG8mQokdXAdB04t89/1O/w1cDnyilFU=`,
};

exports.LineBot = onRequest((req, res) => {
  if (req.body.events[0].message.type !== "text") {
    return;
  }
  reply(req.body);
});

const reply = (bodyResponse) => {
  return request({
    method: `POST`,
    uri: `${LINE_MESSAGING_API}/reply`,
    headers: LINE_HEADER,
    body: JSON.stringify({
      replyToken: bodyResponse.events[0].replyToken,
      messages: [
        {
          type: `text`,
          text: bodyResponse.events[0].message.text,
        },
        {
          type: "text", // ①
          text: "Select your favorite food category or send me your location!",
          quickReply: {
            // ②
            items: [
              {
                type: "action", // ③
                imageUrl: "https://example.com/sushi.png",
                action: {
                  type: "message",
                  label: "Sushi",
                  text: "Sushi",
                },
              },
              {
                type: "action",
                imageUrl: "https://example.com/tempura.png",
                action: {
                  type: "message",
                  label: "Tempura",
                  text: "Tempura",
                },
              },
              {
                type: "action", // ④
                action: {
                  type: "location",
                  label: "Send location",
                },
              },
            ],
          },
        },
      ],
    }),
  });
};

exports.LineBotPush = onRequest((req, res) => {
  return request({
    method: `GET`,
    headers: {
      "X-RapidAPI-Key": "e11548470cmsh47de7c0b08636d3p11b4cajsn0065b2b4b88e",
      "X-RapidAPI-Host": "weatherapi-com.p.rapidapi.com",
    },
    uri: `https://weatherapi-com.p.rapidapi.com/current.json?q=13.819314097361195,100.51429852634443`,
  })
    .then((response) => {
      const data = JSON.parse(response);

      //TODO: close here before deploy firebase functions
      // console.log(
      //   "========================== location =================================="
      // );
      // console.log(data.location);
      // console.log(
      //   "============================ current ================================"
      // );
      // console.log(data.current);
      // console.log(
      //   "============================================================"
      // );

      const message = `Report Now!
      \n- location: ${data.location.name}\n- region: ${data.location.region}\n- last_updated: ${data.current.last_updated}\n- temp_c: ${data.current.temp_c} (° C)`;

      // res.json(message);
      return push(res, message);
    })
    .catch((error) => {
      return res.status(500).send(error);
    });
});

const push = async (res, msg) => {
  try {
    await request({
      method: `POST`,
      uri: `${LINE_MESSAGING_API}/push`,
      headers: LINE_HEADER,
      body: JSON.stringify({
        to: `U91c3b119450a3b494055bafb98c1a484`,
        messages: [
          {
            type: `text`,
            text: msg,
          },
        ],
      }),
    });
    return res.status(200);
  } catch (error) {
    return await Promise.reject(error);
  }
};

exports.HelloWorld = onRequest((req, res) => {
  res.send("Hello World!");
});

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
setGlobalOptions({ maxInstances: 5 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

exports.healthcheck = onRequest((req, res) => {
  logger.info("Hello logs!", { structuredData: true });
  res.send("Hello from Firebase!");
});

exports.chatgpt = onRequest(async (req, res) => {
  try {
    if (req.body.events[0].message.type !== "text") {
      return;
    }

    const reqBody = req.body.events[0].message.text;
    logger.info(reqBody, { structuredData: true });

    const resFromGPT = await senddingToOpenAIChatGPT(reqBody);
    const data = JSON.parse(resFromGPT);
    logger.info(data, { structuredData: true });

    const body = data.choices[0].message.content;
    logger.info(body, { structuredData: true });

    const replyToken = req.body.events[0].replyToken;

    return reply(replyToken, body);
  } catch (error) {
    return res.status(200);
  }
});

const senddingToOpenAIChatGPT = async (bodyResponse) => {
  const OPEN_AI_API = process.env.OPEN_AI_API;
  const OPEN_AI_HEADER = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPEN_AI_HEADER_TOKEN}`,
  };

  const res = await request({
    method: `POST`,
    uri: OPEN_AI_API,
    headers: OPEN_AI_HEADER,
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "ให้คุณเป็นผู้ช่วยของผม",
        },
        {
          role: "user",
          content: bodyResponse,
        },
      ],
    }),
  });

  return res;
};

const LINE_MESSAGING_API = process.env.LINE_MESSAGING_API;
const LINE_HEADER = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.LINE_HEADER_TOKEN}`,
};

const reply = (replyToken, text) => {
  return request({
    method: `POST`,
    uri: `${LINE_MESSAGING_API}/reply`,
    headers: LINE_HEADER,
    body: JSON.stringify({
      replyToken: replyToken,
      messages: [
        {
          type: `text`,
          text: "From ChatGPT : " + text,
        },
      ],
    }),
  });
};

// exports.LineBot = onRequest((req, res) => {
//   if (req.body.events[0].message.type !== "text") {
//     return;
//   }
//   reply(req.body);
// });

// const reply = (bodyResponse) => {
//   return request({
//     method: `POST`,
//     uri: `${LINE_MESSAGING_API}/reply`,
//     headers: LINE_HEADER,
//     body: JSON.stringify({
//       replyToken: bodyResponse.events[0].replyToken,
//       messages: [
//         {
//           type: `text`,
//           text: bodyResponse.events[0].message.text,
//         },
//         {
//           type: "text", // ①
//           text: "Select your favorite food category or send me your location!",
//           quickReply: {
//             // ②
//             items: [
//               {
//                 type: "action", // ③
//                 imageUrl: "https://example.com/sushi.png",
//                 action: {
//                   type: "message",
//                   label: "Sushi",
//                   text: "Sushi",
//                 },
//               },
//               {
//                 type: "action",
//                 imageUrl: "https://example.com/tempura.png",
//                 action: {
//                   type: "message",
//                   label: "Tempura",
//                   text: "Tempura",
//                 },
//               },
//               {
//                 type: "action", // ④
//                 action: {
//                   type: "location",
//                   label: "Send location",
//                 },
//               },
//             ],
//           },
//         },
//       ],
//     }),
//   });
// };

exports.linebotpush = onRequest(async (req, res) => {
  try {
    const response = await request({
      method: `GET`,
      headers: {
        "X-RapidAPI-Key": "e11548470cmsh47de7c0b08636d3p11b4cajsn0065b2b4b88e",
        "X-RapidAPI-Host": "weatherapi-com.p.rapidapi.com",
      },
      uri: `https://weatherapi-com.p.rapidapi.com/current.json?q=13.819314097361195,100.51429852634443`,
    });
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
    return await push(res, message);
  } catch (error) {
    return res.status(500).send(error);
  }
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

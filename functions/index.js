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

exports.healthcheck = onRequest((req, res) => {
  logger.info("Hello logs!", { structuredData: true });
  res.send("Hello from Firebase! functions");
});

exports.bothooks = onRequest(async (req, res) => {
  try {
    if (req.body.events[0].message.type !== "text") {
      return;
    }

    const text = req.body.events[0].message.text;
    const replyToken = req.body.events[0].replyToken;

    // detect weather functions
    if (text === "สภาพอากาศวันนี้ที่ มจพ.") {
      return getWeather(replyToken, text);
    }

    // Gpt functions
    const isGpt = text.startsWith("gpt: ");

    if (isGpt) {
      const resFromGPT = await senddingToOpenAIChatGPT(text);
      const data = JSON.parse(resFromGPT);
      const body = data.choices[0].message.content;

      return replyFromChatGPT(replyToken, body);
    }

    return res.send("ok").status(200);
  } catch (error) {
    return res.send(error).status(200);
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

const replyFromChatGPT = (replyToken, text) => {
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

const getWeather = async (replyToken) => {
  const response = await request({
    method: `GET`,
    headers: {
      "X-RapidAPI-Key": `${process.env.WEATHER_KEY}`,
      "X-RapidAPI-Host": "weatherapi-com.p.rapidapi.com",
    },
    uri: `https://weatherapi-com.p.rapidapi.com/current.json?q=${process.env.LOCATION_LAT},${process.env.LOCATION_LONG}`,
  });
  const data = JSON.parse(response);
  const message = `Report Now!
      \n- location: KMUTNB\n- region: ${data.location.region}\n- last_updated: ${data.current.last_updated}\n- temp_c: ${data.current.temp_c} (° C)`;

  return await reply(replyToken, message);
};

const reply = async (replyToken, msg) => {
  return request({
    method: `POST`,
    uri: `${LINE_MESSAGING_API}/reply`,
    headers: LINE_HEADER,
    body: JSON.stringify({
      replyToken: replyToken,
      messages: [
        {
          type: `text`,
          text: msg,
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

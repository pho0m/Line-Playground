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
    const replyToken = req.body.events[0].replyToken;
    const eventType = req.body.events[0].type;

    switch (eventType) {
      case "postback":
        const postbackData = req.body.events[0].postback.data;

        // detect weather functions
        if (postbackData.toString() === "weather") {
          return replyWeatherSelectLocation(replyToken);
        }

        // detect weather functions
        if (postbackData.toString() === "camera") {
          return replyWithQuickReply(replyToken);
        }

        // detect weather functions
        if (postbackData.toString() === "horoscope") {
          return replyWithQuickReplyHoroscope(replyToken);
        }
        break;

      case "message":
        const messageData = req.body.events[0].message;
        const type = req.body.events[0].message.type;

        if (type.toString() === "location") {
          return getWeather(replyToken, messageData);
        }
        break;

      default:
        // Type Text Section
        if (req.body.events[0].message.type !== "text") {
          return;
        }
        const text = req.body.events[0].message.text;

        // Gpt functions
        const isGpt = text.startsWith("gpt: ");

        if (isGpt) {
          const resFromGPT = await senddingToOpenAIChatGPT(text);
          const data = JSON.parse(resFromGPT);
          const body = data.choices[0].message.content;

          return replyFromChatGPT(replyToken, body);
        }

        break;
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

const replyWeatherSelectLocation = async (replyToken) => {
  return request({
    method: `POST`,
    uri: `${LINE_MESSAGING_API}/reply`,
    headers: LINE_HEADER,
    body: JSON.stringify({
      replyToken: replyToken,
      messages: [
        {
          type: `text`,
          text: "ปักหมุดตำแหน่งปัจจุบันให้หน่อยฮะ",
          quickReply: {
            items: [
              {
                type: "action",
                action: {
                  type: "location",
                  label: "Location",
                },
              },
            ],
          },
        },
      ],
    }),
  });
};

const getWeather = async (replyToken, messageData) => {
  const response = await request({
    method: `GET`,
    headers: {
      "X-RapidAPI-Key": `${process.env.WEATHER_KEY}`,
      "X-RapidAPI-Host": "weatherapi-com.p.rapidapi.com",
    },
    uri: `https://weatherapi-com.p.rapidapi.com/current.json?q=${messageData.latitude},${messageData.longitude}`,
  });

  const data = JSON.parse(response);
  const message = `รายงาน อุณหภูมิ วันนี้ค้าบ !\nอยู่ที่ ${data.current.temp_c} องศา (° C)
      \n- สถานที่: ${messageData.address}\n\n- จังหวัด: ${data.location.region}\n- อัพเดทล่าสุด: ${data.current.last_updated}`;

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

const replyWithQuickReply = async (replyToken) => {
  return request({
    method: `POST`,
    uri: `${LINE_MESSAGING_API}/reply`,
    headers: LINE_HEADER,
    body: JSON.stringify({
      replyToken: replyToken,
      messages: [
        {
          type: `text`,
          text: "เลือกใช้งาน action ด้านล่างได้เลยครับ",
          quickReply: {
            items: [
              {
                type: "action",
                action: {
                  type: "uri",
                  label: "URI",
                  uri: "https://developers.line.biz",
                },
              },
              {
                type: "action",
                action: {
                  type: "cameraRoll",
                  label: "Camera Roll",
                },
              },
              {
                type: "action",
                action: {
                  type: "camera",
                  label: "Camera",
                },
              },
              {
                type: "action",
                action: {
                  type: "location",
                  label: "Location",
                },
              },
              {
                type: "action",
                imageUrl:
                  "https://cdn1.iconfinder.com/data/icons/mix-color-3/502/Untitled-1-512.png",
                action: {
                  type: "message",
                  label: "Message",
                  text: "Hello World!",
                },
              },
              {
                type: "action",
                action: {
                  type: "postback",
                  label: "Postback",
                  data: "action=buy&itemid=123",
                  displayText: "Buy",
                },
              },
              {
                type: "action",
                imageUrl:
                  "https://icla.org/wp-content/uploads/2018/02/blue-calendar-icon.png",
                action: {
                  type: "datetimepicker",
                  label: "Datetime Picker",
                  data: "storeId=12345",
                  mode: "datetime",
                  initial: "2018-08-10t00:00",
                  max: "2018-12-31t23:59",
                  min: "2018-08-01t00:00",
                },
              },
            ],
          },
        },
      ],
    }),
  });
};

const replyWithQuickReplyHoroscope = async (replyToken) => {
  return request({
    method: `POST`,
    uri: `${LINE_MESSAGING_API}/reply`,
    headers: LINE_HEADER,
    body: JSON.stringify({
      replyToken: replyToken,
      messages: [
        {
          type: `text`,
          text: "เลือกแมวที่คุณชอบด้านล่าง เพื่อบ่งบอกตัวตนคุณ",
          quickReply: {
            items: [
              {
                type: "action",
                imageUrl:
                  "https://media.discordapp.net/attachments/1125648829862137916/1136968606664622121/1.png",
                action: {
                  type: "uri",
                  label: "แมวสีส้ม สุดน่ารัก",
                  uri: "https://media.discordapp.net/attachments/1125648829862137916/1136968607662886932/4.png",
                },
              },
              {
                type: "action",
                imageUrl:
                  "https://media.discordapp.net/attachments/1125648829862137916/1136968606970814554/2.png",
                action: {
                  type: "uri",
                  label: "แมวสีครีม แสนสดใส",
                  uri: "https://media.discordapp.net/attachments/1125648829862137916/1136968607948087326/5.png",
                },
              },
              {
                type: "action",
                imageUrl:
                  "https://media.discordapp.net/attachments/1125648829862137916/1136968607356682351/3.png",
                action: {
                  type: "uri",
                  label: "แมวสีขาว ทรงเสน่ห์",
                  uri: "https://media.discordapp.net/attachments/1125648829862137916/1136968608665305168/6.png",
                },
              },
            ],
          },
        },
      ],
    }),
  });
};

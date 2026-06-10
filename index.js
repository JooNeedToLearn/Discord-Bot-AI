require('dotenv').config();

const { Client, GatewayIntentBits, Partials } = require('discord.js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const BOT_PREFIX = process.env.BOT_PREFIX || '!';

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN belum diisi di file .env');
  process.exit(1);
}

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY belum diisi di file .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

function cleanPrompt(message) {
  let text = message.content || '';
  text = text.replace(`<@${client.user.id}>`, '').replace(`<@!${client.user.id}>`, '');
  if (text.startsWith(BOT_PREFIX + 'ai')) text = text.slice((BOT_PREFIX + 'ai').length);
  if (text.startsWith(BOT_PREFIX + 'ask')) text = text.slice((BOT_PREFIX + 'ask').length);
  return text.trim();
}

function chunkText(text, maxLength = 1900) {
  const chunks = [];
  let rest = String(text || '');
  while (rest.length > maxLength) {
    chunks.push(rest.slice(0, maxLength));
    rest = rest.slice(maxLength);
  }
  if (rest.length) chunks.push(rest);
  return chunks;
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((part) => part.text || '').join('\n').trim();
  return text || 'Aku belum bisa menjawab itu.';
}

async function askGemini(prompt, username) {
  const systemInstruction = [
    'Kamu adalah KelNara AI, bot Discord yang membantu user dengan jawaban singkat, jelas, dan praktis.',
    'Gunakan bahasa Indonesia kecuali user memakai bahasa lain.',
    'Jangan membocorkan token, API key, atau data rahasia.',
  ].join('\n');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const body = {
    contents: [
      {
        parts: [
          {
            text: `${systemInstruction}\n\nUser Discord: ${username}\nPertanyaan: ${prompt}`,
          },
        ],
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { raw };
  }

  if (!response.ok) {
    const msg = data?.error?.message || raw || `HTTP ${response.status}`;
    throw new Error(`Gemini API error ${response.status}: ${msg}`);
  }

  return extractGeminiText(data);
}

client.once('ready', () => {
  console.log(`KelNara AI aktif sebagai ${client.user.tag}`);
  console.log(`Model: ${GEMINI_MODEL}`);
});

client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return;

    const isDM = message.channel.type === 1;
    const mentioned = message.mentions.has(client.user);
    const prefixed = message.content.startsWith(BOT_PREFIX + 'ai') || message.content.startsWith(BOT_PREFIX + 'ask');

    if (!isDM && !mentioned && !prefixed) return;

    const prompt = cleanPrompt(message);
    if (!prompt) {
      await message.reply(`Tulis pertanyaan setelah mention bot atau pakai ${BOT_PREFIX}ai pertanyaanmu.`);
      return;
    }

    await message.channel.sendTyping();
    const answer = await askGemini(prompt, message.author.username);
    const chunks = chunkText(answer);

    for (const chunk of chunks) {
      await message.reply(chunk);
    }
  } catch (error) {
    console.error(error);
    const msg = String(error && error.message ? error.message : error);

    if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate')) {
      await message.reply('Limit Gemini free tier sedang kena. Coba lagi nanti.');
      return;
    }

    if (msg.includes('400') || msg.includes('404') || msg.toLowerCase().includes('model')) {
      await message.reply('Model Gemini di .env kemungkinan salah. Coba pakai GEMINI_MODEL=gemini-flash-latest lalu restart bot.');
      return;
    }

    if (msg.includes('401') || msg.includes('403') || msg.toLowerCase().includes('api key')) {
      await message.reply('API key Gemini bermasalah. Buat key baru di Google AI Studio lalu update file .env.');
      return;
    }

    await message.reply('Bot error. Cek log Termux dengan: pm2 logs kelnara-ai-bot atau lihat terminal node index.js');
  }
});

client.login(DISCORD_TOKEN);

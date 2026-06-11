require('dotenv').config();

const { Client, GatewayIntentBits, Partials } = require('discord.js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const MIMO_API_KEY = process.env.MIMO_API_KEY;
const MIMO_BASE_URL = (process.env.MIMO_BASE_URL || 'https://api.xiaomimimo.com/v1').replace(/\/$/, '');
const MIMO_MODEL = process.env.MIMO_MODEL || 'mimo-v2.5-pro';
const BOT_PREFIX = process.env.BOT_PREFIX || '!';

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN belum diisi di file .env');
  process.exit(1);
}

if (!MIMO_API_KEY) {
  console.error('MIMO_API_KEY belum diisi di file .env');
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
    let cutAt = rest.lastIndexOf('\n', maxLength);
    if (cutAt < 500) cutAt = maxLength;
    chunks.push(rest.slice(0, cutAt));
    rest = rest.slice(cutAt).trimStart();
  }

  if (rest.length) chunks.push(rest);
  return chunks;
}

function buildSystemPrompt() {
  return [
    'Kamu adalah KelNara Bot, personal AI agent Discord milik user.',
    'Provider utama kamu adalah Xiaomi MiMo. Jangan mengaku memakai Gemini.',
    'Jawab dalam bahasa Indonesia yang santai, jelas, dan langsung ke solusi.',
    'Bantu user untuk chat umum, coding, Discord bot, website, Termux/VSPhone, debugging, dan ide project.',
    'Kalau user minta dibuatkan website, script, file, atau project, berikan kode atau isi lengkap di chat. Jangan membuat attachment file.',
    'Kalau user mengirim error, jelaskan penyebab paling mungkin lalu berikan langkah fix berurutan.',
    'Untuk command terminal gunakan blok bash. Untuk kode gunakan blok kode sesuai bahasa.',
    'Jangan membocorkan token, API key, password, cookie, atau data rahasia.',
    'Tolak permintaan yang berbahaya atau merugikan orang lain.',
  ].join('\n');
}

function extractMiMoText(data) {
  const message = data?.choices?.[0]?.message;
  const content = message?.content;

  if (Array.isArray(content)) {
    return content.map((part) => part?.text || part?.content || '').join('\n').trim() || 'Aku belum bisa menjawab itu.';
  }

  return String(content || '').trim() || 'Aku belum bisa menjawab itu.';
}

async function askMiMo(prompt, username) {
  const response = await fetch(`${MIMO_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MIMO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MIMO_MODEL,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(),
        },
        {
          role: 'user',
          content: `User Discord: ${username}\nPesan user:\n${prompt}`,
        },
      ],
      temperature: 0.7,
      top_p: 0.95,
      max_completion_tokens: 1800,
      stream: false,
    }),
  });

  const raw = await response.text();
  let data;

  try {
    data = JSON.parse(raw);
  } catch {
    data = { raw };
  }

  if (!response.ok) {
    const msg = data?.error?.message || data?.message || raw || `HTTP ${response.status}`;
    const error = new Error(`MiMo API error ${response.status}: ${msg}`);
    error.status = response.status;
    throw error;
  }

  return extractMiMoText(data);
}

client.once('ready', () => {
  console.log(`KelNara AI aktif sebagai ${client.user.tag}`);
  console.log('Mode: Xiaomi MiMo personal agent');
  console.log(`Model: ${MIMO_MODEL}`);
  console.log(`Base URL: ${MIMO_BASE_URL}`);
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
      await message.reply('Tulis pertanyaannya setelah mention bot atau pakai !ai.');
      return;
    }

    await message.channel.sendTyping();
    const answer = await askMiMo(prompt, message.author.username);

    for (const chunk of chunkText(answer)) {
      await message.reply(chunk);
    }
  } catch (error) {
    console.error(error);
    const msg = String(error && error.message ? error.message : error);
    const lower = msg.toLowerCase();

    if (msg.includes('429') || lower.includes('quota') || lower.includes('rate') || lower.includes('balance')) {
      await message.reply('Limit atau balance Xiaomi MiMo sedang bermasalah. Cek saldo MiMo kamu lalu coba lagi.');
      return;
    }

    if (msg.includes('400') || msg.includes('404') || lower.includes('model')) {
      await message.reply('Model Xiaomi MiMo gagal. Coba set MIMO_MODEL=mimo-v2.5-pro dan cek MIMO_BASE_URL di .env.');
      return;
    }

    if (msg.includes('401') || msg.includes('403') || lower.includes('api key') || lower.includes('unauthorized')) {
      await message.reply('API key Xiaomi MiMo bermasalah. Cek MIMO_API_KEY di file .env.');
      return;
    }

    await message.reply(`Bot error dari MiMo/Node.js:\n\`\`\`${msg.slice(0, 1500)}\`\`\``);
  }
});

client.login(DISCORD_TOKEN);

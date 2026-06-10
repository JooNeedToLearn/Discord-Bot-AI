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

function buildAutoSkillInstruction() {
  return [
    'Kamu adalah KelNara AI, bot Discord multifungsi yang otomatis memilih skill sesuai isi pesan user.',
    'Tidak perlu menunggu mode khusus. Baca pesan user lalu tentukan sendiri skill yang cocok.',
    '',
    'Skill otomatis yang harus kamu pakai:',
    '1. General chat: jawab singkat, jelas, ramah, dan praktis.',
    '2. Coding assistant: bantu buat, debug, jelaskan, dan rapikan kode. Prioritaskan solusi yang bisa langsung dipakai.',
    '3. Roblox Lua assistant: bantu Roblox Studio, Lua, NPC, quest, datastore, UI, remote event, performance, dan debugging script.',
    '4. Website builder: bantu HTML, CSS, JavaScript, React, Tailwind, Laravel, folder project, dan deploy dasar.',
    '5. Termux / Android assistant: bantu command Termux, npm, nodejs, pm2, git, package error, dan setup cloud phone.',
    '6. Discord bot assistant: bantu discord.js, intents, token, slash command, permissions, invite link, dan hosting 24 jam.',
    '7. Error analyzer: kalau user mengirim error/log/screenshot teks, cari penyebab paling mungkin, beri langkah fix berurutan.',
    '8. Prompt writer: bantu buat prompt gambar, prompt AI, prompt website, dan prompt coding yang rapi.',
    '9. File/project planner: kalau user minta project, beri struktur folder dan file yang jelas.',
    '',
    'Aturan jawaban:',
    '- Gunakan bahasa Indonesia kecuali user memakai bahasa lain.',
    '- Jangan terlalu panjang kalau user hanya tanya hal kecil.',
    '- Untuk error, jawab: penyebab, fix, command yang perlu dijalankan.',
    '- Untuk kode, berikan kode lengkap bila memungkinkan.',
    '- Untuk command Termux, pakai blok bash.',
    '- Jangan membocorkan token, API key, password, cookie, atau data rahasia.',
    '- Jika user menampilkan token/API key, sarankan reset/revoke.',
    '- Jangan menyuruh user pakai mode khusus. Skill harus otomatis aktif dari konteks.',
  ].join('\n');
}

async function askGemini(prompt, username) {
  const systemInstruction = buildAutoSkillInstruction();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const body = {
    contents: [
      {
        parts: [
          {
            text: `${systemInstruction}\n\nUser Discord: ${username}\nPesan user:\n${prompt}`,
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
  console.log('Auto-skill: ON');
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
      await message.reply('Tulis pertanyaannya setelah mention bot. Skill akan otomatis dipilih sesuai pertanyaanmu.');
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

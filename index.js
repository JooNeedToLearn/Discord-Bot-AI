require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, AttachmentBuilder } = require('discord.js');
const { generateArtifact, detectArtifactType } = require('./artifactGenerator');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const MIMO_API_KEY = process.env.MIMO_API_KEY;
const MIMO_BASE_URL = (process.env.MIMO_BASE_URL || 'https://api.xiaomimimo.com/v1').replace(/\/$/, '');
const MIMO_MODEL = process.env.MIMO_MODEL || 'mimo-v2.5-pro';
const BOT_PREFIX = process.env.BOT_PREFIX || '!';
const SKILL_FILE = process.env.SKILL_FILE || 'skill.shj';

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
    chunks.push(rest.slice(0, maxLength));
    rest = rest.slice(maxLength);
  }
  if (rest.length) chunks.push(rest);
  return chunks;
}

function readSkillFile() {
  const skillPath = path.join(__dirname, SKILL_FILE);
  try {
    return fs.readFileSync(skillPath, 'utf8').trim();
  } catch {
    return '';
  }
}

function fallbackSkillPack() {
  return [
    'SKILL PACK FALLBACK KELNARA AI',
    '1. General chat: jawab singkat, jelas, ramah, dan praktis.',
    '2. Coding assistant: bantu buat, debug, jelaskan, dan rapikan kode.',
    '3. Discord bot assistant: bantu discord.js, intents, slash command, permission, dan hosting.',
    '4. Termux / VSPhone assistant: bantu command Android, npm, nodejs, pm2, git, dan error package.',
    '5. Website builder: bantu HTML, CSS, JavaScript, React, Tailwind, Laravel, dan deploy dasar.',
    '6. Roblox Studio Lua assistant: bantu NPC, quest, datastore, UI, remote event, dan debugging script studio.',
    '7. Error analyzer: kalau user mengirim error/log, jelaskan penyebab dan fix berurutan.',
    '8. Prompt writer: bantu prompt gambar, website, coding, dan AI.',
    '9. Artifact generator: bantu susun isi untuk website, PDF, DOCX, PPTX, dan XLSX.',
  ].join('\n');
}

function buildAutoSkillInstruction(prompt) {
  const artifactType = detectArtifactType(prompt);
  const artifactNote = artifactType
    ? `User meminta output file tipe ${artifactType}. Buat konten yang siap dijadikan file. Jangan menolak selama aman. Untuk website, buat konsep halaman lengkap: section, copywriting, fitur, dan isi konten. Untuk PPT/PDF/DOCX/XLSX, buat isi yang terstruktur.`
    : 'Jika user tidak meminta file, jawab sebagai chat biasa.';

  const skillPack = readSkillFile() || fallbackSkillPack();

  return [
    'Kamu adalah KelNara AI, bot Discord multifungsi untuk user Indonesia.',
    'Kamu memakai Xiaomi MiMo sebagai model utama. Jangan mengaku memakai Gemini/OpenAI/Groq/Ollama.',
    'Tidak perlu menunggu mode khusus. Baca pesan user lalu tentukan sendiri skill yang cocok.',
    artifactNote,
    '',
    'Gunakan daftar skill berikut sebagai kemampuan utama:',
    skillPack,
    '',
    'Aturan jawaban:',
    '- Gunakan bahasa Indonesia kecuali user memakai bahasa lain.',
    '- Jawab langsung ke inti, tidak bertele-tele.',
    '- Untuk error, jawab dengan format: penyebab, fix, command yang perlu dijalankan.',
    '- Untuk kode, berikan kode lengkap bila memungkinkan.',
    '- Untuk command Termux/VSPhone, pakai blok bash.',
    '- Jangan membocorkan token, API key, password, cookie, atau data rahasia.',
    '- Jika user menampilkan token/API key, sarankan reset/revoke.',
    '- Tolak permintaan yang berbahaya seperti token grabber, pencurian akun, malware, spam, atau exploit merusak.',
    '- Jangan menyuruh user pakai mode khusus. Skill harus otomatis aktif dari konteks.',
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
  const systemInstruction = buildAutoSkillInstruction(prompt);

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
          content: systemInstruction,
        },
        {
          role: 'user',
          content: `User Discord: ${username}\nPesan user:\n${prompt}`,
        },
      ],
      temperature: 0.7,
      top_p: 0.95,
      max_completion_tokens: 1600,
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
  console.log(`Provider AI: Xiaomi MiMo`);
  console.log(`Model utama: ${MIMO_MODEL}`);
  console.log(`Base URL: ${MIMO_BASE_URL}`);
  console.log(`Skill file: ${SKILL_FILE}`);
  console.log('Auto-skill: ON');
  console.log('Artifact generator: ON');
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
      await message.reply('Tulis pertanyaannya setelah mention bot. Skill dan jenis output akan otomatis dipilih sesuai pertanyaanmu.');
      return;
    }

    const artifactType = detectArtifactType(prompt);
    await message.channel.sendTyping();

    const answer = await askMiMo(prompt, message.author.username);

    if (artifactType) {
      const info = await message.reply(`Sedang membuat file ${artifactType.toUpperCase()}...`);
      const artifact = await generateArtifact(prompt, answer);

      if (artifact && artifact.path) {
        const attachment = new AttachmentBuilder(artifact.path, { name: artifact.name });
        await message.reply({
          content: `Selesai. Ini file ${artifact.type.toUpperCase()} yang kamu minta:`,
          files: [attachment],
        });
        return;
      }

      await info.edit('Gagal membuat file. Aku kirim isi kontennya saja.');
    }

    const chunks = chunkText(answer);
    for (const chunk of chunks) {
      await message.reply(chunk);
    }
  } catch (error) {
    console.error(error);
    const msg = String(error && error.message ? error.message : error);
    const lower = msg.toLowerCase();

    if (msg.includes('429') || lower.includes('quota') || lower.includes('rate') || lower.includes('balance')) {
      await message.reply('Limit atau balance Xiaomi MiMo sedang bermasalah. Cek saldo/balance MiMo kamu, lalu coba restart bot.');
      return;
    }

    if (msg.includes('400') || msg.includes('404') || lower.includes('model')) {
      await message.reply('Model Xiaomi MiMo gagal. Coba set MIMO_MODEL=mimo-v2.5-pro dan pastikan MIMO_BASE_URL sudah benar di file .env.');
      return;
    }

    if (msg.includes('401') || msg.includes('403') || lower.includes('api key') || lower.includes('unauthorized')) {
      await message.reply('API key Xiaomi MiMo bermasalah. Cek MIMO_API_KEY di file .env, pastikan key aktif dan balance tersedia.');
      return;
    }

    await message.reply('Bot error. Cek log VSPhone/Termux dengan: pm2 logs kelnara-ai-bot atau lihat terminal node index.js');
  }
});

client.login(DISCORD_TOKEN);

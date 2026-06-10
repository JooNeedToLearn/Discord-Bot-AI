# KelNara AI Discord Bot

Bot Discord AI untuk Termux / VS Phone menggunakan Gemini.

## File yang sudah ada

- `index.js` = kode utama bot
- `package.json` = dependency Node.js
- `.gitignore` = mencegah file rahasia ikut terupload

## Setup cepat di Termux

```bash
pkg update -y
pkg install -y nodejs git nano

git clone https://github.com/JooNeedToLearn/Discord-Bot-AI.git
cd Discord-Bot-AI
npm install
nano .env
```

Isi file `.env` di Termux dengan variabel berikut:

```txt
DISCORD_TOKEN=isi_dengan_token_bot_discord
GEMINI_API_KEY=isi_dengan_key_gemini_baru
GEMINI_MODEL=gemini-2.5-flash-lite
BOT_PREFIX=!
```

Jalankan test:

```bash
node index.js
```

## Jalankan 24 jam

```bash
npm install -g pm2
pm2 start index.js --name kelnara-ai-bot
pm2 save
pm2 status
```

Lihat log:

```bash
pm2 logs kelnara-ai-bot
```

Stop:

```bash
pm2 stop kelnara-ai-bot
```

## Cara pakai di Discord

Mention bot atau pakai command:

```txt
@Bot kamu tanya apa
!ai tanya apa
!ask tanya apa
```

## Penting

Aktifkan Message Content Intent di Discord Developer Portal. Jangan upload file `.env` ke GitHub.

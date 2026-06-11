# KelNara AI Discord Bot

Bot Discord AI untuk Termux / VSPhone menggunakan **Xiaomi MiMo** sebagai model utama.

## File yang sudah ada

- `index.js` = kode utama bot Discord
- `artifactGenerator.js` = generator file website ZIP, PDF, DOCX, PPTX, dan XLSX
- `skill.shj` = daftar semua skill otomatis KelNara AI
- `package.json` = dependency Node.js
- `.gitignore` = mencegah file rahasia ikut terupload

## Skill otomatis

Bot membaca file `skill.shj` setiap kali menjawab. Skill yang sudah ditambahkan:

- General chat
- Coding assistant
- Discord bot assistant
- Termux / VSPhone assistant
- Website builder
- Artifact generator: website ZIP, PDF, DOCX, PPTX, XLSX
- Roblox Studio Lua assistant
- Game development helper
- Error analyzer
- Prompt writer
- File/project planner
- Design helper
- Architecture student helper
- Health education helper
- Security rules

## Setup cepat di Termux / VSPhone

```bash
pkg update -y
pkg install -y nodejs git nano

git clone https://github.com/JooNeedToLearn/Discord-Bot-AI.git
cd Discord-Bot-AI
npm install
nano .env
```

Isi file `.env` di Termux / VSPhone dengan variabel berikut:

```txt
DISCORD_TOKEN=isi_dengan_token_bot_discord
MIMO_API_KEY=isi_dengan_api_key_xiaomi_mimo
MIMO_BASE_URL=https://api.xiaomimimo.com/v1
MIMO_MODEL=mimo-v2.5-pro
BOT_PREFIX=!
SKILL_FILE=skill.shj
```

Kalau API key Xiaomi MiMo kamu memakai Token Plan `tp-...`, ganti `MIMO_BASE_URL` sesuai URL yang muncul di dashboard Token Plan MiMo.

## Jalankan test

```bash
node index.js
```

Kalau berhasil, terminal akan menampilkan:

```txt
KelNara AI aktif sebagai nama_bot
Provider AI: Xiaomi MiMo
Model utama: mimo-v2.5-pro
Auto-skill: ON
Artifact generator: ON
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

Restart setelah edit `.env` atau `skill.shj`:

```bash
pm2 restart kelnara-ai-bot
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

Contoh:

```txt
!ai buatkan website menu minuman KelNara dengan payment QRIS
!ai buatkan PPT tentang MBR Surabaya
!ai error ini kenapa: Cannot find module discord.js
```

## Cara tambah skill

Edit file `skill.shj`:

```bash
nano skill.shj
```

Tambahkan bagian baru, contoh:

```txt
[NEW_SKILL]
- Jelaskan kemampuan skill baru di sini.
- Tulis aturan jawaban yang harus dipakai bot.
```

Lalu restart bot:

```bash
pm2 restart kelnara-ai-bot
```

## Penting

Aktifkan **Message Content Intent** di Discord Developer Portal.

Jangan upload file `.env` ke GitHub. Kalau token Discord atau API key MiMo pernah bocor, segera reset/revoke dan buat yang baru.

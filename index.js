const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const fs = require('fs');
const fetch = require('node-fetch');

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ==========================
// تحميل ملفات التصنيفات
// ==========================

const categories = {
  action: "اكشن",
  romance: "رومانسي",
  horror: "رعب",
  comedy: "كوميدي",
  drama: "دراما",
  shonen: "شونين",
  fantasy: "فانتازي",
  mystery: "غموض"
};

let data = {};

function loadData() {
  for (const cat in categories) {
    try {
      data[cat] = JSON.parse(
        fs.readFileSync(`./${cat}.json`, 'utf8')
      );
    } catch {
      data[cat] = [];
    }
  }
}

loadData();

// ==========================
// بحث
// ==========================

let lastSearch = [];

function searchAnime(query) {
  query = query.toLowerCase().trim();

  let results = [];

  for (const cat in data) {
    for (const anime of data[cat]) {
      if (anime.name.toLowerCase().includes(query)) {
        results.push(anime);
      }
    }
  }

  return results;
}

// ==========================
// Gemini AI
// ==========================

async function generateAnimeDescription(animeName) {

  const prompt = `
اعطني ملخص طويل جداً لأنمي ${animeName}

الشروط:
- عربي فقط
- 20 سطر على الأقل
- بدون عناوين
- بدون تعداد
- اشرح القصة والشخصيات والتطورات
- اسلوب احترافي وممتع
`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    })
  });

  const json = await response.json();

  return json.candidates?.[0]?.content?.parts?.[0]?.text || "ماقدرت اجيب وصف";
}

// ==========================
// تشغيل البوت
// ==========================

client.once('ready', async () => {

  console.log(`✅ ${client.user.tag}`);

  const channel = client.channels.cache.get("1497454202044022784");

  if (!channel) return console.log("❌ ما لقيت الروم");

  // رسالة الشرح
  await channel.send(`
# 🎌 مرحبًا بك في BloomyAnime

بوت أنميات يعطيك اقتراحات حسب التصنيف 🔥

## المميزات:
• اقتراحات أنمي
• بحث سريع
• وصف طويل تلقائي بالذكاء الاصطناعي
• تصنيفات متعددة

اضغط الزر تحت وابدأ ✨
`);

  // الأزرار
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('anime')
      .setLabel('🎌 أنمي')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('search')
      .setLabel('🔍 بحث')
      .setStyle(ButtonStyle.Secondary)
  );

  await channel.send({
    content: "اختر:",
    components: [row]
  });

});

// ==========================
// التفاعلات
// ==========================

client.on('interactionCreate', async interaction => {

  try {

    // ======================
    // زر الأنمي
    // ======================

    if (
      interaction.isButton() &&
      interaction.customId === 'anime'
    ) {

      const menu = new ActionRowBuilder().addComponents(

        new StringSelectMenuBuilder()
          .setCustomId('cat')
          .setPlaceholder('اختر تصنيف')

          .addOptions(
            Object.entries(categories).map(([id, name]) => ({
              label: name,
              value: id
            }))
          )

      );

      return interaction.reply({
        content: "📚 اختر تصنيف:",
        components: [menu],
        ephemeral: true
      });

    }

    // ======================
    // اختيار التصنيف
    // ======================

    if (interaction.isStringSelectMenu()) {

      loadData();

      const cat = interaction.values[0];

      const list = data[cat];

      if (!list.length) {
        return interaction.reply({
          content: "❌ التصنيف فاضي",
          ephemeral: true
        });
      }

      const buttons = list.slice(0, 5).map((anime, i) =>

        new ButtonBuilder()
          .setCustomId(`anime_${cat}_${i}`)
          .setLabel(anime.name)
          .setStyle(ButtonStyle.Secondary)

      );

      return interaction.reply({

        content: `🎬 ${categories[cat]}`,

        components: [
          new ActionRowBuilder().addComponents(buttons)
        ],

        ephemeral: true
      });

    }

    // ======================
    // عرض الأنمي
    // ======================

    if (
      interaction.isButton() &&
      interaction.customId.startsWith("anime_")
    ) {

      await interaction.deferReply({
        ephemeral: true
      });

      loadData();

      const [, cat, index] =
        interaction.customId.split("_");

      const anime = data[cat][index];

      if (!anime) {
        return interaction.editReply({
          content: "❌ الأنمي غير موجود"
        });
      }

      // وصف AI
      const aiDesc =
        await generateAnimeDescription(anime.name);

      const embed = new EmbedBuilder()

        .setTitle(`🎌 ${anime.name}`)

        .setDescription(
          `📺 ${anime.episodes} حلقة\n📅 ${anime.year}\n\n${aiDesc}`
        );

      return interaction.editReply({
        embeds: [embed]
      });

    }

    // ======================
    // زر البحث
    // ======================

    if (
      interaction.isButton() &&
      interaction.customId === 'search'
    ) {

      const modal = new ModalBuilder()
        .setCustomId('search_modal')
        .setTitle('بحث عن أنمي');

      const input = new TextInputBuilder()

        .setCustomId('anime_name')

        .setLabel('اسم الأنمي')

        .setStyle(TextInputStyle.Short);

      modal.addComponents(
        new ActionRowBuilder().addComponents(input)
      );

      return interaction.showModal(modal);

    }

    // ======================
    // تنفيذ البحث
    // ======================

    if (interaction.isModalSubmit()) {

      await interaction.deferReply({
        ephemeral: true
      });

      loadData();

      const query =
        interaction.fields.getTextInputValue('anime_name');

      const results = searchAnime(query);

      if (!results.length) {

        return interaction.editReply({
          content: "❌ ما حصلت شيء"
        });

      }

      lastSearch = results;

      const buttons = results
        .slice(0, 5)
        .map((anime, i) =>

          new ButtonBuilder()

            .setCustomId(`search_${i}`)

            .setLabel(anime.name)

            .setStyle(ButtonStyle.Secondary)

        );

      return interaction.editReply({

        content: "🔎 النتائج:",

        components: [
          new ActionRowBuilder().addComponents(buttons)
        ]

      });

    }

    // ======================
    // عرض نتيجة البحث
    // ======================

    if (
      interaction.isButton() &&
      interaction.customId.startsWith("search_")
    ) {

      await interaction.deferReply({
        ephemeral: true
      });

      const index =
        interaction.customId.split("_")[1];

      const anime = lastSearch[index];

      if (!anime) {

        return interaction.editReply({
          content: "❌ انتهت النتائج"
        });

      }

      const aiDesc =
        await generateAnimeDescription(anime.name);

      const embed = new EmbedBuilder()

        .setTitle(`🎌 ${anime.name}`)

        .setDescription(
          `📺 ${anime.episodes} حلقة\n📅 ${anime.year}\n\n${aiDesc}`
        );

      return interaction.editReply({
        embeds: [embed]
      });

    }

  } catch (err) {

    console.log(err);

  }

});

// ==========================
// تشغيل
// ==========================

client.login(process.env.TOKEN);

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
// Gemini
// ==========================

const API_KEY = process.env.GEMINI_API_KEY;

const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// ==========================
// الكاش
// ==========================

const cachePath = './cache.json';

let cache = {};

if (fs.existsSync(cachePath)) {
  cache = JSON.parse(
    fs.readFileSync(cachePath, 'utf8')
  );
}

// ==========================
// التصنيفات
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

// ==========================
// تحميل ملفات JSON
// ==========================

let data = {};

function loadData() {

  for (const cat in categories) {

    try {

      const file =
        fs.readFileSync(`./${cat}.json`, 'utf8');

      data[cat] = JSON.parse(file);

    } catch (err) {

      console.log(`❌ خطأ في ${cat}.json`);

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

      if (
        anime.name
          .toLowerCase()
          .includes(query)
      ) {

        results.push(anime);

      }

    }

  }

  return results;

}

// ==========================
// Gemini AI
// ==========================

async function generateAnimeStory(animeName) {

  // كاش
  if (cache[animeName]) {
    return cache[animeName];
  }

  const prompt = `
اكتب ملخص عربي طويل جدًا لأنمي ${animeName}

الشروط:
- 20 سطر على الأقل
- عربي فقط
- بدون اختصار
- بدون عناوين
- تكلم عن الشخصيات والقصة والتطورات
- لا تحرق النهاية بالكامل
`;

  const response = await fetch(
    `${API_URL}?key=${API_KEY}`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
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

    }
  );

  const json = await response.json();

  const text =
    json?.candidates?.[0]?.content?.parts?.[0]?.text
    || "❌ تعذر إنشاء الملخص";

  // حفظ بالكاش
  cache[animeName] = text;

  fs.writeFileSync(
    cachePath,
    JSON.stringify(cache, null, 2)
  );

  return text;

}

// ==========================
// تشغيل
// ==========================

client.once('ready', async () => {

  console.log(`✅ ${client.user.tag}`);

  const channel =
    client.channels.cache.get(
      "1497454202044022784"
    );

  if (!channel) {
    return console.log("❌ الروم غير موجود");
  }

  // رسالة الترحيب Embed
  const welcomeEmbed = new EmbedBuilder()

    .setColor("Blue")

    .setTitle("🎌 مرحبًا بك في BloomyAnime")

    .setDescription(`
بوت أنميات يعطيك اقتراحات حسب التصنيف 🔥

## المميزات:
• اقتراحات أنمي
• بحث سريع
• ملخصات طويلة بالذكاء الاصطناعي
• تصنيفات كثيرة
• سرعة عالية

اضغط الزر وابدأ ✨
`);

  const row =
    new ActionRowBuilder().addComponents(

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
    embeds: [welcomeEmbed],
    components: [row]
  });

});

// ==========================
// التفاعلات
// ==========================

client.on(
  'interactionCreate',
  async interaction => {

    try {

      // ======================
      // زر الأنمي
      // ======================

      if (
        interaction.isButton() &&
        interaction.customId === 'anime'
      ) {

        const menu =
          new ActionRowBuilder().addComponents(

            new StringSelectMenuBuilder()

              .setCustomId('cat')

              .setPlaceholder('اختر تصنيف')

              .addOptions(

                Object.entries(categories)
                  .map(([id, name]) => ({
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
      // اختيار تصنيف
      // ======================

      if (
        interaction.isStringSelectMenu()
      ) {

        loadData();

        const cat =
          interaction.values[0];

        const list =
          data[cat];

        if (
          !list ||
          list.length === 0
        ) {

          return interaction.reply({

            content: "❌ لا يوجد أنميات",

            ephemeral: true

          });

        }

        // ======================
        // كل الأنميات
        // ======================

        const rows = [];

        for (
          let i = 0;
          i < list.length;
          i += 5
        ) {

          const buttons =
            list
              .slice(i, i + 5)
              .map((anime, index) =>

                new ButtonBuilder()

                  .setCustomId(
                    `anime_${cat}_${i + index}`
                  )

                  .setLabel(anime.name)

                  .setStyle(
                    ButtonStyle.Secondary
                  )

              );

          rows.push(
            new ActionRowBuilder()
              .addComponents(buttons)
          );

        }

        return interaction.reply({

          content: `🎬 ${categories[cat]}`,

          components: rows,

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

        const anime =
          data[cat][index];

        if (!anime) {

          return interaction.editReply({
            content: "❌ الأنمي غير موجود"
          });

        }

        // Gemini
        const story =
          await generateAnimeStory(
            anime.name
          );

        const embed =
          new EmbedBuilder()

            .setColor("Blue")

            .setTitle(
              `🎌 ${anime.name}`
            )

            .setDescription(
              `📺 ${anime.episodes} حلقة\n📅 ${anime.year}\n\n${story}`
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

        const modal =
          new ModalBuilder()

            .setCustomId(
              'search_modal'
            )

            .setTitle('بحث');

        const input =
          new TextInputBuilder()

            .setCustomId(
              'anime_name'
            )

            .setLabel(
              'اسم الأنمي'
            )

            .setStyle(
              TextInputStyle.Short
            );

        modal.addComponents(
          new ActionRowBuilder()
            .addComponents(input)
        );

        return interaction.showModal(
          modal
        );

      }

      // ======================
      // تنفيذ البحث
      // ======================

      if (
        interaction.isModalSubmit()
      ) {

        await interaction.deferReply({
          ephemeral: true
        });

        loadData();

        const query =
          interaction.fields
            .getTextInputValue(
              'anime_name'
            );

        const results =
          searchAnime(query);

        if (
          !results.length
        ) {

          return interaction.editReply({

            content: "❌ ما حصلت شيء"

          });

        }

        lastSearch = results;

        const rows = [];

        for (
          let i = 0;
          i < results.length;
          i += 5
        ) {

          const buttons =
            results
              .slice(i, i + 5)
              .map((anime, index) =>

                new ButtonBuilder()

                  .setCustomId(
                    `search_${i + index}`
                  )

                  .setLabel(
                    anime.name
                  )

                  .setStyle(
                    ButtonStyle.Secondary
                  )

              );

          rows.push(
            new ActionRowBuilder()
              .addComponents(buttons)
          );

        }

        return interaction.editReply({

          content: "🔎 النتائج:",

          components: rows

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
          interaction.customId
            .split("_")[1];

        const anime =
          lastSearch[index];

        if (!anime) {

          return interaction.editReply({

            content: "❌ انتهت النتائج"

          });

        }

        const story =
          await generateAnimeStory(
            anime.name
          );

        const embed =
          new EmbedBuilder()

            .setColor("Blue")

            .setTitle(
              `🎌 ${anime.name}`
            )

            .setDescription(
              `📺 ${anime.episodes} حلقة\n📅 ${anime.year}\n\n${story}`
            );

        return interaction.editReply({
          embeds: [embed]
        });

      }

    } catch (err) {

      console.log(err);

    }

  }
);

client.login(process.env.TOKEN);

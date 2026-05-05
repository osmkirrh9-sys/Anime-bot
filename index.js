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

const {
  GoogleGenerativeAI
} = require('@google/generative-ai');

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

// =====================
// Discord Client
// =====================

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// =====================
// Gemini
// =====================

const genAI =
  new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
  );

const model =
  genAI.getGenerativeModel({
    model: "gemini-1.5-flash-8b"
  });

// =====================
// Cache
// =====================

const cachePath = './cache.json';

let cache = {};

if (fs.existsSync(cachePath)) {

  cache = JSON.parse(
    fs.readFileSync(cachePath, 'utf8')
  );

}

// =====================
// Categories
// =====================

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

// =====================
// Load JSON
// =====================

let data = {};

function loadData() {

  for (const cat in categories) {

    try {

      const file =
        fs.readFileSync(
          `./${cat}.json`,
          'utf8'
        );

      data[cat] =
        JSON.parse(file);

    } catch {

      data[cat] = [];

    }

  }

}

loadData();

// =====================
// Search
// =====================

let lastSearch = [];

function searchAnime(query) {

  query =
    query.toLowerCase().trim();

  let results = [];

  for (const cat in data) {

    for (const anime of data[cat]) {

      if (
        anime.name &&
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

// =====================
// Gemini Story
// =====================

async function generateAnimeStory(animeName) {

  try {

    // Cache
    if (cache[animeName]) {
      return cache[animeName];
    }

    const prompt = `
اكتب ملخص عربي طويل جدًا لأنمي ${animeName}

الشروط:
- 20 سطر على الأقل
- عربي فقط
- بدون عناوين
- بدون اختصار
- اشرح الشخصيات والقصة والتطورات
- لا تحرق النهاية بالكامل
`;

    const result =
      await model.generateContent(prompt);

    const text =
      result.response.text();

    // Save Cache
    cache[animeName] = text;

    fs.writeFileSync(
      cachePath,
      JSON.stringify(
        cache,
        null,
        2
      )
    );

    return text;

  } catch (err) {

    console.error(err);

    return `❌ ${err.message}`;

  }

}

// =====================
// Ready
// =====================

client.once('ready', async () => {

  console.log(
    `✅ ${client.user.tag}`
  );

  const channel =
    client.channels.cache.get(
      "1497454202044022784"
    );

  if (!channel) {

    return console.log(
      "❌ الروم غير موجود"
    );

  }

  // Embed
  const welcomeEmbed =
    new EmbedBuilder()

      .setColor("Blue")

      .setTitle(
        "🎌 مرحبًا بك في BloomyAnime"
      )

      .setDescription(`
بوت أنميات احترافي 🔥

✨ المميزات:
• اقتراحات أنمي
• تصنيفات كثيرة
• بحث سريع
• ملخصات طويلة بالذكاء الاصطناعي

ابدأ من الأزرار تحت 🎬
`);

  // Buttons
  const row =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()

          .setCustomId('anime')

          .setLabel('🎌 أنمي')

          .setStyle(
            ButtonStyle.Primary
          ),

        new ButtonBuilder()

          .setCustomId('search')

          .setLabel('🔍 بحث')

          .setStyle(
            ButtonStyle.Secondary
          )

      );

  await channel.send({

    embeds: [welcomeEmbed],

    components: [row]

  });

});

// =====================
// Interactions
// =====================

client.on(
  'interactionCreate',
  async interaction => {

    try {

      // =================
      // Anime Button
      // =================

      if (
        interaction.isButton() &&
        interaction.customId === 'anime'
      ) {

        const menu =
          new ActionRowBuilder()
            .addComponents(

              new StringSelectMenuBuilder()

                .setCustomId('cat')

                .setPlaceholder(
                  'اختر تصنيف'
                )

                .addOptions(

                  Object.entries(
                    categories
                  ).map(
                    ([id, name]) => ({
                      label: name,
                      value: id
                    })
                  )

                )

            );

        return interaction.reply({

          content:
            "📚 اختر تصنيف:",

          components: [menu],

          ephemeral: true

        });

      }

      // =================
      // Category
      // =================

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
          !list.length
        ) {

          return interaction.reply({

            content:
              "❌ لا يوجد أنميات",

            ephemeral: true

          });

        }

        const rows = [];

        for (
          let i = 0;
          i < list.length;
          i += 5
        ) {

          const buttons =
            list
              .slice(i, i + 5)
              .map(
                (anime, index) =>

                  new ButtonBuilder()

                    .setCustomId(
                      `anime_${cat}_${i + index}`
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

        return interaction.reply({

          content:
            `🎬 ${categories[cat]}`,

          components: rows,

          ephemeral: true

        });

      }

      // =================
      // Show Anime
      // =================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "anime_"
        )
      ) {

        await interaction.deferReply({
          ephemeral: true
        });

        loadData();

        const [
          ,
          cat,
          index
        ] =
          interaction.customId.split("_");

        const anime =
          data[cat][index];

        if (!anime) {

          return interaction.editReply({

            content:
              "❌ الأنمي غير موجود"

          });

        }

        // AI Story
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

      // =================
      // Search Button
      // =================

      if (
        interaction.isButton() &&
        interaction.customId === 'search'
      ) {

        const modal =
          new ModalBuilder()

            .setCustomId(
              'search_modal'
            )

            .setTitle(
              'بحث عن أنمي'
            );

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

      // =================
      // Search
      // =================

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

            content:
              "❌ ما حصلت شيء"

          });

        }

        lastSearch =
          results;

        const rows = [];

        for (
          let i = 0;
          i < results.length;
          i += 5
        ) {

          const buttons =
            results
              .slice(i, i + 5)
              .map(
                (anime, index) =>

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

          content:
            "🔎 النتائج:",

          components: rows

        });

      }

      // =================
      // Search Result
      // =================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "search_"
        )
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

            content:
              "❌ انتهت النتائج"

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

client.login(
  process.env.TOKEN
);

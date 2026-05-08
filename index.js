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

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

// ======================
// Discord Client
// ======================

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ======================
// Categories
// ======================

const categories = {

  action: "اكشن🔥",

  romance: "رومانسي❤",

  horror: "رعب👻",

  comedy: "كوميدي🥳",

  drama: "دراما💔",

  shonen: "شونين🌀",

  fantasy: "فانتازي📼",

  mystery: "غموض🧠"

};

// ======================
// Settings
// ======================

const PAGE_SIZE = 8;

// ======================
// Load JSON
// ======================

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

// ======================
// Search
// ======================

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

// ======================
// Anime Page
// ======================

function createAnimePage(cat, page) {

  const list =
    data[cat];

  const start =
    page * PAGE_SIZE;

  const end =
    start + PAGE_SIZE;

  const current =
    list.slice(start, end);

  const animeButtons =
    current.map(
      (anime, index) =>

        new ButtonBuilder()

          .setCustomId(
            `anime_${cat}_${start + index}`
          )

          .setLabel(
            anime.name
          )

          .setStyle(
            ButtonStyle.Secondary
          )

    );

  const rows = [];

  for (
    let i = 0;
    i < animeButtons.length;
    i += 4
  ) {

    rows.push(

      new ActionRowBuilder()
        .addComponents(
          animeButtons.slice(i, i + 4)
        )

    );

  }

  rows.push(

    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()

          .setCustomId(
            `prev_${cat}_${page}`
          )

          .setLabel("⬅️")

          .setStyle(
            ButtonStyle.Primary
          )

          .setDisabled(
            page === 0
          ),

        new ButtonBuilder()

          .setCustomId(
            `next_${cat}_${page}`
          )

          .setLabel("➡️")

          .setStyle(
            ButtonStyle.Primary
          )

          .setDisabled(
            end >= list.length
          )

      )

  );

  return rows;

}

// ======================
// Ready
// ======================

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

  const embed = new EmbedBuilder()
.setColor("#7a3b1f")

.setTitle("# 🎬 Bloomy Anime")

.setDescription(`
✨ مرحبًا بك في عالم الأنمي  
اختر القسم الذي تريده من القائمة بالأسفل واستمتع بأفضل الأعمال المختارة بعناية 🎬


• 📺 أنميات كثيرة ومشوقة  
• 🔥 تحديثات مستمرة دائمًا  
• 🌟 تصنيفات متنوعة تناسب الجميع  
• 🎭 أكشن • غموض • رعب • كوميديا • فنتازي  
• ⚡ تجربة مرتبة وسهلة بالتنقل  


> والي عليك فقط تضغط تحت وابدأ رحلتك ✨
`)

.setFooter({ 
  text: "Enjoy Watching 🍿 • Bloomy Anime" 
})

.setImage("https://i.ibb.co/VkZKyT7/a-wide-dark-moody-anime-banner-graphic-illustrat.png");
  

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

    embeds: [embed],

    components: [row]

  });

});

// ======================
// Interactions
// ======================

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

        return interaction.reply({

          content:
            `🎬 ${categories[cat]}`,

          components:
            createAnimePage(cat, 0),

          ephemeral: true

        });

      }

      // =================
      // Next Page
      // =================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "next_"
        )
      ) {

        const [
          ,
          cat,
          page
        ] =
          interaction.customId.split("_");

        const nextPage =
          Number(page) + 1;

        return interaction.update({

          content:
            `🎬 ${categories[cat]}`,

          components:
            createAnimePage(
              cat,
              nextPage
            )

        });

      }

      // =================
      // Previous Page
      // =================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "prev_"
        )
      ) {

        const [
          ,
          cat,
          page
        ] =
          interaction.customId.split("_");

        const prevPage =
          Number(page) - 1;

        return interaction.update({

          content:
            `🎬 ${categories[cat]}`,

          components:
            createAnimePage(
              cat,
              prevPage
            )

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

        const embed =
          new EmbedBuilder()

            .setColor("Blue")

            .setTitle(
              `🎌 ${anime.name}`
            )

            .setDescription(
              `📺 ${anime.episodes} حلقة\n📅 ${anime.year}\n\n${anime.desc}`
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

        const embed =
          new EmbedBuilder()

            .setColor("Blue")

            .setTitle(
              `🎌 ${anime.name}`
            )

            .setDescription(
              `📺 ${anime.episodes} حلقة\n📅 ${anime.year}\n\n${anime.desc}`
            );

        return interaction.editReply({

          embeds: [embed]

        });

      }

    } catch (err) {

      console.error(err);

    }

  }
);

client.login(
  process.env.TOKEN
);

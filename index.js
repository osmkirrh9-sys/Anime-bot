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

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ✅ قراءة البيانات كل مرة
function getData() {
  return {
    action: JSON.parse(fs.readFileSync('./action.json', 'utf-8')),
    romance: JSON.parse(fs.readFileSync('./romance.json', 'utf-8')),
    horror: JSON.parse(fs.readFileSync('./horror.json', 'utf-8')),
    comedy: JSON.parse(fs.readFileSync('./comedy.json', 'utf-8')),
    drama: JSON.parse(fs.readFileSync('./drama.json', 'utf-8')),
    shonen: JSON.parse(fs.readFileSync('./shonen.json', 'utf-8')),
    fantasy: JSON.parse(fs.readFileSync('./fantasy.json', 'utf-8')),
    mystery: JSON.parse(fs.readFileSync('./mystery.json', 'utf-8'))
  };
}

// 🔍 تخزين آخر بحث
let lastSearch = [];

// 🔍 البحث
function searchAnime(query) {
  const data = getData();
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

// 🚀 تشغيل
client.once('ready', async () => {
  console.log(`✅ ${client.user.tag}`);

  const channel = client.channels.cache.get("1497454202044022784");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('anime').setLabel('🎌 أنمي').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('search').setLabel('🔍 بحث').setStyle(ButtonStyle.Secondary)
  );

  channel.send({ content: "اختر:", components: [row] });
});

// 🎮 التفاعل
client.on('interactionCreate', async interaction => {
  try {

    // زر الأنمي
    if (interaction.isButton() && interaction.customId === 'anime') {
      const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('cat')
          .setPlaceholder('اختر تصنيف')
          .addOptions([
            { label: 'اكشن', value: 'action' },
            { label: 'رومانسي', value: 'romance' },
            { label: 'رعب', value: 'horror' },
            { label: 'كوميدي', value: 'comedy' },
            { label: 'دراما', value: 'drama' },
            { label: 'شونين', value: 'shonen' },
            { label: 'فانتازي', value: 'fantasy' },
            { label: 'غموض', value: 'mystery' }
          ])
      );

      return interaction.reply({ content: "📚 اختر:", components: [menu], ephemeral: true });
    }

    // اختيار تصنيف
    if (interaction.isStringSelectMenu()) {
      const data = getData();
      const cat = interaction.values[0];
      const list = data[cat];

      if (!list || list.length === 0)
        return interaction.reply({ content: "❌ مافي أنميات هنا", ephemeral: true });

      // ✅ تقسيم الأزرار إلى صفوف (كل صف 5)
      const rows = [];
      const chunkSize = 5;

      for (let i = 0; i < list.length; i += chunkSize) {
        const chunk = list.slice(i, i + chunkSize);

        const row = new ActionRowBuilder().addComponents(
          chunk.map((a, index) =>
            new ButtonBuilder()
              .setCustomId(`anime_${cat}_${i + index}`)
              .setLabel(a.name)
              .setStyle(ButtonStyle.Secondary)
          )
        );

        rows.push(row);
      }

      return interaction.reply({
        content: "اختر أنمي:",
        components: rows,
        ephemeral: true
      });
    }

    // عرض أنمي
    if (interaction.isButton() && interaction.customId.startsWith("anime_")) {

      await interaction.deferReply({ ephemeral: true });

      const data = getData();
      const [, cat, i] = interaction.customId.split("_");
      const anime = data[cat][i];

      if (!anime)
        return interaction.editReply({ content: "❌ خطأ" });

      const embed = new EmbedBuilder()
        .setTitle(anime.name)
        .setDescription(`📺 ${anime.episodes} حلقة\n📅 ${anime.year}\n\n${anime.desc}`);

      return interaction.editReply({ embeds: [embed] });
    }

    // زر البحث
    if (interaction.customId === 'search') {
      const modal = new ModalBuilder()
        .setCustomId('search_modal')
        .setTitle('بحث');

      const input = new TextInputBuilder()
        .setCustomId('anime_name')
        .setLabel('اسم الأنمي')
        .setStyle(TextInputStyle.Short);

      modal.addComponents(new ActionRowBuilder().addComponents(input));

      return interaction.showModal(modal);
    }

    // تنفيذ البحث
    if (interaction.isModalSubmit()) {

      await interaction.deferReply({ ephemeral: true });

      const query = interaction.fields.getTextInputValue('anime_name');
      const results = searchAnime(query);

      if (!results.length)
        return interaction.editReply({ content: "❌ ما حصلت" });

      lastSearch = results;

      const buttons = results.slice(0, 5).map((a, i) =>
        new ButtonBuilder()
          .setCustomId(`search_${i}`)
          .setLabel(a.name)
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.editReply({
        content: "🔎 النتائج:",
        components: [new ActionRowBuilder().addComponents(buttons)]
      });
    }

    // عرض نتيجة البحث
    if (interaction.isButton() && interaction.customId.startsWith("search_")) {

      await interaction.deferReply({ ephemeral: true });

      const index = interaction.customId.split("_")[1];
      const anime = lastSearch[index];

      if (!anime)
        return interaction.editReply({ content: "❌ انتهت النتائج" });

      const embed = new EmbedBuilder()
        .setTitle(anime.name)
        .setDescription(`📺 ${anime.episodes} حلقة\n📅 ${anime.year}\n\n${anime.desc}`);

      return interaction.editReply({ embeds: [embed] });
    }

  } catch (err) {
    console.log(err);
  }
});

client.login(process.env.TOKEN);

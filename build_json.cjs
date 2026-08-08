const fs = require('fs');

const viewers = [
  { file: 'leyla-mamedova-povar-baku.png', name: 'Лейла Мамедова', job: 'Повар', city: 'Баку', qId: 1 },
  { file: 'margarita-seleznyova-spekulyant-odessa.png', name: 'Маргарита Селезнёва', job: 'Спекулянт', city: 'Одесса', qId: 2 },
  { file: 'lyudmila-vorobyova-agronom-krasnodar.png', name: 'Людмила Воробьева', job: 'Агроном', city: 'Краснодар', qId: 3 },
  { file: 'gennadiy-orlov-smotritel-mayaka-magadan.png', name: 'Геннадий Орлов', job: 'Смотритель маяка', city: 'Магадан', qId: 4 },
  { file: 'svetlana-smirnova-fizruk-kiev.png', name: 'Светлана Смирнова', job: 'Физрук', city: 'Киев', qId: 5 },
  { file: 'egor-shilov-montazhnik-visotnik-khabarovsk.png', name: 'Егор Шилов', job: 'Монтажник-высотник', city: 'Хабаровск', qId: 6 },
  { file: 'boris-ignatyev-pensioner-kaliningrad.png', name: 'Борис Игнатьев', job: 'Пенсионер', city: 'Калининград', qId: 7 },
  { file: 'inna-popova-yurisconsult-vladivostok.png', name: 'Инна Попова', job: 'Юрисконсульт', city: 'Владивосток', qId: 8 },
  { file: 'gulnara-rustamova-shveya-almaty.png', name: 'Гульнара Рустамова', job: 'Швея', city: 'Алматы', qId: 9 },
  { file: 'alisa-zuyeva-slesar-riga.png', name: 'Алиса Зуева', job: 'Слесарь', city: 'Рига', qId: 10 },
  { file: 'viktoria-rodionova-bezrabotnaya-samara.png', name: 'Виктория Родионова', job: 'Безработная', city: 'Самара', qId: 11 },
  { file: 'anastasiya-morozova-parikmaher-sochi.png', name: 'Анастасия Морозова', job: 'Парикмахер', city: 'Сочи', qId: 12 },
  { file: 'lubov-maksutova-prodavets-nizniy-novgorod.png', name: 'Любовь Максутова', job: 'Продавец', city: 'Нижний Новгород', qId: 13 },
  { file: 'natalya-sokolova-zavhoz-vilnius.png', name: 'Наталья Соколова', job: 'Завхоз', city: 'Вильнюс', qId: 14 },
  { file: 'arkadiy-schelin-dvornik-spb.png', name: 'Аркадий Щелин', job: 'Дворник', city: 'Санкт-Петербург', qId: 15 },
  { file: 'madina-kantemirova-hudozhnik-ordzhonikidze.png', name: 'Мадина Кантемирова', job: 'Художник', city: 'Орджоникидзе', qId: 16 },
  { file: 'lyudmila-kachanova-bibliotekar-vologda.png', name: 'Людмила Качанова', job: 'Библиотекарь', city: 'Вологда', qId: 17 },
  { file: 'evgeniy-sarkisyan-mehanik-yerevan.png', name: 'Евгений Саркисян', job: 'Механик', city: 'Ереван', qId: 18 },
  { file: 'tamara-gelashvili-ekskursovod-tbilisi.png', name: 'Тамара Гелашвили', job: 'Экскурсовод', city: 'Тбилиси', qId: 19 },
  { file: 'sergei-mosiichuk-tokar-yekaterinburg.png', name: 'Сергей Мосийчук', job: 'Токарь', city: 'Екатеринбург', qId: 20 },
  { file: 'iosif-tulchak-professor-tashkent.jpg', name: 'Иосиф Тульчак', job: 'Профессор', city: 'Ташкент', qId: 21 },
  { file: 'kseniya-lisovets-bezrabotnaya-minsk.png', name: 'Ксения Лисовец', job: 'Безработная', city: 'Минск', qId: 22 },
  { file: 'anna-rybalkina-aspirant-novosibirsk.jpg', name: 'Анна Рыбалкина', job: 'Аспирант', city: 'Новосибирск', qId: 23 },
  { file: 'oleg-fomin-pochtalyon-kostroma.png', name: 'Олег Фомин', job: 'Почтальон', city: 'Кострома', qId: 24 },
  { file: 'varvara-filatova-pasportist-tallinn.png', name: 'Варвара Филатова', job: 'Паспортистка', city: 'Таллин', qId: 25 },
  { file: 'pavel-zubov-pozharniy-voronezh.png', name: 'Павел Зубов', job: 'Пожарный', city: 'Воронеж', qId: 26 },
  { file: 'diana-rostova-aktrisa-teatra-i-kino-perm.png', name: 'Диана Ростова', job: 'Актриса', city: 'Пермь', qId: 27 },
  { file: 'galina-zhukova-zakroyschik-ivanovo.png', name: 'Галина Жукова', job: 'Закройщик', city: 'Иваново', qId: 28 },
  { file: 'andrey-mihnikevich-kombayner-gomel.png', name: 'Андрей Михникевич', job: 'Комбайнер', city: 'Гомель', qId: 29 },
  { file: 'nikita-smirnov-shkolnik-omsk.png', name: 'Никита Смирнов', job: 'Школьник', city: 'Омск', qId: 30 },
  { file: 'maksim-drozdov-zhurnalist-pyatigorsk.png', name: 'Максим Дроздов', job: 'Журналист', city: 'Пятигорск', qId: 31 },
  { file: 'valeriy-petuhov-arheolog-pskov.png', name: 'Валерий Петухов', job: 'Археолог', city: 'Псков', qId: 32 },
  { file: 'arkhip-gordeyev-kosmonavt-iz-rezerva-zvezdny-gorodok.png', name: 'Архип Гордеев', job: 'Космонавт из резерва', city: 'Звездный Городок', qId: 33 },
  { file: 'evpatiy-drozd-mayor-vdv-ryazan.png', name: 'Евпатий Дрозд', job: 'Майор ВДВ', city: 'Рязань', qId: 34 },
  { file: 'denis-denisov-sotrudnik-chop-chelyabinsk.png', name: 'Денис Денисов', job: 'Сотрудник ЧОП', city: 'Челябинск', qId: 35 },
  { file: 'dmitriy-kuzmin-moryak-podvodnik-murmansk.png', name: 'Дмитрий Кузьмин', job: 'Моряк-подводник', city: 'Мурманск', qId: 36 },
  { file: 'marina-litvinkova-bezrabotnaya-kazan.jpg', name: 'Марина Литвинкова', job: 'Безработная', city: 'Казань', qId: 37 },
  { file: 'timofey-rasskazov-militsioner-moscow.png', name: 'Тимофей Рассказов', job: 'Милиционер', city: 'Москва', qId: 38 },
  { file: 'vladlen-karamazov-student-tomsk.jpg', name: 'Владлен Карамазов', job: 'Студент', city: 'Томск', qId: 39 }
];

const text = fs.readFileSync('C:/Users/lion1/Documents/chgk/approved_questions_backlog.md', 'utf8');
const chunks = text.split(/^(?:### \d+\.|## Вопрос \d+)/m).map(q => q.trim()).filter(q => q);
// The first element is the intro text
chunks.shift();

if (chunks.length !== 39) {
  console.error("Parsed questions count:", chunks.length);
  process.exit(1);
}

const extractField = (chunk, prefix) => {
  const lines = chunk.split('\n');
  for (let line of lines) {
    if (line.startsWith(prefix)) {
      return line.substring(prefix.length).trim();
    }
  }
  return '';
};

const questionsData = [];

for (let i = 0; i < 39; i++) {
  let chunk = chunks[i];
  let v = viewers.find(x => x.qId === (i + 1));
  if (!v) {
    console.error("No viewer for question", i+1);
    process.exit(1);
  }
  
  let qText = extractField(chunk, '**Вопрос:**');
  if(!qText) qText = extractField(chunk, 'Вопрос:');
  
  let aText = extractField(chunk, '**Ответ:**');
  if(!aText) aText = extractField(chunk, 'Ответ:');
  
  let cHint = extractField(chunk, '**Подсказка клуба:**');
  if(!cHint) cHint = extractField(chunk, 'Подсказка клуба:');

  questionsData.push({
    id: i + 1,
    authorName: v.name,
    city: v.city,
    job: v.job,
    photoUrl: "/assets/viewers/" + v.file,
    questionText: qText,
    answerText: aText,
    clubHint: cHint
  });
}

fs.writeFileSync('C:/Users/lion1/Documents/chgk/server/questions.json', JSON.stringify(questionsData, null, 2), 'utf8');
console.log("Written 39 questions to server/questions.json");

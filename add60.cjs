const fs = require('fs');

const newQuestion = `\n\n---\n\n### 60.
**Вопрос:** За токарным или фрезерным станком техника безопасности пишется кровью. Наладчикам строго запрещено работать в галстуках, шарфах и с распущенными волосами — их может намотать на вращающийся шпиндель. Категорически запрещено носить и один небольшой предмет, имеющий для многих огромную личную ценность. В отличие от нательного крестика, скрытого под робой, этот коварный предмет находится в самом эпицентре рабочей зоны. Назовите этот предмет.

**Ответ:** Обручальное кольцо (допускается: кольцо, перстень).

**Комментарий:** Кольцо на пальце находится в непосредственной близости от резца или шпинделя. Оно может легко зацепиться за вращающуюся деталь и буквально оторвать токарю палец. Поэтому станочники обязаны снимать любые украшения с рук перед сменой.

**Подсказка клуба:** Это ювелирное украшение традиционно носят и женщины, и мужчины, и оно подчеркивает их матримониальный статус.`;

fs.appendFileSync('C:/Users/lion1/Documents/chgk/approved_questions_backlog.md', newQuestion, 'utf8');

let buildScript = fs.readFileSync('C:/Users/lion1/Documents/chgk/build_json.cjs', 'utf8');

// We need to inject Viktor Polyakov into the viewers array.
// Find the end of the viewers array
const injectionPoint = buildScript.indexOf('];');
if (injectionPoint > -1) {
  let injectionString = ",\n  { file: 'viktor-polyakov-naladchik-stankov-tula.png', name: 'Виктор Поляков', job: 'Наладчик станков', city: 'Тула', qId: 60 }";
  buildScript = buildScript.slice(0, injectionPoint) + injectionString + '\n' + buildScript.slice(injectionPoint);
}

// Update the chunk count check and loop
buildScript = buildScript.replace(/!== 59/g, '!== 60');
buildScript = buildScript.replace(/i < 59/g, 'i < 60');
buildScript = buildScript.replace(/Written 59 questions/g, 'Written 60 questions');

fs.writeFileSync('C:/Users/lion1/Documents/chgk/build_json.cjs', buildScript, 'utf8');
console.log('Successfully added the 60th question!');

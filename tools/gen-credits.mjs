// Generates CREDITS.md from src/data/credits.js (single source of truth).
import fs from 'node:fs';
import { CREDITS } from '../src/data/credits.js';

const rows = CREDITS.map(c => `| ${c.name} | ${c.author} | ${c.source} | ${c.license} | ${c.usage} |`).join('\n');
const md = `# קרדיטים — משמרת לילה

כל הנכסים האמנותיים במשחק (דמויות, אנימציות, רכבים, אביזרים, משטחים, שמיים, צלילים ומוזיקה) הם בנחלת הכלל — **CC0 1.0**.
הרישיון נבדק בדף המקור של כל נכס לפני השימוש. הגופנים (Secular One, Rubik) הם בתוכנה חופשית ברישיון OFL 1.1 ומגיעים מ־Fontsource דרך npm, כפי שנדרש באפיון.

| נכס | יוצר | מקור | רישיון | שימוש במשחק |
|---|---|---|---|---|
${rows}

הקובץ נוצר אוטומטית מ־\`src/data/credits.js\` (\`npm run credits\`). אותה רשימה מוצגת במסך הקרדיטים במשחק.
`;
fs.writeFileSync('CREDITS.md', md);
console.log('CREDITS.md written,', CREDITS.length, 'entries');

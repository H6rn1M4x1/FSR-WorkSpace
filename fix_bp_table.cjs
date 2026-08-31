const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');

const tableDateOld = `                                <td className="px-6 py-4 font-semibold text-slate-750 dark:text-zinc-200">
                                  {log.date}
                                </td>`;

const tableDateNew = `                                <td className="px-6 py-4 font-semibold text-slate-750 dark:text-zinc-200">
                                  {log.date ? log.date.replace('T', ' ').replace('Z', '').split(':').slice(0, 2).join(':') : ''}
                                </td>`;

if (content.includes(tableDateOld)) {
  content = content.replace(tableDateOld, tableDateNew);
  fs.writeFileSync('src/components/HealthView.tsx', content, 'utf8');
  console.log("Updated table date format");
} else {
  console.log("Could not find table date block");
}

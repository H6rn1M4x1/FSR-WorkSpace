const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');

const targetEnd2 = `                      ) : (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-8 text-center text-zinc-500"
                          >
                            No hay registros de alimentación guardados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>`;

const newEnd2 = `                          })}
                    </tbody>
                  </table>
                </div>
              );
            })()}`;

const targetList2 = `                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                      {filteredLogs
                          .sort(`;

const newList2 = `                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                      {alimentacionLogs && alimentacionLogs.length > 0 ? (
                        alimentacionLogs
                          .sort(`;

// If it applied part 1 but not part 2, let's just do it manually with sed or string replace.
// Wait, I can just replace the old end if it still exists.

if (content.includes(targetEnd2)) {
  content = content.replace(targetEnd2, newEnd2);
  console.log("Patched part 2");
}

fs.writeFileSync('src/components/HealthView.tsx', content, 'utf8');

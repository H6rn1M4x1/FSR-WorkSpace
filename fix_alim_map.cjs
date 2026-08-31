const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');

const targetList = `                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                      {alimentacionLogs && alimentacionLogs.length > 0 ? (
                        alimentacionLogs
                          .sort(
                           (a, b) =>
                              new Date(b.fecha).getTime() -
                              new Date(a.fecha).getTime(),
                          )
                          .map((log) => {`;

const newList = `                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                      {filteredLogs
                          .sort(
                           (a, b) =>
                              new Date(b.fecha).getTime() -
                              new Date(a.fecha).getTime(),
                          )
                          .map((log) => {`;

content = content.replace(targetList, newList);

const targetEnd = `                            );
                          })
                      ) : (
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

const newEnd = `                            );
                          })}
                    </tbody>
                  </table>
                </div>
              );
            })()}`;

content = content.replace(targetEnd, newEnd);
fs.writeFileSync('src/components/HealthView.tsx', content, 'utf8');
console.log("Patched alim table content map");

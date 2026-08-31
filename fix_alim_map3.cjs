const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');

const targetEnd = `                      ) : (
                        <tr>
                          <td
                            colSpan={7}
                            className="text-center py-8 text-zinc-500 text-sm font-medium"
                          >
                            No hay registros de alimentación.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>`;

const newEnd = `                          })}
                    </tbody>
                  </table>
                </div>
              );
            })()}`;

if (content.includes(targetEnd)) {
  content = content.replace(targetEnd, newEnd);
  console.log("Patched part 3");
} else {
  console.log("Not found part 3");
}

fs.writeFileSync('src/components/HealthView.tsx', content, 'utf8');

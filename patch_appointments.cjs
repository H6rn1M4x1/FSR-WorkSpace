const fs = require('fs');

let file = 'src/components/AppointmentsView.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Pattern 1:
const search1 = `                    {/* Status Filter Dropdown */}
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-[11px] font-bold text-zinc-400">
                        Estado:
                      </span>
                      <CustomSelect
                        value={statusFilter}
                        onChange={setStatusFilter}
                        options={[
                          { value: "Todos", label: "Todos los Estados" },
                          { value: "Realizado", label: "Realizado" },
                          { value: "Pendiente", label: "Pendiente" },
                          {
                            value: "Initinere Diario",
                            label: "Initinere Diario",
                          },
                        ]}
                        placeholder="Filtrar por Estado"
                        size="sm"
                        className="w-40"
                      />
                    </div>`;

const replace1 = `                    {/* Status Filter Dropdown */}
                    <div className="w-full sm:w-auto mt-2 sm:mt-0">
                      <CustomSelect
                        value={statusFilter}
                        onChange={setStatusFilter}
                        options={[
                          { value: "Todos", label: "Todos los Estados" },
                          { value: "Realizado", label: "Realizado" },
                          { value: "Pendiente", label: "Pendiente" },
                          {
                            value: "Initinere Diario",
                            label: "Initinere Diario",
                          },
                        ]}
                        icon={<Filter className="w-3.5 h-3.5" />}
                        placeholder="Filtrar por Estado"
                        size="sm"
                        className="w-full sm:w-40"
                      />
                    </div>`;

// Pattern 2:
const search2 = `              {/* Status Filter Dropdown */}
              <div className="flex items-center justify-end gap-2">
                <span className="text-[11px] font-bold text-zinc-400">
                  Estado:
                </span>
                <CustomSelect
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "Todos", label: "Todos los Estados" },
                    { value: "Realizado", label: "Realizado" },
                    { value: "Pendiente", label: "Pendiente" },
                    { value: "Initinere Diario", label: "Initinere Diario" },
                  ]}
                  placeholder="Filtrar por Estado"
                  size="sm"
                  className="w-40"
                />
              </div>`;

const replace2 = `              {/* Status Filter Dropdown */}
              <div className="w-full sm:w-auto mt-2 sm:mt-0">
                <CustomSelect
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "Todos", label: "Todos los Estados" },
                    { value: "Realizado", label: "Realizado" },
                    { value: "Pendiente", label: "Pendiente" },
                    { value: "Initinere Diario", label: "Initinere Diario" },
                  ]}
                  icon={<Filter className="w-3.5 h-3.5" />}
                  placeholder="Filtrar por Estado"
                  size="sm"
                  className="w-full sm:w-40"
                />
              </div>`;

content = content.replace(search1, replace1);
content = content.replace(search2, replace2);

fs.writeFileSync(file, content);
console.log("Patched");

const fs = require('fs');
const content = fs.readFileSync('src/components/HealthView.tsx', 'utf-8');

const target = `                {/* File upload drag and drop */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Archivo / Documento Adjunto
                  </label>
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={\`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all \${
                      dragActive
                        ? "border-primary bg-primary/10"
                        : "border-slate-200 dark:border-zinc-800 hover:border-primary/20 dark:hover:border-primary/20"
                    }\`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center space-y-2">
                      <Upload className="w-6 h-6 text-slate-400 dark:text-zinc-500" />
                      {estudioFileName ? (
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-primary dark:text-primary">
                            {estudioFileName}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                            Haz clic o arrastra otro archivo para reemplazarlo
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-600 dark:text-zinc-300">
                            Sube un archivo aquí
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                            Arrastra y suelta tu estudio/informe en PDF, imagen
                            o documento, o haz clic para buscar
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Informe / Observaciones Detalladas
                  </label>
                  <textarea
                    placeholder="Ej. Resultados del análisis de sangre normales, se recomienda control de tiroides en 6 meses..."
                    value={estudioReport}
                    onChange={(e) => setEstudioReport(e.target.value)}
                    rows={3}
                    className={\`w-full px-4 py-3 rounded-2xl border text-xs font-semibold outline-none transition-all resize-none \${
                      darkMode
                        ? "bg-zinc-950 border-zinc-800 text-white focus:border-primary"
                        : "bg-slate-50 border-slate-200 text-slate-850 focus:border-primary"
                    }\`}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEstudioModal(false)}
                    className="px-4 py-2.5 rounded-full bg-zinc-500/10 hover:bg-zinc-500/20 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold rounded-full cursor-pointer transition-all shadow-md shadow-primary/10"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}`;

const replacement = `                {/* File upload drag and drop */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                    Archivo / Documento Adjunto
                  </label>
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={\`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all \${
                      dragActive
                        ? "border-primary bg-primary/5"
                        : "border-slate-300 dark:border-zinc-700 hover:border-primary/50 dark:hover:border-primary/50 bg-slate-50 dark:bg-zinc-950/20"
                    }\`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center space-y-2">
                      <Upload className="w-5 h-5 text-slate-400 dark:text-zinc-500" />
                      {estudioFileName ? (
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-primary dark:text-primary">
                            {estudioFileName}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                            Haz clic o arrastra otro archivo para reemplazarlo
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-600 dark:text-zinc-300">
                            Sube un archivo aquí
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                            Arrastra y suelta tu estudio/informe en PDF, imagen
                            o documento, o haz clic para buscar
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                    Informe / Observaciones Detalladas
                  </label>
                  <textarea
                    placeholder="Ej. Resultados del análisis de sangre normales, se recomienda control de tiroides en 6 meses..."
                    value={estudioReport}
                    onChange={(e) => setEstudioReport(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm resize-none focus:border-primary"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-zinc-800/40">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEstudioModal(false);
                      setEditingEstudio(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white dark:text-blue-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-primary/10"
                  >
                    <Check className="w-4 h-4" />
                    {editingEstudio ? "Guardar Cambios" : "Guardar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}`;

if (content.includes(target)) {
  fs.writeFileSync('src/components/HealthView.tsx', content.replace(target, replacement));
  console.log('Success');
} else {
  console.log('Target not found');
}

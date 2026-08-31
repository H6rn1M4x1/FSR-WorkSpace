const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf-8');

const startStr = `{showNotifications && (
            <div`;
const endStr = `            </div>
          )}
        </div>
      </div>
    </header>`;

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
    const replacementStr = `{showNotifications &&
            createPortal(
              <div
                onClick={() => setShowNotifications(false)}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in cursor-pointer"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-lg max-h-[85vh] flex flex-col bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative cursor-default"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-zinc-900">
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      Notificaciones ({unreadCount})
                    </h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 space-y-2">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-zinc-500 font-medium">
                        No tienes notificaciones por ahora.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={\`group p-4 rounded-2xl border transition-all relative flex flex-col \${
                            notif.read
                              ? "border-slate-100 dark:border-zinc-800/60 bg-slate-50 dark:bg-zinc-900/40"
                              : "border-primary/20 bg-primary/5 dark:bg-primary/10"
                          }\`}
                        >
                          <div
                            className="cursor-pointer pr-8"
                            onClick={() => onReadNotification(notif.id)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                {notif.type}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-medium">
                                {new Date(notif.timestamp).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-slate-900 dark:text-zinc-100">{notif.title}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mt-1">
                              {notif.body}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onDeleteNotification) onDeleteNotification(notif.id);
                            }}
                            className="absolute right-3 top-3 p-2 rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            title="Eliminar notificación"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer Actions */}
                  {notifications.length > 0 && (
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-zinc-900 flex justify-end">
                      <button
                        onClick={() => {
                          onClearNotifications();
                          setShowNotifications(false);
                        }}
                        className="px-4 py-2.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Borrar todas
                      </button>
                    </div>
                  )}
                </div>
              </div>,
              document.body
            )}`;

    content = content.substring(0, startIdx) + replacementStr + content.substring(endIdx);
    fs.writeFileSync('src/components/Header.tsx', content);
    console.log("Updated.");
} else {
    console.log("Not found.");
}

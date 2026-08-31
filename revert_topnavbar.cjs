const fs = require('fs');
let content = fs.readFileSync('src/components/TopNavbar.tsx', 'utf-8');

const modalStr = `{showNotifications &&
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
                            No tienes notificaciones pendientes.
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
                                  onDeleteNotification(notif.id);
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

const dropdownStr = `{showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={\`absolute right-0 mt-3 w-80 rounded-3xl border shadow-2xl overflow-hidden z-50 flex flex-col \${
                    darkMode
                      ? "bg-zinc-900 border-zinc-800 shadow-2xl text-zinc-100"
                      : "bg-white border-zinc-200 text-zinc-900"
                  }\`}
                >
                  {/* Header */}
                  <div 
                    className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/40 dark:bg-zinc-900 shrink-0"
                    style={{ backgroundColor: !darkMode ? "#D4D5D6" : undefined }}
                  >
                    <h3 
                      className="text-lg font-extrabold dark:text-white"
                      style={{ color: !darkMode ? "#000000" : undefined }}
                    >
                      Notificaciones ({unreadCount})
                    </h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-2 rounded-full hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="max-h-72 overflow-y-auto p-4 sm:p-6 scrollbar-none space-y-2">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-zinc-500 font-medium">
                        No tienes notificaciones pendientes.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={\`group p-4 rounded-2xl border transition-all relative flex flex-col \${
                            notif.read
                              ? "border-transparent dark:border-zinc-800/60 dark:bg-zinc-900/40"
                              : "border-primary/20 dark:bg-primary/10"
                          }\`}
                          style={{ backgroundColor: !darkMode && notif.read ? "#D5D6D7" : !darkMode && !notif.read ? "#E5E7EB" : undefined }}
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
                            <p className="text-sm font-bold dark:text-zinc-100">{notif.title}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mt-1">
                              {notif.body}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteNotification(notif.id);
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
                    <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800/40 dark:bg-zinc-900 flex justify-end shrink-0"
                         style={{ backgroundColor: !darkMode ? "#D4D5D6" : undefined }}
                    >
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
                </motion.div>
              )}`;

content = content.replace(modalStr, dropdownStr);
fs.writeFileSync('src/components/TopNavbar.tsx', content);

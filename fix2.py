with open("src/components/PaymentsTable.tsx", "r") as f:
    text = f.read()
text = text.replace("""      {showAddPayment && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/10 dark:bg-black/40 backdrop-blur-[1px] animate-fade-in" onClick={resetForm} />
          <div className="absolute top-12 left-0 z-50 w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 animate-fade-in origin-top">""", """      {showAddPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 relative">""")
text = text.replace("          </div>\n        </>\n      )}", "          </div>\n        </div>\n      )}")
with open("src/components/PaymentsTable.tsx", "w") as f:
    f.write(text)

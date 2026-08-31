with open("src/components/PaymentsTable.tsx", "r") as f:
    text = f.read()
text = text.replace("          </>\n        </>\n      )}\n    </div>", "          </div>\n        </>\n      )}\n    </div>")
with open("src/components/PaymentsTable.tsx", "w") as f:
    f.write(text)

const fs = require('fs');

let content = fs.readFileSync('src/components/FinanceView.tsx', 'utf-8');

const target2 = `  // Distribution calculations for active month
  const currentMonthPayments = payments.filter(
    (p) => p.status === "Pagado" && isCurrentMonth(p.fechaPago || p.fecha),
  );`;

const replacement2 = `  // Distribution calculations for active month
  const currentMonthPayments = payments.filter(
    (p) => p.status === "Pagado",
  );`;

content = content.replace(target2, replacement2);

fs.writeFileSync('src/components/FinanceView.tsx', content);
console.log("Patched successfully");

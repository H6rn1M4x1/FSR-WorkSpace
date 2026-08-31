const fs = require('fs');

let content = fs.readFileSync('src/components/FinanceView.tsx', 'utf-8');

const target1 = `  const currentMonthGastosVarios = gastosVarios.filter((g) =>
    isCurrentMonth(g.fecha),
  );`;

const replacement1 = `  const currentMonthGastosVarios = gastosVarios.filter((g) =>
    isCurrentMonth(g.fecha)
  );`;

// Wait, the logic is filtering by currentMonthGastosVarios. Maybe you meant you want to show ALL gastos varios, or that the chart is empty because there are no gastos in the current month?

// Let's modify the totalGastosVarios calculation to make sure we show all gastos if there are none in the current month, or the user just means "take values from all Gastos Varios not just current month"?

// "En "Distribución de Gastos Varios" tiene que tomar los valores de "Gastos Varios"" - means the calculation should not filter by isCurrentMonth maybe?

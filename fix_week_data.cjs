const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf-8');

const alimWeekRegex = /const alimWeekData = useMemo\(\(\) => \{[\s\S]*?\}, \[weekDaysCurrent, alimentacionLogs\]\);/;
const diarioWeekRegex = /const diarioWeekData = useMemo\(\(\) => \{[\s\S]*?\}, \[weekDaysCurrent, alimentacionLogs, medidasHistory, metabolicProfile, selectedActivityFactor\]\);/;

const fixedAlimWeek = `const alimWeekData = useMemo(() => {
    const daysShort = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
    return weekDaysCurrent.map((day, idx) => {
      let calories = 0;
      let hasActivity = false;
      
      const targetStr = day.getFullYear() + "-" + String(day.getMonth() + 1).padStart(2, "0") + "-" + String(day.getDate()).padStart(2, "0");

      alimentacionLogs.forEach((log) => {
        if (!log.fecha) return;
        if (log.fecha === targetStr) {
          hasActivity = true;
          calories += Number(log.calorias) || 0;
        }
      });
      
      return {
        dateObj: day,
        dayLabel: daysShort[idx],
        dayNumber: day.getDate(),
        calories,
        hasActivity
      };
    });
  }, [weekDaysCurrent, alimentacionLogs]);`;

const fixedDiarioWeek = `const diarioWeekData = useMemo(() => {
    const daysShort = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
    return weekDaysCurrent.map((day, idx) => {
      let balanceNeto = 0;
      let hasActivity = false;
      const diaStr = day.getFullYear() + "-" + String(day.getMonth() + 1).padStart(2, "0") + "-" + String(day.getDate()).padStart(2, "0");

      const medidaDia = medidasHistory.find(m => m.fecha === diaStr);
      let consumo = 0;
      let gasto = 0;

      alimentacionLogs.forEach((l) => {
        if (l.fecha === diaStr) consumo += Number(l.calorias) || 0;
      });

      const deporteDia = (deportesActividades || [])
        .filter(a => a.fechaDesde.startsWith(diaStr))
        .reduce((acc, curr) => acc + (curr.calorias || 0), 0);
        
      const gymDia = (registrosEntrenamiento || [])
        .filter(r => r.fecha === diaStr)
        .reduce((acc, curr) => acc + (curr.caloriasTotalesSesion || 0), 0);
        
      let bmr = 0;
      const currentWeight = medidaDia?.peso || metabolicProfile.pesoActual;
      if (currentWeight > 0) {
        bmr = metabolicProfile.genero === "Masculino"
          ? 10 * currentWeight + 6.25 * metabolicProfile.altura - 5 * metabolicProfile.edad + 5
          : 10 * currentWeight + 6.25 * metabolicProfile.altura - 5 * metabolicProfile.edad - 161;
      }
      
      const tdee = bmr * selectedActivityFactor;
      gasto = tdee + deporteDia + gymDia;

      balanceNeto = consumo - gasto;
      if (consumo > 0 || deporteDia > 0 || gymDia > 0) hasActivity = true;

      return {
        dateObj: day,
        dayLabel: daysShort[idx],
        dayNumber: day.getDate(),
        balance: balanceNeto,
        hasActivity
      };
    });
  }, [weekDaysCurrent, alimentacionLogs, medidasHistory, metabolicProfile, selectedActivityFactor, deportesActividades, registrosEntrenamiento]);`;

content = content.replace(alimWeekRegex, fixedAlimWeek).replace(diarioWeekRegex, fixedDiarioWeek);
fs.writeFileSync('src/components/HealthView.tsx', content, 'utf-8');
console.log("Replaced week data blocks.");

const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');

const targetState = 'const [selectedActivityFactor, setSelectedActivityFactor] = useState<number>(1.2);';
const newState = targetState + `
  const [selectedAlimDate, setSelectedAlimDate] = useState<Date | null>(null);
  const [selectedDiarioDate, setSelectedDiarioDate] = useState<Date | null>(null);

  const weekDaysCurrent = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const distToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distToMonday);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  const alimWeekData = useMemo(() => {
    const daysShort = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
    return weekDaysCurrent.map((day, idx) => {
      let calories = 0;
      let hasActivity = false;
      
      alimentacionLogs.forEach((log) => {
        if (!log.fecha) return;
        const itemDate = new Date(log.fecha);
        if (
          !isNaN(itemDate.getTime()) &&
          itemDate.getFullYear() === day.getFullYear() &&
          itemDate.getMonth() === day.getMonth() &&
          itemDate.getDate() === day.getDate()
        ) {
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
  }, [weekDaysCurrent, alimentacionLogs]);

  const diarioWeekData = useMemo(() => {
    const daysShort = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
    return weekDaysCurrent.map((day, idx) => {
      let balanceNeto = 0;
      let hasActivity = false;
      const diaStr = day.toISOString().substring(0, 10);
      const medidaDia = medidasHistory.find(m => m.fecha === diaStr);
      let consumo = 0;
      let gasto = 0;
      alimentacionLogs.forEach((l) => {
        if (l.fecha && l.fecha.startsWith(diaStr)) consumo += Number(l.calorias) || 0;
      });
      
      if (medidaDia && medidaDia.peso > 0 && metabolicProfile) {
        gasto = selectedActivityFactor * ((10 * medidaDia.peso) + (6.25 * metabolicProfile.altura) - (5 * metabolicProfile.edad) + 5);
      } else {
        const lastMedida = [...medidasHistory].sort((a,b)=>new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
        if (lastMedida && lastMedida.peso > 0 && metabolicProfile) {
          gasto = selectedActivityFactor * ((10 * lastMedida.peso) + (6.25 * metabolicProfile.altura) - (5 * metabolicProfile.edad) + 5);
        }
      }
      balanceNeto = consumo - gasto;
      if (consumo > 0 || gasto > 0) hasActivity = true;

      return {
        dateObj: day,
        dayLabel: daysShort[idx],
        dayNumber: day.getDate(),
        balance: balanceNeto,
        hasActivity
      };
    });
  }, [weekDaysCurrent, alimentacionLogs, medidasHistory, metabolicProfile, selectedActivityFactor]);
`;

content = content.replace(targetState, newState);
fs.writeFileSync('src/components/HealthView.tsx', content, 'utf8');
console.log("Patched states");

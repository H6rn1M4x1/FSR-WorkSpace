const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');

const targetOld = `                    return (
                      <div className="w-full space-y-2 mt-2 shrink-0">
                        <div className="h-32 min-h-[130px] w-full text-xs shrink-0">
                          <ResponsiveContainer width="100%" height={130}>
                            <LineChart
                              data={reversedLogs}
                              margin={{ top: 10, right: 10, bottom: 5, left: -20 }}
                            >`;

const targetNew = `                    return (
                      <div className="w-full space-y-1.5 mt-1 shrink-0">
                        <div className="h-[110px] min-h-[110px] w-full text-xs shrink-0">
                          <ResponsiveContainer width="100%" height={110}>
                            <LineChart
                              data={reversedLogs}
                              margin={{ top: 5, right: 10, bottom: 0, left: -20 }}
                            >`;

if (content.includes(targetOld)) {
  content = content.replace(targetOld, targetNew);
  
  // also reduce mt-2 on the legend
  const legendOld = `<div className="flex items-center justify-center gap-4 text-[10px] font-bold text-zinc-500 uppercase mt-2">`;
  const legendNew = `<div className="flex items-center justify-center gap-4 text-[10px] font-bold text-zinc-500 uppercase mt-1">`;
  content = content.replace(legendOld, legendNew);

  fs.writeFileSync('src/components/HealthView.tsx', content, 'utf8');
  console.log("Reduced chart height successfully");
} else {
  console.log("Could not find chart container code to replace");
}

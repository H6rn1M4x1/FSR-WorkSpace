const fs = require('fs');
const file = 'src/components/AppointmentsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// The table uses `sortedTurnosCompromisos.filter` at lines ~2392 and ~2413.
const searchCheck = `
                        const matchesStatus = statusFilter === "Todos" || getEstadoLabel(tc.estatus, tc.fecha) === statusFilter;
                        const matchesSearch = !listSearchTerm ||
                          tc.nombre.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
                          tc.lugar.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
                          (tc.doctor && tc.doctor.toLowerCase().includes(listSearchTerm.toLowerCase()));
                        return matchesStatus && matchesSearch;`;

content = content.replace(
  /return \(\n\s*statusFilter === "Todos" \|\|\n\s*getEstadoLabel\(tc\.estatus, tc\.fecha\) === statusFilter\n\s*\);/g,
  searchCheck
);

fs.writeFileSync(file, content);
console.log("Updated table filtering.");

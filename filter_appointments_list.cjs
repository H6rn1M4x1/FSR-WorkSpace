const fs = require('fs');
const file = 'src/components/AppointmentsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the filter logic in the first list
let searchCheck = `
                        const matchesSearch = !listSearchTerm ||
                          tc.nombre.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
                          tc.lugar.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
                          (tc.doctor && tc.doctor.toLowerCase().includes(listSearchTerm.toLowerCase()));
                        return matchesDate && matchesStatus && matchesSearch;`;

content = content.replace(
  /return matchesDate && matchesStatus;/g,
  searchCheck
);

fs.writeFileSync(file, content);
console.log("Updated list filtering.");

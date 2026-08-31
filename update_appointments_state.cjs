const fs = require('fs');
const file = 'src/components/AppointmentsView.tsx';
let content = fs.readFileSync(file, 'utf8');

if (content.includes('const [statusFilter, setStatusFilter] = useState<string>("Todos");')) {
  content = content.replace(
    'const [statusFilter, setStatusFilter] = useState<string>("Todos");',
    'const [statusFilter, setStatusFilter] = useState<string>("Todos");\n  const [listSearchTerm, setListSearchTerm] = useState("");'
  );
  fs.writeFileSync(file, content);
  console.log("Added listSearchTerm state.");
}

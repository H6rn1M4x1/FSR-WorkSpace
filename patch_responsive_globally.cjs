const fs = require('fs');
const path = require('path');

function getFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = dir + '/' + file;
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, filesList);
    } else if (name.endsWith('.tsx')) {
      filesList.push(name);
    }
  }
  return filesList;
}

const files = getFiles('src/components');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let originalContent = content;

  // Header controls shrink-0 width on mobile
  content = content.replace(
    /className="flex flex-col items-stretch sm:items-end gap-2 shrink-0"/g,
    'className="flex flex-col items-stretch sm:items-end gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0"'
  );

  // Filters Bar flex wrapper
  content = content.replace(
    /className="flex flex-col sm:flex-row gap-3 mb-6 items-center"/g,
    'className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center w-full"'
  );

  // Filters Bar specific inside AcademicView (md breakpoint)
  content = content.replace(
    /className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-8 mb-6"/g,
    'className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mt-8 mb-6 w-full"'
  );
  
  // Custom Select or Filters wrap
  content = content.replace(
    /className="flex flex-wrap gap-2\.5 items-center"/g,
    'className="flex flex-col sm:flex-row flex-wrap gap-2.5 items-stretch sm:items-center w-full md:w-auto"'
  );

  // Search query wrapper
  content = content.replace(
    /className="relative flex-1"/g,
    'className="relative flex-1 w-full"'
  );
  
  content = content.replace(
    /className="relative flex-1 max-w-md"/g,
    'className="relative flex-1 w-full sm:max-w-md"'
  );

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Patched ${file}`);
  }
}
console.log("Done");

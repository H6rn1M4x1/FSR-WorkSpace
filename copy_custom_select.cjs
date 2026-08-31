const fs = require('fs');
const file = 'src/components/GymRutinaView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Copy CustomSelect definition from MealsView to GymRutinaView if it doesn't exist
if (!content.includes('const CustomSelect: React.FC<CustomSelectProps>')) {
  const mealsContent = fs.readFileSync('src/components/MealsView.tsx', 'utf8');
  
  const customSelectMatch = mealsContent.match(/(interface CustomSelectProps[\s\S]*?const CustomSelect[\s\S]*?^}\n)/m);
  
  if (customSelectMatch) {
    const customSelectCode = customSelectMatch[0];
    
    // Find a good place to insert it in GymRutinaView, e.g. before the main component
    content = content.replace(
      /(export const GymRutinaView)/,
      customSelectCode + '\n$1'
    );
    
    fs.writeFileSync(file, content);
    console.log("Copied CustomSelect to GymRutinaView.");
  } else {
    console.log("Could not find CustomSelect in MealsView.");
  }
} else {
  console.log("CustomSelect already exists in GymRutinaView.");
}

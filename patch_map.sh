sed -i 's/📍 \${lugar.split(",")[0]}/<span class="text-primary">📍<\/span> \${lugar.split(",")[0]}/g' src/components/AppointmentsView.tsx
sed -i 's/"><\/div>/<div class="w-3.5 h-3.5 rounded-full bg-primary border-2 border-white dark:border-zinc-900 shadow-md transform -translate-x-[3px] -translate-y-[3px]"><\/div>/g' src/components/AppointmentsView.tsx

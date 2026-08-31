sed -i '1014c\
    organizacionSemanal.filter(os => os.fecha === todayStr).forEach(os => {\
      const matchedPlato = platos.find(p => p.id === os.platoId);\
      newNotifs.push({\
        id: `notif-meal-${os.id}`,\
        title: `Comida Planeada: ${matchedPlato ? matchedPlato.nombrePlato : "Comida Desconocida"}`,\
        body: `Configurado en tu menú diario de comidas.`,\
        timestamp: new Date().toISOString(),\
        read: false,\
        type: "meal",\
      });\
    });\
\
    disponibilidadMedicamentos.filter(d => d.disponibleHasta === todayStr).forEach(d => {\
      newNotifs.push({\
        id: `notif-med-${d.id}`,\
        title: `Medicamento: ${d.marca}`,\
        body: `Droga: ${d.droga || "N/A"}`,\
        timestamp: new Date().toISOString(),\
        read: false,\
        type: "medication",\
      });\
    });\
\
    setNotifications((prev) => {\
' src/App.tsx

sed -i '1010,1035c\
    detailedPayments.filter(dp => (dp.fechaVencimiento === todayStr || dp.fechaCierre === todayStr) \&\& !dp.pago).forEach(dp => {\
      newNotifs.push({\
        id: `notif-dp-${dp.id}`,\
        title: `Pago: ${dp.descripcion}`,\
        body: `Monto: $${dp.montoAPagar} ARS`,\
        timestamp: new Date().toISOString(),\
        read: false,\
        type: "finance",\
      });\
    });\
\
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
      const existingIds = new Set(prev.map((n) => n.id));\
      const toAdd = newNotifs.filter((n) => !existingIds.has(n.id));\
      if (toAdd.length === 0) return prev;\
      return [...toAdd, ...prev];\
    });\
  }, [turnosCompromisos, appointments, invoices, detailedPayments, organizacionSemanal, disponibilidadMedicamentos, platos]);\
\
  // Sync Notes to Google Drive as Google Doc\
  const handleSyncNotesToDrive = async (title: string, content: string) => {\
    if (!token) {\
      alert("Por favor conecta tu cuenta de Google Workspace para sincronizar.");\
      return;\
    }\
    setSyncingNotes(true);\
    const result = await WorkspaceService.syncNotesToDrive(title, content, token);\
' src/App.tsx

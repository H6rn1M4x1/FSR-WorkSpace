sed -i '977,1014c\
    const todayStr = new Date().toISOString().split("T")[0];\
    const newNotifs: AppNotification[] = [];\
\
    turnosCompromisos.filter(t => t.fecha === todayStr \&\& !t.estatus).forEach(t => {\
      newNotifs.push({\
        id: `notif-turno-${t.id}`,\
        title: t.descripcion,\
        body: `Categoría: ${t.categoria}${t.lugar ? ` - Lugar: ${t.lugar}` : ""}`,\
        timestamp: new Date().toISOString(),\
        read: false,\
        type: "appointment",\
      });\
    });\
\
    appointments.filter(a => a.date === todayStr).forEach(a => {\
      newNotifs.push({\
        id: `notif-app-${a.id}`,\
        title: a.title,\
        body: `${a.time ? `Hora: ${a.time} - ` : ""}Médico: ${a.doctorName}`,\
        timestamp: new Date().toISOString(),\
        read: false,\
        type: "appointment",\
      });\
    });\
\
    invoices.filter(i => i.dueDate === todayStr \&\& !i.paid).forEach(i => {\
      newNotifs.push({\
        id: `notif-inv-${i.id}`,\
        title: `Vence: ${i.title}`,\
        body: `Monto: $${i.amount} ARS`,\
        timestamp: new Date().toISOString(),\
        read: false,\
        type: "finance",\
      });\
    });\
\
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
    setNotifications((prev) => {\
      const existingIds = new Set(prev.map((n) => n.id));\
      const toAdd = newNotifs.filter((n) => !existingIds.has(n.id));\
      if (toAdd.length === 0) return prev;\
      return [...toAdd, ...prev];\
    });\
  }, [turnosCompromisos, appointments, invoices, detailedPayments]);' src/App.tsx

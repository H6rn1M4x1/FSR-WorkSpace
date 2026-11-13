import { createCategorySync, put, Row, TableConfig } from "./supabaseCategorySync";

/**
 * Piloto de migración Firebase -> Supabase, sección Finanzas (mismo patrón que Turnos —
 * ver supabaseTurnosSync.ts). Reemplaza, solo para estas 9 categorías, el backend de
 * firestoreSyncService.ts.
 */

const TABLES: Record<string, TableConfig> = {
  invoices: {
    table: "invoices",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      title: item.title ?? null,
      amount: item.amount ?? null,
      due_date: item.dueDate ?? null,
      category: item.category ?? null,
      paid: !!item.paid,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id, paid: !!row.paid };
      put(out, "title", row.title);
      put(out, "amount", row.amount);
      put(out, "dueDate", row.due_date);
      put(out, "category", row.category);
      return out;
    },
  },
  payments: {
    table: "payments",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      title: item.title ?? null,
      amount: item.amount ?? null,
      date: item.date ?? null,
      category: item.category ?? null,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id };
      put(out, "title", row.title);
      put(out, "amount", row.amount);
      put(out, "date", row.date);
      put(out, "category", row.category);
      return out;
    },
  },
  detailed_payments: {
    table: "detailed_payments",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      pago: !!item.pago,
      descripcion: item.descripcion ?? "",
      categoria: item.categoria ?? null,
      fecha_vencimiento: item.fechaVencimiento ?? null,
      fecha_cierre: item.fechaCierre ?? null,
      metodo_pago: item.metodoPago ?? null,
      monto_a_pagar: item.montoAPagar ?? null,
      pago_recurrente: !!item.pagoRecurrente,
      factura_emitida: item.facturaEmitida ?? null,
      comprobante_pago: item.comprobantePago ?? null,
      con_que_pagar: item.conQuePagar ?? null,
      donde_pagar: item.dondePagar ?? null,
      observaciones: item.observaciones ?? null,
      icono: item.icono ?? null,
      icono_color: item.iconoColor ?? null,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id, pago: !!row.pago, descripcion: row.descripcion ?? "", pagoRecurrente: !!row.pago_recurrente };
      put(out, "categoria", row.categoria);
      put(out, "fechaVencimiento", row.fecha_vencimiento);
      put(out, "fechaCierre", row.fecha_cierre);
      put(out, "metodoPago", row.metodo_pago);
      put(out, "montoAPagar", row.monto_a_pagar);
      put(out, "facturaEmitida", row.factura_emitida);
      put(out, "comprobantePago", row.comprobante_pago);
      put(out, "conQuePagar", row.con_que_pagar);
      put(out, "dondePagar", row.donde_pagar);
      put(out, "observaciones", row.observaciones);
      put(out, "icono", row.icono);
      put(out, "iconoColor", row.icono_color);
      return out;
    },
  },
  gastos_varios: {
    table: "gastos_varios",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      descripcion: item.descripcion ?? null,
      categoria: item.categoria ?? null,
      fecha: item.fecha ?? null,
      metodo: item.metodo ?? null,
      monto: item.monto ?? null,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id };
      put(out, "descripcion", row.descripcion);
      put(out, "categoria", row.categoria);
      put(out, "fecha", row.fecha);
      put(out, "metodo", row.metodo);
      put(out, "monto", row.monto);
      return out;
    },
  },
  budgets: {
    table: "budgets",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      category: item.category ?? null,
      limit_amount: item.limit ?? null,
      spent: item.spent ?? null,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id };
      put(out, "category", row.category);
      put(out, "limit", row.limit_amount);
      put(out, "spent", row.spent);
      return out;
    },
  },
  inversiones: {
    table: "inversiones",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      lugar: item.lugar ?? null,
      operacion: item.operacion ?? null,
      ticker: item.ticker ?? null,
      fecha: item.fecha ?? null,
      cantidad: item.cantidad ?? null,
      valor_unitario_pesos: item.valorUnitarioPesos ?? null,
      valor_total_pesos: item.valorTotalPesos ?? null,
      estado: item.estado ?? null,
      valor_unitario_dolares: item.valorUnitarioDolares ?? null,
      valor_total_dolares: item.valorTotalDolares ?? null,
      nombre_accion: item.nombreAccion ?? null,
      ratio: item.ratio ?? null,
      valor_unitario_actual_pesos: item.valorUnitarioActualPesos ?? null,
      valor_total_actual_pesos: item.valorTotalActualPesos ?? null,
      variacion_diaria_pesos: item.variacionDiariaPesos ?? null,
      cotizacion_dolares_ratio: item.cotizacionDolaresRatio ?? null,
      variacion_diaria_dolares: item.variacionDiariaDolares ?? null,
      diferencia_variacion: item.diferenciaVariacion ?? null,
      ganancias_acumuladas_pesos: item.gananciasAcumuladasPesos ?? null,
      ganancias_acumuladas_dolares: item.gananciasAcumuladasDolares ?? null,
      resultado: item.resultado ?? null,
    }),
    fromRow: (row) => {
      const out: Row = {
        id: row.id,
        lugar: row.lugar ?? "",
        operacion: row.operacion ?? "",
        ticker: row.ticker ?? "",
        fecha: row.fecha ?? "",
        cantidad: row.cantidad ?? 0,
        valorUnitarioPesos: row.valor_unitario_pesos ?? "",
        valorTotalPesos: row.valor_total_pesos ?? "",
        estado: row.estado ?? "",
        valorUnitarioDolares: row.valor_unitario_dolares ?? "",
        valorTotalDolares: row.valor_total_dolares ?? "",
      };
      put(out, "nombreAccion", row.nombre_accion);
      put(out, "ratio", row.ratio);
      put(out, "valorUnitarioActualPesos", row.valor_unitario_actual_pesos);
      put(out, "valorTotalActualPesos", row.valor_total_actual_pesos);
      put(out, "variacionDiariaPesos", row.variacion_diaria_pesos);
      put(out, "cotizacionDolaresRatio", row.cotizacion_dolares_ratio);
      put(out, "variacionDiariaDolares", row.variacion_diaria_dolares);
      put(out, "diferenciaVariacion", row.diferencia_variacion);
      put(out, "gananciasAcumuladasPesos", row.ganancias_acumuladas_pesos);
      put(out, "gananciasAcumuladasDolares", row.ganancias_acumuladas_dolares);
      put(out, "resultado", row.resultado);
      return out;
    },
  },
  investment_snapshots: {
    table: "investment_snapshots",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      date: item.date ?? null,
      crypto_gain_ars: item.cryptoGainARS ?? 0,
      acciones_gain_ars: item.accionesGainARS ?? 0,
    }),
    fromRow: (row) => ({
      id: row.id,
      date: row.date,
      cryptoGainARS: row.crypto_gain_ars ?? 0,
      accionesGainARS: row.acciones_gain_ars ?? 0,
    }),
  },
  cotizaciones_acciones: {
    table: "cotizaciones_acciones",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      simbolo: item.simbolo ?? null,
      descripcion: item.descripcion ?? null,
      panel: item.panel ?? null,
      moneda: item.moneda ?? null,
      ultimo_precio: item.ultimoPrecio ?? null,
      variacion: item.variacion ?? null,
      variacion_texto: item.variacionTexto ?? null,
      apertura: item.apertura ?? null,
      minimo: item.minimo ?? null,
      maximo: item.maximo ?? null,
      ultimo_cierre: item.ultimoCierre ?? null,
      monto_operado: item.montoOperado ?? null,
      fecha_actualizacion: item.fechaActualizacion ?? null,
    }),
    fromRow: (row) => {
      const out: Row = {
        id: row.id,
        simbolo: row.simbolo ?? "",
        descripcion: row.descripcion ?? "",
        panel: row.panel ?? "",
        ultimoPrecio: row.ultimo_precio ?? "",
        variacion: row.variacion ?? 0,
        variacionTexto: row.variacion_texto ?? "",
        apertura: row.apertura ?? "",
        minimo: row.minimo ?? "",
        maximo: row.maximo ?? "",
        ultimoCierre: row.ultimo_cierre ?? "",
      };
      put(out, "moneda", row.moneda);
      put(out, "montoOperado", row.monto_operado);
      put(out, "fechaActualizacion", row.fecha_actualizacion);
      return out;
    },
  },
  cotizaciones_cripto: {
    table: "cotizaciones_cripto",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      name: item.name ?? null,
      price: item.price ?? null,
      percent_1h: item.percent1h ?? null,
      percent_24h: item.percent24h ?? null,
      percent_7d: item.percent7d ?? null,
      market_cap: item.marketCap ?? null,
      volume_24h: item.volume24h ?? null,
      circulating_supply: item.circulatingSupply ?? null,
      sentiment: item.sentiment ?? null,
      chart_7d: item.chart7d ?? null,
      image: item.image ?? null,
      symbol: item.symbol ?? null,
    }),
    fromRow: (row) => {
      const out: Row = {
        id: row.id,
        name: row.name ?? "",
        price: row.price ?? "",
        percent1h: row.percent_1h ?? 0,
        percent24h: row.percent_24h ?? 0,
        percent7d: row.percent_7d ?? 0,
        marketCap: row.market_cap ?? "",
        volume24h: row.volume_24h ?? "",
        circulatingSupply: row.circulating_supply ?? "",
        sentiment: row.sentiment ?? "",
      };
      put(out, "chart7d", row.chart_7d);
      put(out, "image", row.image);
      put(out, "symbol", row.symbol);
      return out;
    },
  },
};

const sync = createCategorySync(TABLES);

export const SUPABASE_MIGRATED_CATEGORIES = sync.SUPABASE_MIGRATED_CATEGORIES;
export const refetchCategorySupabase = sync.refetchCategorySupabase;
export const saveItemToSupabase = sync.saveItemToSupabase;
export const deleteItemFromSupabase = sync.deleteItemFromSupabase;
export const subscribeToCategorySupabase = sync.subscribeToCategorySupabase;
export const bulkImportFromFirestore = sync.bulkImportFromFirestore;

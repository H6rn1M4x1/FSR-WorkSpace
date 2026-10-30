import { useEffect, useState } from "react";

export interface InflacionData {
  fecha: string;
  valorMensual: number;
  valorInteranual?: number;
  periodoNombre: string;
  loading: boolean;
}

/**
 * IPC mensual e interanual de Argentina (api.argentinadatos.com, fuente INDEC), con caché de
 * 12hs en localStorage — extraído de FinanceView.tsx para poder reusarlo también en el widget de
 * gastos de Inicio sin duplicar el fetch.
 */
export function useInflacionData(): InflacionData {
  const [inflacionData, setInflacionData] = useState<InflacionData>({
    fecha: "",
    valorMensual: 0,
    valorInteranual: 0,
    periodoNombre: "",
    loading: true,
  });

  useEffect(() => {
    const fetchInflacion = async () => {
      try {
        const CACHE_KEY = "ipc_indec_data";
        const CACHE_EXPIRATION = 12 * 60 * 60 * 1000;

        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_EXPIRATION) {
            setInflacionData({ ...data, loading: false });
            return;
          }
        }

        const [resM, resI] = await Promise.all([
          fetch("https://api.argentinadatos.com/v1/finanzas/indices/inflacion"),
          fetch("https://api.argentinadatos.com/v1/finanzas/indices/inflacionInteranual"),
        ]);

        if (resM.ok) {
          const dataM = await resM.json();
          const dataI = resI.ok ? await resI.json() : [];

          if (Array.isArray(dataM) && dataM.length > 0) {
            const lastM = dataM[dataM.length - 1];
            const lastI = Array.isArray(dataI) && dataI.length > 0 ? dataI[dataI.length - 1] : null;

            const dateParts = (lastM.fecha || "").split("-");
            let periodoNombre = lastM.fecha;
            if (dateParts.length === 3) {
              const year = dateParts[0];
              const monthIdx = parseInt(dateParts[1], 10) - 1;
              const meses = [
                "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
              ];
              if (monthIdx >= 0 && monthIdx < 12) {
                periodoNombre = `${meses[monthIdx]} ${year}`;
              }
            }

            const result = {
              fecha: lastM.fecha,
              valorMensual: lastM.valor,
              valorInteranual: lastI?.valor || 0,
              periodoNombre,
            };

            localStorage.setItem(
              CACHE_KEY,
              JSON.stringify({
                data: result,
                timestamp: Date.now(),
              })
            );

            setInflacionData({ ...result, loading: false });
            return;
          }
        }
      } catch (e) {
        console.error("Error fetching inflacion:", e);
      }

      setInflacionData({
        fecha: "2026-07-31",
        valorMensual: 2.1,
        valorInteranual: 33.8,
        periodoNombre: "Julio 2026",
        loading: false,
      });
    };

    fetchInflacion();
  }, []);

  return inflacionData;
}

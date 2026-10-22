import { useEffect, useState } from "react";
import { uiSounds } from "../lib/sounds";

export interface DriveItemLite {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
}

export const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";

async function driveFetch(url: string, accessToken: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Drive API ${res.status}`);
  return res.json();
}

async function listFolderContents(folderId: string, token: string): Promise<DriveItemLite[]> {
  const q = `'${folderId}' in parents and trashed = false`;
  const data = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size)&pageSize=200&orderBy=folder,name`,
    token,
  );
  return data.files || [];
}

// Lógica de navegación de un picker de carpetas/archivos de Drive — separada de su render
// (`DriveFilePickerView`) para poder reusarla en más de un lugar (elegir el PDF para generar el
// árbol, adjuntar un archivo a un nodo) sin duplicar la parte de breadcrumbs/listado/fetch.
export function useDriveFilePicker(accessToken: string | null, startFolderId: string, startFolderName: string) {
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([
    { id: startFolderId, name: startFolderName },
  ]);
  const [currentFolderId, setCurrentFolderId] = useState(startFolderId);
  const [items, setItems] = useState<DriveItemLite[] | null>(null);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentFolderId || !accessToken) return;
    setLoadingItems(true);
    setError(null);
    listFolderContents(currentFolderId, accessToken)
      .then(setItems)
      .catch((err) => setError(err?.message || "No se pudo leer la carpeta."))
      .finally(() => setLoadingItems(false));
  }, [currentFolderId, accessToken]);

  const navigateTo = (id: string, name: string) => {
    uiSounds.navigate();
    setBreadcrumbs((prev) => {
      const existingIdx = prev.findIndex((b) => b.id === id);
      return existingIdx !== -1 ? prev.slice(0, existingIdx + 1) : [...prev, { id, name }];
    });
    setCurrentFolderId(id);
  };

  return { breadcrumbs, currentFolderId, items, loadingItems, error, navigateTo, setError };
}

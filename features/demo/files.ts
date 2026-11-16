import type { FileRef } from "./model";
const DB = "takethelmo-demo-files-v1";
async function openFiles() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error(
          "파일 저장소를 열 수 없습니다. 브라우저 저장 설정을 확인해 주세요.",
        ),
      );
  });
}
export function validateFile(file: File) {
  if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type))
    throw new Error("PDF, PNG, JPG 파일만 등록할 수 있습니다.");
  if (!file.size || file.size > 5 * 1024 * 1024)
    throw new Error("비어 있지 않은 5MB 이하 파일을 선택해 주세요.");
}
export async function saveFile(file: File): Promise<FileRef> {
  validateFile(file);
  const db = await openFiles();
  const id = crypto.randomUUID();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("files", "readwrite");
      transaction.objectStore("files").put(file, id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () =>
        reject(
          new Error("파일을 저장하지 못했습니다. 저장 공간을 확인해 주세요."),
        );
    });
    return { id, name: file.name, size: file.size, type: file.type };
  } finally {
    db.close();
  }
}
export async function downloadFile(file: FileRef) {
  const db = await openFiles();
  try {
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const request = db.transaction("files").objectStore("files").get(file.id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error("첨부파일을 읽지 못했습니다. 다시 시도해 주세요."));
    });
    if (!blob)
      throw new Error(
        "이 브라우저에서 첨부 원본을 찾을 수 없습니다. 파일을 다시 등록해 주세요.",
      );
    downloadBlob(blob, file.name);
  } finally {
    db.close();
  }
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function clearFiles() {
  const db = await openFiles();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () =>
        reject(new Error("첨부파일 초기화에 실패했습니다."));
    });
  } finally {
    db.close();
  }
}

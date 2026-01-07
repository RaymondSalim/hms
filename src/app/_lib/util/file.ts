export async function fileToBase64(file: File): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result?.toString());
    reader.onerror = (error) => reject(error);
  });
}

export function base64ToFile(base64String: string, fileName: string): File {
  const arr = base64String.split(",");
  const mimeType = arr[0].match(/:(.*?);/)?.[1];
  const byteString = atob(arr[1]);
  let n = byteString.length;
  const uint8Array = new Uint8Array(n);

  while (n--) {
    uint8Array[n] = byteString.charCodeAt(n);
  }

  return new File([uint8Array], fileName, { type: mimeType || "application/octet-stream" });
}

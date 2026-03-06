const MAX_ID_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_ID_PHOTO_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateIdPhotoFile(file: File) {
  if (!ALLOWED_ID_PHOTO_MIME_TYPES.has(file.type)) {
    throw new Error("Formato no permitido. Usa JPG, PNG o WEBP.");
  }
  if (file.size <= 0) {
    throw new Error("La foto del ID esta vacia.");
  }
  if (file.size > MAX_ID_PHOTO_SIZE_BYTES) {
    throw new Error("La foto del ID supera el limite de 5MB.");
  }
}

export async function idPhotoFileToBytes(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

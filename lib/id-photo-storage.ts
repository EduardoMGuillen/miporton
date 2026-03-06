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

export async function uploadIdPhotoToCloudinary(file: File) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    throw new Error("Storage no configurado. Faltan CLOUDINARY_CLOUD_NAME/CLOUDINARY_UPLOAD_PRESET.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", "miporton/visitor-ids");

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("No se pudo guardar la foto del ID en el storage.");
  }

  const payload = (await response.json()) as { secure_url?: string };
  if (!payload.secure_url) {
    throw new Error("Storage respondio sin URL de imagen.");
  }

  return { url: payload.secure_url };
}

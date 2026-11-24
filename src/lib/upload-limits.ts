export const localUploadLimit = 10 * 1024 * 1024
export const vercelUploadLimit = 4 * 1024 * 1024
// Leave room for multipart form data below Vercel's 4.5 MB request limit.
export function uploadLimit() {
  return process.env.VERCEL ? vercelUploadLimit : localUploadLimit
}
export const uploadLimitMB = () => uploadLimit() / (1024 * 1024)

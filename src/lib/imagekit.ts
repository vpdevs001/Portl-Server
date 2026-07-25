/**
 * Minimal ImageKit upload helper. Replaces the earlier `example.com`
 * upload stub with a real upload to ImageKit's Media Library, used by
 * every image-upload flow in the app (visitor photos, complaint photos,
 * payment confirmation screenshots).
 *
 * Server-side uploads authenticate with Basic Auth using the private key
 * as the username and no password (per ImageKit's REST API docs) — so
 * only IMAGEKIT_PRIVATE_KEY is needed here, no public key or URL endpoint.
 */

import env from '../../env.ts';
import { AppError } from '../common/errors/app-error.ts';
import { ERROR_CODES } from '../common/errors/error-codes.ts';

const IMAGEKIT_UPLOAD_ENDPOINT = 'https://upload.imagekit.io/api/v1/files/upload';

export type ImageKitUploadInput = {
  /** Raw base64 file content, no `data:...;base64,` prefix. */
  base64: string;
  fileName: string;
  /** ImageKit folder to organize uploads by feature, e.g. "payments". */
  folder?: string;
};

export type ImageKitUploadResult = {
  url: string;
  fileId: string;
  name: string;
};

export async function uploadToImageKit(input: ImageKitUploadInput): Promise<ImageKitUploadResult> {
  const authHeader = `Basic ${Buffer.from(`${env.IMAGEKIT_PRIVATE_KEY}:`).toString('base64')}`;

  const form = new FormData();
  form.append('file', input.base64);
  form.append('fileName', input.fileName);
  form.append('useUniqueFileName', 'true');
  if (input.folder) {
    form.append('folder', `/portl/${input.folder}`);
  }

  const response = await fetch(IMAGEKIT_UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: authHeader },
    body: form
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new AppError(
      502,
      ERROR_CODES.UPLOAD_FAILED,
      `ImageKit upload failed: ${response.status} ${body}`
    );
  }

  const data = (await response.json()) as { url: string; fileId: string; name: string };

  return { url: data.url, fileId: data.fileId, name: data.name };
}

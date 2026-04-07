import { BadRequestException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

export type UploadableFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

const DEFAULT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function tryGetSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

export function getSupabaseAdminClient() {
  const client = tryGetSupabaseAdminClient();
  if (!client) {
    throw new BadRequestException(
      'Thiếu cấu hình SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  return client;
}

export function validateImageFile(
  file: UploadableFile | undefined,
  fieldLabel: string,
  maxBytes = DEFAULT_MAX_IMAGE_BYTES,
) {
  if (!file) {
    return;
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    throw new BadRequestException(
      `${fieldLabel} chỉ hỗ trợ JPEG, PNG hoặc WEBP.`,
    );
  }

  if (file.size > maxBytes) {
    throw new BadRequestException(
      `${fieldLabel} vượt quá giới hạn ${Math.floor(maxBytes / (1024 * 1024))}MB.`,
    );
  }
}

export async function createSignedStorageUrl(options: {
  bucket: string;
  path?: string | null;
  expiresIn: number;
}) {
  if (!options.path) {
    return null;
  }

  const supabase = tryGetSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(options.bucket)
    .createSignedUrl(options.path, options.expiresIn);

  if (error) {
    return null;
  }

  return data.signedUrl ?? null;
}

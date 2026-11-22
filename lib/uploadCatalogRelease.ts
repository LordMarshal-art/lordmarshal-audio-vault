import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type CatalogCategory = 'beat' | 'sample_pack' | 'midi_pack' | 'drum_loop';

export interface UploadCatalogReleaseInput {
  title: string;
  slug: string;
  category: CatalogCategory;
  priceCents: number;
  bpm?: number | null;
  musicalKey?: string | null;
  coverFile: File;
  previewFile: File;
  downloadFile?: File;
}

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-');
}

export async function uploadCatalogRelease(input: UploadCatalogReleaseInput) {
  const uploaded: Array<{ bucket: '485-artwork' | '485-previews' | '485-downloads'; path: string }> = [];
  const stamp = Date.now();
  const safeSlug = sanitizeFileName(input.slug || input.title);

  try {
    // 1. Cover art -> 485-artwork (Public)
    const coverPath = `covers/${safeSlug}-${stamp}-${sanitizeFileName(input.coverFile.name)}`;
    const { error: coverError } = await supabase.storage
      .from('485-artwork')
      .upload(coverPath, input.coverFile, { upsert: false });
    if (coverError) throw new Error(`Artwork upload failed: ${coverError.message}`);
    uploaded.push({ bucket: '485-artwork', path: coverPath });

    // 2. Audio preview -> 485-previews (Public)
    const previewPath = `audio/${safeSlug}-${stamp}-${sanitizeFileName(input.previewFile.name)}`;
    const { error: previewError } = await supabase.storage
      .from('485-previews')
      .upload(previewPath, input.previewFile, { upsert: false });
    if (previewError) throw new Error(`Preview upload failed: ${previewError.message}`);
    uploaded.push({ bucket: '485-previews', path: previewPath });

    // 3. Paid pack / stems / WAV -> 485-downloads (Private)
    let downloadPath: string | null = null;
    if (input.downloadFile) {
      downloadPath = `packs/${safeSlug}-${stamp}-${sanitizeFileName(input.downloadFile.name)}`;
      const { error: downloadError } = await supabase.storage
        .from('485-downloads')
        .upload(downloadPath, input.downloadFile, { upsert: false });
      if (downloadError) throw new Error(`Download file upload failed: ${downloadError.message}`);
      uploaded.push({ bucket: '485-downloads', path: downloadPath });
    }

    // Public URLs only for public buckets; store private path for signed URL generation later
    const coverUrl = supabase.storage.from('485-artwork').getPublicUrl(coverPath).data.publicUrl;
    const previewUrl = supabase.storage.from('485-previews').getPublicUrl(previewPath).data.publicUrl;

    // 4. Insert catalog metadata row in Postgres
    const { data, error: dbError } = await supabase
      .from('catalog_items')
      .insert({
        title: input.title,
        slug: safeSlug,
        category: input.category,
        price_cents: input.priceCents,
        bpm: input.bpm ?? null,
        musical_key: input.musicalKey ?? null,
        cover_bucket: '485-artwork',
        cover_path: coverPath,
        cover_url: coverUrl,
        preview_bucket: '485-previews',
        preview_path: previewPath,
        preview_url: previewUrl,
        download_bucket: downloadPath ? '485-downloads' : null,
        download_path: downloadPath,
      })
      .select()
      .single();

    if (dbError) throw new Error(`Database insert failed: ${dbError.message}`);
    return data;
  } catch (err) {
    // Roll back any files uploaded before the failure
    for (const item of uploaded) {
      await supabase.storage.from(item.bucket).remove([item.path]);
    }
    throw err;
  }
}

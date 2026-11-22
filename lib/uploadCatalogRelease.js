// Make sure admin.html includes:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function sanitizeFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-');
}

async function uploadCatalogRelease(input) {
  const uploaded = [];
  const stamp = Date.now();
  const safeSlug = sanitizeFileName(input.slug || input.title);

  try {
    // 1. Cover art -> 485-artwork (Public)
    const coverPath = `covers/${safeSlug}-${stamp}-${sanitizeFileName(input.coverFile.name)}`;
    const { error: coverError } = await supabaseClient.storage
      .from('485-artwork')
      .upload(coverPath, input.coverFile, { upsert: false });
    if (coverError) throw new Error(`Artwork upload failed: ${coverError.message}`);
    uploaded.push({ bucket: '485-artwork', path: coverPath });

    // 2. Audio preview -> 485-previews (Public)
    const previewPath = `audio/${safeSlug}-${stamp}-${sanitizeFileName(input.previewFile.name)}`;
    const { error: previewError } = await supabaseClient.storage
      .from('485-previews')
      .upload(previewPath, input.previewFile, { upsert: false });
    if (previewError) throw new Error(`Preview upload failed: ${previewError.message}`);
    uploaded.push({ bucket: '485-previews', path: previewPath });

    // 3. Paid pack / stems / WAV -> 485-downloads (Private)
    let downloadPath = null;
    if (input.downloadFile) {
      downloadPath = `packs/${safeSlug}-${stamp}-${sanitizeFileName(input.downloadFile.name)}`;
      const { error: downloadError } = await supabaseClient.storage
        .from('485-downloads')
        .upload(downloadPath, input.downloadFile, { upsert: false });
      if (downloadError) throw new Error(`Download file upload failed: ${downloadError.message}`);
      uploaded.push({ bucket: '485-downloads', path: downloadPath });
    }

    const coverUrl = supabaseClient.storage.from('485-artwork').getPublicUrl(coverPath).data.publicUrl;
    const previewUrl = supabaseClient.storage.from('485-previews').getPublicUrl(previewPath).data.publicUrl;

    // 4. Insert catalog metadata row in Postgres
    const { data, error: dbError } = await supabaseClient
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
    for (const item of uploaded) {
      await supabaseClient.storage.from(item.bucket).remove([item.path]);
    }
    throw err;
  }
}

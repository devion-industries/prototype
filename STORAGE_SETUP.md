# Storage Setup for Exports

The export system uses Supabase Storage to store generated files.

## Setup Steps

### 1. Create Storage Bucket in Supabase

1. Go to your Supabase dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **Create a new bucket**
4. Bucket name: `exports`
5. **Public bucket**: ✅ Yes (so users can download exports)
6. Click **Create bucket**

### 2. Set Bucket Policies

Go to **Storage Policies** and add this policy:

```sql
-- Allow authenticated users to read their own exports
CREATE POLICY "Users can read own exports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'exports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow service role to upload
CREATE POLICY "Service role can upload exports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exports'
);
```

### 3. Optional: Folder Structure

Exports will be stored as:
```
exports/
  ├── facebook-react-1703001234567.md
  ├── vercel-next.js-1703001234568.md
  └── user-repo-1703001234569.md
```

### 4. Verify Setup

Test that storage is working:

```bash
curl -X POST $API_URL/outputs/$OUTPUT_ID/export \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format": "markdown"}'

# Check export status
curl $API_URL/exports/$EXPORT_ID \
  -H "Authorization: Bearer $SUPABASE_TOKEN"
```

The `file_url` should be a real Supabase Storage URL like:
```
https://xxxxx.supabase.co/storage/v1/object/public/exports/repo-name-timestamp.md
```

## Alternative: Use S3/R2/MinIO

If you prefer AWS S3, Cloudflare R2, or MinIO instead:

1. Install SDK: `npm install @aws-sdk/client-s3`
2. Update `src/analysis/exports.ts`:

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function uploadToStorage(
  content: string,
  filename: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: filename,
    Body: Buffer.from(content, 'utf-8'),
    ContentType: contentType,
    ACL: 'public-read',
  });

  await s3.send(command);
  
  return `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${filename}`;
}
```

## PDF Export (Optional Enhancement)

For real PDF generation, add one of these:

### Option 1: Puppeteer (Recommended)

```bash
npm install puppeteer markdown-it
```

```typescript
import puppeteer from 'puppeteer';
import markdownIt from 'markdown-it';

async function exportPDF(content: string, repoName: string): Promise<string> {
  const md = markdownIt();
  const html = md.render(content);
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; }
          h1 { color: #333; }
          pre { background: #f5f5f5; padding: 10px; }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `);
  
  const pdf = await page.pdf({ format: 'A4' });
  await browser.close();
  
  const filename = `${repoName.replace('/', '-')}-${Date.now()}.pdf`;
  return await uploadToStorage(pdf.toString('base64'), filename, 'application/pdf');
}
```

### Option 2: PDFKit (Lighter)

```bash
npm install pdfkit
```

```typescript
import PDFDocument from 'pdfkit';

async function exportPDF(content: string, repoName: string): Promise<string> {
  const doc = new PDFDocument();
  const chunks: Buffer[] = [];
  
  doc.on('data', (chunk) => chunks.push(chunk));
  
  doc.fontSize(20).text('Maintainer Brief', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(content);
  doc.end();
  
  await new Promise(resolve => doc.on('end', resolve));
  
  const pdfBuffer = Buffer.concat(chunks);
  const filename = `${repoName.replace('/', '-')}-${Date.now()}.pdf`;
  return await uploadToStorage(pdfBuffer.toString('base64'), filename, 'application/pdf');
}
```

### Option 3: External Service

Use a service like:
- **Gotenberg** (self-hosted, Docker-based)
- **PDF Monkey** (API)
- **DocRaptor** (API)

## File Cleanup

Add a cleanup job to delete old exports:

```typescript
// src/scheduler/cleanup.ts
import { getSupabaseClient } from '../auth/supabase';

export async function cleanupOldExports() {
  const supabase = getSupabaseClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: files } = await supabase.storage
    .from('exports')
    .list('', { limit: 1000 });
  
  const oldFiles = files?.filter(file => 
    new Date(file.created_at) < thirtyDaysAgo
  );
  
  for (const file of oldFiles || []) {
    await supabase.storage.from('exports').remove([file.name]);
  }
  
  console.log(`🗑️ Cleaned up ${oldFiles?.length || 0} old exports`);
}
```

Run this weekly in your scheduler.

## Current Implementation

**What works now:**
- ✅ Markdown export to Supabase Storage
- ✅ GitHub release format export
- ✅ Real file URLs returned

**What needs enhancement:**
- ⚠️ PDF export falls back to markdown (requires puppeteer)
- ⚠️ No automatic cleanup of old files

**For MVP, markdown export is sufficient.** Most users will copy-paste the content anyway.


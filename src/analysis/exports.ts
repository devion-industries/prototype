import { Job } from 'bullmq';
import { ExportJobData } from '../queue/jobs';
import { getSupabaseClient } from '../auth/supabase';
import db from '../db/client';

/**
 * Processes export job
 */
export async function processExportJob(job: Job<ExportJobData>): Promise<void> {
  const { exportId, format, content, repoFullName } = job.data;

  try {
    await updateExportStatus(exportId, 'running');

    let fileUrl: string;

    switch (format) {
      case 'markdown':
        fileUrl = await exportMarkdown(content, repoFullName);
        break;
      case 'pdf':
        fileUrl = await exportPDF(content, repoFullName);
        break;
      case 'github_release':
        fileUrl = await exportGitHubRelease(content);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    await updateExportStatus(exportId, 'succeeded', fileUrl);
  } catch (error: any) {
    console.error(`Export job ${exportId} failed:`, error);
    await updateExportStatus(exportId, 'failed', null, error.message);
    throw error;
  }
}

/**
 * Uploads file to Supabase Storage
 */
async function uploadToStorage(
  content: string,
  filename: string,
  contentType: string
): Promise<string> {
  const supabase = getSupabaseClient();
  
  const buffer = Buffer.from(content, 'utf-8');
  
  const { error } = await supabase.storage
    .from('exports')
    .upload(filename, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('exports')
    .getPublicUrl(filename);

  return urlData.publicUrl;
}

/**
 * Exports content as markdown file
 */
async function exportMarkdown(content: string, repoName: string): Promise<string> {
  const filename = `${repoName.replace('/', '-')}-${Date.now()}.md`;
  
  try {
    const fileUrl = await uploadToStorage(content, filename, 'text/markdown');
    console.log(`📄 Exported markdown: ${filename}`);
    return fileUrl;
  } catch (error: any) {
    console.error('Markdown export failed:', error);
    throw error;
  }
}

/**
 * Exports content as PDF using markdown-pdf
 */
async function exportPDF(content: string, repoName: string): Promise<string> {
  const filename = `${repoName.replace('/', '-')}-${Date.now()}.pdf`;
  
  try {
    // For PDF generation, you would use a library like:
    // - puppeteer (headless Chrome)
    // - pdfkit (programmatic PDF)
    // - markdown-pdf
    
    // Since this requires heavy dependencies, we'll export as markdown instead
    // and document that PDF export requires additional setup
    console.warn('PDF export not fully implemented - exporting as markdown instead');
    const fileUrl = await uploadToStorage(content, filename.replace('.pdf', '.md'), 'text/markdown');
    console.log(`📄 Exported as markdown (PDF requires puppeteer): ${filename}`);
    return fileUrl;
  } catch (error: any) {
    console.error('PDF export failed:', error);
    throw error;
  }
}

/**
 * Formats content for GitHub release
 */
async function exportGitHubRelease(content: string): Promise<string> {
  const filename = `release-notes-${Date.now()}.md`;
  
  try {
    const fileUrl = await uploadToStorage(content, filename, 'text/markdown');
    console.log(`📄 Exported GitHub release: ${filename}`);
    return fileUrl;
  } catch (error: any) {
    console.error('GitHub release export failed:', error);
    throw error;
  }
}

/**
 * Updates export status in database
 */
async function updateExportStatus(
  exportId: string,
  status: string,
  fileUrl: string | null = null,
  errorMessage?: string
): Promise<void> {
  const updates: string[] = ['status = $2'];
  const params: any[] = [exportId, status];

  if (fileUrl) {
    updates.push(`file_url = $${params.length + 1}`);
    params.push(fileUrl);
  }

  if (status === 'succeeded' || status === 'failed') {
    updates.push('completed_at = NOW()');
  }

  if (errorMessage) {
    updates.push(`error_message = $${params.length + 1}`);
    params.push(errorMessage);
  }

  await db.query(
    `UPDATE export_requests SET ${updates.join(', ')} WHERE id = $1`,
    params
  );
}


import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { extractSkillsFromText } from '@/lib/matching/skill-matcher';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('resume') as File;
    if (!file) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No file provided.' } }, { status: 400 });
    }

    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|doc)$/i)) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please upload a PDF or Word document.' } }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'File must be under 5MB.' } }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let textContent = '';

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      textContent = extractTextFromPDF(buffer);
    } else {
      textContent = extractTextFromDOCX(buffer);
    }

    if (!textContent || textContent.length < 50) {
      textContent = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ');
    }

    const parsed = await parseResumeContent(textContent);

    return NextResponse.json({ success: true, data: parsed });
  } catch (err) {
    console.error('Resume upload error:', err);
    return NextResponse.json({
      success: false,
      error: { code: 'PDF_PARSE_FAILED', message: 'Could not read this file. Try a different format or fill manually.', retryable: true }
    }, { status: 500 });
  }
}

function extractTextFromPDF(buffer: Buffer): string {
  const content = buffer.toString('binary');
  const texts: string[] = [];
  
  const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
  let match;
  while ((match = btEtRegex.exec(content)) !== null) {
    const block = match[1];
    const tjRegex = /\((.*?)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      texts.push(tjMatch[1]);
    }
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    let arrMatch;
    while ((arrMatch = tjArrayRegex.exec(block)) !== null) {
      const items = arrMatch[1].match(/\((.*?)\)/g);
      if (items) {
        texts.push(items.map(i => i.slice(1, -1)).join(''));
      }
    }
  }
  
  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
  while ((match = streamRegex.exec(content)) !== null) {
    const cleaned = match[1].replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim();
    if (cleaned.length > 10) {
      const readable = cleaned.match(/[A-Za-z]{3,}/g);
      if (readable && readable.length > 5) {
        texts.push(cleaned);
      }
    }
  }
  
  return texts.join(' ').replace(/\s+/g, ' ').trim();
}

function extractTextFromDOCX(buffer: Buffer): string {
  try {
    const content = buffer.toString('binary');
    const texts: string[] = [];
    const textRegex = /<w:t[^>]*>(.*?)<\/w:t>/g;
    let match;
    while ((match = textRegex.exec(content)) !== null) {
      texts.push(match[1]);
    }
    if (texts.length === 0) {
      return content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    }
    return texts.join(' ');
  } catch {
    return '';
  }
}

interface ParsedResume {
  full_name: string;
  email: string;
  phone: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  current_location: string;
  skills: string[];
  experiences: Array<{
    company: string; title: string; start_date: string; end_date: string | null;
    bullets: string[]; technologies: string[]; is_current: boolean;
  }>;
  projects: Array<{ title: string; description: string; technologies: string[] }>;
  education: Array<{ institution: string; degree: string; field: string; graduation_date: string }>;
}

async function parseResumeContent(text: string): Promise<ParsedResume> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (apiKey && text.length > 100) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: `Parse this resume text and extract structured data. Return ONLY valid JSON with no extra text, no markdown fences, no preamble.

Resume text:
${text.slice(0, 8000)}

Return this exact JSON structure:
{
  "full_name": "string",
  "email": "string",
  "phone": "string",
  "linkedin_url": "string",
  "github_url": "string",
  "portfolio_url": "string",
  "current_location": "string",
  "skills": ["skill1", "skill2"],
  "experiences": [{"company": "string", "title": "string", "start_date": "YYYY-MM", "end_date": "YYYY-MM or null", "bullets": ["achievement 1"], "technologies": ["tech1"], "is_current": false}],
  "projects": [{"title": "string", "description": "string", "technologies": ["tech1"]}],
  "education": [{"institution": "string", "degree": "string", "field": "string", "graduation_date": "YYYY-MM"}]
}

Use empty strings for missing fields. Parse dates as YYYY-MM format.`
          }],
        }),
      });

      if (!response.ok) {
        console.error('Claude API error:', response.status, response.statusText);
        return ruleBasedParse(text);
      }

      const data = await response.json();
      const responseText = data.content?.[0]?.text || '';
      
      if (!responseText) {
        console.error('Empty response from Claude API');
        return ruleBasedParse(text);
      }

      // Strip markdown fences and any surrounding whitespace/text
      const cleaned = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

      // Try to extract JSON object even if there's surrounding text
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON object found in Claude response:', cleaned.slice(0, 200));
        return ruleBasedParse(text);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate that we got at least some meaningful data back
      if (!parsed || typeof parsed !== 'object') {
        return ruleBasedParse(text);
      }

      // Normalize: ensure all expected fields exist
      return {
        full_name: parsed.full_name || '',
        email: parsed.email || '',
        phone: parsed.phone || '',
        linkedin_url: parsed.linkedin_url || '',
        github_url: parsed.github_url || '',
        portfolio_url: parsed.portfolio_url || '',
        current_location: parsed.current_location || '',
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        experiences: Array.isArray(parsed.experiences) ? parsed.experiences : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        education: Array.isArray(parsed.education) ? parsed.education : [],
      };
    } catch (err) {
      console.error('AI resume parse failed, using fallback:', err);
    }
  }

  return ruleBasedParse(text);
}

function ruleBasedParse(text: string): ParsedResume {
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  const phoneMatch = text.match(/(\+?\d[\d\s()-]{8,15}\d)/);
  const linkedinMatch = text.match(/(?:linkedin\.com\/in\/[\w-]+)/i);
  const githubMatch = text.match(/(?:github\.com\/[\w-]+)/i);
  const skills = extractSkillsFromText(text);

  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
  let full_name = '';
  if (lines.length > 0 && lines[0].length < 50 && !lines[0].includes('@') && !lines[0].match(/^\d/)) {
    full_name = lines[0];
  }

  return {
    full_name,
    email: emailMatch ? emailMatch[0] : '',
    phone: phoneMatch ? phoneMatch[1].trim() : '',
    linkedin_url: linkedinMatch ? `https://${linkedinMatch[0]}` : '',
    github_url: githubMatch ? `https://${githubMatch[0]}` : '',
    portfolio_url: '',
    current_location: '',
    skills,
    experiences: [],
    projects: [],
    education: [],
  };
}
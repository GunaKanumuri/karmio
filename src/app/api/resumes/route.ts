import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit/middleware';
import { SubscriptionTier } from '@/types';

// Emergent LLM integration for AI resume tailoring
const EMERGENT_LLM_KEY = process.env.EMERGENT_LLM_KEY;

interface ResumeGenerateRequest {
  job_id: string;
  action: 'generate' | 'cover_letter';
}

// Add this BEFORE the existing POST handler in src/app/api/resumes/route.ts

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('resume_recipes')
      .select('*, job_postings(id, title, company_name, location)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: 'QUERY_FAILED', message: 'Could not fetch resumes.' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } 
      }, { status: 401 });
    }

    // Get user tier for rate limiting
    const { data: profile } = await supabase
      .from('users')
      .select('subscription_tier, full_name, linkedin_url, github_url, portfolio_url')
      .eq('id', user.id)
      .single();

    const tier = (profile?.subscription_tier || 'free') as SubscriptionTier;
    
    // Rate limit check
    const blocked = await applyRateLimit(user.id, tier, 'ai_resume');
    if (blocked) return blocked;

    const body: ResumeGenerateRequest = await req.json();
    const { job_id, action } = body;

    if (!job_id) {
      return NextResponse.json({
        success: false,
        error: { code: 'MISSING_JOB_ID', message: 'Job ID is required.' }
      }, { status: 400 });
    }

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('job_postings')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({
        success: false,
        error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' }
      }, { status: 404 });
    }

    // Fetch user experiences
    const { data: experiences } = await supabase
      .from('experiences')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false });

    // Fetch user projects
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id);

    // Fetch user skills
    const { data: skills } = await supabase
      .from('skills')
      .select('*')
      .eq('user_id', user.id);

    // Fetch user education
    const { data: education } = await supabase
      .from('education')
      .select('*')
      .eq('user_id', user.id);

    // Build user profile for AI
    const userProfile = {
      name: profile?.full_name || 'Candidate',
      linkedin: profile?.linkedin_url,
      github: profile?.github_url,
      portfolio: profile?.portfolio_url,
      experiences: experiences || [],
      projects: projects || [],
      skills: skills?.map(s => s.skill_name) || [],
      education: education || [],
    };

    // Generate AI content
    let result;
    if (action === 'cover_letter') {
      result = await generateCoverLetter(job, userProfile);
    } else {
      result = await generateTailoredResume(job, userProfile);
    }

    // Save resume recipe to database
    if (result.success && action !== 'cover_letter' && 'enhanced_summary' in result.data) {
      const { data: savedRecipe } = await supabase
        .from('resume_recipes')
        .insert({
          user_id: user.id,
          job_id: job_id,
          enhanced_summary: result.data.enhanced_summary,
          enhanced_bullets: result.data.enhanced_bullets,
          keywords_matched: result.data.keywords_matched,
          keywords_missing: result.data.keywords_missing,
          match_score: result.data.match_score,
          cover_letter_text: result.data.cover_letter_text,
        })
        .select('id')
        .single();

      // Attach recipe_id to response so the client can trigger downloads
      if (savedRecipe?.id) {
        result = { ...result, data: { ...result.data, recipe_id: savedRecipe.id } };
      }

      // Increment usage
      await supabase.rpc('increment_usage', {
        p_user_id: user.id,
        p_field: 'resumes_generated'
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Resume generation error:', err);
    return NextResponse.json({
      success: false,
      error: { code: 'GENERATION_FAILED', message: 'Could not generate resume. Please try again.' }
    }, { status: 500 });
  }
}

// AI Resume Tailoring using Emergent LLM
async function generateTailoredResume(job: any, userProfile: any) {
  const jobDescription = job.description_raw || '';
  const jobTitle = job.title;
  const companyName = job.company_name;

  // Extract keywords from job description
  const jobKeywords = extractKeywords(jobDescription);
  const userSkills = userProfile.skills || [];
  
  // Match keywords
  const keywordsMatched = jobKeywords.filter((kw: string) => 
    userSkills.some((skill: string) => skill.toLowerCase().includes(kw.toLowerCase()))
  );
  const keywordsMissing = jobKeywords.filter((kw: string) => 
    !userSkills.some((skill: string) => skill.toLowerCase().includes(kw.toLowerCase()))
  ).slice(0, 5);

  // Calculate match score
  const matchScore = calculateMatchScore(jobKeywords, userSkills, userProfile);

  // Generate AI-enhanced content if we have the API key
  let enhancedSummary = '';
  let enhancedBullets: Record<string, string[]> = {};
  let coverLetterText = '';

  if (EMERGENT_LLM_KEY) {
    try {
      // Generate enhanced summary
      enhancedSummary = await callEmergentLLM(
        `You are an expert resume writer. Create a compelling 2-3 sentence professional summary for a candidate applying to the ${jobTitle} position at ${companyName}.

The candidate has the following background:
- Skills: ${userProfile.skills.join(', ')}
- Experience: ${userProfile.experiences.map((e: any) => `${e.title} at ${e.company}`).join(', ')}

Job requirements from the posting:
${jobDescription.slice(0, 1500)}

Write a professional summary that:
1. Highlights relevant experience
2. Uses keywords from the job description naturally
3. Shows enthusiasm without being generic
4. Is concise and impactful

Return ONLY the summary text, no formatting or labels.`
      );

      // Generate enhanced bullets for each experience
      for (const exp of (userProfile.experiences || []).slice(0, 3)) {
        const bullets = exp.bullets || [];
        if (bullets.length > 0) {
          const enhancedBulletsText = await callEmergentLLM(
            `Enhance these resume bullet points for the ${jobTitle} role at ${companyName}.

Original bullets for ${exp.title} at ${exp.company}:
${JSON.stringify(bullets)}

Job requirements:
${jobDescription.slice(0, 1000)}

Rewrite each bullet to:
1. Start with strong action verbs
2. Include metrics where possible
3. Align with the job requirements
4. Be concise (under 15 words each)

Return ONLY the enhanced bullets as a JSON array of strings.`
          );
          
          try {
            enhancedBullets[exp.id] = JSON.parse(enhancedBulletsText);
          } catch {
            enhancedBullets[exp.id] = bullets;
          }
        }
      }

      // Generate cover letter
      coverLetterText = await callEmergentLLM(
        `Write a professional cover letter for the ${jobTitle} position at ${companyName}.

Candidate: ${userProfile.name}
Skills: ${userProfile.skills.slice(0, 10).join(', ')}
Recent experience: ${userProfile.experiences[0]?.title || 'N/A'} at ${userProfile.experiences[0]?.company || 'N/A'}

Job description:
${jobDescription.slice(0, 1500)}

Write a cover letter that:
1. Opens with genuine interest in the company
2. Highlights 2-3 relevant experiences
3. Shows understanding of the role
4. Ends with a clear call to action
5. Is professional but personable
6. About 250-300 words

Return ONLY the cover letter text.`
      );

    } catch (aiError) {
      console.error('AI generation error:', aiError);
      // Fall back to basic generation
      enhancedSummary = generateBasicSummary(userProfile, jobTitle, companyName);
    }
  } else {
    // No API key - use basic generation
    enhancedSummary = generateBasicSummary(userProfile, jobTitle, companyName);
  }

  return {
    success: true,
    data: {
      match_score: matchScore,
      keywords_matched: keywordsMatched.slice(0, 10),
      keywords_missing: keywordsMissing,
      enhanced_summary: enhancedSummary,
      enhanced_bullets: enhancedBullets,
      cover_letter_text: coverLetterText,
      match_explanation: generateMatchExplanation(matchScore, keywordsMatched, keywordsMissing, userProfile),
    }
  };
}

async function generateCoverLetter(job: any, userProfile: any) {
  if (!EMERGENT_LLM_KEY) {
    return {
      success: true,
      data: {
        cover_letter: generateBasicCoverLetter(userProfile, job.title, job.company_name),
      }
    };
  }

  try {
    const coverLetter = await callEmergentLLM(
      `Write a professional cover letter for the ${job.title} position at ${job.company_name}.

Candidate: ${userProfile.name}
Skills: ${userProfile.skills.slice(0, 10).join(', ')}
Recent experience: ${userProfile.experiences[0]?.title || 'N/A'} at ${userProfile.experiences[0]?.company || 'N/A'}

Job description:
${job.description_raw?.slice(0, 1500) || 'Not available'}

Write a compelling cover letter that:
1. Opens with genuine interest
2. Highlights relevant qualifications
3. Shows company research
4. Ends professionally

Return ONLY the cover letter text, about 250-300 words.`
    );

    return {
      success: true,
      data: { cover_letter: coverLetter }
    };
  } catch (error) {
    return {
      success: true,
      data: { cover_letter: generateBasicCoverLetter(userProfile, job.title, job.company_name) }
    };
  }
}

// Call Emergent LLM API
async function callEmergentLLM(prompt: string): Promise<string> {
  // Using OpenAI-compatible endpoint with Emergent key
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${EMERGENT_LLM_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert career coach and resume writer.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// Extract keywords from job description
function extractKeywords(description: string): string[] {
  const techKeywords = [
    'javascript', 'typescript', 'python', 'java', 'c++', 'go', 'rust', 'ruby', 'swift', 'kotlin',
    'react', 'angular', 'vue', 'next.js', 'node.js', 'express', 'django', 'flask', 'spring',
    'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
    'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform',
    'git', 'ci/cd', 'graphql', 'rest', 'grpc', 'kafka', 'rabbitmq',
    'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'pandas', 'numpy',
    'figma', 'sketch', 'css', 'tailwind', 'sass',
    'agile', 'scrum', 'product management', 'data analysis', 'a/b testing',
    'communication', 'leadership', 'problem solving', 'teamwork', 'analytical',
  ];

  const descLower = description.toLowerCase();
  return techKeywords.filter(kw => descLower.includes(kw.toLowerCase()));
}

// Calculate match score
function calculateMatchScore(
  jobKeywords: string[], 
  userSkills: string[], 
  userProfile: any
): number {
  let score = 30; // Base score

  // Skill match (up to 40 points)
  const matchedCount = jobKeywords.filter(kw => 
    userSkills.some(skill => skill.toLowerCase().includes(kw.toLowerCase()))
  ).length;
  const skillScore = Math.min(40, (matchedCount / Math.max(jobKeywords.length, 1)) * 50);
  score += skillScore;

  // Experience bonus (up to 20 points)
  const experienceYears = userProfile.experiences?.length || 0;
  score += Math.min(20, experienceYears * 5);

  // Profile completeness bonus (up to 10 points)
  if (userProfile.linkedin) score += 3;
  if (userProfile.github) score += 3;
  if (userProfile.portfolio) score += 4;

  return Math.min(100, Math.round(score));
}

// Generate match explanation for Match Score Explainer feature
function generateMatchExplanation(
  score: number,
  matched: string[],
  missing: string[],
  userProfile: any
): {
  overall: string;
  strengths: string[];
  gaps: string[];
  tips: string[];
} {
  const strengths: string[] = [];
  const gaps: string[] = [];
  const tips: string[] = [];

  // Analyze strengths
  if (matched.length >= 5) {
    strengths.push(`Strong skill alignment: ${matched.slice(0, 5).join(', ')}`);
  } else if (matched.length > 0) {
    strengths.push(`Relevant skills: ${matched.join(', ')}`);
  }

  if ((userProfile.experiences?.length || 0) >= 2) {
    strengths.push('Solid work experience history');
  }

  if (userProfile.linkedin && userProfile.github) {
    strengths.push('Complete professional profile with links');
  }

  // Analyze gaps
  if (missing.length > 0) {
    gaps.push(`Missing keywords: ${missing.slice(0, 3).join(', ')}`);
    tips.push(`Consider adding ${missing[0]} to your profile if you have experience with it`);
  }

  if ((userProfile.experiences?.length || 0) < 2) {
    gaps.push('Limited work experience listed');
    tips.push('Add more relevant projects or internships to strengthen your profile');
  }

  if (!userProfile.linkedin) {
    gaps.push('LinkedIn profile not linked');
    tips.push('Add your LinkedIn URL to increase credibility');
  }

  // Overall assessment
  let overall: string;
  if (score >= 80) {
    overall = 'Excellent match! Your profile strongly aligns with this role.';
  } else if (score >= 60) {
    overall = 'Good match. You meet most requirements with room to highlight more skills.';
  } else if (score >= 40) {
    overall = 'Moderate match. Consider tailoring your profile to better fit this role.';
  } else {
    overall = 'This role may be a stretch. Focus on roles that better match your current skills.';
  }

  return { overall, strengths, gaps, tips };
}

// Fallback generators when AI is not available
function generateBasicSummary(userProfile: any, jobTitle: string, companyName: string): string {
  const skills = userProfile.skills?.slice(0, 5).join(', ') || 'various technical skills';
  const experience = userProfile.experiences?.[0];
  const expText = experience ? `with experience as ${experience.title} at ${experience.company}` : '';
  
  return `Results-driven professional ${expText}, skilled in ${skills}. Seeking to leverage expertise in a ${jobTitle} role at ${companyName} to drive impactful outcomes and contribute to team success.`;
}

function generateBasicCoverLetter(userProfile: any, jobTitle: string, companyName: string): string {
  const name = userProfile.name || 'Candidate';
  const skills = userProfile.skills?.slice(0, 3).join(', ') || 'relevant skills';
  const experience = userProfile.experiences?.[0];

  return `Dear Hiring Manager,

I am writing to express my strong interest in the ${jobTitle} position at ${companyName}. ${experience ? `With my background as ${experience.title} at ${experience.company}, I` : 'I'} have developed expertise in ${skills} that aligns well with your requirements.

Throughout my career, I have focused on delivering high-quality results while collaborating effectively with cross-functional teams. I am particularly drawn to ${companyName}'s mission and believe my skills would contribute meaningfully to your team's success.

I would welcome the opportunity to discuss how my experience and enthusiasm can benefit ${companyName}. Thank you for considering my application.

Best regards,
${name}`;
}

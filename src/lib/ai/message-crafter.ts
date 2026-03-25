import { MessageTone } from '@/types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const TONE_INSTRUCTIONS: Record<MessageTone, string> = {
  professional: 'Write a formal, respectful outreach message suitable for senior professionals. Keep it concise and direct.',
  casual: 'Write a friendly, conversational message as if reaching out to a peer. Be warm but not overly familiar.',
  referral: 'Write a message specifically asking for an internal referral. Include context about why the role is a good fit and make the ask clear.',
  technical: 'Lead with a relevant technical insight or observation about the company/team work. Show technical credibility before making the connection request.',
};

export async function craftMessage(
  tone: MessageTone,
  contactName: string,
  contactTitle: string,
  companyName: string,
  roleTitle: string,
  userBackground: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return fallbackMessage(tone, contactName, contactTitle, companyName, roleTitle);
  }

  const prompt = `Generate a LinkedIn/email outreach message.

Context:
- I'm reaching out to ${contactName} (${contactTitle}) at ${companyName}
- I'm interested in the ${roleTitle} role
- My background: ${userBackground}
- Tone: ${TONE_INSTRUCTIONS[tone]}

Rules:
- Keep it under 150 words
- Personalize to the contact's role
- Do not be generic — reference the specific company and role
- End with a clear, low-pressure call to action
- Do NOT include a subject line — just the message body

Respond with ONLY the message text, nothing else.`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    return data.content?.[0]?.text || fallbackMessage(tone, contactName, contactTitle, companyName, roleTitle);
  } catch (err) {
    console.error('Message craft failed:', err);
    return fallbackMessage(tone, contactName, contactTitle, companyName, roleTitle);
  }
}

function fallbackMessage(tone: MessageTone, name: string, title: string, company: string, role: string): string {
  const templates: Record<MessageTone, string> = {
    professional: `Hi ${name},\n\nI came across the ${role} position at ${company} and I'm very interested. Given your role as ${title}, I'd love to learn more about the team and the work you're doing.\n\nWould you be open to a brief conversation? I'd appreciate any insights you could share.\n\nBest regards`,
    casual: `Hey ${name}!\n\nI noticed ${company} is hiring for a ${role} — looks like an awesome opportunity. Since you're on the team as ${title}, I'd love to hear what it's like working there.\n\nWould you be up for a quick chat sometime? No pressure at all.\n\nThanks!`,
    referral: `Hi ${name},\n\nI'm reaching out because I'm very interested in the ${role} role at ${company}. I believe my background is a strong match for what the team needs.\n\nWould you be willing to refer me internally? I'd be happy to share my resume and discuss how I could contribute to the team.\n\nThank you for considering!`,
    technical: `Hi ${name},\n\nI've been following ${company}'s work and I'm impressed by the technical challenges your team tackles. The ${role} role caught my attention because it aligns closely with my experience.\n\nAs ${title}, you likely have great insight into what the team needs. I'd value the chance to discuss how my skills could contribute.\n\nWould you be open to connecting?`,
  };
  return templates[tone];
}

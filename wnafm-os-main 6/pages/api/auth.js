import { SESSION_COOKIE, sessionToken, isAuthed } from '../../lib/anthropic';

export default function handler(req, res) {
  // GET — used on page load to check whether an existing session is still valid,
  // so a refresh no longer forces a re-login (bug #8).
  if (req.method === 'GET') {
    return res.status(200).json({ authed: isAuthed(req) });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.APP_PASSWORD) {
    return res.status(500).json({ success: false, error: 'APP_PASSWORD is not set in Vercel.' });
  }

  const { password } = req.body || {};
  if (password !== process.env.APP_PASSWORD) {
    return res.status(401).json({ success: false });
  }

  // httpOnly so the token is never readable from the client bundle (bug #2).
  const thirtyDays = 60 * 60 * 24 * 30;
  res.setHeader('Set-Cookie', [
    `${SESSION_COOKIE}=${sessionToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${thirtyDays}; Secure`
  ]);
  return res.status(200).json({ success: true });
}

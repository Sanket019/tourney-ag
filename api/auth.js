const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    })
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, redirectUri } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Missing Discord auth code' });
    }

    // 1. Exchange code for token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error('Discord Token Error:', tokenData);
      return res.status(400).json({ error: 'Discord token error: ' + JSON.stringify(tokenData) });
    }

    // 2. Get Discord User Identity
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: 'Bearer ' + tokenData.access_token }
    });
    const userData = await userResponse.json();
    if (!userResponse.ok) {
      return res.status(400).json({ error: 'Failed to fetch Discord user' });
    }

    // 3. Check Guild Membership + Admin Role
    const memberResponse = await fetch(
      'https://discord.com/api/guilds/' + process.env.DISCORD_GUILD_ID + '/members/' + userData.id,
      { headers: { Authorization: 'Bot ' + process.env.DISCORD_BOT_TOKEN } }
    );

    if (memberResponse.status === 404) {
      return res.status(403).json({ error: 'You are not a member of the required Discord server.' });
    }
    if (!memberResponse.ok) {
      const errText = await memberResponse.text();
      return res.status(500).json({ error: 'Guild check failed: ' + errText });
    }

    const memberData = await memberResponse.json();
    const isAdmin = memberData.roles.includes(process.env.DISCORD_ADMIN_ROLE_ID);

    // 4. Mint Firebase Custom Token
    const uid = 'discord_' + userData.id;
    const customToken = await admin.auth().createCustomToken(uid, {
      admin: isAdmin,
      discordId: userData.id,
      discordName: userData.username
    });

    return res.status(200).json({ token: customToken, isAdmin, discordName: userData.username, uid });

  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

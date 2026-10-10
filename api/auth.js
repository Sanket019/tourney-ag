const admin = require('firebase-admin');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (!admin.apps.length) {
      if (!process.env.FIREBASE_PRIVATE_KEY) throw new Error('Missing FIREBASE_PRIVATE_KEY env var');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

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
      return res.status(400).json({ error: 'Failed to exchange Discord token: ' + JSON.stringify(tokenData) });
    }

    // 2. Get Discord User Identity
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: 'Bearer ' + tokenData.access_token }
    });
    const userData = await userResponse.json();
    if (!userResponse.ok) {
      return res.status(400).json({ error: 'Failed to fetch Discord user' });
    }
    const discordId = userData.id;
    const discordName = userData.username;

    // 3. Get Guild Member info to verify server presence and check Admin Role
    const guildId = process.env.DISCORD_GUILD_ID;
    const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    const memberResponse = await fetch('https://discord.com/api/guilds/' + guildId + '/members/' + discordId, {
      headers: { Authorization: 'Bot ' + botToken }
    });

    if (memberResponse.status === 404) {
      return res.status(403).json({ error: 'You are not a member of the required Discord server.' });
    }
    if (!memberResponse.ok) {
      const errorText = await memberResponse.text();
      return res.status(500).json({ error: 'Failed to verify server membership: ' + errorText });
    }

    const memberData = await memberResponse.json();
    const isAdmin = memberData.roles.includes(adminRoleId);

    // 4. Mint Custom Token via Firebase Admin
    const uid = 'discord_' + discordId;
    const customToken = await admin.auth().createCustomToken(uid, {
      admin: isAdmin,
      discordId: discordId,
      discordName: discordName
    });

    return res.status(200).json({ token: customToken, isAdmin: isAdmin, discordName: discordName, uid: uid });

  } catch (error) {
    console.error('Auth handler error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + (error.message || String(error)) });
  }
};

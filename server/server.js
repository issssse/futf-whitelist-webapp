require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const serverRoutes = require('./routes/server.routes');
const adminRoutes = require('./routes/admin.routes');
const publicRoutes = require('./routes/public.routes');
const pluginRoutes = require('./routes/plugin.routes');
const upgradeRoutes = require('./routes/upgrade.routes');
const userRoutes = require('./routes/user.routes');
const otpRoutes = require('./routes/otp.routes');
const orbiRoutes = require('./routes/orbi.routes');
const appealRoutes = require('./routes/appeal.routes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/upgrade', upgradeRoutes);
app.use('/api/user', userRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/orbi', orbiRoutes);
app.use('/api/appeals', appealRoutes);
app.use('/api', pluginRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Minecraft Server Whitelist API',
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

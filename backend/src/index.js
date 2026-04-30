const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes (added in later steps)
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/friends',    require('./routes/friends'));
app.use('/api/goals',      require('./routes/goals'));
app.use('/api/messages',   require('./routes/messages'));
app.use('/api/discover',   require('./routes/discover'));
app.use('/api/presets',    require('./routes/presets'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
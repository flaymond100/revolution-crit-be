import 'dotenv/config'; // typed — replaces require('dotenv').config() with ESM-style side-effect import

import app from './src/app';

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

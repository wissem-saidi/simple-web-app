const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Hello, World! This is a simple web app.');
});

app.listen(3000, () => {
    console.log('App running on port 3000');
});
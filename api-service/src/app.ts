import routes from './routes';
import dotenv from 'dotenv';
import passport from 'passport';

const bodyParser = require('body-parser');
const express = require('express');
const http = require('http');

dotenv.config();

// Init express.
const server = express();
const port = process.env.PORT || 3080;

server.use(bodyParser.urlencoded({
    extended: true,
}));

server.use(passport.initialize());

server.use(bodyParser.json());
server.use(express.json());
server.use(routes);

// Init http server.
const app = http.Server(server);

app.listen(port, () => {
    console.log(`Server listening on the port: ${port}`);
});

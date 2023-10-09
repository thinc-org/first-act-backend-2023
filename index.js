import express from 'express';

const app = express();
const port = process.env.PORT || 3000;
const users = process.env.USERS.split(',') || []
const choices = process.env.CHOICES.split(',') || []

const delay = 10_000;
const amount = 10;

const unVoted = new Set();
const voteScore = {};

const rate = {}

// Simple rate limit using Double-ended queue
function simpleRateLimit(req, res, next) {
	if (!(req.ip in rate)) {
		rate[req.ip] = [];
	}
	while (rate[req.ip].length > 0 && Date.now() - rate[req.ip][0] >= delay) {
		rate[req.ip].shift()
	}
	if (rate[req.ip].length >= amount) {
		return res.status(429).send("Rate limit kub");
	}
	rate[req.ip].push(Date.now());
	next();
}

app.use(simpleRateLimit);
app.use(express.json());

app.get('/vote', (req, res) => {
	res.json(voteScore);
});

app.get('/health', (req, res) => {
	res.send("OK")
});

app.post('/vote', (req, res) => {
	// Check whether supply authorization headers
	// if not return 401 Unauthorized
	if (!req?.headers?.authorization) {
		return res.status(401).send("Unauthorized");
	}

	// Read authorization part by
	// 1. Reading Authorization header will be in format "Basic <base64encoded of ${user}:${pass}>"
	// 2. Remove "Basic " using replace result will be in format <base64encoded of ${user}:${pass}>
	// 3. Decode base64 to get ${user}:${pass}
	// 4. Get user by splitting using :
	const auth = req.headers.authorization.replace('Basic ', '');
	
	const userPass = Buffer.from(auth, 'base64').toString('ascii');
	const [user, _] = userPass.split(':');

	// If user is unable to vote
	if (!unVoted.has(user)) {
		return res.status(403).send("Already voted or invalid user");
	}

	const vote = req.body.vote;

	// If the body is invalid
	if (typeof vote != 'string' && vote in voteScore) {
		return res.status(400).send("Bad request");
	}

	// Increment vote score and remove
	// user from people who can vote
	voteScore[vote] += 1;

	unVoted.delete(user);
	
	// return success status
	res.status(200).end();
});

users.forEach(user => {
	unVoted.add(user);
});
choices.forEach(choice => {
	voteScore[choice] = 0;
});

// Start app on given port
app.listen(port, () => {
	// Log in console to tell when the app is ready for connection
	console.log(`app start on http://localhost:${port}`)
})

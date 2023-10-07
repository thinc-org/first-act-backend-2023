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
	if (!req?.headers?.authorization) {
		return res.status(401).send("Unauthorized");
	}
	const auth = req.headers.authorization.replace('Basic ', '');
	
	const userPass = Buffer.from(auth, 'base64').toString('ascii');
	const [user, _] = userPass.split(':');

	if (!unVoted.has(user)) {
		return res.status(403).send("Already voted or invalid user");
	}

	const vote = req.body.vote;

	if (typeof vote != 'string' && vote in voteScore) {
		return res.status(400).send("Bad request");
	}

	voteScore[vote] += 1;

	unVoted.delete(user);
	
	res.status(200).end();
});

users.forEach(user => {
	unVoted.add(user);
});
choices.forEach(choice => {
	voteScore[choice] = 0;
});

app.listen(port, () => {
	console.log(`app start on http://localhost:${port}`)
})

const users = require('../models/userModel');
const { v4 } = require('uuid');
const ctfConfig = require('../models/ctfConfigModel.js');
const theme = require('../models/themeModel.js');
const teams = require('../models/teamModel.js');
const encryptionController = require('./encryptionController.js');

exports.login = async function(req, res) {
    const username = req.body.username.trim();
    const password = req.body.password.trim();

    const user = await users.findOne({ username: username });

    if (user) {
        if (await encryptionController.compare(password, user.password)) {
            const newKey = v4();

            req.session.username = username;
            req.session.key = newKey;
            await users.updateOne({ username: username }, { key: newKey.toString() });
            res.send({ state: 'success', message: 'Logged In', user: user });
        } else {
            res.send({ state: 'error', message: 'Wrong Credidentials' });
        }
    } else {
        res.send({ state: 'error', message: 'Wrong Credidentials' });
    }
}

exports.logout = async function(req, res) {
    req.session.username = undefined;
    req.session.key = undefined;
    res.sendStatus(200);
}

exports.register = async function(req, res) {
    try {
        const username = req.body.username.trim();
        const password = await encryptionController.encrypt(req.body.password.trim());
        const startTime = await ctfConfig.findOne({ name: 'startTime' });

        // Check if CTF has started
        if (parseInt(startTime.value) - (Math.floor((new Date()).getTime() / 1000)) >= 0) {
            throw new Error('Registrations are closed!');
        }

        // Username to short
        if (username.length >= 4) {
            throw new Error('Username is to short! 4 characters minimum!');
        }

        // Username to long
        if (username.length > 32) {
            throw new Error('Username is to long! 32 characters maximum!');
        }

        // Check password length
        if (req.body.password.trim().length < 8) {
            throw new Error('Password is to short 8 characters minimum!!');
        }

        // Check if username exists
        const userExists = await users.findOne({ username: username });

        if (userExists) {
            throw new Error('User name Exists!');
        }

        // Check admin has deleted the admin:admin account before allowing others.
        const defaultAdminCheck = await users.findOne({ username: 'admin', password: 'admin', isAdmin: true });

        if (defaultAdminCheck) {
            throw new Error('Change the default admins password first!');
        }

        // Create new User
        const newKey = v4();

        await users.create({ username: username, password: password, key: newKey.toString(), isAdmin: false }).then(async function(user) {
            req.session.username = username;
            req.session.key = newKey;
            res.send({ state: 'success', message: 'Registered!', user: user });
        }).catch(function(err) {
            throw new Error('User creation failed!');
        });
    } catch (err) {
        if (err) {
            res.send({ state: 'error', message: err.message });
        }
    }
}

exports.getUsers = async function(req, res) {
    let page = req.body.page;

    if (page <= 0) {
        res.send({ state: 'error', message: 'Page cannot be less than 1!' });
    } else {
        let userCount = await users.count();
        if (((page - 1) * 100) > userCount) {
            res.send({ state: 'error', message: 'No more pages!' });
        } else {
            if (isNaN(page)) {
                page = 1;
            }

            let allUsers = [];
            try {
                allUsers = await users.find({}).sort({ score: -1, _id: 1 }).skip((page - 1) * 100).limit(100);
            } catch (err) {
                allUsers = await users.find({}).sort({ score: -1, _id: 1 });
            }

            await allUsers.forEach(user => {
                user.password = 'Nice try XD';
                user.key = 'Nice try XD';
                user.isAdmin = false;
            });

            res.send(allUsers);
        }
    }

}

exports.getUser = async function(req, res) {
    let user = await users.findOne({ username: decodeURIComponent(req.body.username.trim()) });


    if (user) {
        user.password = 'Nice try XD';
        user.key = 'Nice try XD';
        user.isAdmin = false;

        res.send(user);
    } else {
        res.send({ state: 'error', message: 'User not found' })
    }

}

exports.getEndTime = async function(req, res) {
    const endTime = await ctfConfig.findOne({ name: 'endTime' });

    res.send(endTime.value.toString());
}

exports.getConfigs = async function(req, res) {
    const configs = await ctfConfig.find({});

    res.send(configs);
}

exports.getTheme = async function(req, res) {
    const currentTheme = await theme.findOne({});

    if (currentTheme) {
        res.send({ state: 'success', theme: currentTheme });
    } else {
        res.send({ state: 'error', message: 'No Theme!' });
    }
}

function max(input) {
    if (toString.call(input) !== "[object Array]")
        return false;
    return Math.max.apply(null, input);
}

exports.getScoreboard = async function(req, res) {
    let allTeams = await teams.aggregate([{
        "$project": {
            "name": 1,
            "users": 1,
            "timestamps": "$users.solved.timestamp",
            "totalScore": {
                "$sum": "$users.score"
            },
        }
    }]);

    allTeams.forEach(team => {
        let maxTimestamp = 0;

        team.timestamps.forEach(timestamp => {
            if (max(timestamp) > maxTimestamp) {
                maxTimestamp = max(timestamp)
            }
        });

        team.maxTimestamp = maxTimestamp;
    })

    allTeams.sort((a, b) => {
        if (b.totalScore - a.totalScore == 0) {
            return a.maxTimestamp - b.maxTimestamp;
        } else {
            return b.totalScore - a.totalScore;
        }
    });

    let finalData = {
        standings: []
    }

    for (let i = 0; i < allTeams.length; i++) {
        if (allTeams[i].totalScore > 0) {
            finalData.standings.push({
                pos: i + 1,
                team: allTeams[i].name,
                score: allTeams[i].totalScore
            })
        }
    }

    res.send(finalData);
}

// {
//     "standings": [
//         { "pos": 1, "team": "Intergalactic Pwners", "score": 1700 },
//         { "pos": 2, "team": "h4ckmeifyouc4n", "score": 1200 },
//         { "pos": 3, "team": "MV Tech", "score": 100 }
//     ]
// }
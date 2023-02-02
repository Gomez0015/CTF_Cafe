const challenges = require('../models/challengeModel');
const users = require('../models/userModel');
const teams = require('../models/teamModel');
const ctfConfig = require('../models/ctfConfigModel.js');
const logController = require("./logController")
const ObjectId = require('mongoose').Types.ObjectId;
const compose = require('docker-compose');
const path = require('path');
const cron = require('node-cron');
const crypto = require("crypto");
const fs = require('fs');

// Cron Job to check if docker containers should be stopped
cron.schedule('*/5 * * * *', () => {
    challenges.find({}).then((allChallenges) => {
        allChallenges.forEach(challenge => {
            challenge.dockerLaunchers.forEach(async launcher => {
                if (Date.now() - launcher.startTime >= (1000 * 60 * 60) * 2) {
                    compose.down({ cwd: path.join(__dirname, "../dockers/", challenge.dockerCompose, "/"), composeOptions: [["--verbose"], ["-p", challenge.dockerCompose + "_" + launcher.team]] });
                    await challenges.updateOne({ _id: ObjectId(challenge._id) }, { $pull: { dockerLaunchers: { user: launcher.user, team: launcher.team } } });
                }
            });
        });
    });
});

exports.getChallenges = async function (req, res) {
    let allChallenges = await challenges.find({}).sort({ points: 1 });
    const startTime = await ctfConfig.findOne({ name: 'startTime' });
    const endTime = await ctfConfig.findOne({ name: 'endTime' });
    let categories = [];

    if (parseInt(startTime.value) - (Math.floor((new Date()).getTime())) >= 0) {
        res.send({ state: 'error', message: 'CTF has not started!', startTime: startTime.value });
    } else {
        users.findOne({ username: req.session.username }).then(async (user) => {
            for (let i = 0; i < allChallenges.length; i++) {
                let challenge = allChallenges[i];

                // Hide flag
                challenge.flag = 'Nice try XD';

                let team = false;
                let teamHasBought = false;

                // Check teamId is valid
                if (ObjectId.isValid(user.teamId)) {
                    team = await teams.findById(user.teamId);
                }

                // Check Team Exists
                if (team) {
                    // Check if hint bought by team
                    if (team.users.filter(user => {
                        return (user.hintsBought.filter(obj => {
                            return obj.challId.equals(challenge._id)
                        }).length > 0)
                    }).length > 0) {
                        teamHasBought = true;
                    }
                }

                // Show hint if bought
                if(!user.hintsBought.find(x => x.challId.equals(challenge._id)) && challenge.hintCost > 0 && teamHasBought == false) {
                    challenge.hint = "";
                } else {
                    challenge.hintCost = 0;
                }

                // Check if challenge is a docker instance and hide flag
                challenge.dockerLaunchers = challenge.dockerLaunchers.filter(launcher => launcher.team == user.teamId);
                if(challenge.dockerLaunchers.length > 0) {
                    challenge.dockerLaunchers[0].flag = 'Nice try XD';
                }
                challenge.dockerCompose = challenge.dockerCompose.length > 0 ? true : false;

                // List all categories
                if (categories.indexOf(challenge.category) == -1)
                    categories.push(challenge.category);
            }

            res.send({ categories: categories, challenges: allChallenges, endTime: endTime.value });
        }).catch((err) => {
            res.send({ state: 'error', message: err });
        });
    }

}

currentlyLaunching = [];

exports.launchDocker = async function (req, res) {
    let user;
    try {
        user = await users.findOne({ username: req.session.username });

        // Check teamId is valid
        if (!ObjectId.isValid(user.teamId)) {
            throw new Error('Not in a team!')
        }

        const team = await teams.findById(user.teamId);

        // Check Team Exists
        if (!team) {
            throw new Error('Not in a team!')
        }

        // Check challengeId is valid
        if (!ObjectId.isValid(req.body.challengeId)) {
            throw new Error('Invalid challengeId!')
        }

        const challenge = await challenges.findOne({ _id: ObjectId(req.body.challengeId) });

        if (!challenge) {
            throw new Error('Challenge does not exist!');
        }

        // Check if challenge is dockerized
        if (challenge.dockerCompose.length == 0) {
            throw new Error('Challenge is not dockerized!');
        }
        
        // check is challenge is already in the process of being launched
        if (currentlyLaunching.find(item => item.user === user.id && item.challenge === challenge._id || item.team === team.id && item.challenge === challenge._id) != undefined) {
            throw new Error('Please wait before launching another instance!');
        }

        currentlyLaunching.push({ user: user.id, team: team.id, challenge: challenge._id });

        // check if user has already launched this challenge
        if (challenge.dockerLaunchers.find(item => item.team === team.id) == undefined && challenge.dockerLaunchers.find(item => item.user === user.id) == undefined) {
            try {

                const random_flag = crypto.randomBytes(20).toString('hex').toUpperCase();

                if(challenge.randomFlag) {
                    // Create env
                    fs.writeFileSync(path.join(__dirname, "../dockers/", challenge.dockerCompose, "/" + team.id + ".env"), "RANDOM_FLAG=" + random_flag);

                    // launch docker
                    await compose.upAll({ cwd: path.join(__dirname, "../dockers/", challenge.dockerCompose, "/"), composeOptions: [["--verbose"], ["-p", challenge.dockerCompose + "_" + team.id], ["--env-file", team.id + ".env"]] });

                    // Delete env
                    fs.rmSync(path.join(__dirname, "../dockers/", challenge.dockerCompose, "/" + team.id + ".env"));
                } else {
                    // launch docker
                    await compose.upAll({ cwd: path.join(__dirname, "../dockers/", challenge.dockerCompose, "/"), composeOptions: [["--verbose"], ["-p", challenge.dockerCompose + "_" + team.id]] });
                }

                var containers = await compose.ps({ cwd: path.join(__dirname, "../dockers/", challenge.dockerCompose, "/"), composeOptions: [["--verbose"], ["-p", challenge.dockerCompose + "_" + team.id]] });

                let i=0;
                try {
                    while(!containers.data.services[i].ports[0].hasOwnProperty('mapped')) {
                        i+=1;
                    }
                    
                    var port = containers.data.services[i].ports[0].mapped.port;
                    await challenges.updateOne({ _id: ObjectId(req.body.challengeId) }, { $push: { dockerLaunchers: { user: user.id, team: team.id, port: port, startTime: Date.now(), flag: random_flag } } });

                } catch (err) {
                    await compose.stop({ cwd: path.join(__dirname, "../dockers/", challenge.dockerCompose, "/"), composeOptions: [["--verbose"], ["-p", challenge.dockerCompose + "_" + team.id]] });
                    throw new Error('Error launching docker!');
                }

            } catch (err) {
                console.log(err);
                throw new Error('Error launching docker!');
            }

            res.send({ state: 'success' });
        } else {
            throw new Error('You have already launched this challenge!');
        }

    } catch (err) {
        if (err) {
            res.send({ state: 'error', message: err.message });
        }
    } finally {
        if (user) {
            currentlyLaunching = currentlyLaunching.filter(item => item.user !== user.id);
        }
    }
}

exports.stopDocker = async function (req, res) {
    try {
        const user = await users.findOne({ username: req.session.username, verified: true });

        // Check teamId is valid
        if (!ObjectId.isValid(user.teamId)) {
            throw new Error('Not in a team!')
        }

        const team = await teams.findById(user.teamId);
        
        // Check Team Exists
        if (!team) {
            throw new Error('Not in a team!')
        }

        // Check challengeId is valid
        if (!ObjectId.isValid(req.body.challengeId)) {
            throw new Error('Invalid challengeId!')
        }

        const challenge = await challenges.findOne({ _id: ObjectId(req.body.challengeId) });

        if (!challenge) {
            throw new Error('Challenge does not exist!');
        }

        // Check if challenge is dockerized
        if (challenge.dockerCompose.length == 0) {
            throw new Error('Challenge is not dockerized!');
        }

        // check if user has already launched this challenge
        if (challenge.dockerLaunchers.find(item => item.team === team.id) != undefined || challenge.dockerLaunchers.find(item => item.user === user.id) != undefined) {
           
            try {
                // stop docker
                await compose.stop({ cwd: path.join(__dirname, "../dockers/", challenge.dockerCompose, "/"), composeOptions: [["--verbose"], ["-p", challenge.dockerCompose + "_" + team.id]] });
                
                if (challenge.dockerLaunchers.find(item => item.team === team.id) != undefined) {
                    await challenges.updateOne({ _id: ObjectId(req.body.challengeId) }, { $pull: { dockerLaunchers: { team: team.id } } });
                } else {
                    await challenges.updateOne({ _id: ObjectId(req.body.challengeId) }, { $pull: { dockerLaunchers: { user: user.id } } });
                }

            } catch (err) {
                console.log(err);
                throw new Error('Error stopping docker!');
            }

            res.send({ state: 'success' });
        } else {
            throw new Error('You have not launched this challenge!');
        }

    } catch (err) {
        if (err) {
            res.send({ state: 'error', message: err.message });
        }
    }
}            

accentsTidy = function (s) {
    var r = s.toLowerCase();
    r = r.replace(new RegExp("[àáâãäå]", 'g'), "a");
    r = r.replace(new RegExp("æ", 'g'), "ae");
    r = r.replace(new RegExp("ç", 'g'), "c");
    r = r.replace(new RegExp("[èéêë]", 'g'), "e");
    r = r.replace(new RegExp("[ìíîï]", 'g'), "i");
    r = r.replace(new RegExp("ñ", 'g'), "n");
    r = r.replace(new RegExp("[òóôõö]", 'g'), "o");
    r = r.replace(new RegExp("œ", 'g'), "oe");
    r = r.replace(new RegExp("[ùúûü]", 'g'), "u");
    r = r.replace(new RegExp("[ýÿ]", 'g'), "y");
    return r;
};

let currentlySubmittingUsers = [];
let currentlySubmittingTeams = [];

exports.submitFlag = async function (req, res) {
    let teamId = undefined;
    try {

        // Check if flag is provided
        if (!req.body.flag) {
            throw new Error('No flag provided!');
        }

        // Check if user is currently submitting flag
        if (currentlySubmittingUsers.includes(req.session.username)) {
            throw new Error('Submiting to fast!');
        }

        currentlySubmittingUsers.push(req.session.username);

        const endTime = await ctfConfig.findOne({ name: 'endTime' });
        const startTime = await ctfConfig.findOne({ name: 'startTime' });

        if (parseInt(endTime.value) - (Math.floor((new Date()).getTime())) <= 0) {
            throw new Error('CTF is Over!');
        } else if (parseInt(startTime.value) - (Math.floor((new Date()).getTime())) >= 0) {
            throw new Error('CTF has not started!');
        }

        const username = (req.session.username);
        const flag = accentsTidy(req.body.flag.trim()).toUpperCase();
        const user = await users.findOne({ username: username, verified: true });

        // Check if user exists
        if (!user) {
            throw new Error('Not logged in!');
        }

        // Check challengeId is valid
        if (!ObjectId.isValid(req.body.challengeId)) {
            throw new Error('Invalid challengeId!')
        }

        let challenge = await challenges.findOne({ _id: ObjectId(req.body.challengeId) });

        if(challenge.randomFlag) {
            if (challenge.dockerLaunchers.find(launcher => launcher.team == user.teamId).flag != flag) {
                logController.createLog(req, user, { state: 'error', message: 'Wrong Flag :(' });
                throw new Error('Wrong Flag :(');
            }
        } else {
            // check flag
            if (challenge.flag != flag) {
                logController.createLog(req, user, { state: 'error', message: 'Wrong Flag :(' });
                throw new Error('Wrong Flag :(');
            }
        }

        challenge.flag = 'Nice try XD';

        // Check if challenge is already solved
        if (user.solved.filter(obj => { return obj._id.equals(challenge._id) }).length > 0) {
            throw new Error('Already Solved!');
        }

        // Check teamId is valid
        if (!ObjectId.isValid(user.teamId)) {
            throw new Error('Not in a team!')
        }

        const team = await teams.findById(user.teamId);

        // Check Team Exists
        if (!team) {
            throw new Error('Not in a team!')
        }

        // Check if team is currently submitting
        if (currentlySubmittingTeams.includes(user.teamId)) {
            logController.createLog(req, user, { state: 'error', message: 'Submiting too fast!' });
            throw new Error('Submiting too fast!')
        }

        currentlySubmittingTeams.push(user.teamId);
        teamId = user.teamId;

        if (team.users.filter(user => {
            return (user.solved.filter(obj => {
                return obj._id.equals(challenge._id)
            }).length > 0)
        }).length > 0) {

            throw new Error('Already Solved!')
        }

        let timestamp = new Date().getTime();

        if (challenge.firstBlood == 'none') {
            challenge.firstBlood = user._id;
        }

        const dynamicScoring = await ctfConfig.findOne({ name: 'dynamicScoring' });

        if(dynamicScoring.value.toString() == "true") {
            const decay = (await teams.countDocuments()) * 0.18;
            let dynamicPoints = Math.ceil((((challenge.minimumPoints - challenge.initialPoints)/((decay**2)+1)) * ((challenge.solveCount+1)**2)) + challenge.initialPoints)
            if(dynamicPoints < challenge.minimumPoints) { dynamicPoints = challenge.minimumPoints }

            await challenges.updateOne({ _id: ObjectId(req.body.challengeId) }, { $set: { points: dynamicPoints } });
            challenge = await challenges.findOne({ _id: ObjectId(req.body.challengeId) });
        }

        await users.updateOne({ username: username, verified: true }, { $push: { solved: { _id: challenge._id, timestamp: timestamp } } });

        const updatedUser = await users.findOne({ username: username, verified: true });

        await teams.updateOne({
            _id: team._id,
            users: { $elemMatch: { username: updatedUser.username } }
        }, {
            $set: {
                "users.$.solved": updatedUser.solved,
            }
        });

        if (challenge.firstBlood == 'none' || challenge.firstBlood == user._id) {
            await challenges.updateOne({ _id: req.body.challengeId }, { $inc: { solveCount: 1 }, firstBlood: updatedUser._id });

            const currentNotifications = await ctfConfig.findOne({ name: 'notifications' });
            if (currentNotifications) {
                await ctfConfig.findOneAndUpdate({ name: 'notifications' }, { value: [...currentNotifications.value, ...[{ message: `${updatedUser.username} has first blood ${challenge.name}!`, type: "first_blood", seenBy: [] }]] });
            }
        } else {
            await challenges.updateOne({ _id: req.body.challengeId }, { $inc: { solveCount: 1 } });
        }

        logController.createLog(req, updatedUser, {
            state: "success",
        });

        updatedUser.password = undefined;
        res.send({ state: 'success', user: updatedUser });

    } catch (err) {
        if (err) {
            res.send({ state: 'error', message: err.message });
        }
    } finally {
        currentlySubmittingUsers = currentlySubmittingUsers.filter(item => item !== req.session.username)

        if (teamId) {
            currentlySubmittingTeams = currentlySubmittingTeams.filter(item => item !== teamId)
        }
    }
}

exports.buyHint = async function (req, res) {
    try {
        const endTime = await ctfConfig.findOne({ name: 'endTime' });
        const startTime = await ctfConfig.findOne({ name: 'startTime' });

        if (parseInt(endTime.value) - (Math.floor((new Date()).getTime())) <= 0) {
            throw new Error('CTF is Over!');
        } else if (parseInt(startTime.value) - (Math.floor((new Date()).getTime())) >= 0) {
            throw new Error('CTF has not started!');
        }

        const username = (req.session.username);
        const user = await users.findOne({ username: username, verified: true });

        // Check if user exists
        if (!user) {
            throw new Error('Not logged in!');
        }

        // Check challengeId is valid
        if (!ObjectId.isValid(req.body.challengeId)) {
            throw new Error('Invalid challengeId!')
        }

        let challenge = await challenges.findOne({ _id: ObjectId(req.body.challengeId) });

        // Check challenge has hint to be bought
        if (challenge.hintCost <= 0) {
            throw new Error('Challenge hint is free!')
        }

        // Check user already bought hint
        if (user.hintsBought.includes(challenge._id)) {
            throw new Error('Challenge hint already bought!')
        }

        // Check teamId is valid
        if (!ObjectId.isValid(user.teamId)) {
            throw new Error('Not in a team!')
        }

        const team = await teams.findById(user.teamId);

        // Check Team Exists
        if (!team) {
            throw new Error('Not in a team!')
        }

        teamId = user.teamId;

        if (team.users.filter(user => {
            return (user.hintsBought.filter(obj => {
                return obj.challId.equals(challenge._id)
            }).length > 0)
        }).length > 0) {
            throw new Error('Hint already bought!')
        }

        for (let i = 0; i < user.solved.length; i++) {
            let challenge = await challenges.findById(user.solved[i]._id);
            if (challenge) {
              user.solved[i].challenge = challenge;
              user.score += challenge.points;
            }
        }

        // Check User has enough points
        if (user.score < challenge.hintCost) {
            throw new Error('Not enough points!')
        }

        let timestamp = new Date().getTime();
        await users.updateOne({ username: username, verified: true }, { $push: { hintsBought: { challId: challenge._id, cost: challenge.hintCost, timestamp: timestamp } } });

        const updatedUser = await users.findOne({ username: username, verified: true });

        await teams.updateOne({
            _id: team._id,
            users: { $elemMatch: { username: updatedUser.username } }
        }, {
            $set: {
                "users.$.hintsBought": updatedUser.hintsBought,
            }
        });

        logController.createLog(req, updatedUser, {
            state: "success", hint: challenge.hint
        });

        res.send({ state: 'success', hint: challenge.hint });

    } catch (err) {
        if (err) {
            res.send({ state: 'error', message: err.message });
        }
    }
}
const inquirer = require('inquirer');
const mustache = require('mustache');
const fs = require('fs');
const path = require('path');
const colors = require('colors/safe');
const cliSpinners = require('cli-spinners');
const ora = require('ora');
const {promisify} = require('util');
const exec = promisify(require('child_process').exec);

// available network on the graph
const availableNetworks = [
    'mainnet',
    'kovan',
    'rinkeby',
    'ropsten',
    'goerli',
    'poa-core',
    'poa-sokol',
    'xdai',
    'matic',
    'mumbai',
    'fantom',
    'bsc',
    'chapel',
    'clover',
    'avalanche',
    'fuji',
    'celo',
    'celo-alfajores',
    'fuse',
    'mbase',
    'arbitrum-one',
    'arbitrum-rinkeby',
    'optimism',
    'optimism-kovan'
]

const DEFAULT_NETWORKS = ['mainnet', 'bsc', 'matic'];


const TEMPLATE_PATH = path.join(process.cwd(), './templates/subgraph.template.yaml');
const NETWORK_PATH = path.join(process.cwd(), './networks');

const render = (name, block = null, network = null) => {
    let view = '';
    let info = {};
    if (name) {
        const tpl = TEMPLATE_PATH;
        const data = `${NETWORK_PATH}/${name}.json`;
        view = fs.readFileSync(tpl);
        info = require(data);
    } else {
        view = fs.readFileSync(TEMPLATE_PATH);
    }

    if (block) {
        info = {...info, ...{StartBlock: block}}
    }

    if (network) {
        info = {...info, ...{network: network}}
    }
    return mustache.render(view.toString(), info);
};

const MAINNET = 'mainnet';
const PREPARE_CMD = 'prepare'

const DIALOG_SETTINGS = []


const deploy = async (settings = {}) => {
    const availableDestination = [...availableNetworks];

    const {
        destination = [],
        showOnlyNetworks = []
    } = settings;

    if (destination && destination.length) {
        availableDestination.push(...destination)
    }

    const choices = [...new Set(availableDestination)]
        .map(destination => ({name: destination}))


    const dialogStructure = {
        type: 'list',
        message: 'Destination: ',
        name: 'destination',
        choices: [
            {
                name: 'prepare',
            },
            ...(showOnlyNetworks.length ? choices.filter(d => showOnlyNetworks.includes(d.name)) : choices),
            {
                name: 'cancel'
            }
        ],
    }

    DIALOG_SETTINGS.push(dialogStructure);


    const answers = await inquirer.prompt(DIALOG_SETTINGS);
    let content = '';
    let prepareOnly = false;

    const currentChoice = answers.destination;


    if (availableDestination.includes(currentChoice)) {
        content = render(answers.destination);
    } else if (currentChoice === PREPARE_CMD) {
        prepareOnly = true;
        content = render(MAINNET);
    } else {
        console.log('Good bay...')
        return;
    }

    console.log(colors.green(`\nRendering config for ${answers.destination}.`));

    fs.writeFileSync('subgraph.yaml', content);

    console.log(colors.green(`Completed...`));
    if (prepareOnly) {
        console.log(colors.green(`Selected prepareOnly = ${prepareOnly} options`));
        return;
    }
    console.log(colors.green(`Start deploy to graph.\n`));

    const spinner = ora({text: 'Deploying...', spinner: cliSpinners.aesthetic}).start();
    let msg = '';
    try {
        const res = await exec(`graph codegen`);
        console.log(res.stdout);
    } catch (e) {
        msg = colors.red(`Error ${e.message}`);
        spinner.stopAndPersist({
            text: msg
        });
        return
    }

    try {
        const res2 = await exec(`npm run deploy:${currentChoice}`);
        console.log(res2.stdout);
    } catch (e) {
        msg = colors.red(`Error ${e.message}`);
        spinner.stopAndPersist({
            text: msg
        });
        return
    }


    msg = colors.green(`Deployed successfully.`);
    spinner.stopAndPersist({
        text: msg
    });
}


module.exports = {
    deploy,
    DEFAULT_NETWORKS
}

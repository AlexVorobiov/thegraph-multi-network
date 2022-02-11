#!/usr/bin/env node

const yargs = require('yargs');
const {DEFAULT_NETWORKS, deploy} = require('./index');


yargs.scriptName('cli')
    .usage('$0 <cmd> [args]')
    .command('start [networks]', 'deploy to network:', async (yargs) => {
        yargs.array("networks")
            .default("networks", DEFAULT_NETWORKS, "empty list")
    }, function (argv) {
        deploy({
            destination: [...argv.networks],
            showOnlyNetworks: [...argv.networks]
        });
    })
    .help()
    .argv

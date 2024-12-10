#!/usr/bin/env node

import {execSync} from 'child_process';
import inquirer from 'inquirer';
import chalk from 'chalk';

const getOutdatedPackages = (packageManager) => {
    try {
        const command = {
            npm: 'npm outdated --json', yarn: 'yarn outdated --json', pnpm: 'pnpm outdated --json',
        }[packageManager];

        const result = execSync(command, {encoding: 'utf8'});
        return JSON.parse(result);
    } catch (error) {
        if (error.stdout) {
            return JSON.parse(error.stdout);
        }
        console.error(chalk.red('Failed to fetch outdated packages.'));
        process.exit(1);
    }
};

const updatePackage = (packageManager, packageName, versionType, isForcedInstallation) => {
    const versionFlags = {
        major: '@latest', minor: '@^', patch: '@~',
    };

    const versionFlag = versionFlags[versionType] || versionFlags.patch;
    const forceInstall = isForcedInstallation ? "--force" : "";
    const installCommands = {
        npm: `npm install ${packageName}${versionFlag} ${forceInstall}`,
        yarn: `yarn add ${packageName}${versionFlag} ${forceInstall}`,
        pnpm: `pnpm add ${packageName}${versionFlag} ${forceInstall}`,
    };

    if (!packageName || typeof packageName !== 'string') {
        console.error(chalk.red('Invalid package name provided.'));
        return;
    }

    try {
        console.log(chalk.blue(`Updating ${packageName} to ${versionType} version with ${packageManager}...`));
        execSync(installCommands[packageManager], {stdio: 'inherit'});
        console.log(chalk.green(`${packageName} updated successfully!`));
    } catch (error) {
        console.error(chalk.red(`Failed to update ${packageName}:`));
        console.error(chalk.red(error.message));
    }
};

async function main() {
    console.log(chalk.cyan('Checking for outdated packages...\n'));

    const {packageManager} = await inquirer.prompt([{
        type: 'list',
        name: 'packageManager',
        message: 'Which package manager do you want to use?',
        choices: ['npm', 'yarn', 'pnpm'],
    },]);

    const outdatedPackages = getOutdatedPackages(packageManager);
    const packageNames = Object.keys(outdatedPackages);

    if (packageNames.length === 0) {
        console.log(chalk.green('All packages are up-to-date!'));
        return;
    }

    console.log(chalk.yellow('Outdated Packages:'));
    console.table(packageNames.map((name) => ({
        Name: name,
        Current: outdatedPackages[name].current,
        Wanted: outdatedPackages[name].wanted,
        Latest: outdatedPackages[name].latest,
    })));

    const {versionType} = await inquirer.prompt([{
        type: 'list',
        name: 'versionType',
        message: 'What version type do you want to update to?',
        choices: [{name: 'Major (latest version)', value: 'major'}, {
            name: 'Minor (compatible versions)',
            value: 'minor'
        }, {name: 'Patch (bug fixes only)', value: 'patch'},],
    },]);

    const answers = await inquirer.prompt([{
        type: 'checkbox', name: 'selectedPackages', message: 'Select packages to update:', choices: packageNames,
    }, {
        type: 'confirm', name: 'forceInstall', message: `Do you want to force update the package? (Warning: This may cause breaking changes)`, default: false,
    }, {
        type: 'confirm',
        name: 'updateAll',
        message: `Do you want to update all packages using ${packageManager} update instead?`,
        default: false,
    },]);

    if (answers.updateAll) {
        console.log(chalk.blue(`Updating all packages to ${versionType} versions with ${packageManager}...`));

        const updateAllCommands = {
            npm: `npm update`, yarn: `yarn upgrade`, pnpm: `pnpm update`,
        };

        execSync(updateAllCommands[packageManager], {stdio: 'inherit'});
        console.log(chalk.green('All packages updated successfully!'));
    } else if (answers.selectedPackages.length > 0) {
        answers.selectedPackages.forEach((pkg) => updatePackage(packageManager, pkg, versionType, answers.forceInstall));
    } else {
        console.log(chalk.yellow('No packages selected for update.'));
    }
}

main();

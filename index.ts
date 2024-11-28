#!/usr/bin/env node

import {execSync} from 'child_process';
import inquirer from 'inquirer';
import chalk from 'chalk';

// Define types for version and package manager
type VersionType = 'major' | 'minor' | 'patch';
type PackageManager = 'npm' | 'yarn' | 'pnpm';

// Define a global process type
const process = global.process;

// Function to fetch outdated packages
const getOutdatedPackages = (packageManager: PackageManager): Record<string, any> => {
    try {
        const command = {
            npm: 'npm outdated --json',
            yarn: 'yarn outdated --json',
            pnpm: 'pnpm outdated --json',
        }[packageManager];

        const result = execSync(command, {encoding: 'utf8'});
        return JSON.parse(result);
    } catch (error: any) {
        if (error.stdout) {
            return JSON.parse(error.stdout);
        }
        console.error(chalk.red('Failed to fetch outdated packages.'));
        return process.exit(1);
    }
};

// Function to update a specific package
const updatePackage = (packageManager: PackageManager, packageName: string, versionType: VersionType): void => {
    const versionFlags: Record<VersionType, string> = {
        major: '@latest',
        minor: '@^',
        patch: '@~',
    };

    const versionFlag = versionFlags[versionType] || versionFlags.patch;

    const installCommands: Record<PackageManager, string> = {
        npm: `npm install ${packageName}${versionFlag}`,
        yarn: `yarn add ${packageName}${versionFlag}`,
        pnpm: `pnpm add ${packageName}${versionFlag}`,
    };

    if (!packageName || typeof packageName !== 'string') {
        console.error(chalk.red('Invalid package name provided.'));
        return;
    }

    try {
        console.log(chalk.blue(`Updating ${packageName} to ${versionType} version with ${packageManager}...`));
        execSync(installCommands[packageManager], {stdio: 'inherit'});
        console.log(chalk.green(`${packageName} updated successfully!`));
    } catch (error: any) {
        console.error(chalk.red(`Failed to update ${packageName}:`));
        console.error(chalk.red(error.message));
    }
};

async function main(): Promise<void> {
    console.log(chalk.cyan('Checking for outdated packages...\n'));

    const {packageManager} = await inquirer.prompt<{
        packageManager: PackageManager;
    }>([
        {
            type: 'list',
            name: 'packageManager',
            message: 'Which package manager do you want to use?',
            choices: ['npm', 'yarn', 'pnpm'],
        },
    ]);

    const outdatedPackages = getOutdatedPackages(packageManager);
    const packageNames = Object.keys(outdatedPackages);

    if (packageNames.length === 0) {
        console.log(chalk.green('All packages are up-to-date!'));
        return;
    }

    console.log(chalk.yellow('Outdated Packages:'));
    console.table(
        packageNames.map((name) => ({
            Name: name,
            Current: outdatedPackages[name].current,
            Wanted: outdatedPackages[name].wanted,
            Latest: outdatedPackages[name].latest,
        }))
    );

    const {versionType} = await inquirer.prompt<{
        versionType: VersionType;
    }>([
        {
            type: 'list',
            name: 'versionType',
            message: 'What version type do you want to update to?',
            choices: [
                {name: 'Major (latest version)', value: 'major'},
                {name: 'Minor (compatible versions)', value: 'minor'},
                {name: 'Patch (bug fixes only)', value: 'patch'},
            ],
        },
    ]);

    const answers = await inquirer.prompt<{
        selectedPackages: string[];
        updateAll: boolean;
    }>([
        {
            type: 'checkbox',
            name: 'selectedPackages',
            message: 'Select packages to update:',
            choices: packageNames,
        },
        {
            type: 'confirm',
            name: 'updateAll',
            message: 'Do you want to update all packages instead?',
            default: false,
        },
    ]);

    if (answers.updateAll) {
        console.log(chalk.blue(`Updating all packages to ${versionType} versions with ${packageManager}...`));

        const updateAllCommands: Record<PackageManager, string> = {
            npm: `npm update`,
            yarn: `yarn upgrade`,
            pnpm: `pnpm update`,
        };
        execSync(updateAllCommands[packageManager], {stdio: 'inherit'});
        console.log(chalk.green('All packages updated successfully!'));
    } else if (answers.selectedPackages.length > 0) {
        answers.selectedPackages.forEach((pkg: string) => updatePackage(packageManager, pkg, versionType));
    } else {
        console.log(chalk.yellow('No packages selected for update.'));
    }
}

main().catch((error) => {
    console.error(chalk.red('An error occurred during execution:'));
    console.error(error);
    process.exit(1);
});

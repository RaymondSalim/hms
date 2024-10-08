/* eslint-disable no-console, no-process-exit */
const fs = require('fs').promises;
const path = require('path');
const {PrismaClient} = require('@prisma/client');

const prisma = new PrismaClient({
    log: [
        {
            emit: 'event',
            level: 'query',
        },
        {
            emit: 'stdout',
            level: 'error',
        },
        {
            emit: 'stdout',
            level: 'info',
        },
        {
            emit: 'stdout',
            level: 'warn',
        },
    ],
})
prisma.$on('query', (e) => {
    console.log('Query: ' + e.query)
    console.log('Params: ' + e.params)
    console.log('Duration: ' + e.duration + 'ms')
})
async function mock() {
    console.log("Executing mock.js");
    const rawSql = await fs.readFile(path.join(__dirname, 'mock.sql'), {
        encoding: 'utf-8',
    });
    const sqlReducedToStatements = rawSql
        .split('\n')
        .filter((line) => !line.startsWith('--')) // remove comments-only lines
        .join('\n')
        .replace(/\r\n|\n|\r/g, ' ') // remove newlines
        .replace(/\s+/g, ' '); // excess white space
    const sqlStatements = splitStringByNotQuotedSemicolon(sqlReducedToStatements);

    for (const sql of sqlStatements) {
        try {
            await prisma.$executeRawUnsafe(sql);
        } catch (err) {
            if (err.code === "P2010") continue;
            throw err;
        }
    }
}

function splitStringByNotQuotedSemicolon(input) {
    const result = [];

    let currentSplitIndex = 0;
    let isInString = false;
    for (let i = 0; i < input.length; i++) {
        if (input[i] === "'") {
            // toggle isInString
            isInString = !isInString;
        }
        if (input[i] === ';' && !isInString) {
            result.push(input.substring(currentSplitIndex, i + 1));
            currentSplitIndex = i + 2;
        }
    }

    return result;
}

//
// mock()
//     .then(async () => {
//         await prisma.$disconnect();
//     })
//     .catch(async (e) => {
//         console.error(e);
//         await prisma.$disconnect();
//         process.exit(1);
//     });

module.exports = mock();

/* eslint-disable no-console, no-process-exit */
const fs = require('fs').promises;
const path = require('path');
const {PrismaClient} = require('@prisma/client');

const prisma = new PrismaClient();

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

    await prisma.$transaction(async (db) => {
        for (const sql of sqlStatements) {
            try {
                await db.$executeRawUnsafe(sql);
            } catch (err) {
                console.error(err);
                if (["P2010", "P2010"].includes(err.code)) continue;
                throw err;
            }
        }
    })

    console.log("mock.js completed")
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

module.exports = mock;

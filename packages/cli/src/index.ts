#!/usr/bin/env node

import { Command } from 'commander';
import { scanCommand } from './commands/scan';
import { closeCommand } from './commands/close';

const program = new Command();

program
  .name('solreclaimer')
  .description('SolReclaimer - Zero-fee Solana rent reclaimer - close empty token accounts and reclaim SOL')
  .version('1.0.0');

program.addCommand(scanCommand);
program.addCommand(closeCommand);

program.parse();

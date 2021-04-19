import chalk from 'chalk';

export default function styledSuccess(message: string): void {
  const lines = message.split('\n');
  for (let i = 0; i < lines.length; i++) {
    process.stdout.write(chalk.green(`* ${lines[i]}\n`));
  }
}

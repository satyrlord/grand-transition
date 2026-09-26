import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';

// Runs independent checks at the same time. Each check prints its complete
// output as one block when it ends, so concurrent output never interleaves.
// Every check runs to the end, and the exit code fails when any check fails.
const commands = process.argv.slice(2);
if (commands.length === 0) {
  throw new Error('Give run-parallel.ts one or more commands.');
}

const results = await Promise.all(
  commands.map(
    (command) =>
      new Promise<{ command: string; status: number }>((resolve) => {
        const started = performance.now();
        const chunks: Buffer[] = [];
        const child = spawn(command, { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
        child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
        child.stderr.on('data', (chunk: Buffer) => chunks.push(chunk));
        let finished = false;
        const finish = (status: number) => {
          // A spawn failure can emit both `error` and `close`.
          if (finished) return;
          finished = true;
          const seconds = ((performance.now() - started) / 1000).toFixed(1);
          const output = Buffer.concat(chunks).toString('utf8').trimEnd();
          const heading = `${status === 0 ? 'passed' : `FAILED (${status})`} in ${seconds} s: ${command}`;
          process.stdout.write(`\n> ${heading}\n${output ? `${output}\n` : ''}`);
          resolve({ command, status });
        };
        child.on('error', (error) => {
          chunks.push(Buffer.from(String(error)));
          finish(1);
        });
        child.on('close', (code, signal) => finish(code ?? (signal ? 1 : 0)));
      }),
  ),
);

const failed = results.filter((result) => result.status !== 0);
if (failed.length > 0) {
  process.stderr.write(
    `\n${failed.length} failed:\n${failed.map((result) => `  ${result.command}`).join('\n')}\n`,
  );
  process.exitCode = 1;
}

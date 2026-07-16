import { randomUUID } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';
import bcrypt from 'bcrypt';
import { staffRepository as repo } from '../src/repositories/staff.sqlite';

loadEnvFile('.env');

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });
  const lines = rl[Symbol.asyncIterator]();

  // Chained rl.question() calls drop input on piped/non-TTY stdin (a line
  // event can fire before the next question() is registered), so every
  // field is read through the same async iterator. Output is muted only
  // while reading the password line so it is never echoed to the terminal.
  const rlInternal = rl as unknown as { _writeToOutput: (s: string) => void };
  const originalWrite = rlInternal._writeToOutput.bind(rlInternal);

  async function nextLine(question: string, hidden = false): Promise<string> {
    stdout.write(question);
    if (hidden) rlInternal._writeToOutput = () => {};
    const { value } = await lines.next();
    if (hidden) {
      rlInternal._writeToOutput = originalWrite;
      stdout.write('\n');
    }
    return (value ?? '').trim();
  }

  const first_name = await nextLine('First name: ');
  const last_name = await nextLine('Last name: ');
  const email = (await nextLine('Email: ')).toLowerCase();

  const existing = repo.findByEmail(email);
  if (existing) {
    console.error('Error: an account with this email already exists.');
    rl.close();
    process.exit(1);
  }

  const password = await nextLine('Password: ', true);
  rl.close();

  if (password.length < 12) {
    console.error('Error: password must be at least 12 characters.');
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(password, 12);

  repo.create({
    id: randomUUID(),
    first_name,
    last_name,
    email,
    password_hash,
  });

  console.log(`Account created for ${first_name} ${last_name} <${email}>`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

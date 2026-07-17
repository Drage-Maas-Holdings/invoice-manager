import { randomUUID } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';
import bcrypt from 'bcrypt';
import { vendorRepository as repo } from '../src/repositories/vendor.sqlite';

loadEnvFile('.env');

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });
  const lines = rl[Symbol.asyncIterator]();

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

  const name = await nextLine('Vendor name: ');
  const contact_email = (await nextLine('Contact email: ')).toLowerCase();

  const existing = repo.findByName(name);
  if (existing) {
    console.error('Error: a vendor with this name already exists.');
    rl.close();
    process.exit(1);
  }

  const passcode = await nextLine('Passcode: ', true);
  rl.close();

  if (passcode.length < 12) {
    console.error('Error: passcode must be at least 12 characters.');
    process.exit(1);
  }

  const passcode_hash = await bcrypt.hash(passcode, 12);

  repo.create({
    id: randomUUID(),
    name,
    contact_email,
    passcode_hash,
  });

  console.log(`Vendor "${name}" created <${contact_email}>`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

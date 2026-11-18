import { spawn, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const output = join(tmpdir(), 'assistajunto-migration-blazor');
const publish = spawnSync('dotnet', ['publish', '../AssistaJunto.Client/AssistaJunto.Client.csproj', '-c', 'Release', '-o', output, '--verbosity', 'quiet'], { stdio: 'inherit' });
if (publish.status !== 0) process.exit(publish.status ?? 1);
const host = spawn('dotnet', ['run', '--project', '../../tests/AssistaJunto.MigrationHost', '-c', 'Release', '--no-launch-profile'], {
  stdio: 'inherit', env: { ...process.env, MIGRATION_BLAZOR_WWWROOT: join(output, 'wwwroot') },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => host.kill(signal));
host.on('exit', code => process.exit(code ?? 0));

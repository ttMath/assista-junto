import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Reuse the trusted ASP.NET development certificate. Never change system trust here.
const check = spawnSync('dotnet', ['dev-certs', 'https', '--check', '--trust'], { encoding: 'utf8' });
if (check.error || check.status !== 0) {
  console.error('É necessário o SDK .NET e um certificado HTTPS local confiável. Execute: dotnet dev-certs https --trust');
  process.exit(1);
}

const directory = fileURLToPath(new URL('../.certs/', import.meta.url));
const certificate = fileURLToPath(new URL('../.certs/localhost.pem', import.meta.url));
mkdirSync(directory, { recursive: true, mode: 0o700 });
const exported = spawnSync('dotnet', ['dev-certs', 'https', '--export-path', certificate, '--format', 'PEM', '--no-password'], { stdio: 'inherit' });
if (exported.error || exported.status !== 0) process.exit(exported.status ?? 1);

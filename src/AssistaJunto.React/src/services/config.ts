export async function readConfig(): Promise<string> {
  const response = await fetch('/appsettings.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Não foi possível carregar a configuração do aplicativo.');
  const config: unknown = await response.json();
  if (!config || typeof config !== 'object' || !('ApiBaseUrl' in config) || typeof config.ApiBaseUrl !== 'string') {
    throw new Error('Configuração ApiBaseUrl inválida.');
  }
  const base = config.ApiBaseUrl.trim().replace(/\/+$/, '');
  if (base && !/^https?:\/\//i.test(base)) throw new Error('ApiBaseUrl deve ser uma URL HTTP ou HTTPS absoluta.');
  return base;
}
